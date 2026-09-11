import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, BookOpen, FileText, Building2, LogOut, CalendarDays, Tag } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ACCENT = '#818cf8';

const NavItem = ({ icon: Icon, label, path, exact, current }) => {
  const navigate = useNavigate();
  const active   = exact ? current === path : (current === path || current.startsWith(path + '/'));
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-sm text-xs tracking-wide transition-all border ${
        active
          ? 'border-[#818cf833] bg-[#818cf811] text-[#818cf8]'
          : 'border-transparent text-[#7ec8d8] hover:text-[#b8e0ea] hover:border-[#818cf811] hover:bg-[#818cf808]'
      }`}
    >
      <Icon size={14} style={{ color: active ? ACCENT : undefined }} />
      {label}
    </button>
  );
};

const ContableLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex">
      <GeometricBackground />
      <aside className="w-52 border-r border-[#818cf822] flex flex-col py-6 px-4 shrink-0 bg-[#08101e] relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#818cf844]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#818cf844]" />

        <div className="mb-6 pb-4 border-b border-[#818cf811]">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-[#818cf822] bg-[#818cf808] hover:bg-[#818cf815] hover:border-[#818cf855] text-[#7ec8d8] hover:text-[#818cf8] text-xs tracking-wide transition-all"
          >
            <ChevronLeft size={13} /> PANEL PRINCIPAL
          </button>
          <p className="text-[#818cf8] font-bold text-base tracking-[4px]" style={{ textShadow: '0 0 12px #818cf866' }}>
            KERNEL
          </p>
          <p className="text-[#7ec8d8] text-[11px] mt-1 tracking-[2px]">// CONTABLE</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={FileText}    label="FACTURAS"    path="/contable"              exact current={pathname} />
          <NavItem icon={Building2}  label="PROVEEDORES" path="/contable/proveedores"  current={pathname} />
          <NavItem icon={CalendarDays} label="PERÍODOS"  path="/contable/periodos"    current={pathname} />
          <NavItem icon={Tag}        label="CATEGORÍAS"  path="/contable/categorias"  current={pathname} />
        </nav>

        <div className="border-t border-[#818cf811] pt-4 mt-2">
          <p className="text-[#7ec8d8] text-[10px] mb-2 truncate tracking-wider">// {user?.nombre?.toUpperCase()}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d55] text-[10px] text-[#7ec8d8] hover:text-[#ff3d3d] transition-all tracking-wide"
            >
              <LogOut size={13} /> SALIR
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(129,140,248,0.006) 2px, rgba(129,140,248,0.006) 4px)' }}
        />
        <div className="relative z-10 h-full overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const ContableLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <ContableLayoutInner />
  </NotificationProvider>
);

export default ContableLayout;
