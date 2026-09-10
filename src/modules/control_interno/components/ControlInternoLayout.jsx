import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';

const ACCENT = '#c084fc';

const NavItem = ({ icon: Icon, label, path, exact, current }) => {
  const navigate = useNavigate();
  const active   = exact ? current === path : (current === path || current.startsWith(path + '/'));
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-sm text-[10px] tracking-widest transition-all border ${
        active
          ? 'border-[#c084fc33] bg-[#c084fc11] text-[#c084fc]'
          : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#c084fc11] hover:bg-[#c084fc08]'
      }`}
    >
      <Icon size={12} style={{ color: active ? ACCENT : undefined }} />
      {label}
    </button>
  );
};

const ControlInternoLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex">
      <aside className="w-52 border-r border-[#c084fc22] flex flex-col py-6 px-4 shrink-0 bg-[#08101e] relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#c084fc]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#c084fc]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#c084fc44]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#c084fc44]" />

        <div className="mb-6 pb-4 border-b border-[#c084fc11]">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-[#c084fc22] bg-[#c084fc08] hover:bg-[#c084fc15] hover:border-[#c084fc55] text-[#6aacbc] hover:text-[#c084fc] text-[10px] tracking-wider transition-all"
          >
            <ChevronLeft size={12} /> PANEL PRINCIPAL
          </button>
          <p className="text-[#c084fc] font-bold text-base tracking-[4px]" style={{ textShadow: '0 0 12px #c084fc66' }}>
            KERNEL
          </p>
          <p className="text-[#6aacbc] text-[9px] mt-0.5 tracking-[3px]">// CONTROL INTERNO</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={FileText}    label="FACTURAS"  path="/control-interno"          exact current={pathname} />
        </nav>

        <div className="border-t border-[#c084fc11] pt-4 mt-2">
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
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(192,132,252,0.005) 2px, rgba(192,132,252,0.005) 4px)' }}
        />
        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const ControlInternoLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <ControlInternoLayoutInner />
  </NotificationProvider>
);

export default ControlInternoLayout;
