import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { useNotifications } from '../../contexts/NotificationContext';

export default function ManageCategories() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state for new category
  const [newCatName, setNewCatName] = useState('');
  const [roleName, setRoleName] = useState('Plumber'); // default example role
  const [assignedUserId, setAssignedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const catRes = await api.get(`/categories/${communityId}`);
      // backend returns array of strings: data: ["Electrical", "Plumbing"]
      setCategories(catRes.data || []);

      const memRes = await api.get(`/members/${communityId}`);
      const assignable = (memRes.data || []).filter(
        m => m.role === 'responsible_person' || m.role === 'community_admin'
      );
      setMembers(assignable);
    } catch (err) {
      addToast(err.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, addToast]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      addToast('Category name is required.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/categories', {
        community_id: communityId,
        category: newCatName.trim(),
        role_name: roleName,
        assigned_user_id: assignedUserId || null,
      });

      addToast(`Category "${newCatName}" created successfully!`, 'success');
      setNewCatName('');
      setAssignedUserId('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  return (
    <div className="manage-categories-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Admin / Categories</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Manage Categories</h2>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Category List */}
        <Card noHover header="Current Categories">
          {categories.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No categories configured yet.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {categories.map((cat) => (
                <li 
                  key={cat} 
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: 'var(--space-3) var(--space-4)', 
                    background: 'var(--bg-input)', 
                    borderRadius: 'var(--radius-md)',
                    border: 'var(--glass-border)'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>🏷️ {cat}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Add New Category */}
        <Card noHover header="Add Custom Category">
          <form onSubmit={handleCreateCategory} id="add-category-form">
            <div className="form-group">
              <label htmlFor="new-cat-name" className="form-label">Category Name</label>
              <input
                id="new-cat-name"
                type="text"
                className="form-input"
                placeholder="e.g. Elevator, Internet, Cleaning"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role-name" className="form-label">Mapped Role Name</label>
              <input
                id="role-name"
                type="text"
                className="form-input"
                placeholder="e.g. Technician, Janitor, Plumber"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
              <span className="form-hint">The title of the role responsible for this category.</span>
            </div>

            <div className="form-group">
              <label htmlFor="assignee-select" className="form-label">Auto-Route Assignee (Optional)</label>
              <select
                id="assignee-select"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="form-select"
              >
                <option value="">-- No Auto Assignee (Manual Routing) --</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name} ({m.role === 'community_admin' ? 'Admin' : 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <Button 
              id="btn-submit-category"
              type="submit" 
              loading={submitting} 
              style={{ width: '100%', marginTop: 'var(--space-4)' }}
            >
              Add Category
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
