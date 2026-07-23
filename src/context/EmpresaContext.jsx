import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService.js';

const EmpresaContext = createContext(null);

export const EmpresaProvider = ({ children }) => {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await apiService.get('/patronales/portal/me');
      setEmpresa(data);
      return data;
    } catch {
      setEmpresa(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith('/portal-empresa') || path === '/portal-empresa/login') {
      setLoading(false);
      return;
    }
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await apiService.post('/patronales/portal/login', { email, password });
    await refreshMe();
    return data;
  };

  const logout = async () => {
    await apiService.post('/patronales/portal/logout');
    setEmpresa(null);
    window.location.href = '/portal-empresa/login';
  };

  return (
    <EmpresaContext.Provider value={{ empresa, loading, login, logout, refreshMe }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => useContext(EmpresaContext);
