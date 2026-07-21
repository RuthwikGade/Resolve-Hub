import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { useNotifications } from '../../contexts/NotificationContext';

export default function JoinRequests() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get(`/members/requests/${communityId}`);
      setRequests(res.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch join requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, addToast]);

  const handleAction = async (id, actionVal) => {
    setActionId(id);
    try {
      await api.put(`/members/requests/${id}`, { action: actionVal });
      addToast(`Join request ${actionVal === 'approve' ? 'approved' : 'rejected'}!`, 'success');
      // Refresh list
      fetchRequests();
    } catch (err) {
      addToast(err.message || 'Failed to process request', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  return (
    <div className="join-requests-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Admin / Join Requests</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Pending Join Requests</h2>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>

      <Card noHover>
        {requests.length === 0 ? (
          <div className="text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No pending join requests found for this community.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--glass-border)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Name</th>
                  <th style={{ padding: 'var(--space-3)' }}>Email</th>
                  <th style={{ padding: 'var(--space-3)' }}>Phone</th>
                  <th style={{ padding: 'var(--space-3)' }}>Requested At</th>
                  <th style={{ padding: 'var(--space-3)', textRight: true }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: 'var(--glass-border)' }}>
                    <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>{req.name}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{req.email}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{req.phone || 'N/A'}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {new Date(req.joined_at).toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        <Button
                          id={`btn-approve-${req.id}`}
                          size="sm"
                          variant="success"
                          loading={actionId === req.id}
                          onClick={() => handleAction(req.id, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          id={`btn-reject-${req.id}`}
                          size="sm"
                          variant="danger"
                          loading={actionId === req.id}
                          onClick={() => handleAction(req.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
