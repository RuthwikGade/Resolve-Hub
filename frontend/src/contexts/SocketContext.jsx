import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Connect / reconnect when token changes
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, isAuthenticated]);

  const joinCommunity = useCallback((communityId) => {
    socketRef.current?.emit('join_community', communityId);
  }, []);

  const leaveCommunity = useCallback((communityId) => {
    socketRef.current?.emit('leave_community', communityId);
  }, []);

  const onEvent = useCallback((event, callback) => {
    socketRef.current?.on(event, callback);
  }, []);

  const offEvent = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    joinCommunity,
    leaveCommunity,
    onEvent,
    offEvent,
    emit,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export default SocketContext;
