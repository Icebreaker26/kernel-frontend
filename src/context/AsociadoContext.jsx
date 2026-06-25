import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService.js';

const AsociadoContext = createContext(null);

export const AsociadoProvider = ({ children }) => {
  const [asociado, setAsociado] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiService.get('/asociados/me')
      .then(({ data }) => setAsociado(data))
      .catch(() => setAsociado(null))
      .finally(() => setLoading(false));
  }, []);

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
    <AsociadoContext.Provider value={{ asociado, loading, login, logout }}>
      {children}
    </AsociadoContext.Provider>
  );
};

export const useAsociado = () => useContext(AsociadoContext);
