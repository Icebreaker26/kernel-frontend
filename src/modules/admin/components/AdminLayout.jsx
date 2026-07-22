import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, Shield, LogOut, Upload, UsersRound, ClipboardList, Building2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const NAV = [
  { to: '/admin',                   end: true,  icon: Users,         label: 'Usuarios' },
  { to: '/admin/permisos',          end: false, icon: Shield,        label: 'Permisos' },
  { to: '/admin/asociados',         end: true,  icon: UsersRound,    label: 'Asociados' },
  { to: '/admin/empresas',          end: false, icon: Building2,     label: 'Empresas' },
  { to: '/admin/auditoria',         end: false, icon: ClipboardList, label: 'Auditoría' },
  { to: '/admin/asociados/importar',end: false, icon: Upload,        label: 'Importar asociados' },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex relative">
      <GeometricBackground />

      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
        }}
      />

      {/* Sidebar */}
      <aside className="w-56 border-r border-[#00e5ff11] bg-[#08101e] flex flex-col py-6 px-4 shrink-0 relative z-[2]">
        <div className="mb-8">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1 text-[#1a4a55] hover:text-[#00e5ff] text-[9px] tracking-widest mb-4 transition-colors"
          >
            <ChevronLeft size={11} /> SELECTOR
          </button>

          <p className="text-[#1a4a55] text-[7px] tracking-[4px] mb-0.5">// MÓDULO</p>
          <p
            className="text-[#00e5ff] font-bold text-sm tracking-[3px]"
            style={{ textShadow: '0 0 16px #00e5ff44' }}
          >
            KERNEL
          </p>
          <p className="text-[#a855f7] text-[9px] tracking-[2px] mt-0.5"
            style={{ textShadow: '0 0 8px #a855f733' }}
          >
            ADMIN
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] tracking-wider transition-colors ${
                  isActive
                    ? 'bg-[#a855f711] text-[#a855f7] border border-[#a855f722]'
                    : 'text-[#1a4a55] hover:text-[#a0d4e0] hover:bg-[#00e5ff08] border border-transparent'
                }`
              }
            >
              <Icon size={13} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#00e5ff11] pt-4">
          <p className="text-[#1a4a55] text-[9px] tracking-wider mb-3 truncate">{user?.nombre?.toUpperCase()}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-[9px] text-[#1a4a55] hover:text-[#ff3d3d] transition-colors tracking-widest"
            >
              <LogOut size={12} /> SALIR
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto relative z-[2]">
        <Outlet />
      </main>
    </div>
  );
};

const AdminLayoutWithNotifications = () => (
  <NotificationProvider endpoint="/notificaciones">
    <AdminLayout />
  </NotificationProvider>
);

export default AdminLayoutWithNotifications;
