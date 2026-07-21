import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#f59e0b', '#6366f1', '#10b981', '#f43f5e', '#6b7280'];
const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
  closed: 'Closed',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{
      background: 'var(--bg-card-solid)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 14px',
      fontSize: 'var(--font-size-sm)',
    }}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div style={{ color: 'var(--text-secondary)' }}>{value} complaints</div>
    </div>
  );
};

const renderLegend = (props) => {
  const { payload } = props;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: 8 }}>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
};

export default function ResolutionChart({ data = [] }) {
  const chartData = data.length
    ? data.map(d => ({ name: STATUS_LABELS[d.status] || d.status, value: d.count }))
    : [
        { name: 'Open', value: 0 },
        { name: 'In Progress', value: 0 },
        { name: 'Resolved', value: 0 },
      ];

  const hasData = chartData.some(d => d.value > 0);

  return (
    <div className="chart-card" id="resolution-chart">
      <div className="chart-card-title">Status Distribution</div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-desc">No data to display yet</div>
        </div>
      )}
    </div>
  );
}
