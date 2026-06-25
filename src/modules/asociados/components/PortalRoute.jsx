import { Navigate } from 'react-router-dom';
import { useAsociado } from '../../../context/AsociadoContext.jsx';

export const PortalProtectedRoute = ({ children }) => {
  const { asociado, loading } = useAsociado();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <span className="text-slate-400 font-mono text-sm animate-pulse">Cargando...</span>
    </div>
  );
  return asociado ? children : <Navigate to="/portal/login" replace />;
};

export const PortalPublicRoute = ({ children }) => {
  const { asociado, loading } = useAsociado();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <span className="text-slate-400 font-mono text-sm animate-pulse">Cargando...</span>
    </div>
  );
  return asociado ? <Navigate to="/portal" replace /> : children;
};
