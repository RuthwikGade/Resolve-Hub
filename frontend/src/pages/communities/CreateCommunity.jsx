import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { updateUser } = useAuth();

  const [name, setName] = useState('');
  const [type, setType] = useState('Apartment'); // default type matching community_type enum
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Community name is required.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/communities', {
        name,
        type,
        description,
        address,
      });

      addToast('Community created successfully!', 'success');
      
      // Update local storage / user role context since they are now community_admin
      updateUser({ role: 'community_admin' });

      // Navigate to the newly created community
      navigate(`/communities/${res.data.id}`);
    } catch (err) {
      addToast(err.message || 'Failed to create community', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-community-page" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <p className="header-breadcrumb">ResolveHub / Communities / New</p>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Create a New Community</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Setup a portal for your apartment, gated community, campus, or village.
        </p>
      </div>

      <Card noHover>
        <form onSubmit={handleSubmit} id="create-community-form">
          <div className="form-group">
            <label htmlFor="community-name" className="form-label">Community Name *</label>
            <input
              id="community-name"
              type="text"
              placeholder="e.g. Green Valley Apartments, MIT Campus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="community-type" className="form-label">Community Type *</label>
            <select
              id="community-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="form-select"
              required
            >
              <option value="Apartment">Apartment</option>
              <option value="Village">Village</option>
              <option value="Campus">Campus</option>
              <option value="Gated Community">Gated Community</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="community-desc" className="form-label">Description</label>
            <textarea
              id="community-desc"
              placeholder="Brief description of the community..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="community-address" className="form-label">Address</label>
            <input
              id="community-address"
              type="text"
              placeholder="Complete physical address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <Button 
              id="btn-cancel-community"
              variant="secondary" 
              onClick={() => navigate('/communities')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              id="btn-submit-community"
              type="submit" 
              loading={loading}
            >
              Create Community
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
