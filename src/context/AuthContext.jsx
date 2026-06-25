import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.pathname.startsWith('/portal')) {
      setLoading(false);
      return;
    }
    apiService.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await apiService.post('/auth/login', { email, password });
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiService.post('/auth/logout');
    setUser(null);
    window.location.href = '/landing';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
