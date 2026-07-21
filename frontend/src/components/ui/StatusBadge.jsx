import { classNames, formatStatus } from '../../utils/helpers';
import { STATUS_COLORS } from '../../utils/constants';

const STATUS_ICONS = {
  open: '🟡',
  in_progress: '🔵',
  resolved: '🟢',
  escalated: '🔴',
  closed: '⚫',
};

export default function StatusBadge({ id, status, className, ...rest }) {
  const colorInfo = STATUS_COLORS[status] || STATUS_COLORS.open;
  const icon = STATUS_ICONS[status] || '🟡';
  const label = formatStatus(status);

  return (
    <span
      id={id}
      className={classNames('badge', colorInfo.className, className)}
      {...rest}
    >
      <span style={{ fontSize: '0.7em' }}>{icon}</span>
      {label}
    </span>
  );
}
