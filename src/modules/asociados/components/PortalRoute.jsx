import { Navigate } from 'react-router-dom';
import { useAsociado } from '../../../context/AsociadoContext.jsx';

export const PortalProtectedRoute = ({ children }) => {
  const { asociado, loading } = useAsociado();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] font-sans">
      <span className="animate-pulse text-base text-slate-500">Cargando…</span>
    </div>
  );
  return asociado ? children : <Navigate to="/portal/login" replace />;
};

export const PortalPublicRoute = ({ children }) => {
  const { asociado, loading } = useAsociado();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] font-sans">
      <span className="animate-pulse text-base text-slate-500">Cargando…</span>
    </div>
  );
  return asociado ? <Navigate to="/portal" replace /> : children;
};
