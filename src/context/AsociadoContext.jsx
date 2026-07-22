import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService.js';

const AsociadoContext = createContext(null);

export const AsociadoProvider = ({ children }) => {
  const [asociado, setAsociado] = useState(null);
  const [loading, setLoading]   = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await apiService.get('/asociados/me');
      setAsociado(data);
      return data;
    } catch {
      setAsociado(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/portal')) {
      setLoading(false);
      return;
    }
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const login = async (codigo, password) => {
    const { data } = await apiService.post('/asociados/login', { codigo, password });
    setAsociado(data);
    return data;
  };

  const logout = async () => {
    await apiService.post('/asociados/logout');
    setAsociado(null);
    window.location.href = '/portal/login';
  };

  return (
    <AsociadoContext.Provider value={{ asociado, loading, login, logout, refreshMe }}>
      {children}
    </AsociadoContext.Provider>
  );
};

export const useAsociado = () => useContext(AsociadoContext);
