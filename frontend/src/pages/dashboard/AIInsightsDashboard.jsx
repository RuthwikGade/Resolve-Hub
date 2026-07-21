import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';

export default function AIInsightsDashboard() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Load user's managed communities
  useEffect(() => {
    async function loadCommunities() {
      try {
        const res = await api.get('/communities/mine');
        const list = res.data || [];
        setCommunities(list);
        if (list.length > 0) {
          setSelectedCommunityId(list[0].id);
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

  // Load AI Insights for selected community
  useEffect(() => {
    if (!selectedCommunityId) return;

    let active = true;
    async function loadData() {
      setLoadingInsights(true);
      try {
        const res = await api.get(`/analytics/${selectedCommunityId}/ai-insights`);
        if (!active) return;
        setInsights(res.data);
      } catch (err) {
        addToast(err.message || 'Failed to fetch AI insights', 'error');
      } finally {
        if (active) {
          setLoading(false);
          setLoadingInsights(false);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [selectedCommunityId, addToast]);

  const handleCommunityChange = (e) => {
    setSelectedCommunityId(e.target.value);
  };

  if (loading) {
    return <Loader variant="page" />;
  }

  if (communities.length === 0) {
    return (
      <Card noHover className="text-center" style={{ padding: 'var(--space-8)', maxWidth: '600px', margin: 'var(--space-8) auto' }}>
        <h3>No Communities Managed</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0 var(--space-6)' }}>
          You must be an admin of a community to view the AI Insights dashboard.
        </p>
        <Button onClick={() => navigate('/communities')}>Explore Communities</Button>
      </Card>
    );
  }

  const dupChartData = (insights?.duplicateCategories || []).map(item => ({
    name: item.category,
    Count: parseInt(item.count, 10)
  }));

  const efficiencyChartData = (insights?.resolutionEfficiency || []).map(item => ({
    name: item.category,
    Hours: parseFloat((parseFloat(item.avg_resolution_minutes) / 60).toFixed(1))
  }));

  return (
    <div className="ai-insights-page page-transition">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            🧠 AI Insights & recommendations
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Advanced analytics, issue hotspots, and automatically generated management advice.
          </p>
        </div>

        {/* Community Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Community:</span>
          <select
            id="ai-insights-community-select"
            value={selectedCommunityId}
            onChange={handleCommunityChange}
            className="form-select"
            style={{ width: '220px', padding: 'var(--space-2) var(--space-4)' }}
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingInsights ? (
        <Loader variant="grid" count={2} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* AI Recommendations Panel */}
          <Card noHover style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              🤖 AI Advisor Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {insights?.recommendations && insights.recommendations.length > 0 ? (
                insights.recommendations.map((rec, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                  }} dangerouslySetInnerHTML={{ __html: rec }} />
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Gathering insights. Check back later.</p>
              )}
            </div>
          </Card>

          {/* Grid for Duplicate and Efficiency Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Duplicates Chart */}
            <Card noHover header="Duplicate Complaints By Category">
              {dupChartData.length === 0 ? (
                <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No duplicate complaints detected.
                </div>
              ) : (
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dupChartData}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      />
                      <Bar dataKey="Count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Resolution Efficiency Chart */}
            <Card noHover header="Avg Resolution Time By Category (Hours)">
              {efficiencyChartData.length === 0 ? (
                <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No complaints resolved yet.
                </div>
              ) : (
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyChartData}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      />
                      <Bar dataKey="Hours" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Unresolved High Priority Hotspots */}
          <Card noHover header="High Urgency Hotspots (Active High/Critical Complaints)">
            {insights?.priorityHotspots && insights.priorityHotspots.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="form-group" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--space-2)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      <th style={{ padding: 'var(--space-3)' }}>CATEGORY</th>
                      <th style={{ padding: 'var(--space-3)' }}>CRITICAL TICKETS</th>
                      <th style={{ padding: 'var(--space-3)' }}>HIGH TICKETS</th>
                      <th style={{ padding: 'var(--space-3)' }}>TOTAL UNRESOLVED</th>
                      <th style={{ padding: 'var(--space-3)' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.priorityHotspots.map((hot, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)' }}>
                        <td style={{ padding: 'var(--space-4)', fontWeight: 600 }}>{hot.category}</td>
                        <td style={{ padding: 'var(--space-4)', color: 'var(--color-danger)' }}>{hot.critical_count}</td>
                        <td style={{ padding: 'var(--space-4)', color: 'var(--priority-high)' }}>{hot.high_count}</td>
                        <td style={{ padding: 'var(--space-4)' }}>{hot.total_count}</td>
                        <td style={{ padding: 'var(--space-4)' }}>
                          <Badge variant={parseInt(hot.critical_count, 10) > 0 ? 'danger' : 'warning'}>
                            {parseInt(hot.critical_count, 10) > 0 ? 'Action Needed' : 'Monitoring'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                No active critical/high priority hotspots detected. Community is running smoothly!
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
