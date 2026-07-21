import { useNavigate } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import { classNames, truncateText, formatRelativeTime } from '../../utils/helpers';

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate();

  if (!complaint) return null;

  const {
    id,
    _id,
    title,
    category,
    status = 'open',
    priority = 'medium',
    assignedTo,
    assigned_to,
    createdAt,
    created_at,
    description,
  } = complaint;

  const complaintId = id || _id;
  const time = created_at || createdAt;
  const assignee = assigned_to || assignedTo;

  return (
    <div
      id={`complaint-card-${complaintId}`}
      className={classNames('complaint-card', `priority-${priority}`)}
      onClick={() => navigate(`/complaints/${complaintId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/complaints/${complaintId}`); }}
    >
      <div className="complaint-card-header">
        <h4 className="complaint-card-title">{title}</h4>
        <StatusBadge status={status} />
      </div>
      {description && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
          {truncateText(description, 120)}
        </p>
      )}
      <div className="complaint-card-meta">
        {category && <span>🏷️ {category}</span>}
        {priority && (
          <span style={{ textTransform: 'capitalize' }}>
            🔥 {priority}
          </span>
        )}
        {assignee && (
          <span>👤 {typeof assignee === 'object' ? assignee.name : assignee}</span>
        )}
        <span>🕐 {formatRelativeTime(time)}</span>
      </div>
    </div>
  );
}
