const { query } = require('../config/db');

/**
 * Get aggregate stats for a community.
 * @param {string} communityId
 * @returns {Object}
 */
const getCommunityStats = async (communityId) => {
  const result = await query(
    `SELECT
       COUNT(*) as total_complaints,
       COUNT(*) FILTER (WHERE status = 'OPEN') as open_complaints,
       COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED') as acknowledged_complaints,
       COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_complaints,
       COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_complaints,
       COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_complaints,
       COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated_complaints,
       CASE
         WHEN COUNT(*) > 0
         THEN ROUND(
           (COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::numeric / COUNT(*)::numeric) * 100, 2
         )
         ELSE 0
       END as resolution_rate,
       ROUND(
         AVG(
           EXTRACT(EPOCH FROM (
             CASE
               WHEN status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
               THEN resolved_at - created_at
               ELSE NULL
             END
           )) / 60
         )::numeric, 2
       ) as avg_resolution_minutes
     FROM complaints
     WHERE community_id = $1`,
    [communityId]
  );

  return result.rows[0];
};

/**
 * Get complaint counts grouped by category for a community.
 * @param {string} communityId
 * @returns {Array}
 */
const getComplaintsByCategory = async (communityId) => {
  const result = await query(
    `SELECT
       category,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'OPEN') as open,
       COUNT(*) FILTER (WHERE status = 'RESOLVED' OR status = 'CLOSED') as resolved,
       COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated,
       ROUND(
         COALESCE(
           AVG(
             CASE
               WHEN status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
               ELSE NULL
             END
           ), 0
         )::numeric, 2
       ) as avg_resolution_minutes
     FROM complaints
     WHERE community_id = $1
     GROUP BY category
     ORDER BY total DESC`,
    [communityId]
  );

  return result.rows;
};

/**
 * Get daily complaint counts for the last N days in a community.
 * @param {string} communityId
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Array}
 */
const getComplaintsTrend = async (communityId, days = 30) => {
  const result = await query(
    `SELECT
       date_trunc('day', created_at)::date as date,
       COUNT(*) as count,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved
     FROM complaints
     WHERE community_id = $1
       AND created_at >= NOW() - INTERVAL '1 day' * $2
     GROUP BY date_trunc('day', created_at)::date
     ORDER BY date ASC`,
    [communityId, days]
  );

  return result.rows;
};

/**
 * Get complaint stats for a specific user within a community.
 * @param {string} userId
 * @param {string} communityId
 * @returns {Object}
 */
const getMemberStats = async (userId, communityId) => {
  // Stats for complaints filed by the user
  const filedResult = await query(
    `SELECT
       COUNT(*) as total_filed,
       COUNT(*) FILTER (WHERE status = 'OPEN') as open_filed,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved_filed,
       COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated_filed
     FROM complaints
     WHERE created_by = $1 AND community_id = $2`,
    [userId, communityId]
  );

  // Stats for complaints assigned to the user
  const assignedResult = await query(
    `SELECT
       COUNT(*) as total_assigned,
       COUNT(*) FILTER (WHERE status = 'OPEN' OR status = 'ACKNOWLEDGED' OR status = 'IN_PROGRESS') as active_assigned,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved_assigned,
       ROUND(
         AVG(
           EXTRACT(EPOCH FROM (
             CASE
               WHEN status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
               THEN resolved_at - created_at
               ELSE NULL
             END
           )) / 60
         )::numeric, 2
       ) as avg_resolution_minutes
     FROM complaints
     WHERE assigned_to = $1 AND community_id = $2`,
    [userId, communityId]
  );

  return {
    filed: filedResult.rows[0],
    assigned: assignedResult.rows[0],
  };
};

/**
 * Get AI-powered insights, duplicate statistics, priority hotspots, and recommendations for a community.
 *
 * @param {string} communityId
 * @returns {Promise<Object>}
 */
