import { classNames } from '../../utils/helpers';

export function Spinner({ size = 'md', className }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  return <div className={classNames('spinner', sizeClass, className)} />;
}

export function FullPageLoader() {
  return (
    <div className="loader-fullpage">
      <Spinner size="lg" />
      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Loading…
      </span>
    </div>
  );
}

export function SkeletonLine({ width = '100%', height = '14px', className }) {
  return (
    <div
      className={classNames('skeleton', 'skeleton-text', className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ className }) {
  return <div className={classNames('skeleton', 'skeleton-card', className)} />;
}

export function SkeletonAvatar({ size = 40, className }) {
  return (
    <div
      className={classNames('skeleton', 'skeleton-avatar', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonChart({ className }) {
  return <div className={classNames('skeleton', 'skeleton-chart', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="glass-card no-hover" style={{ padding: 'var(--space-5)' }}>
      <SkeletonLine width="60%" height="18px" />
      <SkeletonLine width="100%" />
      <SkeletonLine width="80%" />
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <SkeletonLine width="60px" height="22px" />
        <SkeletonLine width="80px" height="22px" />
      </div>
    </div>
  );
}

export default Spinner;
