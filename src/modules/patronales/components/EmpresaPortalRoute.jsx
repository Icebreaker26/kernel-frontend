import { Navigate } from 'react-router-dom';
import { useEmpresa } from '../../../context/EmpresaContext.jsx';

const Cargando = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#05080f]">
    <span className="text-[#6aacbc] font-mono text-sm animate-pulse tracking-widest">CARGANDO...</span>
  </div>
);

export const EmpresaProtectedRoute = ({ children }) => {
  const { empresa, loading } = useEmpresa();
  if (loading) return <Cargando />;
  return empresa ? children : <Navigate to="/portal-empresa/login" replace />;
};

export const EmpresaPublicRoute = ({ children }) => {
  const { empresa, loading } = useEmpresa();
  if (loading) return <Cargando />;
  return empresa ? <Navigate to="/portal-empresa" replace /> : children;
};
