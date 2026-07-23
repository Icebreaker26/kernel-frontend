import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, LayoutDashboard, Building2, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';

const ACCENT = '#f59e0b';

const NavItem = ({ icon: Icon, label, path, current }) => {
  const navigate = useNavigate();
  const active   = current === path || current.startsWith(path + '/');
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-sm text-[10px] tracking-widest transition-all border ${
        active
          ? 'border-[#f59e0b33] bg-[#f59e0b11] text-[#f59e0b]'
          : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#f59e0b11] hover:bg-[#f59e0b08]'
      }`}
    >
      <Icon size={12} style={{ color: active ? ACCENT : undefined }} />
      {label}
    </button>
  );
};

const PatronalesLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex">
      <aside className="w-52 border-r border-[#f59e0b22] flex flex-col py-6 px-4 shrink-0 bg-[#08101e] relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f59e0b]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f59e0b]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#f59e0b44]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#f59e0b44]" />

        <div className="mb-6 pb-4 border-b border-[#f59e0b11]">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-[#f59e0b22] bg-[#f59e0b08] hover:bg-[#f59e0b15] hover:border-[#f59e0b55] text-[#6aacbc] hover:text-[#f59e0b] text-[10px] tracking-wider transition-all"
          >
            <ChevronLeft size={12} /> PANEL PRINCIPAL
          </button>
          <p className="text-[#f59e0b] font-bold text-base tracking-[4px]" style={{ textShadow: '0 0 12px #f59e0b66' }}>
            KERNEL
          </p>
          <p className="text-[#6aacbc] text-[9px] mt-0.5 tracking-[3px]">// PATRONALES</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={LayoutDashboard} label="DASHBOARD"   path="/patronales"          current={location.pathname === '/patronales' ? '/patronales' : ''} />
          <NavItem icon={Building2}       label="EMPRESAS"    path="/patronales/empresas" current={location.pathname} />
          <NavItem icon={FileText}        label="FACTURAS"    path="/patronales/facturas" current={location.pathname} />
        </nav>

        <div className="border-t border-[#f59e0b11] pt-4 mt-2">
          <p className="text-[#6aacbc] text-[9px] mb-2 truncate tracking-widest">// {user?.nombre?.toUpperCase()}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d55] text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-all tracking-widest"
            >
              <LogOut size={12} /> SALIR
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,158,11,0.008) 2px, rgba(245,158,11,0.008) 4px)' }}
        />
        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const PatronalesLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <PatronalesLayoutInner />
  </NotificationProvider>
);

export default PatronalesLayout;
