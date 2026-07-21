import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/analytics/StatsCard';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Card from '../../components/ui/Card';
import api from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';

export default function MemberDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [myCommunities, setMyCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Load user's communities first
  useEffect(() => {
    async function loadCommunities() {
      try {
        const res = await api.get('/communities/mine');
        const list = res.data || [];
        setMyCommunities(list);
        if (list.length > 0) {
          const initialId = localStorage.getItem('activeCommunityId') || list[0].id;
          const exists = list.some(c => c.id === initialId);
          const finalId = exists ? initialId : list[0].id;
          setSelectedCommunityId(finalId);
          localStorage.setItem('activeCommunityId', finalId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        addToast(err.message || 'Failed to fetch communities', 'error');
        setLoading(false);
      }
    }
    loadCommunities();
  }, [addToast]);

  // Load complaints for selected community and filter in-memory for user's complaints
  useEffect(() => {
    if (!selectedCommunityId) return;
    
    let active = true;
    async function loadComplaints() {
      setLoadingComplaints(true);
      try {
        const res = await api.get(`/complaints/community/${selectedCommunityId}`);
        if (!active) return;
        
        // Filter in-memory for user's own complaints
        const allComplaints = res.data?.complaints || [];
        const myOwn = allComplaints.filter((c) => c.created_by === user?.id);
        
        setComplaints(myOwn);

        // Calculate stats
        const total = myOwn.length;
        const open = myOwn.filter((c) => 
          ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'].includes(c.status)
        ).length;
        const resolved = myOwn.filter((c) => 
          c.status === 'RESOLVED' || c.status === 'CLOSED'
        ).length;
        
        setStats({ total, open, resolved });
      } catch (err) {
        addToast(err.message || 'Failed to fetch complaints', 'error');
      } finally {
        if (active) {
          setLoading(false);
          setLoadingComplaints(false);
        }
      }
    }

    loadComplaints();
    return () => { active = false; };
  }, [selectedCommunityId, user?.id, addToast]);

  const handleCommunityChange = (e) => {
    const cid = e.target.value;
    setSelectedCommunityId(cid);
    localStorage.setItem('activeCommunityId', cid);
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  if (myCommunities.length === 0) {
    return (
      <div className="page-transition" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
        <Card noHover>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Welcome to ResolveHub, {user?.name}! 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            To view dashboard stats or raise complaints, you must join a community first.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
            <Button id="btn-explore-comm" onClick={() => navigate('/communities')}>
              Explore Communities
            </Button>
            <Button id="btn-create-comm" variant="secondary" onClick={() => navigate('/communities/create')}>
              Create Community
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-transition">
      {/* Welcome & Community Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Here's what's happening with your community grievances.
          </p>
        </div>

        {/* Community Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Community:</span>
          <select
            id="dashboard-community-select"
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
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <StatsCard
          id="stat-total"
          label="My Complaints"
          value={stats.total}
          icon="📋"
          color="rgba(99,102,241,0.15)"
        />
        <StatsCard
          id="stat-open"
          label="Open & In Progress"
          value={stats.open}
          icon="🟡"
          color="rgba(245,158,11,0.15)"
        />
        <StatsCard
          id="stat-resolved"
          label="Resolved & Closed"
          value={stats.resolved}
          icon="✅"
          color="rgba(16,185,129,0.15)"
        />
      </div>

      {/* Quick Action & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
          My Recent Complaints
        </h2>
        <Button
          id="quick-create-complaint"
          onClick={() => navigate(`/complaints/create?communityId=${selectedCommunityId}`)}
          icon="➕"
          size="sm"
        >
          New Complaint
        </Button>
      </div>

      {/* Recent complaints */}
      <div>
        {loadingComplaints ? (
          <Loader variant="grid" count={2} />
        ) : complaints.length === 0 ? (
          <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              No complaints raised by you in this community yet.
            </p>
            <Button
              id="empty-create-complaint"
              onClick={() => navigate(`/complaints/create?communityId=${selectedCommunityId}`)}
            >
              Raise First Complaint
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {complaints.slice(0, 6).map(c => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
