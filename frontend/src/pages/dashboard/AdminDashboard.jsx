import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../components/analytics/StatsCard';
import CategoryChart from '../../components/analytics/CategoryChart';
import TrendChart from '../../components/analytics/TrendChart';
import ResolutionChart from '../../components/analytics/ResolutionChart';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import Loader from '../../components/ui/Loader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';

const formatResolutionTime = (minutes) => {
  const min = parseFloat(minutes || 0);
  if (min === 0) return 'N/A';
  if (min < 60) return `${Math.round(min)}m`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [myCommunities, setMyCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [stats, setStats] = useState({
    total: 0, open: 0, resolved: 0, escalated: 0, resolutionRate: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load user's communities first
  useEffect(() => {
    async function loadCommunities() {
      try {
        const res = await api.get('/communities/mine');
        const list = res.data || [];
        // Keep only where user is admin or super admin
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

  // Load analytics and recent complaints for selected community
  useEffect(() => {
    if (!selectedCommunityId) return;

    let active = true;
    async function loadAnalytics() {
      setLoadingAnalytics(true);
      try {
        const [statsRes, categoryRes, trendRes, complaintsRes] = await Promise.allSettled([
          api.get(`/analytics/${selectedCommunityId}`),
          api.get(`/analytics/${selectedCommunityId}/categories`),
          api.get(`/analytics/${selectedCommunityId}/trend`),
          api.get(`/complaints/community/${selectedCommunityId}`),
        ]);

        if (!active) return;

        // 1. Process Stats
        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value.data || {};
          const total = parseInt(s.total_complaints || 0, 10);
          const open = parseInt(s.open_complaints || 0, 10) + parseInt(s.acknowledged_complaints || 0, 10);
          const inProgress = parseInt(s.in_progress_complaints || 0, 10);
          const resolved = parseInt(s.resolved_complaints || 0, 10);
          const closed = parseInt(s.closed_complaints || 0, 10);
          const escalated = parseInt(s.escalated_complaints || 0, 10);
          
          setStats({
            total,
            open: open + inProgress,
            resolved: resolved + closed,
            escalated,
            resolutionRate: parseFloat(s.resolution_rate || 0),
          });

          // Build status distribution data for Pie Chart
          setStatusData([
            { status: 'open', count: open },
            { status: 'in_progress', count: inProgress },
            { status: 'resolved', count: resolved + closed },
            { status: 'escalated', count: escalated },
          ]);
        }

        // 2. Process Categories
        if (categoryRes.status === 'fulfilled') {
          const list = categoryRes.value.data || [];
          setCategoryData(
            list.map((c) => ({
              name: c.category,
              count: parseInt(c.total || 0, 10),
              avgResolutionMinutes: parseFloat(c.avg_resolution_minutes || 0),
            }))
          );
        }

        // 3. Process Trend
        if (trendRes.status === 'fulfilled') {
          const trend = trendRes.value.data || [];
          setTrendData(
            trend.map((t) => ({
              date: new Date(t.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              }),
              count: parseInt(t.count || 0, 10),
            }))
          );
        }

        // 4. Process Recent Complaints
        if (complaintsRes.status === 'fulfilled') {
          const raw = complaintsRes.value.data?.complaints || [];
          setRecentComplaints(raw.slice(0, 5));
        }

      } catch (err) {
        addToast(err.message || 'Failed to load analytics', 'error');
      } finally {
        if (active) {
          setLoading(false);
          setLoadingAnalytics(false);
        }
      }
    }

    loadAnalytics();

    return () => { active = false; };
  }, [selectedCommunityId, addToast]);

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
            No Communities Managed
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            You need to be an admin of a community to view the admin analytics dashboard.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
            <Button id="btn-explore-comm-admin" onClick={() => navigate('/communities')}>
              Explore Communities
            </Button>
            <Button id="btn-create-comm-admin" variant="secondary" onClick={() => navigate('/communities/create')}>
              Create Community
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-transition">
      {/* Welcome & Community switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Overview of community complaints and resolution timelines.
          </p>
        </div>

        {/* Switcher dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Community:</span>
          <select
            id="admin-dashboard-community-select"
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

      {/* Stats Cards */}
      <div className="stats-grid stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <StatsCard id="admin-stat-total" label="Total Raised" value={stats.total} icon="📊" color="rgba(99,102,241,0.15)" />
        <StatsCard id="admin-stat-open" label="Open & In Progress" value={stats.open} icon="🟡" color="rgba(245,158,11,0.15)" />
        <StatsCard id="admin-stat-resolved" label="Resolved & Closed" value={stats.resolved} icon="✅" color="rgba(16,185,129,0.15)" />
        <StatsCard id="admin-stat-escalated" label="Escalated" value={stats.escalated} icon="🔴" color="rgba(244,63,94,0.15)" />
        <StatsCard
          id="admin-stat-resolution-rate"
          label="Resolution Rate"
          value={`${stats.resolutionRate}%`}
          icon="📈"
          color="rgba(56,189,248,0.15)"
        />
      </div>

      {/* Charts Grid */}
      {loadingAnalytics ? (
        <Loader variant="grid" count={2} />
      ) : (
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          <CategoryChart data={categoryData} />
          <TrendChart data={trendData} />
          <ResolutionChart data={statusData} />
        </div>
      )}

      {/* Two Column Grid: Recent Activity & Resolution Efficiency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Recent Activity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
              Recent Grievances
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/complaints?communityId=${selectedCommunityId}`)}>
              View All
            </Button>
          </div>

          {recentComplaints.length === 0 ? (
            <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No complaints raised in this community yet.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              {recentComplaints.map(c => (
                <ComplaintCard key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </div>

        {/* Category Resolution Time Panel */}
        <Card noHover header="Resolution Efficiency by Category">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {categoryData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>
                No category metrics available.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left', fontSize: 'var(--font-size-xs)' }}>
                      <th style={{ paddingBottom: 'var(--space-2)' }}>CATEGORY</th>
                      <th style={{ paddingBottom: 'var(--space-2)', textAlign: 'right' }}>AVG TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: 'var(--space-3) 0', fontWeight: 500 }}>
                          {cat.name}
                        </td>
                        <td style={{ padding: 'var(--space-3) 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ⏱️ {formatResolutionTime(cat.avgResolutionMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
