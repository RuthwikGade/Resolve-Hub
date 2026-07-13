const cron = require('node-cron');
const { query } = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Check for SLA breaches and escalate overdue complaints.
 * Finds complaints that are OPEN, ACKNOWLEDGED, or IN_PROGRESS
 * and have exceeded their SLA max_resolution_minutes.
 */
const checkAndEscalate = async () => {
  console.log('[Escalation] Running SLA breach check...');

  try {
    // Find all complaints that are currently active
    const result = await query(
      `SELECT c.id, c.title, c.category, c.priority, c.status, c.community_id,
              c.created_by, c.assigned_to, c.created_at, c.ai_summary,
              s.id as sla_rule_id,
              s.max_resolution_minutes,
              EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 60 AS elapsed_minutes
       FROM complaints c
       LEFT JOIN sla_rules s ON c.community_id = s.community_id AND c.category = s.category
       WHERE c.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')`
    );

    if (result.rows.length === 0) {
      console.log('[Escalation] No active complaints found.');
      return;
    }

    // Default SLA limits by priority (in minutes)
    const DEFAULT_SLA = {
      CRITICAL: 360,     // 6 hours
      HIGH: 1440,        // 24 hours
      MEDIUM: 4320,      // 3 days
      LOW: 10080,        // 7 days
    };

    let escalatedCount = 0;

    for (const complaint of result.rows) {
      const priorityKey = (complaint.priority || 'MEDIUM').toUpperCase();
      
      // Determine max minutes: category rule overrides default priority SLA
      let maxMinutes = complaint.max_resolution_minutes;
      if (maxMinutes === null || maxMinutes === undefined) {
        maxMinutes = DEFAULT_SLA[priorityKey] || 4320;
      }

      const elapsed = Math.round(complaint.elapsed_minutes || 0);

      // Check if it breached the SLA limit
      if (elapsed > maxMinutes) {
        try {
          console.log(`[Escalation] SLA Breach: Complaint "${complaint.title}" (ID: ${complaint.id}) has been active for ${elapsed}m (SLA: ${maxMinutes}m)`);
          
          // 1. Update complaint status to ESCALATED
          await query(
            `UPDATE complaints SET status = 'ESCALATED', updated_at = NOW()
             WHERE id = $1 AND status != 'ESCALATED'`,
            [complaint.id]
          );

          // 2. Create escalation log entry
          await query(
            `INSERT INTO escalation_log (complaint_id, community_id, sla_rule_id, reason, sla_minutes, elapsed_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              complaint.id,
              complaint.community_id,
              complaint.sla_rule_id || null,
              `SLA breach: ${elapsed} minutes elapsed, limit was ${maxMinutes} minutes (Priority: ${priorityKey})`,
              maxMinutes,
              elapsed,
            ]
          );

          // 3. Create complaint event
          await query(
            `INSERT INTO complaint_events (complaint_id, event_type, actor_id, old_status, new_status, note)
             VALUES ($1, 'STATUS_CHANGE', $2, $3, 'ESCALATED', $4)`,
            [
              complaint.id,
              complaint.created_by, // Raised by the creator originally
              complaint.status,
              `Auto-escalated due to SLA breach. Elapsed: ${elapsed}min, SLA limit: ${maxMinutes}min.`,
            ]
          );

          // 4. Notify community admins about escalation
          const admins = await query(
            `SELECT user_id FROM community_members
             WHERE community_id = $1 AND role = 'community_admin' AND status = 'approved'`,
            [complaint.community_id]
          );

          const adminIds = admins.rows.map((a) => a.user_id);

          if (adminIds.length > 0) {
            await notificationService.notifyMultiple(
              adminIds,
              'IN_APP',
              'Complaint Escalated — SLA Breach',
              `Complaint "${complaint.title}" (${complaint.category}) has been escalated.\n` +
              `AI Summary: ${complaint.ai_summary || 'No summary available.'}\n` +
              `Elapsed: ${elapsed} min (SLA Limit: ${maxMinutes} min).`,
              {
                complaintId: complaint.id,
                communityId: complaint.community_id,
                type: 'escalation',
              }
            );
          }

          // 5. Notify the assigned person
          if (complaint.assigned_to) {
            await notificationService.notify(
              complaint.assigned_to,
              'IN_APP',
              'Your Assigned Complaint Escalated',
              `Complaint "${complaint.title}" assigned to you has been escalated due to SLA breach.`,
              {
                complaintId: complaint.id,
                communityId: complaint.community_id,
                type: 'escalation',
              }
            );
          }

          escalatedCount++;
          console.log(`[Escalation] Escalated complaint ${complaint.id} successfully.`);
        } catch (err) {
          console.error(`[Escalation] Failed to escalate complaint ${complaint.id}:`, err.message);
        }
      }
    }

    console.log(`[Escalation] SLA breach check complete. Escalated ${escalatedCount} complaint(s).`);
  } catch (err) {
    console.error('[Escalation] Error during SLA breach check:', err.message);
  }
};;

/**
 * Start the escalation cron job.
 * Runs every 15 minutes to check for SLA breaches.
 */
const startEscalationCron = () => {
  console.log('[Escalation] Starting escalation cron (every 15 minutes)...');

  cron.schedule('*/15 * * * *', async () => {
    await checkAndEscalate();
  });

  // Also run once on startup after a short delay
  setTimeout(() => {
    checkAndEscalate().catch((err) =>
      console.error('[Escalation] Initial check failed:', err.message)
    );
  }, 5000);
};

module.exports = { startEscalationCron, checkAndEscalate };
