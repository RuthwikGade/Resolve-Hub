import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { useNotifications } from '../../contexts/NotificationContext';

export default function ManageRouting() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [routingRules, setRoutingRules] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingCategory, setEditingCategory] = useState('');
  const [roleName, setRoleName] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRoutingData = async () => {
    try {
      const routingRes = await api.get(`/categories/routing/${communityId}`);
      setRoutingRules(routingRes.data || []);

      const memRes = await api.get(`/members/${communityId}`);
      // Filter assignable staff/admins
      const assignable = (memRes.data || []).filter(
        m => m.role === 'responsible_person' || m.role === 'community_admin'
      );
      setMembers(assignable);
    } catch (err) {
      addToast(err.message || 'Failed to load routing rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, addToast]);

  const startEdit = (rule) => {
    setEditingCategory(rule.category);
    setRoleName(rule.role_name || '');
    setAssignedUserId(rule.assigned_user_id || '');
  };

  const handleUpdateRouting = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put('/categories/routing', {
        community_id: communityId,
        category: editingCategory,
        role_name: roleName,
        assigned_user_id: assignedUserId || null,
      });

      addToast(`Routing for "${editingCategory}" updated successfully!`, 'success');
      setEditingCategory('');
      loadRoutingData();
    } catch (err) {
      addToast(err.message || 'Failed to update routing rule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  return (
    <div className="manage-routing-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Admin / Auto-Routing</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Complaint Auto-Routing</h2>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Routing Mappings Table */}
        <Card noHover header="Category Auto-Routing Configurations">
          {routingRules.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No auto-routing rules configured.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: 'var(--glass-border)' }}>
                    <th style={{ padding: 'var(--space-3)' }}>Category</th>
                    <th style={{ padding: 'var(--space-3)' }}>Responsible Role</th>
                    <th style={{ padding: 'var(--space-3)' }}>Auto-Assigned Staff</th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routingRules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: 'var(--glass-border)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>🏷️ {rule.category}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                        {rule.role_name}
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        👤 {rule.assigned_user_name || 'No assignee (fallback routing)'}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <Button
                          id={`btn-edit-routing-${rule.id}`}
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(rule)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Edit Form */}
        <Card noHover header={editingCategory ? `Edit Auto-Routing: ${editingCategory}` : 'Select a Category to Edit'}>
          {!editingCategory ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>
              Click "Edit" on any category in the table to modify its routing behavior.
            </p>
          ) : (
            <form onSubmit={handleUpdateRouting} id="routing-form">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCategory}
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="role-name-input" className="form-label">Mapped Role Name *</label>
                <input
                  id="role-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electrician, Security Officer"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="assignee-select" className="form-label">Auto-Route Assignee</label>
                <select
                  id="assignee-select"
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Choose Assigned User --</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.role === 'community_admin' ? 'Admin' : 'Staff'})
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  Complaints in this category will automatically be assigned to this user.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <Button 
                  id="btn-cancel-edit"
                  type="button" 
                  variant="secondary" 
                  onClick={() => setEditingCategory('')}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button 
                  id="btn-save-routing"
                  type="submit" 
                  loading={submitting} 
                  style={{ flex: 1 }}
                >
                  Save Route
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