const getAIInsights = async (communityId) => {
  // 1. Total duplicate complaints and duplicate groups
  const dupStats = await query(
    `SELECT COUNT(*) as total_duplicates,
            COUNT(DISTINCT duplicate_of_id) as unique_duplicate_groups
     FROM complaints
     WHERE community_id = $1 AND is_duplicate = TRUE`,
    [communityId]
  );
  
  // 2. Categories with most duplicate issues
  const dupCategories = await query(
    `SELECT category, COUNT(*) as count
     FROM complaints
     WHERE community_id = $1 AND is_duplicate = TRUE
     GROUP BY category
     ORDER BY count DESC`,
    [communityId]
  );

  // 3. Priority hotspots (unresolved high/critical issues)
  const priorityHotspots = await query(
    `SELECT category, 
            COUNT(*) FILTER (WHERE priority = 'CRITICAL') as critical_count,
            COUNT(*) FILTER (WHERE priority = 'HIGH') as high_count,
            COUNT(*) as total_count
     FROM complaints
     WHERE community_id = $1 AND status NOT IN ('RESOLVED', 'CLOSED')
     GROUP BY category
     HAVING COUNT(*) FILTER (WHERE priority IN ('CRITICAL', 'HIGH')) > 0
     ORDER BY critical_count DESC, high_count DESC`,
    [communityId]
  );

  // 4. Resolution efficiency (average resolution time per category)
  const efficiency = await query(
    `SELECT category,
            COUNT(*) as total_complaints,
            COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved_complaints,
            ROUND(
              AVG(
                EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
              )::numeric, 2
            ) as avg_resolution_minutes
     FROM complaints
     WHERE community_id = $1 AND resolved_at IS NOT NULL
     GROUP BY category
     ORDER BY avg_resolution_minutes DESC`,
    [communityId]
  );

  // 5. Generate AI Recommendations
  const totalDups = parseInt(dupStats.rows[0]?.total_duplicates || 0, 10);
  const efficiencyRows = efficiency.rows;
  const hotspotRows = priorityHotspots.rows;

  let recommendations = [];

  // Look for Gemini Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
    try {
      const prompt = `
        You are an expert community management consultant. Analyze the following statistics for community (ID: ${communityId}):
        - Total duplicate complaints: ${totalDups}
        - Category-wise complaints & resolution times: ${JSON.stringify(efficiencyRows)}
        - High-priority issue hotspots (Critical/High unresolved): ${JSON.stringify(hotspotRows)}
        
        Provide 3-4 specific, actionable, highly professional recommendations in a JSON array of strings. 
        Each recommendation should start with an emoji and be written in a professional, constructive tone.
        Respond with raw JSON only (no markdown block formatting like \`\`\`json).
        Example format: ["💡 Recommendation 1", "🔧 Recommendation 2"]
      `;
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      if (response.ok) {
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        recommendations = JSON.parse(text);
      }
    } catch (err) {
      console.warn('[AnalyticsService] Failed to generate AI recommendations via Gemini. Falling back to offline heuristics:', err.message);
    }
  }

  // Fallback Offline Heuristics for Recommendations
  if (recommendations.length === 0) {
    if (hotspotRows.length > 0) {
      const topHotspot = hotspotRows[0];
      recommendations.push(
        `🚨 **Urgent Priority Hotspot**: We detected ${topHotspot.critical_count} critical and ${topHotspot.high_count} high priority unresolved issues in the **${topHotspot.category}** category. Suggest prioritizing dispatching staff immediately.`
      );
    }
    
    // Check for slow category resolution
    const slowCategory = efficiencyRows.find(row => parseFloat(row.avg_resolution_minutes) > 1440); // > 24 hours
    if (slowCategory) {
      recommendations.push(
        `⏱️ **Resolution SLA Delay**: The **${slowCategory.category}** category average resolution time is currently ${Math.round(slowCategory.avg_resolution_minutes / 60)} hours. Consider reviewing the assignment routing rule or allocating additional contractors.`
      );
    }

    // Check for duplicates
    if (totalDups > 2) {
      const topDupCat = dupCategories.rows[0];
      recommendations.push(
        `💡 **Redundant Reporting**: We detected ${totalDups} duplicate complaints, mostly in **${topDupCat?.category || 'General'}**. Suggest posting a community notice about ongoing maintenance in this category to prevent residents from raising duplicate requests.`
      );
    }

    // Default general recommendation if list is too short
    if (recommendations.length < 2) {
      recommendations.push(
        `📈 **Platform health**: General resolution efficiency is stable. Suggest establishing automated SLA alerts for staff members to proactively avoid escalations.`
      );
    }
  }

  return {
    totalDuplicates: totalDups,
    duplicateCategories: dupCategories.rows,
    priorityHotspots: hotspotRows,
    resolutionEfficiency: efficiencyRows,
    recommendations
  };
};

module.exports = {
  getCommunityStats,
  getComplaintsByCategory,
  getComplaintsTrend,
  getMemberStats,
  getAIInsights,
};
