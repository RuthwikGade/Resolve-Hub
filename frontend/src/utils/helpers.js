import { STATUS_COLORS, PRIORITY_COLORS } from './constants';

/**
 * Format an ISO date string into a human-readable format.
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  const defaults = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateStr).toLocaleDateString('en-US', { ...defaults, ...options });
}

/**
 * Format an ISO date string into a relative "time ago" string.
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  const weeks   = Math.floor(days / 7);
  const months  = Math.floor(days / 30);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  if (weeks < 5)    return `${weeks}w ago`;
  return `${months}mo ago`;
}

/**
 * Return the STATUS_COLORS entry for a status string.
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.open;
}

/**
 * Return the PRIORITY_COLORS entry for a priority string.
 */
export function getPriorityColor(priority) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
}

/**
 * Truncate text to a maximum length, adding ellipsis.
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Get initials from a name string (e.g. "John Doe" → "JD").
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/**
 * Format a duration in minutes into a human-readable string.
 */
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

/**
 * Conditionally join class names.
 */
export function classNames(...args) {
  return args
    .flat()
    .filter(Boolean)
    .join(' ');
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a status value for display (e.g. 'in_progress' → 'In Progress').
 */
export function formatStatus(status) {
  if (!status) return '';
  return status.split('_').map(capitalize).join(' ');
}

/**
 * Debounce a function call.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
