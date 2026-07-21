import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageMembers() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/members/${communityId}`);
      setMembers(res.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, addToast]);

  const handleRoleChange = async (id, newRole) => {
    setActionId(id);
    try {
      await api.put(`/members/${id}/role`, { role: newRole });
      addToast('Member role updated successfully!', 'success');
      fetchMembers();
    } catch (err) {
      addToast(err.message || 'Failed to update member role', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveMember = async (id) => {
    if (!window.confirm('Are you sure you want to remove this member from the community?')) {
      return;
    }
    setActionId(id);
    try {
      await api.del(`/members/${id}`);
      addToast('Member removed from community.', 'success');
      fetchMembers();
    } catch (err) {
      addToast(err.message || 'Failed to remove member', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  return (
    <div className="manage-members-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Admin / Members</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Manage Members</h2>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>

      <Card noHover>
        {members.length === 0 ? (
          <div className="text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No members found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--glass-border)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Name</th>
                  <th style={{ padding: 'var(--space-3)' }}>Email</th>
                  <th style={{ padding: 'var(--space-3)' }}>Role</th>
                  <th style={{ padding: 'var(--space-3)' }}>Joined At</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id;

                  return (
                    <tr key={m.id} style={{ borderBottom: 'var(--glass-border)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>
                        {m.name} {isSelf && <span style={{ color: 'var(--color-primary-light)', fontSize: '11px' }}>(You)</span>}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{m.email}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <select
                          id={`role-select-${m.id}`}
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="form-select"
                          style={{ width: '180px', padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--font-size-xs)' }}
                          disabled={isSelf || actionId === m.id}
                        >
                          <option value="member">Resident (Member)</option>
                          <option value="responsible_person">Staff (Responsible Person)</option>
                          <option value="community_admin">Admin (Community Admin)</option>
                        </select>
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <Button
                          id={`btn-remove-${m.id}`}
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={isSelf || actionId === m.id}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
