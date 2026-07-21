import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

let toastIdCounter = 0;

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { onEvent, offEvent } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  // Fetch notifications on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/notifications');
        if (!cancelled) {
          const list = res.data?.notifications || [];
          setNotifications(list);
          setUnreadCount(list.filter(n => !n.is_read).length);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      addToast(notification.message || 'New notification', 'info');
    };
    onEvent('notification', handler);
    return () => offEvent('notification', handler);
  }, [isAuthenticated, onEvent, offEvent]);

  // ─── Toast Management ──────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++toastIdCounter;
    const toast = { id, message, type, createdAt: Date.now() };
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss
    toastTimers.current[id] = setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id || n._id) === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    toasts,
    addToast,
    removeToast,
    markAsRead,
    markAllRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export default NotificationContext;
