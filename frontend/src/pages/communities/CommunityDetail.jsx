import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import ComplaintFilters from '../../components/complaints/ComplaintFilters';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { joinCommunity, leaveCommunity, onEvent, offEvent } = useSocket();
  const { user } = useAuth();

  const [community, setCommunity] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  // Filters state
  const [filters, setFilters] = useState({
    status: [],
    category: '',
    priority: '',
    search: '',
  });

  // Fetch community, complaints, members
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        // Load details
        const commRes = await api.get(`/communities/${id}`);
        if (!active) return;
        setCommunity(commRes.data);

        // Load members
        const membRes = await api.get(`/members/${id}`);
        if (!active) return;
        setMembers(membRes.data || []);

        // Load complaints
        const complRes = await api.get(`/complaints/community/${id}`);
        if (!active) return;
        setComplaints(complRes.data?.complaints || []);
      } catch (err) {
        addToast(err.message || 'Failed to load community details', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    // Join WebSocket room
    joinCommunity(id);

    return () => {
      active = false;
      leaveCommunity(id);
    };
  }, [id, joinCommunity, leaveCommunity, addToast]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const handleNewComplaint = (complaint) => {
      if (complaint.community_id === id) {
        setComplaints((prev) => [complaint, ...prev]);
        addToast(`New complaint raised: "${complaint.title}"`, 'info');
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
  }, [id, onEvent, offEvent, addToast]);

  if (loading) {
    return <Loader variant="page" />;
  }

  if (!community) {
    return (
      <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
        <h3>Community Not Found</h3>
        <Button variant="secondary" onClick={() => navigate('/communities')} style={{ marginTop: 'var(--space-4)' }}>
          Back to Communities
        </Button>
      </Card>
    );
  }

  // Check if current user is community admin or Platform Admin
  const isUserAdmin = community.role === 'community_admin' || user?.role === 'super_admin';

  // Apply filters in-memory
  const filteredComplaints = complaints.filter((c) => {
    if (filters.status.length > 0 && !filters.status.includes(c.status?.toLowerCase())) {
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

  return (
    <div className="community-detail-page">
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <p className="header-breadcrumb">ResolveHub / Communities / {community.name}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{community.name}</h2>
              <Badge variant="primary">{community.type}</Badge>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              {community.description || 'No description available.'}
            </p>
            {community.address && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                📍 {community.address}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button 
              id="btn-new-complaint"
              onClick={() => navigate(`/complaints/create?communityId=${id}`)}
              icon="📋"
            >
              Raise Complaint
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Shortcuts Panel */}
      {isUserAdmin && (
        <Card noHover style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-primary)' }}>
          <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--color-primary-light)' }}>
            🛠️ Admin Control Dashboard
          </h4>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/members/${id}`)} id="btn-admin-members">
              👥 Members
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/categories/${id}`)} id="btn-admin-categories">
              🏷️ Categories & Routing
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/sla/${id}`)} id="btn-admin-sla">
              ⏱️ SLA Settings
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/routing/${id}`)} id="btn-admin-routing">
              🔀 Auto-Routing
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/join-requests/${id}`)} id="btn-admin-join-requests">
              📩 Join Requests
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate(`/communities/${id}/ai-insights`)} id="btn-admin-ai-insights">
              🧠 AI Insights
            </Button>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="tab-container" style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: 'var(--glass-border)', marginBottom: 'var(--space-6)' }}>
        <button
          className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-3) 0',
            color: activeTab === 'feed' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'feed' ? '2px solid var(--color-primary)' : 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          📋 Complaints Feed ({filteredComplaints.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-3) 0',
            color: activeTab === 'members' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'members' ? '2px solid var(--color-primary)' : 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          👥 Members ({members.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'feed' ? (
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexDirection: 'column' }}>
          {/* Filters */}
          <ComplaintFilters 
            filters={filters} 
            onChange={setFilters} 
            onClear={() => setFilters({ status: [], category: '', priority: '', search: '' })} 
          />

          {/* Feed Grid */}
          {filteredComplaints.length === 0 ? (
            <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No complaints found matching current filters.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
              {filteredComplaints.map((c) => (
                <ComplaintCard key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {members.map((m) => (
            <Card key={m.id} noHover style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
              <div className="sidebar-avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
                {getInitials(m.name)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{m.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{m.email}</div>
                <div style={{ marginTop: 'var(--space-1)' }}>
                  <Badge variant={m.role === 'community_admin' ? 'danger' : m.role === 'responsible_person' ? 'warning' : 'info'}>
                    {m.role === 'community_admin' ? 'Admin' : m.role === 'responsible_person' ? 'Staff' : 'Resident'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
