import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import apiService from '../services/apiService.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children, endpoint }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    apiService.get(endpoint)
      .then(({ data }) => setNotificaciones(Array.isArray(data) ? data : []))
      .catch(() => {});

    const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''), {
      withCredentials: true,
    });

    socket.on('notificacion', (notif) => {
      setNotificaciones((prev) => [notif, ...prev].slice(0, 50));
    });

    socketRef.current = socket;

    // BFCache: desconectar al salir, reconectar si el browser restaura desde caché
    const handlePageHide = () => socket.disconnect();
    const handlePageShow = (e) => { if (e.persisted) socket.connect(); };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      socket.disconnect();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [endpoint]);

  const marcarLeida = async (id) => {
    try {
      await apiService.patch(`${endpoint}/${id}/leer`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch {}
  };

  const marcarTodasLeidas = async () => {
    try {
      await apiService.patch(`${endpoint}/leer-todas`);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch {}
  };

  return (
    <NotificationContext.Provider value={{ notificaciones, marcarLeida, marcarTodasLeidas }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
