import { formatRelativeTime, classNames } from '../../utils/helpers';
import { EVENT_TYPES } from '../../utils/constants';

export default function ComplaintTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
        <div className="empty-state-icon">📜</div>
        <div className="empty-state-title">No activity yet</div>
        <div className="empty-state-desc">Events will appear here as the complaint progresses.</div>
      </div>
    );
  }

  return (
    <div className="timeline" id="complaint-timeline">
      {events.map((event, index) => {
        const type = EVENT_TYPES[event.type] || EVENT_TYPES.comment;
        return (
          <div
            key={event._id || index}
            className="timeline-item"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className={classNames('timeline-dot', type.dotClass)} />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-actor">
                  {type.icon}{' '}
                  {event.actor?.name || event.actorName || 'System'}
                </span>
                <span className="timeline-time">
                  {formatRelativeTime(event.createdAt || event.timestamp)}
                </span>
              </div>
              <div className="timeline-action">
                {event.description || type.label}
                {event.from && event.to && (
                  <span> — {event.from} → {event.to}</span>
                )}
              </div>
              {event.note && (
                <div className="timeline-note">{event.note}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
