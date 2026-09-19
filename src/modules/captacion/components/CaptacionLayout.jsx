import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Users, ClipboardCheck, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import UserAvatar from '../../../components/UserAvatar.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ACCENT = '#10b981';

const NavItem = ({ icon: Icon, label, path, exact, current }) => {
  const navigate = useNavigate();
  const active   = exact ? current === path : (current === path || current.startsWith(path + '/'));
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-sm text-xs tracking-wide transition-all border ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-emerald-500/10 hover:bg-emerald-500/5'
      }`}
    >
      <Icon size={14} style={{ color: active ? ACCENT : undefined }} />
      {label}
    </button>
  );
};

const CaptacionLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  return (
    <div className="min-h-screen bg-[#020617] font-mono flex">
      <GeometricBackground />
      <aside className="w-52 border-r border-emerald-900/30 flex flex-col py-6 px-4 shrink-0 bg-[#041a12]/60 relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-900/60" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-900/60" />

        <div className="mb-6 pb-4 border-b border-emerald-900/20">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-emerald-900/30 bg-emerald-900/10 hover:bg-emerald-900/20 hover:border-emerald-700/50 text-slate-400 hover:text-emerald-400 text-xs tracking-wide transition-all"
          >
            <ChevronLeft size={13} /> PANEL PRINCIPAL
          </button>
          <p className="text-emerald-400 font-bold text-base tracking-[4px]" style={{ textShadow: '0 0 12px #10b98166' }}>
            KERNEL
          </p>
          <p className="text-slate-500 text-[11px] mt-1 tracking-[2px]">// CAPTACIÓN</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={Users}          label="PROSPECTOS"    path="/captacion"              exact current={pathname} />
          <NavItem icon={ClipboardCheck} label="VINCULACIONES" path="/captacion/vinculaciones" current={pathname} />
          <NavItem icon={BarChart2}      label="MIS VALORES"   path="/captacion/valores"       current={pathname} />
        </nav>

        <div className="border-t border-emerald-900/20 pt-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <UserAvatar url={user?.avatar_url} nombre={user?.nombre} size={28} accent={ACCENT} />
            <p className="text-slate-400 text-[10px] truncate tracking-wider">{user?.nombre?.toUpperCase()}</p>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-red-900/20 bg-red-900/5 hover:bg-red-900/15 hover:border-red-700/40 text-[10px] text-slate-400 hover:text-red-400 transition-all tracking-wide"
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
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.005) 2px, rgba(16,185,129,0.005) 4px)' }}
        />
        <div className="relative z-10 h-full overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const CaptacionLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <CaptacionLayoutInner />
  </NotificationProvider>
);

export default CaptacionLayout;
