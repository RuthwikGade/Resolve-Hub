import { classNames } from '../../utils/helpers';

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const TOAST_TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export default function Toast({ id, message, type = 'info', onClose }) {
  return (
    <div id={id} className={classNames('toast', `toast-${type}`)}>
      <span className="toast-icon">{TOAST_ICONS[type]}</span>
      <div className="toast-content">
        <div className="toast-title">{TOAST_TITLES[type]}</div>
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({ toasts = [], onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={`toast-${toast.id}`}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
