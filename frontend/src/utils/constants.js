// ─── API & Socket ────────────────────────────────────────────
export const API_BASE_URL = 'http://localhost:3001/api';
export const SOCKET_URL   = 'http://localhost:3001';

// ─── Complaint Statuses ──────────────────────────────────────
export const COMPLAINT_STATUSES = [
  { value: 'open',        label: 'Open Complaints' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'escalated',   label: 'Escalated' },
  { value: 'closed',      label: 'Closed' },
];

// ─── Complaint Priorities ────────────────────────────────────
export const COMPLAINT_PRIORITIES = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ─── Community Types ─────────────────────────────────────────
export const COMMUNITY_TYPES = [
  { value: 'Apartment',       label: 'Apartment' },
  { value: 'Village',         label: 'Village' },
  { value: 'Campus',          label: 'Campus' },
  { value: 'Gated Community', label: 'Gated Community' },
];

// ─── Status → Color map ─────────────────────────────────────
export const STATUS_COLORS = {
  open:        { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', className: 'badge-open' },
  in_progress: { bg: 'rgba(99,102,241,0.12)',  text: '#6366f1', className: 'badge-in-progress' },
  resolved:    { bg: 'rgba(16,185,129,0.12)',   text: '#10b981', className: 'badge-resolved' },
  escalated:   { bg: 'rgba(244,63,94,0.12)',    text: '#f43f5e', className: 'badge-escalated' },
  closed:      { bg: 'rgba(107,114,128,0.12)',  text: '#6b7280', className: 'badge-closed' },
};

// ─── Priority → Color map ────────────────────────────────────
export const PRIORITY_COLORS = {
  low:      { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  medium:   { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  high:     { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
  critical: { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e' },
};

// ─── Default Categories ──────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Security',
  'Parking',
  'Noise',
  'Maintenance',
  'Landscaping',
  'Pest Control',
  'Internet/WiFi',
  'Water Supply',
  'Garbage',
  'Other',
];

// ─── Sidebar Navigation Items ────────────────────────────────
export const NAV_ITEMS = {
  member: [
    { section: 'Main', items: [
      { label: 'Dashboard',   path: '/dashboard',   icon: '📊' },
      { label: 'Communities',  path: '/communities', icon: '🏘️' },
      { label: 'Complaints',  path: '/complaints',  icon: '📋' },
    ]},
    { section: 'Settings', items: [
      { label: 'Profile Settings', path: '/profile/settings', icon: '⚙️' }
    ]}
  ],
  responsible_person: [
    { section: 'Main', items: [
      { label: 'Dashboard',   path: '/dashboard',   icon: '📊' },
      { label: 'Communities',  path: '/communities', icon: '🏘️' },
      { label: 'Complaints',  path: '/complaints',  icon: '📋' },
    ]},
    { section: 'Admin', items: [
      { label: 'Members',      path: '/admin/members',      icon: '👥' },
      { label: 'Categories',   path: '/admin/categories',   icon: '🏷️' },
      { label: 'SLA Rules',    path: '/admin/sla',          icon: '⏱️' },
      { label: 'Routing',      path: '/admin/routing',      icon: '🔀' },
      { label: 'Join Requests',path: '/admin/join-requests',icon: '📩' },
    ]},
    { section: 'Settings', items: [
      { label: 'Profile Settings', path: '/profile/settings', icon: '⚙️' }
    ]}
  ],
  community_admin: [
    { section: 'Main', items: [
      { label: 'Dashboard',   path: '/dashboard',   icon: '📊' },
      { label: 'Communities',  path: '/communities', icon: '🏘️' },
      { label: 'Complaints',  path: '/complaints',  icon: '📋' },
    ]},
    { section: 'Admin', items: [
      { label: 'Members',      path: '/admin/members',      icon: '👥' },
      { label: 'Categories',   path: '/admin/categories',   icon: '🏷️' },
      { label: 'SLA Rules',    path: '/admin/sla',          icon: '⏱️' },
      { label: 'Routing',      path: '/admin/routing',      icon: '🔀' },
      { label: 'Join Requests',path: '/admin/join-requests',icon: '📩' },
    ]},
    { section: 'Settings', items: [
      { label: 'Profile Settings', path: '/profile/settings', icon: '⚙️' }
    ]}
  ],
  super_admin: [
    { section: 'Main', items: [
      { label: 'Dashboard',   path: '/dashboard',   icon: '📊' },
      { label: 'Communities',  path: '/communities', icon: '🏘️' },
      { label: 'Complaints',  path: '/complaints',  icon: '📋' },
    ]},
    { section: 'Admin', items: [
      { label: 'Members',      path: '/admin/members',      icon: '👥' },
      { label: 'Categories',   path: '/admin/categories',   icon: '🏷️' },
      { label: 'SLA Rules',    path: '/admin/sla',          icon: '⏱️' },
      { label: 'Routing',      path: '/admin/routing',      icon: '🔀' },
      { label: 'Join Requests',path: '/admin/join-requests',icon: '📩' },
    ]},
    { section: 'Settings', items: [
      { label: 'Profile Settings', path: '/profile/settings', icon: '⚙️' }
    ]}
  ],
};

// ─── Event type mapping ──────────────────────────────────────
export const EVENT_TYPES = {
  created:        { label: 'Created',        icon: '🆕', dotClass: 'created' },
  status_change:  { label: 'Status Changed', icon: '🔄', dotClass: 'status-change' },
  assigned:       { label: 'Assigned',       icon: '👤', dotClass: 'assigned' },
  escalated:      { label: 'Escalated',      icon: '⚠️', dotClass: 'escalated' },
  resolved:       { label: 'Resolved',       icon: '✅', dotClass: 'resolved' },
  comment:        { label: 'Comment',        icon: '💬', dotClass: 'comment' },
};
