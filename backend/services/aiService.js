const { query } = require('../config/db');

// List of allowed categories
const ALLOWED_CATEGORIES = [
  'Electrical',
  'Water Supply',
  'Internet',
  'Security',
  'Maintenance',
  'Cleanliness',
  'Infrastructure',
  'Other'
];

// List of allowed priorities
const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * Tokenize a text string into a set of normalized words.
 * Filters out stop words and short terms.
 * @param {string} text 
 * @returns {Set<string>}
 */
const tokenize = (text) => {
  if (!text) return new Set();
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 
    'on', 'at', 'by', 'of', 'with', 'from', 'my', 'our', 'your', 'this', 'that', 'please', 
    'help', 'issue', 'problem', 'broken', 'not', 'working', 'having', 'there', 'has'
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // replace punctuation with space
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
    
  return new Set(words);
};

/**
 * Calculate Jaccard Similarity between two word sets.
 * @param {Set<string>} setA 
 * @param {Set<string>} setB 
 * @returns {number} 0 to 1
 */
const calculateJaccardSimilarity = (setA, setB) => {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
};

/**
 * Perform duplicate detection using Jaccard Similarity on active complaints.
 * 
 * @param {string} title 
 * @param {string} description 
 * @param {string} communityId 
 * @returns {Promise<Object|null>} The duplicate complaint record if found, or null
 */
const findDuplicate = async (title, description, communityId) => {
  try {
    // Tokenize the incoming complaint
    const newWords = tokenize(`${title} ${description}`);
    if (newWords.size === 0) return null;

    // Fetch all active complaints in the community
    const result = await query(
      `SELECT id, title, description, category, priority, status, created_at 
       FROM complaints 
       WHERE community_id = $1 AND status NOT IN ('RESOLVED', 'CLOSED') AND is_duplicate = FALSE`,
      [communityId]
    );

    let bestMatch = null;
    let maxSimilarity = 0;

    for (const comp of result.rows) {
      const compWords = tokenize(`${comp.title} ${comp.description}`);
      const similarity = calculateJaccardSimilarity(newWords, compWords);

      // Threshold of 0.45 similarity indicates a duplicate
      if (similarity > 0.45 && similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = comp;
      }
    }

    if (bestMatch) {
      console.log(`[AI-Duplicates] Match found! Similarity: ${(maxSimilarity * 100).toFixed(1)}%. ID: ${bestMatch.id}`);
      return bestMatch;
    }

    return null;
  } catch (err) {
    console.error('[AI-Duplicates] Error during duplicate detection:', err.message);
    return null;
  }
};

/**
 * Keyword-based heuristic categorization and priority mapping (Offline Fallback).
 * 
 * @param {string} title 
 * @param {string} description 
 * @returns {Object} { category, priority, summary }
 */
