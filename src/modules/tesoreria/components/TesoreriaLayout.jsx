import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, LayoutDashboard, CreditCard, ArrowLeftRight, Building2, FileText, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ACCENT = '#34d399';

const NavItem = ({ icon: Icon, label, path, exact, current }) => {
  const navigate = useNavigate();
  const active   = exact ? current === path : (current === path || current.startsWith(path + '/'));
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-sm text-xs tracking-wide transition-all border ${
        active
          ? 'border-[#34d39933] bg-[#34d39911] text-[#34d399]'
          : 'border-transparent text-[#7ec8d8] hover:text-[#b8e0ea] hover:border-[#34d39911] hover:bg-[#34d39908]'
      }`}
    >
      <Icon size={14} style={{ color: active ? ACCENT : undefined }} />
      {label}
    </button>
  );
};

const TesoreriaLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex">
      <GeometricBackground />
      <aside className="w-52 border-r border-[#34d39922] flex flex-col py-6 px-4 shrink-0 bg-[#08101e] relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#34d399]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#34d399]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#34d39944]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#34d39944]" />

        <div className="mb-6 pb-4 border-b border-[#34d39911]">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-[#34d39922] bg-[#34d39908] hover:bg-[#34d39915] hover:border-[#34d39955] text-[#7ec8d8] hover:text-[#34d399] text-xs tracking-wide transition-all"
          >
            <ChevronLeft size={13} /> PANEL PRINCIPAL
          </button>
          <p className="text-[#34d399] font-bold text-base tracking-[4px]" style={{ textShadow: '0 0 12px #34d39966' }}>
            KERNEL
          </p>
          <p className="text-[#7ec8d8] text-[11px] mt-1 tracking-[2px]">// TESORERÍA</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={LayoutDashboard} label="DASHBOARD"    path="/tesoreria"             exact current={pathname} />
          <NavItem icon={FileText}        label="FACTURAS"     path="/tesoreria/facturas"    current={pathname} />
          <NavItem icon={ArrowLeftRight}  label="MOVIMIENTOS"  path="/tesoreria/movimientos" current={pathname} />
          <NavItem icon={Building2}       label="PROVEEDORES"  path="/tesoreria/proveedores" current={pathname} />
          <NavItem icon={CreditCard}      label="CUENTAS"      path="/tesoreria/cuentas"     current={pathname} />
          <NavItem icon={Upload}          label="EXTRACTO"     path="/tesoreria/extracto"    current={pathname} />
        </nav>

        <div className="border-t border-[#34d39911] pt-4 mt-2">
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
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(52,211,153,0.006) 2px, rgba(52,211,153,0.006) 4px)' }}
        />
        <div className="relative z-10 h-full overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const TesoreriaLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <TesoreriaLayoutInner />
  </NotificationProvider>
);

export default TesoreriaLayout;
