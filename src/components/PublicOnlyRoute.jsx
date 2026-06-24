import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <span className="text-slate-400 font-mono text-sm animate-pulse">Cargando...</span>
    </div>
  );

  return user ? <Navigate to="/selector" replace /> : children;
};

export default PublicOnlyRoute;
