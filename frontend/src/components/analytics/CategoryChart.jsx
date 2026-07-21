import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const isTime = metric === 'avgResolutionMinutes';

  const formatVal = (min) => {
    if (min === 0) return '0m';
    if (min < 60) return `${Math.round(min)}m`;
    const hrs = min / 60;
    if (hrs < 24) return `${hrs.toFixed(1)}h`;
    const days = hrs / 24;
    return `${days.toFixed(1)}d`;
  };

  return (
    <div style={{
      background: 'var(--bg-card-solid)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 14px',
      fontSize: 'var(--font-size-sm)',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
      {isTime ? (
        <div style={{ color: 'var(--color-success)', fontWeight: 500 }}>
          ⏱️ Avg Time: {formatVal(data.avgResolutionMinutes)}
        </div>
      ) : (
        <div style={{ color: 'var(--color-violet)', fontWeight: 500 }}>
          📊 Total: {data.count} complaints
        </div>
      )}
    </div>
  );
};

export default function CategoryChart({ data = [] }) {
  const [metric, setMetric] = useState('count'); // 'count' or 'avgResolutionMinutes'

  const chartData = data.length
    ? data.map(d => ({
        name: d.name || d.category,
        count: d.count || 0,
        avgResolutionMinutes: d.avgResolutionMinutes || 0,
        avgResolutionHours: parseFloat(((d.avgResolutionMinutes || 0) / 60).toFixed(1))
      }))
    : [
        { name: 'Plumbing', count: 0, avgResolutionMinutes: 0, avgResolutionHours: 0 },
        { name: 'Electrical', count: 0, avgResolutionMinutes: 0, avgResolutionHours: 0 },
        { name: 'Security', count: 0, avgResolutionMinutes: 0, avgResolutionHours: 0 },
      ];

  const yAxisFormatter = (value) => {
    if (metric === 'count') return value;
    return `${value}h`;
  };

  return (
    <div className="chart-card" id="category-chart">
      {/* Title & Toggle buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="chart-card-title" style={{ marginBottom: 0 }}>
          {metric === 'count' ? 'Complaints by Category' : 'Resolution Time by Category'}
        </div>
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setMetric('count')}
            style={{
              background: metric === 'count' ? 'var(--gradient-primary)' : 'transparent',
              color: metric === 'count' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              padding: '4px 10px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Volume
          </button>
          <button
            onClick={() => setMetric('avgResolutionMinutes')}
            style={{
              background: metric === 'avgResolutionMinutes' ? 'var(--gradient-primary)' : 'transparent',
              color: metric === 'avgResolutionMinutes' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              padding: '4px 10px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Avg Time
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          <Bar
            dataKey={metric === 'count' ? 'count' : 'avgResolutionHours'}
            fill={metric === 'count' ? 'url(#barGradientCount)' : 'url(#barGradientTime)'}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
          <defs>
            <linearGradient id="barGradientCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="barGradientTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

