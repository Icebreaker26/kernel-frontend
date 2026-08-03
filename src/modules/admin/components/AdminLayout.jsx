import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useState } from 'react';
import { Users, Shield, LogOut, Upload, UsersRound, ClipboardList, Building2, ChevronLeft, Menu, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { NotificationProvider, useNotifications } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';
import apiService from '../../../services/apiService.js';

const NAV = [
  { to: '/admin',                    end: true,  icon: Users,         label: 'Usuarios' },
  { to: '/admin/permisos',           end: false, icon: Shield,        label: 'Permisos' },
  { to: '/admin/asociados',          end: true,  icon: UsersRound,    label: 'Asociados' },
  { to: '/admin/empresas',           end: false, icon: Building2,     label: 'Empresas' },
  { to: '/admin/auditoria',          end: false, icon: ClipboardList, label: 'Auditoría' },
  { to: '/admin/asociados/importar', end: false, icon: Upload,        label: 'Importar asociados' },
];

const AdminLayout = () => {
  const { user, logout }               = useAuth();
  const navigate                       = useNavigate();
  const { notificaciones }             = useNotifications();
  const [pendientesPortal, setPendientes] = useState(0);
  const [sidebarAbierto, setSidebar]   = useState(false);

  const cargarPendientes = useCallback(async () => {
    try {
      const { data } = await apiService.get('/asociados/pendientes-portal');
      setPendientes(data.count);
    } catch {}
  }, []);

  useEffect(() => { cargarPendientes(); }, [cargarPendientes]);

  useEffect(() => {
    const hayNueva = notificaciones.some(n => n.tipo === 'solicitud_portal' && !n.leida);
    if (hayNueva) cargarPendientes();
  }, [notificaciones, cargarPendientes]);

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex relative">
      <GeometricBackground />

      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
        }}
      />

      {/* Overlay móvil */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/60 z-30 sm:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 border-r border-[#00e5ff11] bg-[#08101e] flex flex-col py-6 px-4 shrink-0
        transition-transform duration-200
        ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}
        sm:relative sm:translate-x-0 sm:z-[2]
      `}>
        {/* Esquinas */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#a855f7]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#a855f7]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#a855f744]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#a855f744]" />

        {/* Botón cerrar — solo móvil */}
        <button
          className="sm:hidden absolute top-4 right-4 text-[#6aacbc] hover:text-[#a0d4e0] transition-colors z-10"
          onClick={() => setSidebar(false)}
        >
          <X size={14} />
        </button>

        <div className="mb-8">
          <button
            onClick={() => { navigate('/selector'); setSidebar(false); }}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-4 rounded-sm border border-[#00e5ff22] bg-[#00e5ff08] hover:bg-[#00e5ff15] hover:border-[#00e5ff55] text-[#6aacbc] hover:text-[#00e5ff] text-[9px] tracking-widest transition-all"
          >
            <ChevronLeft size={11} /> PANEL PRINCIPAL
          </button>

          <p className="text-[#6aacbc] text-[7px] tracking-[4px] mb-0.5">// MÓDULO</p>
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
          {NAV.map(({ to, end, icon: Icon, label }) => {
            const badge = to === '/admin/asociados' && pendientesPortal > 0 ? pendientesPortal : 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebar(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] tracking-wider transition-colors ${
                    isActive
                      ? 'bg-[#a855f711] text-[#a855f7] border border-[#a855f722]'
                      : 'text-[#6aacbc] hover:text-[#a0d4e0] hover:bg-[#00e5ff08] border border-transparent'
                  }`
                }
              >
                <Icon size={13} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-[#ffb700] text-black text-[9px] font-bold rounded-sm flex items-center justify-center px-1 animate-pulse">
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#00e5ff11] pt-4">
          <p className="text-[#6aacbc] text-[9px] tracking-wider mb-3 truncate">{user?.nombre?.toUpperCase()}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d55] text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-all tracking-widest"
            >
              <LogOut size={12} /> CERRAR SESIÓN
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto relative z-[2] min-w-0">
        {/* Barra top — solo móvil */}
        <div className="sm:hidden flex items-center gap-3 px-4 py-3 border-b border-[#a855f711] bg-[#08101e] relative z-10">
          <button
            onClick={() => setSidebar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#a855f722] rounded-sm text-[#6aacbc] hover:text-[#a855f7] transition-colors"
          >
            <Menu size={14} />
          </button>
          <p className="text-[#00e5ff] font-bold tracking-[3px] text-sm" style={{ textShadow: '0 0 10px #00e5ff55' }}>KERNEL</p>
          <p className="text-[#a855f7] text-[9px] tracking-[2px]">// ADMIN</p>
        </div>

        <div className="p-4 sm:p-8 relative z-10">
          <Outlet />
        </div>
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
