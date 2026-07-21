import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import ComplaintTimeline from '../../components/complaints/ComplaintTimeline';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { formatRelativeTime } from '../../utils/helpers';
import { API_BASE_URL } from '../../utils/constants';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const { onEvent, offEvent } = useSocket();

  const [complaint, setComplaint] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  
  // Status transition states
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reassignment states
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [updatingAssign, setUpdatingAssign] = useState(false);

  const loadComplaintData = async () => {
    try {
      const compRes = await api.get(`/complaints/${id}`);
      setComplaint(compRes.data);
      if (compRes.data?.assigned_to) {
        setSelectedAssignee(compRes.data.assigned_to);
      }

      const eventsRes = await api.get(`/complaints/${id}/events`);
      // map backend properties to what timeline component expects
      const mappedEvents = (eventsRes.data || []).map(ev => ({
        ...ev,
        type: ev.event_type?.toLowerCase(),
        actorName: ev.actor_name,
        createdAt: ev.created_at,
      }));
      setEvents(mappedEvents);

      // If user is admin/super_admin, load members for reassignment
      if (compRes.data?.community_id) {
        const memRes = await api.get(`/members/${compRes.data.community_id}`);
        // filter down to staff and admins
        const assignable = (memRes.data || []).filter(
          m => m.role === 'responsible_person' || m.role === 'community_admin'
        );
        setMembers(assignable);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load complaint details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaintData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, addToast]);

  // Handle Socket.IO events for live status/assignment changes
  useEffect(() => {
    const handleStatusChanged = ({ complaintId, newStatus }) => {
      if (complaintId === id) {
        setComplaint((prev) => prev ? { ...prev, status: newStatus } : null);
        addToast(`Complaint status updated to ${newStatus}`, 'info');
        loadComplaintData();
      }
    };

    onEvent('status_changed', handleStatusChanged);
    return () => {
      offEvent('status_changed', handleStatusChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, onEvent, offEvent, addToast]);

  const handleStatusUpdate = async (statusVal) => {
    setNextStatus(statusVal);
    setStatusNote('');
    setStatusModalOpen(true);
  };

  const submitStatusUpdate = async () => {
    setUpdatingStatus(true);
    try {
      await api.put(`/complaints/${id}/status`, {
        status: nextStatus,
        note: statusNote,
      });
      addToast(`Status updated to ${nextStatus}`, 'success');
      setStatusModalOpen(false);
      loadComplaintData();
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitReassign = async () => {
    if (!selectedAssignee) {
      addToast('Please select a user to assign.', 'warning');
      return;
    }
    setUpdatingAssign(true);
    try {
      await api.put(`/complaints/${id}/assign`, {
        assigned_to: selectedAssignee,
      });
      addToast('Complaint reassigned successfully', 'success');
      setAssignModalOpen(false);
      loadComplaintData();
    } catch (err) {
      addToast(err.message || 'Failed to reassign', 'error');
    } finally {
      setUpdatingAssign(false);
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  if (!complaint) {
    return (
      <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
        <h3>Complaint Not Found</h3>
        <Button variant="secondary" onClick={() => navigate('/complaints')} style={{ marginTop: 'var(--space-4)' }}>
          Back to Feed
        </Button>
      </Card>
    );
  }

  // Determine allowed buttons based on status
  const currentStatus = complaint.status?.toUpperCase();
  const isCreator = user?.id === complaint.created_by;
  const isAssignee = user?.id === complaint.assigned_to;
  const isAdmin = user?.role === 'super_admin' || members.some(m => m.user_id === user?.id && m.role === 'community_admin');

  // Actions allowed based on role and status
  const canAcknowledge = currentStatus === 'OPEN' && (isAssignee || isAdmin);
  const canStartWork = (currentStatus === 'ACKNOWLEDGED' || currentStatus === 'ESCALATED') && (isAssignee || isAdmin);
  const canResolve = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'].includes(currentStatus) && (isAssignee || isAdmin || isCreator);
  const canClose = currentStatus === 'RESOLVED' && (isCreator || isAdmin);

  return (
    <div className="complaint-detail-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <p className="header-breadcrumb">ResolveHub / Complaints / {complaint.title}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{complaint.title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
              Community: <strong>{complaint.community_name || 'Loading...'}</strong> | Raised {formatRelativeTime(complaint.created_at)}
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Main Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card noHover>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <StatusBadge status={complaint.status} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Badge variant={complaint.priority === 'critical' ? 'danger' : complaint.priority === 'high' ? 'warning' : 'primary'}>
                  {complaint.priority?.toUpperCase()} Priority
                </Badge>
                <Badge variant="info">{complaint.category}</Badge>
              </div>
            </div>

            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-6)' }}>
              {complaint.description}
            </p>

            {/* Photo Attachments */}
            {complaint.attachments && complaint.attachments.length > 0 && (
              <div>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Attachments</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                  {complaint.attachments.map((att) => {
                    // Normalize backend upload path for browser display
                    const pathUrl = att.file_path.startsWith('.') ? att.file_path.slice(1) : att.file_path;
                    const fullUrl = `http://localhost:3001${pathUrl}`;
                    
                    return (
                      <a key={att.id} href={fullUrl} target="_blank" rel="noreferrer" className="attachment-preview-card">
                        <img 
                          src={fullUrl} 
                          alt={att.original_name} 
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: 'var(--glass-border)' }} 
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Timeline Audit Trail */}
          <Card noHover header="Activity Log & Timeline">
            <ComplaintTimeline events={events} />
          </Card>
        </div>

        {/* Sidebar Info & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Action Panel */}
          <Card noHover header="Complaint Lifecycle">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {canAcknowledge && (
                <Button id="btn-action-acknowledge" onClick={() => handleStatusUpdate('ACKNOWLEDGED')} style={{ width: '100%' }}>
                  Acknowledge Complaint
                </Button>
              )}
              {canStartWork && (
                <Button id="btn-action-start-work" onClick={() => handleStatusUpdate('IN_PROGRESS')} style={{ width: '100%' }}>
                  Start Investigation
                </Button>
              )}
              {canResolve && (
                <Button id="btn-action-resolve" onClick={() => handleStatusUpdate('RESOLVED')} variant="success" style={{ width: '100%' }}>
                  Mark Resolved
                </Button>
              )}
              {canClose && (
                <Button id="btn-action-close" onClick={() => handleStatusUpdate('CLOSED')} variant="secondary" style={{ width: '100%' }}>
                  Close Complaint
                </Button>
              )}
              
              {!canAcknowledge && !canStartWork && !canResolve && !canClose && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                  No lifecycle actions available for your role/status.
                </p>
              )}
            </div>
          </Card>

          {/* Assignment Panel */}
          <Card noHover header="Assignment Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Assigned Staff:</span>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                  👤 {complaint.assignee_name || 'Unassigned'}
                </p>
                {complaint.assignee_email && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    ✉️ {complaint.assignee_email}
                  </span>
                )}
              </div>
              
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Raised By:</span>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                  👤 {complaint.creator_name}
                </p>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  ✉️ {complaint.creator_email}
                </span>
              </div>

              {isAdmin && (
                <Button 
                  id="btn-trigger-reassign"
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setAssignModalOpen(true)}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  🔄 Reassign Complaint
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Lifecycle Status Note Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Change Status to ${nextStatus}`}
      >
        <div className="form-group">
          <label htmlFor="status-note" className="form-label">Add Note (Optional)</label>
          <textarea
            id="status-note"
            className="form-textarea"
            placeholder="Add relevant comments about this step..."
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
            Cancel
          </Button>
          <Button id="btn-confirm-status" onClick={submitStatusUpdate} loading={updatingStatus}>
            Confirm Status Change
          </Button>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Reassign Complaint"
      >
        <div className="form-group">
          <label htmlFor="assignee-select" className="form-label">Select Staff Member</label>
          <select
            id="assignee-select"
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="form-select"
          >
            <option value="">-- Select --</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name} ({m.role === 'community_admin' ? 'Admin' : 'Staff'})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
            Cancel
          </Button>
          <Button id="btn-confirm-assign" onClick={submitReassign} loading={updatingAssign}>
            Assign
          </Button>
        </div>
      </Modal>
    </div>
  );
}
