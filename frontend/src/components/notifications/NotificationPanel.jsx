import { useNotifications } from '../../contexts/NotificationContext';
import { formatRelativeTime, classNames } from '../../utils/helpers';
import Button from '../ui/Button';

export default function NotificationPanel({ onClose }) {
  const { notifications, markAsRead, markAllRead, unreadCount } = useNotifications();

  return (
    <div className="notification-panel" id="notification-panel">
      <div className="notification-panel-header">
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
          Notifications
          {unreadCount > 0 && (
            <span className="badge badge-primary" style={{ marginLeft: 8 }}>{unreadCount}</span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button
            id="mark-all-read"
            variant="ghost"
            size="sm"
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🔕</div>
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 20).map(n => (
            <div
              key={n._id || n.id}
              className={classNames('notification-item', !n.is_read && 'unread')}
              onClick={() => {
                if (!n.is_read) markAsRead(n._id || n.id);
              }}
              id={`notification-${n._id || n.id}`}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: n.is_read ? 400 : 600, marginBottom: 2 }}>
                  {n.message || n.title || 'Notification'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  {formatRelativeTime(n.createdAt || n.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
