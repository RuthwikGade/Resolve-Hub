import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDuration } from '../../utils/helpers';

export default function ManageSLA() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxMinutes, setMaxMinutes] = useState(120);
  const [submitting, setSubmitting] = useState(false);

  const loadSlaData = async () => {
    try {
      const slaRes = await api.get(`/sla/${communityId}`);
      setRules(slaRes.data || []);

      const catRes = await api.get(`/categories/${communityId}`);
      setCategories(catRes.data || []);
      if (catRes.data?.length > 0) {
        setSelectedCategory(catRes.data[0]);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load SLA rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlaData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, addToast]);

  const handleUpsertRule = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      addToast('Please select a category.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.put('/sla', {
        community_id: communityId,
        category: selectedCategory,
        max_resolution_minutes: parseInt(maxMinutes, 10),
      });

      addToast(`SLA for category "${selectedCategory}" updated successfully!`, 'success');
      loadSlaData();
    } catch (err) {
      addToast(err.message || 'Failed to save SLA rule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to remove this SLA rule? Default limits will be used.')) {
      return;
    }
    try {
      await api.del(`/sla/${id}`);
      addToast('SLA rule removed.', 'success');
      loadSlaData();
    } catch (err) {
      addToast(err.message || 'Failed to delete SLA rule', 'error');
    }
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  return (
    <div className="manage-sla-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Admin / SLA Rules</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Service Level Agreements (SLA)</h2>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Rules Table */}
        <Card noHover header="Category Timelines & SLA Rules">
          {rules.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No custom SLA rules configured yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: 'var(--glass-border)' }}>
                    <th style={{ padding: 'var(--space-3)' }}>Category</th>
                    <th style={{ padding: 'var(--space-3)' }}>Max Resolution Time</th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: 'var(--glass-border)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>🏷️ {rule.category}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                        <strong>{formatDuration(rule.max_resolution_minutes)}</strong> ({rule.max_resolution_minutes} minutes)
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <Button
                          id={`btn-delete-sla-${rule.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Configure SLA Form */}
        <Card noHover header="Configure Category SLA">
          <form onSubmit={handleUpsertRule} id="sla-form">
            <div className="form-group">
              <label htmlFor="sla-category" className="form-label">Category</label>
              <select
                id="sla-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sla-minutes" className="form-label">Max Resolution Time (Minutes)</label>
              <input
                id="sla-minutes"
                type="number"
                min="5"
                max="43200" // 30 days max
                className="form-input"
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(e.target.value)}
                required
              />
              <span className="form-hint">
                Time limit before the complaint is escalated. e.g. 120 = 2 hours, 1440 = 24 hours.
              </span>
            </div>

            <div 
              style={{
                marginTop: 'var(--space-4)', 
                padding: 'var(--space-3)', 
                background: 'rgba(99,102,241,0.06)', 
                borderRadius: 'var(--radius-md)', 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-primary-light)'
              }}
            >
              ℹ️ Current Conversion: <strong>{formatDuration(maxMinutes)}</strong>
            </div>

            <Button 
              id="btn-save-sla"
              type="submit" 
              loading={submitting} 
              style={{ width: '100%', marginTop: 'var(--space-5)' }}
            >
              Save SLA Rule
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
