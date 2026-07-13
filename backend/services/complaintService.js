const { query } = require('../config/db');
const routingService = require('./routingService');
const notificationService = require('./notificationService');
const aiService = require('./aiService');

/**
 * Valid status transitions map.
 * Key = current status, Value = array of allowed next statuses.
 * ESCALATED is a special transition allowed from any status (system-only).
 */
const VALID_TRANSITIONS = {
  OPEN: ['ACKNOWLEDGED', 'RESOLVED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
};

/**
 * Check if a status transition is valid.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
const isValidTransition = (currentStatus, newStatus) => {
  // ESCALATED can be set from any status (system-only)
  if (newStatus === 'ESCALATED') {
    return true;
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(newStatus);
};

/**
 * Create a new complaint with auto-assignment, AI analysis, duplicate detection, and event logging.
 *
 * @param {Object} data - { title, description, community_id }
 * @param {string} userId - Creator's user ID
 * @returns {Object} Created complaint
 */
const create = async (data, userId) => {
  const { title, description, community_id, category: userCategory, priority: userPriority } = data;

  // 1. Analyze complaint using AI (categorize, detect priority, generate summary)
  const aiAnalysis = await aiService.analyzeComplaint(title, description, community_id);
  
  // Use user-selected category if it is valid for the community, otherwise use AI-detected category
  let category = aiAnalysis.category;
  if (userCategory) {
    const validCategoriesResult = await query(
      'SELECT DISTINCT category FROM category_role_mapping WHERE community_id = $1',
      [community_id]
    );
    const validCategories = validCategoriesResult.rows.map(r => r.category.toLowerCase());
    if (validCategories.includes(userCategory.toLowerCase())) {
      const matched = validCategoriesResult.rows.find(r => r.category.toLowerCase() === userCategory.toLowerCase());
      category = matched.category;
    }
  }

  // Use user-selected priority if valid, otherwise use AI-detected priority
  let priority = aiAnalysis.priority;
  if (userPriority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(userPriority.toUpperCase())) {
    priority = userPriority.toUpperCase();
  }

  const { summary } = aiAnalysis;

  // 2. Check for duplicate complaints in the same community
  const duplicate = await aiService.findDuplicate(title, description, community_id);

  let complaint;

  if (duplicate) {
    console.log(`[ComplaintService] Duplicate detected for: "${title}". Linking to parent: ${duplicate.id}`);
    
    // Create complaint as CLOSED since it's a duplicate
    const result = await query(
      `INSERT INTO complaints (title, description, category, priority, status, community_id, created_by, ai_summary, is_duplicate, duplicate_of_id)
       VALUES ($1, $2, $3, $4, 'CLOSED', $5, $6, $7, TRUE, $8)
       RETURNING *`,
      [title, description, category, priority, community_id, userId, summary, duplicate.id]
    );
    complaint = result.rows[0];

    // Increment duplicate_count on parent complaint
    await query(
      `UPDATE complaints 
       SET duplicate_count = duplicate_count + 1, updated_at = NOW() 
       WHERE id = $1`,
      [duplicate.id]
    );

    // Log duplicate link event on parent complaint
    await query(
      `INSERT INTO complaint_events (complaint_id, event_type, actor_id, note, metadata)
       VALUES ($1, 'STATUS_CHANGE', $2, $3, $4)`,
      [
        duplicate.id,
        userId,
        `Duplicate complaint reported by another resident. Linked report ID: ${complaint.id}.`,
        JSON.stringify({ linkedComplaintId: complaint.id })
      ]
    );

    // Notify the user who reported the duplicate
    try {
      await notificationService.notify(
        userId,
        'IN_APP',
        'Duplicate Complaint Detected',
        `A similar issue "${duplicate.title}" has already been reported. We have linked your report to it to combine efforts.`,
        { complaintId: duplicate.id, duplicateId: complaint.id }
      );
    } catch (err) {
      console.error('Failed to send duplicate notification:', err.message);
    }
  } else {
    // Normal non-duplicate complaint flow. Auto-assign via routing rules
    const assignedTo = await routingService.autoAssign(community_id, category);

    const result = await query(
      `INSERT INTO complaints (title, description, category, priority, status, community_id, created_by, assigned_to, ai_summary)
       VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8)
       RETURNING *`,
      [title, description, category, priority, community_id, userId, assignedTo, summary]
    );

    complaint = result.rows[0];

    // Create initial audit event
    await query(
      `INSERT INTO complaint_events (complaint_id, event_type, actor_id, new_status, note)
       VALUES ($1, 'CREATED', $2, 'OPEN', 'Complaint created and analyzed by AI.')`,
      [complaint.id, userId]
    );

    // Notify the assigned person
    if (assignedTo) {
      try {
        await notificationService.notify(
          assignedTo,
          'IN_APP',
          'New Complaint Assigned',
          `A new complaint "${title}" has been assigned to you in category "${category}".`,
          { complaintId: complaint.id, communityId: community_id }
        );
      } catch (err) {
        console.error('Failed to send assignment notification:', err.message);
      }
    }
  }

  return complaint;
};

/**
 * Get a complaint by ID with related user info.
 * @param {string} id
 * @returns {Object|null}
 */
const getById = async (id) => {
  const result = await query(
    `SELECT c.*,
            creator.name as creator_name,
            creator.email as creator_email,
            assignee.name as assignee_name,
            assignee.email as assignee_email,
            com.name as community_name
     FROM complaints c
     LEFT JOIN users creator ON c.created_by = creator.id
     LEFT JOIN users assignee ON c.assigned_to = assignee.id
     LEFT JOIN communities com ON c.community_id = com.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Also get attachments
  const attachments = await query(
    'SELECT * FROM complaint_attachments WHERE complaint_id = $1 ORDER BY uploaded_at',
    [id]
  );

  return {
    ...result.rows[0],
    attachments: attachments.rows,
  };
};

/**
 * Get complaints for a community with optional filters.
 * @param {string} communityId
 * @param {Object} filters - { status, category, priority, assignedTo, page, limit }
 * @returns {Object} { complaints, total, page, limit }
 */
const getByCommunity = async (communityId, filters = {}) => {
  const {
    status,
    category,
    priority,
    assigned_to,
    page = 1,
    limit = 20,
  } = filters;

  let sql = `
    SELECT c.*,
           creator.name as creator_name,
           assignee.name as assignee_name,
           com.name as community_name
    FROM complaints c
    LEFT JOIN users creator ON c.created_by = creator.id
    LEFT JOIN users assignee ON c.assigned_to = assignee.id
    LEFT JOIN communities com ON c.community_id = com.id
    WHERE c.community_id = $1
  `;
  const params = [communityId];

  if (status) {
    params.push(status);
    sql += ` AND c.status = $${params.length}`;
  }

  if (category) {
    params.push(category);
    sql += ` AND c.category = $${params.length}`;
  }

  if (priority) {
    params.push(priority);
    sql += ` AND c.priority = $${params.length}`;
  }

  if (assigned_to) {
    params.push(assigned_to);
    sql += ` AND c.assigned_to = $${params.length}`;
  }

  // Count total for pagination
  const countResult = await query(
    `SELECT COUNT(*) FROM complaints c WHERE c.community_id = $1${
      status ? ` AND c.status = '${status}'` : ''
    }${category ? ` AND c.category = '${category}'` : ''}${
      priority ? ` AND c.priority = '${priority}'` : ''
    }${assigned_to ? ` AND c.assigned_to = '${assigned_to}'` : ''}`,
    [communityId]
  );

  const offset = (page - 1) * limit;
  params.push(limit, offset);
  sql += ` ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await query(sql, params);

  return {
    complaints: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
};

/**
 * Update complaint status with validation and audit logging.
 *
 * @param {string} id - Complaint ID
 * @param {string} newStatus - Target status
 * @param {string} actorId - User performing the action
 * @param {string} note - Optional note
 * @returns {Object} Updated complaint
 */
const updateStatus = async (id, newStatus, actorId, note) => {
  // Get current complaint
  const current = await query('SELECT * FROM complaints WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const complaint = current.rows[0];

  // Validate transition
  if (!isValidTransition(complaint.status, newStatus)) {
    const err = new Error(
      `Invalid status transition: ${complaint.status} → ${newStatus}. ` +
      `Allowed transitions from ${complaint.status}: ${VALID_TRANSITIONS[complaint.status].join(', ') || 'none'}`
    );
    err.statusCode = 400;
    throw err;
  }

  // Build update query
  let updateSql = 'UPDATE complaints SET status = $1, updated_at = NOW()';
  const updateParams = [newStatus];

  // Set resolved_at timestamp when moving to RESOLVED or CLOSED (if not already resolved)
  if (newStatus === 'RESOLVED' || (newStatus === 'CLOSED' && !complaint.resolved_at)) {
    updateSql += ', resolved_at = NOW()';
  }

  updateParams.push(id);
  updateSql += ` WHERE id = $${updateParams.length} RETURNING *`;

  const result = await query(updateSql, updateParams);
  const updated = result.rows[0];

  // Create audit event
  await query(
    `INSERT INTO complaint_events (complaint_id, event_type, actor_id, old_status, new_status, note)
     VALUES ($1, 'STATUS_CHANGE', $2, $3, $4, $5)`,
    [id, actorId, complaint.status, newStatus, note || null]
  );

  // Notify the complaint creator about status change
  try {
    await notificationService.notify(
      complaint.created_by,
      'IN_APP',
      'Complaint Status Updated',
      `Your complaint "${complaint.title}" status changed from ${complaint.status} to ${newStatus}.`,
      { complaintId: id, oldStatus: complaint.status, newStatus }
    );
  } catch (err) {
    console.error('Failed to send status update notification:', err.message);
  }

  return updated;
};

/**
 * Reassign a complaint to a different user.
 *
 * @param {string} id - Complaint ID
 * @param {string} newAssigneeId - New assignee user ID
 * @param {string} actorId - User performing the reassignment
 * @returns {Object} Updated complaint
 */
const reassign = async (id, newAssigneeId, actorId) => {
  const current = await query('SELECT * FROM complaints WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const complaint = current.rows[0];
  const oldAssignee = complaint.assigned_to;

  const result = await query(
    `UPDATE complaints SET assigned_to = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [newAssigneeId, id]
  );

  // Create audit event
  await query(
    `INSERT INTO complaint_events (complaint_id, event_type, actor_id, note)
     VALUES ($1, 'REASSIGNED', $2, $3)`,
    [id, actorId, `Reassigned from ${oldAssignee || 'unassigned'} to ${newAssigneeId}`]
  );

  // Notify the new assignee
  try {
    await notificationService.notify(
      newAssigneeId,
      'IN_APP',
      'Complaint Assigned to You',
      `Complaint "${complaint.title}" has been reassigned to you.`,
      { complaintId: id, communityId: complaint.community_id }
    );
  } catch (err) {
    console.error('Failed to send reassignment notification:', err.message);
  }

  return result.rows[0];
};

/**
 * Get the audit trail (events) for a complaint.
 * @param {string} complaintId
 * @returns {Array}
 */
const getEvents = async (complaintId) => {
  const result = await query(
    `SELECT ce.*, u.name as actor_name, u.email as actor_email
     FROM complaint_events ce
     LEFT JOIN users u ON ce.actor_id = u.id
     WHERE ce.complaint_id = $1
     ORDER BY ce.created_at ASC`,
    [complaintId]
  );

  return result.rows;
};

/**
 * Add an attachment to a complaint.
 * @param {string} complaintId
 * @param {Object} fileInfo - { filename, originalname, mimetype, size, path }
 * @returns {Object} Created attachment record
 */
const addAttachment = async (complaintId, fileInfo) => {
  const relativePath = `/uploads/${fileInfo.filename}`;
  const result = await query(
    `INSERT INTO complaint_attachments (complaint_id, file_name, mime_type, file_size, file_path)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      complaintId,
      fileInfo.originalname || fileInfo.filename,
      fileInfo.mimetype,
      fileInfo.size,
      relativePath,
    ]
  );

  return result.rows[0];
};

module.exports = {
  create,
  getById,
  getByCommunity,
  updateStatus,
  reassign,
  getEvents,
  addAttachment,
};