const analyzeOfflineFallback = (title, description) => {
  const fullText = `${title} ${description}`.toLowerCase();
  
  // 1. Determine Category
  let category = 'Other';
  
  const categoryKeywords = {
    Electrical: ['electrical', 'electricity', 'light', 'wire', 'switch', 'fan', 'bulb', 'power', 'shock', 'meter', 'generator', 'socket', 'plug', 'blackout'],
    'Water Supply': ['water', 'leak', 'leakage', 'pipe', 'tap', 'plumbing', 'tank', 'drain', 'sewer', 'overflow', 'dry', 'pump', 'washroom', 'toilet', 'flush'],
    Internet: ['wifi', 'wi-fi', 'internet', 'fiber', 'network', 'router', 'slow', 'offline', 'broadband', 'connection', 'cable'],
    Security: ['theft', 'security', 'guard', 'lock', 'camera', 'cctv', 'gate', 'trespass', 'intruder', 'robbery', 'stranger', 'patrol', 'break-in'],
    Cleanliness: ['garbage', 'clean', 'trash', 'smell', 'dirt', 'sweep', 'waste', 'dustbin', 'litter', 'hygiene', 'sweeper', 'sewage', 'dump'],
    Infrastructure: ['road', 'pothole', 'wall', 'lift', 'elevator', 'crack', 'fence', 'gate', 'building', 'roof', 'stairs', 'pathway', 'asphalt'],
    Maintenance: ['repair', 'paint', 'door', 'window', 'lock', 'garden', 'grass', 'park', 'gym', 'gymnasium', 'ac', 'air conditioner', 'leakage']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => fullText.includes(kw))) {
      category = cat;
      break;
    }
  }

  // 2. Determine Priority
  let priority = 'MEDIUM';
  
  const criticalKeywords = ['fire', 'shock', 'spark', 'flood', 'gas leak', 'robbery', 'danger', 'injury', 'trap', 'elevator trap', 'total power failure', 'collapse'];
  const highKeywords = ['broken lock', 'wifi offline', 'no water', 'security gate open', 'lift broken', 'escalated', 'water leaking', 'flooding'];
  const lowKeywords = ['fading', 'paint', 'grass long', 'dust', 'park cleaning', 'gym mirror'];

  if (criticalKeywords.some(kw => fullText.includes(kw))) {
    priority = 'CRITICAL';
  } else if (highKeywords.some(kw => fullText.includes(kw))) {
    priority = 'HIGH';
  } else if (lowKeywords.some(kw => fullText.includes(kw))) {
    priority = 'LOW';
  }

  // 3. Generate Summary
  const descSentences = description.split(/[.!?]+/);
  const firstSentence = descSentences[0] ? descSentences[0].trim() : '';
  const summaryText = firstSentence.length > 150 ? firstSentence.slice(0, 147) + '...' : firstSentence;
  const summary = `Complaint: "${title}". Details: ${summaryText}`;

  return { category, priority, summary };
};

/**
 * Core AI analysis function. Categorizes, prioritizes, and summarizes complaints.
 * Automatically switches between Gemini API and Local Offline Heuristics.
 * 
 * @param {string} title 
 * @param {string} description 
 * @param {string} communityId 
 * @returns {Promise<Object>} { category, priority, summary }
 */
const analyzeComplaint = async (title, description, communityId) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    console.log('[AI-Service] No GEMINI_API_KEY found. Using offline heuristics fallback.');
    return analyzeOfflineFallback(title, description);
  }

  console.log('[AI-Service] Running Gemini AI analysis...');
  const prompt = `
    You are an AI assistant for a community complaint management platform called ResolveHub.
    Analyze the following user complaint:
    Title: "${title}"
    Description: "${description}"

    Analyze and extract:
    1. Category: Classify the issue into exactly one of these: ${ALLOWED_CATEGORIES.join(', ')}.
    2. Priority: Detect urgency level into exactly one of these: ${ALLOWED_PRIORITIES.join(', ')}.
       - CRITICAL: Life threat, active fire, flooding, active robbery, gas leak, total electrical failure.
       - HIGH: Water leakage, main door lock broken, internet offline, lift broken.
       - MEDIUM: Streetlight broken, garbage not picked up.
       - LOW: Aesthetic maintenance, gardening.
    3. Summary: A short 1-2 sentence summary of what the core issue is and where it is.

    Please respond with a raw JSON object and nothing else. Do not wrap it in markdown block quotes (like \`\`\`json). Return exactly:
    {
      "category": "categoryName",
      "priority": "priorityLevel",
      "summary": "concise summary text"
    }
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean response if model wrapped it in markdown code block
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    
    // Normalize and validate category
    let category = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === parsed.category?.toLowerCase());
    if (!category) category = 'Other';
    
    // Normalize and validate priority
    let priority = ALLOWED_PRIORITIES.find(p => p === parsed.priority?.toUpperCase());
    if (!priority) priority = 'MEDIUM';
    
    const summary = parsed.summary || title;

    console.log(`[AI-Service] Gemini successfully analyzed: Cat=${category}, Priority=${priority}`);
    return { category, priority, summary };
  } catch (err) {
    console.warn('[AI-Service] Gemini API call failed. Falling back to offline heuristics:', err.message);
    return analyzeOfflineFallback(title, description);
  }
};

module.exports = {
  findDuplicate,
  analyzeComplaint,
};
