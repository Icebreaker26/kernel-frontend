import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

export const ACCENT = '#38bdf8';

const Tab = ({ to, end, children }) => (
  <NavLink to={to} end={end}
    className={({ isActive }) => `rounded-sm px-3 py-1.5 text-[10px] tracking-widest ${isActive ? 'bg-[#38bdf822] text-[#38bdf8]' : 'text-[#6aacbc] hover:text-[#00e5ff]'}`}>
    {children}
  </NavLink>
);

const FirmaLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-[#020617] font-mono text-[#a0d4e0]">
      <GeometricBackground />
      <div className="relative z-[2] mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/selector')} aria-label="Volver al selector" className="text-[#6aacbc] transition-colors hover:text-[#00e5ff]">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <PenLine size={18} style={{ color: ACCENT }} />
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FIRMA ELECTRÓNICA</h1>
            </div>
          </div>
          <nav className="ml-auto flex gap-1">
            <Tab to="/firma" end>FIRMAR</Tab>
            <Tab to="/firma/verificar">VERIFICAR</Tab>
          </nav>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default FirmaLayout;
