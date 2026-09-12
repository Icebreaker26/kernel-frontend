import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import apiService from '../services/apiService.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children, endpoint }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    apiService.get(endpoint)
      .then(({ data }) => setNotificaciones(Array.isArray(data) ? data : []))
      .catch(() => {});

    const sock = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''), {
      withCredentials: true,
    });

    sock.on('notificacion', (notif) => {
      setNotificaciones((prev) => [notif, ...prev].slice(0, 50));
    });

    setSocket(sock);

    // BFCache: desconectar al salir, reconectar si el browser restaura desde caché
    const handlePageHide = () => sock.disconnect();
    const handlePageShow = (e) => { if (e.persisted) sock.connect(); };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      sock.disconnect();
      setSocket(null);
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
    <NotificationContext.Provider value={{ notificaciones, marcarLeida, marcarTodasLeidas, socket }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
