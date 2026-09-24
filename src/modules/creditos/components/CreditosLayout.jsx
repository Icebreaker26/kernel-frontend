import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, HandCoins } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

export const ACCENT = '#84cc16';

const Tab = ({ to, end, children }) => (
  <NavLink to={to} end={end}
    className={({ isActive }) => `rounded-sm px-3 py-1.5 text-[10px] tracking-widest ${isActive ? 'bg-[#84cc1622] text-[#84cc16]' : 'text-[#6aacbc] hover:text-[#00e5ff]'}`}>
    {children}
  </NavLink>
);

const CreditosLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-[#020617] font-mono text-[#a0d4e0]">
      <GeometricBackground />
      <div className="relative z-[2] mx-auto max-w-[1300px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/selector')} aria-label="Volver al selector" className="text-[#6aacbc] transition-colors hover:text-[#00e5ff]"><ArrowLeft size={16} /></button>
          <div className="flex items-center gap-3">
            <HandCoins size={18} style={{ color: ACCENT }} />
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>CRÉDITOS</h1>
            </div>
          </div>
          <nav className="ml-auto flex gap-1">
            <Tab to="/creditos" end>SOLICITUDES</Tab>
            <Tab to="/creditos/nueva">NUEVA</Tab>
            <Tab to="/creditos/empresas">EMPRESAS</Tab>
          </nav>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default CreditosLayout;
