const complaintService = require('../services/complaintService');

/**
 * POST /api/complaints
 * Create a new complaint (with optional file upload).
 */
const create = async (req, res, next) => {
  try {
    const complaint = await complaintService.create(req.body, req.user.id);

    // Handle file attachment if uploaded
    if (req.file) {
      await complaintService.addAttachment(complaint.id, req.file);
    }

    // Handle multiple files if uploaded
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await complaintService.addAttachment(complaint.id, file);
      }
    }

    // Re-fetch to include attachments
    const fullComplaint = await complaintService.getById(complaint.id);

    return res.status(201).json({
      success: true,
      data: fullComplaint,
      message: 'Complaint created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints/:id
 * Get a specific complaint by ID.
 */
const getById = async (req, res, next) => {
  try {
    const complaint = await complaintService.getById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints/community/:communityId
 * Get all complaints for a community with optional filters.
 */
const getByCommunity = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      assigned_to: req.query.assigned_to,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await complaintService.getByCommunity(communityId, filters);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/complaints/:id/status
 * Update a complaint's status.
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const complaint = await complaintService.updateStatus(id, status, req.user.id, note);

    return res.status(200).json({
      success: true,
      data: complaint,
      message: `Complaint status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/complaints/:id/assign
 * Reassign a complaint to a different user.
 */
const reassign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const complaint = await complaintService.reassign(id, assigned_to, req.user.id);

    return res.status(200).json({
      success: true,
      data: complaint,
      message: 'Complaint reassigned successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints/:id/events
 * Get the audit trail for a complaint.
 */
const getEvents = async (req, res, next) => {
  try {
    const events = await complaintService.getEvents(req.params.id);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  getById,
  getByCommunity,
  updateStatus,
  reassign,
  getEvents,
};
