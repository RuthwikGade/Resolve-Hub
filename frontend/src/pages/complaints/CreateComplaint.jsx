import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import ComplaintForm from '../../components/complaints/ComplaintForm';
import { useNotifications } from '../../contexts/NotificationContext';
import { useOffline } from '../../hooks/useOffline';

export default function CreateComplaint() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { isOnline, saveDraft } = useOffline();
  const [searchParams] = useSearchParams();

  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState(searchParams.get('communityId') || '');
  const [categories, setCategories] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Fetch user's communities
  useEffect(() => {
    async function fetchCommunities() {
      try {
        const res = await api.get('/communities/mine');
        setCommunities(res.data || []);
        if (res.data?.length > 0 && !selectedCommunityId) {
          setSelectedCommunityId(res.data[0].id);
        }
      } catch (err) {
        addToast(err.message || 'Failed to load communities', 'error');
      } finally {
        setLoadingCommunities(false);
      }
    }
    fetchCommunities();
  }, [addToast, selectedCommunityId]);

  // Load custom categories for the community
  useEffect(() => {
    if (!selectedCommunityId) return;
    async function fetchCategories() {
      try {
        const res = await api.get(`/categories/${selectedCommunityId}`);
        // backend returns array of category strings
        const list = res.data || [];
        setCategories(list);
      } catch (err) {
        console.warn('Failed to fetch categories:', err.message);
      }
    }
    fetchCategories();
  }, [selectedCommunityId]);

  const handleSubmit = async (formData, formJson) => {
    if (!selectedCommunityId) {
      addToast('Please select a community.', 'warning');
      return;
    }

    // Append community_id to FormData
    formData.append('community_id', selectedCommunityId);

    if (!isOnline) {
      // Offline draft save
      try {
        await saveDraft({
          ...formJson,
          community_id: selectedCommunityId,
        });
        addToast('No internet connection. Complaint saved as draft locally!', 'warning');
        navigate(`/complaints?communityId=${selectedCommunityId}`);
      } catch (err) {
        addToast('Failed to save draft locally', 'error');
      }
      return;
    }

    setLoadingSubmit(true);
    try {
      await api.upload('/complaints', formData);
      addToast('Complaint submitted successfully!', 'success');
      navigate(`/complaints?communityId=${selectedCommunityId}`);
    } catch (err) {
      addToast(err.message || 'Failed to submit complaint', 'error');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleSaveDraft = async (formJson) => {
    if (!selectedCommunityId) {
      addToast('Please select a community to save a draft.', 'warning');
      return;
    }
    try {
      await saveDraft({
        ...formJson,
        community_id: selectedCommunityId,
      });
      addToast('Complaint draft saved successfully.', 'success');
      navigate(`/complaints?communityId=${selectedCommunityId}`);
    } catch (err) {
      addToast('Failed to save draft.', 'error');
    }
  };

  if (loadingCommunities) {
    return <Loader variant="page" />;
  }

  if (communities.length === 0) {
    return (
      <div className="create-complaint-page" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
        <Card noHover>
          <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>No Communities</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            You must be a member of a community to raise complaints.
          </p>
          <Button id="btn-goto-communities-create" onClick={() => navigate('/communities')}>
            Join a Community
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="create-complaint-page" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <p className="header-breadcrumb">ResolveHub / Complaints / Raise</p>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Raise a Complaint</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Provide clear details and optional photos to help staff identify and resolve the issue quickly.
        </p>
      </div>

      <Card noHover>
        {/* Community Selector */}
        <div className="form-group" style={{ borderBottom: 'var(--glass-border)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <label htmlFor="create-complaint-community" className="form-label">Select Community</label>
          <select
            id="create-complaint-community"
            value={selectedCommunityId}
            onChange={(e) => setSelectedCommunityId(e.target.value)}
            className="form-select"
            disabled={loadingSubmit}
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.role})
              </option>
            ))}
          </select>
        </div>

        <ComplaintForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          loading={loadingSubmit}
          categories={categories.length > 0 ? categories : undefined}
        />
      </Card>
    </div>
  );
}
