import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

export const ACCENT = '#fbbf24';

const Tab = ({ to, end, children }) => (
  <NavLink to={to} end={end}
    className={({ isActive }) => `rounded-sm px-3 py-1.5 text-[10px] tracking-widest ${isActive ? 'bg-[#fbbf2422] text-[#fbbf24]' : 'text-[#6aacbc] hover:text-[#00e5ff]'}`}>
    {children}
  </NavLink>
);

const CarteraLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-[#020617] font-mono text-[#a0d4e0]">
      <GeometricBackground />
      <div className="relative z-[2] mx-auto max-w-[1300px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/selector')} aria-label="Volver al selector" className="text-[#6aacbc] transition-colors hover:text-[#00e5ff]"><ArrowLeft size={16} /></button>
          <div className="flex items-center gap-3">
            <Wallet size={18} style={{ color: ACCENT }} />
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>CARTERA</h1>
            </div>
          </div>
          <nav className="ml-auto flex gap-1" aria-label="Secciones de Cartera">
            <Tab to="/cartera" end>BANDEJA</Tab>
            <Tab to="/cartera/reportes">REPORTES DEL MES</Tab>
          </nav>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default CarteraLayout;
