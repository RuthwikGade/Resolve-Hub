import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import ComplaintFilters from '../../components/complaints/ComplaintFilters';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSocket } from '../../contexts/SocketContext';

export default function ComplaintList() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { onEvent, offEvent } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [myCommunities, setMyCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState(searchParams.get('communityId') || '');
  const [complaints, setComplaints] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    status: 'OPEN',
    category: '',
    priority: '',
    search: '',
  });

  // Load user's communities first
  useEffect(() => {
    async function fetchMyCommunities() {
      try {
        const res = await api.get('/communities/mine');
        const list = res.data || [];
        setMyCommunities(list);
        if (list.length > 0 && !selectedCommunityId) {
          const initialId = localStorage.getItem('activeCommunityId') || list[0].id;
          const exists = list.some(c => c.id === initialId);
          const finalId = exists ? initialId : list[0].id;
          setSelectedCommunityId(finalId);
          setSearchParams({ communityId: finalId });
          localStorage.setItem('activeCommunityId', finalId);
        }
      } catch (err) {
        addToast(err.message || 'Failed to fetch communities', 'error');
      } finally {
        setLoadingCommunities(false);
      }
    }
    fetchMyCommunities();
  }, [addToast, selectedCommunityId, setSearchParams]);

  // Load complaints for selected community
  useEffect(() => {
    if (!selectedCommunityId) return;

    let active = true;
    async function fetchComplaints() {
      setLoadingComplaints(true);
      try {
        const res = await api.get(`/complaints/community/${selectedCommunityId}`);
        if (active) {
          setComplaints(res.data?.complaints || []);
        }
      } catch (err) {
        addToast(err.message || 'Failed to fetch complaints', 'error');
      } finally {
        if (active) setLoadingComplaints(false);
      }
    }

    fetchComplaints();

    return () => { active = false; };
  }, [selectedCommunityId, addToast]);

  // Listen to Socket.IO events for live updates
  useEffect(() => {
    if (!selectedCommunityId) return;

    const handleNewComplaint = (complaint) => {
      if (complaint.community_id === selectedCommunityId) {
        setComplaints((prev) => [complaint, ...prev]);
        addToast(`New complaint: "${complaint.title}"`, 'info');
      }
    };

    const handleStatusChanged = ({ complaintId, newStatus }) => {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
    };

    onEvent('complaint_created', handleNewComplaint);
    onEvent('status_changed', handleStatusChanged);

    return () => {
      offEvent('complaint_created', handleNewComplaint);
      offEvent('status_changed', handleStatusChanged);
    };
  }, [selectedCommunityId, onEvent, offEvent, addToast]);

  const handleCommunityChange = (e) => {
    const cid = e.target.value;
    setSelectedCommunityId(cid);
    setSearchParams({ communityId: cid });
    localStorage.setItem('activeCommunityId', cid);
  };

  // Filter logic (in-memory filtering on top of fetched list)
  const filteredComplaints = complaints.filter((c) => {
    if (filters.status && c.status?.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }
    if (filters.category && c.category !== filters.category) {
      return false;
    }
    if (filters.priority && c.priority?.toLowerCase() !== filters.priority) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  if (loadingCommunities) {
    return <Loader variant="page" />;
  }

  if (myCommunities.length === 0) {
    return (
      <div className="complaints-page" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
        <Card noHover>
          <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>No Communities Joined</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            To view or create complaints, you must first create a community or join an existing one.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
            <Button id="btn-goto-communities" onClick={() => navigate('/communities')}>
              Explore Communities
            </Button>
            <Button id="btn-create-community-shortcut" variant="secondary" onClick={() => navigate('/communities/create')}>
              Create Community
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="complaints-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Complaints</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Complaints Feed</h2>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {/* Community Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Community:</span>
            <select
              id="community-switcher"
              value={selectedCommunityId}
              onChange={handleCommunityChange}
              className="form-select"
              style={{ width: '220px', padding: 'var(--space-2) var(--space-4)' }}
            >
              {myCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button 
            id="btn-raise-complaint"
            onClick={() => navigate(`/complaints/create?communityId=${selectedCommunityId}`)}
            icon="➕"
          >
            New Complaint
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Filters */}
        <ComplaintFilters 
          filters={filters} 
          onChange={setFilters} 
          onClear={() => setFilters({ status: '', category: '', priority: '', search: '' })} 
        />

        {/* Complaints List Grid */}
        {loadingComplaints ? (
          <Loader variant="grid" count={3} />
        ) : filteredComplaints.length === 0 ? (
          <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No complaints found matching current filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {filteredComplaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
