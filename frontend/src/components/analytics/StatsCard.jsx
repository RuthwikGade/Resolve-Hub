import { useState, useEffect, useRef } from 'react';

export default function StatsCard({ id, label, value, icon, trend, trendLabel, color }) {
  const [displayValue, setDisplayValue] = useState(0);
  const targetRef = useRef(value);

  // Animated count-up
  useEffect(() => {
    targetRef.current = typeof value === 'number' ? value : 0;
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const end = targetRef.current;
    const duration = 800;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      start = Math.round(eased * end);
      setDisplayValue(start);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [value]);

  const iconBg = color || 'rgba(99,102,241,0.15)';
  const iconColor = color ? undefined : 'var(--color-primary-light)';

  return (
    <div id={id} className="stats-card">
      <div>
        <div className="stats-value count-up">{displayValue}</div>
        <div className="stats-label">{label}</div>
        {trend !== undefined && (
          <span className={`stats-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            {trendLabel && ` ${trendLabel}`}
          </span>
        )}
      </div>
      <div className="stats-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
    </div>
  );
}
