import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [liveServerMetrics, setLiveServerMetrics] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
    const socket = io(socketUrl, {
      auth: {
        token,
        email: user?.email,
        name: user?.name
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen to real-time server metrics updates
    socket.on('server:metrics', (data) => {
      setLiveServerMetrics((prev) => ({
        ...prev,
        [data.serverId]: {
          ...data.metrics,
          status: data.status,
          updatedAt: new Date().toISOString()
        }
      }));
    });

    socket.on('metrics:update', (data) => {
      setLiveServerMetrics((prev) => ({
        ...prev,
        [data.serverId]: {
          ...data.metrics,
          status: data.status,
          updatedAt: new Date().toISOString()
        }
      }));
    });

    // Listen to real-time server status changes
    socket.on('server:status', (data) => {
      setLiveServerMetrics((prev) => ({
        ...prev,
        [data.serverId]: {
          ...(prev[data.serverId] || {}),
          status: data.status,
          lastErrorMessage: data.error,
          lastContact: data.lastContact
        }
      }));
    });

    // Listen to live alerts
    socket.on('alert:created', (newAlert) => {
      setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
    });

    socket.on('alert:resolved', (resolvedAlert) => {
      setRecentAlerts((prev) =>
        prev.map((a) => (a._id === resolvedAlert._id ? resolvedAlert : a))
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const subscribeToServer = (serverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe:server', { serverId });
    }
  };

  const unsubscribeFromServer = (serverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe:server', { serverId });
    }
  };

  return (
    <SocketContext.Provider value={{
      isConnected,
      liveServerMetrics,
      recentAlerts,
      subscribeToServer,
      unsubscribeFromServer
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
