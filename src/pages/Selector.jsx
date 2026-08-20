import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserCircle, Ticket, Bell, Users, ClipboardList, MonitorSmartphone, LogOut, Banknote, UsersRound, Building2, Search, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { NotificationProvider, useNotifications } from '../context/NotificationContext.jsx';
import apiService from '../services/apiService.js';
import GeometricBackground from '../components/GeometricBackground.jsx';
import BusquedaGlobal from '../components/BusquedaGlobal.jsx';


const MODULOS = [
  { modulo: 'gerencia',   ruta: '/gerencia',   nombre: 'Centro de Mando', descripcion: 'KPIs y métricas gerenciales', icon: LayoutDashboard, color: '#e879f9' },
  { modulo: 'admin',      ruta: '/admin',      nombre: 'Administración',  descripcion: 'Usuarios y permisos',         icon: Shield,          color: '#a855f7' },
  { modulo: 'sorteos',    ruta: '/sorteos',    nombre: 'Sorteos',         descripcion: 'Bonos y gestión de números',  icon: Ticket,          color: '#00e5ff' },
  { modulo: 'patronales', ruta: '/patronales', nombre: 'Patronales',      descripcion: 'Cuentas de cobro a empresas', icon: Banknote,        color: '#f59e0b' },
  { modulo: 'asociados',  ruta: '/asociados',  nombre: 'Asociados',       descripcion: 'Perfiles y vista transversal',icon: UsersRound,      color: '#10b981' },
  { modulo: 'empresas',   ruta: '/empresas',   nombre: 'Empresas',        descripcion: 'Perfiles, aportes y bonos',   icon: Building2,       color: '#f97316' },
];

const MetricaCard = ({ icon: Icon, valor, label, color, alerta, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#08101e] border rounded-sm px-4 py-4 flex items-center gap-3 relative overflow-hidden ${onClick ? 'cursor-pointer hover:bg-[#ffffff04] transition-colors' : ''}`}
    style={{ borderColor: alerta ? '#ffb70044' : '#00e5ff11' }}
  >
    <div className="absolute top-0 left-0 w-1/3 h-[1px]" style={{ background: alerta ? '#ffb700' : color, boxShadow: `0 0 6px ${alerta ? '#ffb700' : color}` }} />
    <div className="p-2 rounded-sm bg-[#0d1829]">
      <Icon size={15} style={{ color: alerta ? '#ffb700' : color }} />
    </div>
    <div>
      <p className="text-xl font-bold" style={{ color: alerta ? '#ffb700' : '#a0d4e0', textShadow: alerta ? '0 0 10px #ffb70044' : 'none' }}>
        {valor ?? '—'}
      </p>
      <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase">{label}</p>
    </div>
  </div>
);

const SelectorInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { notificaciones } = useNotifications();
  const sinLeer          = notificaciones.filter((n) => !n.leida).length;
  const [metricas, setMetricas]   = useState(null);
  const [busquedaAbierta, setBusquedaAbierta]     = useState(false);

  const cargarMetricas = () => {
    apiService.get('/admin/metricas')
      .then(({ data }) => setMetricas(data))
      .catch(() => {});
  };

  useEffect(() => { cargarMetricas(); }, []);

  // Refrescar métricas en tiempo real cuando llega solicitud de portal
  const ultimaNotifIdRef = useRef(null);
  useEffect(() => {
    const ultima = notificaciones[0];
    if (!ultima || ultima.id === ultimaNotifIdRef.current) return;
    ultimaNotifIdRef.current = ultima.id;
    cargarMetricas();
  }, [notificaciones]);

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setBusquedaAbierta(true);
      }
      if (e.key === 'Escape') setBusquedaAbierta(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#05080f] font-mono px-4 sm:px-6 py-7 sm:py-10 relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }} />

      <div className="max-w-4xl mx-auto relative z-[2]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// SISTEMA DE GESTIÓN COOPERATIVA</p>
            <h1 className="text-3xl font-bold text-[#00e5ff] tracking-[4px]" style={{ textShadow: '0 0 24px #00e5ff55' }}>
              KERNEL
            </h1>
            <p className="text-[#6aacbc] text-[10px] mt-1 tracking-[2px]">
              BIENVENIDO, {user?.nombre?.toUpperCase()}
            </p>
          </div>
          {/* Móvil: 4 botones en fila con ícono+etiqueta. Desktop: fila compacta */}
          <div className="grid grid-cols-4 sm:flex sm:items-center sm:gap-4 gap-1 bg-[#08101e] sm:bg-transparent border border-[#00e5ff0d] sm:border-0 rounded-sm sm:rounded-none p-1 sm:p-0">
            <button
              onClick={() => setBusquedaAbierta(true)}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-1.5 sm:px-3 rounded-sm sm:border sm:border-[#00e5ff11] sm:bg-[#08101e] hover:bg-[#00e5ff08] sm:hover:border-[#00e5ff33] text-[#6aacbc] hover:text-[#00e5ff] transition-all tracking-widest"
            >
              <Search size={18} className="sm:hidden" />
              <Search size={11} className="hidden sm:block" />
              <span className="text-[8px] sm:text-[9px]">BUSCAR</span>
              <kbd className="hidden sm:inline text-[7px] border border-[#6aacbc33] rounded px-1 py-0.5 ml-1 tracking-normal">Ctrl+K</kbd>
            </button>

            <button onClick={() => navigate('/notificaciones')}
              className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-0 rounded-sm hover:bg-[#00e5ff08] sm:hover:bg-transparent text-[#6aacbc] hover:text-[#00e5ff] transition-colors tracking-widest">
              <Bell size={18} className="sm:hidden" />
              <Bell size={13} className="hidden sm:block" />
              <span className="sm:hidden text-[8px]">NOTIF.</span>
              <span className="hidden sm:inline text-[9px]">NOTIFICACIONES</span>
              {sinLeer > 0 && (
                <span className="absolute top-1.5 right-3 sm:-top-1.5 sm:-right-3 min-w-[16px] h-4 bg-[#ff3d3d] rounded-sm text-white text-[9px] flex items-center justify-center px-0.5"
                  style={{ boxShadow: '0 0 6px #ff3d3d88' }}>
                  {sinLeer}
                </span>
              )}
            </button>

            <button onClick={() => navigate('/perfil')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-0 rounded-sm hover:bg-[#00e5ff08] sm:hover:bg-transparent text-[#6aacbc] hover:text-[#00e5ff] transition-colors tracking-widest">
              <UserCircle size={18} className="sm:hidden" />
              <UserCircle size={13} className="hidden sm:block" />
              <span className="sm:hidden text-[8px]">PERFIL</span>
              <span className="hidden sm:inline text-[9px]">MI PERFIL</span>
            </button>

            <button onClick={logout}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-1.5 sm:px-2 rounded-sm sm:border sm:border-[#ff3d3d22] sm:bg-[#ff3d3d08] hover:bg-[#ff3d3d15] sm:hover:border-[#ff3d3d55] text-[#6aacbc] hover:text-[#ff3d3d] transition-all tracking-widest">
              <LogOut size={18} className="sm:hidden" />
              <LogOut size={12} className="hidden sm:block" />
              <span className="sm:hidden text-[8px]">SALIR</span>
              <span className="hidden sm:inline text-[9px]">CERRAR SESIÓN</span>
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <MetricaCard icon={Users}         valor={metricas?.asociados_activos}      label="Asociados activos"      color="#00e5ff" />
          <MetricaCard icon={Ticket}        valor={metricas?.sorteos_activos}        label="Sorteos activos"        color="#3b82f6" />
          <MetricaCard icon={ClipboardList} valor={metricas?.solicitudes_pendientes} label="Solicitudes pendientes" color="#a855f7"
            alerta={metricas?.solicitudes_pendientes > 0} />
          <MetricaCard icon={MonitorSmartphone} valor={metricas?.portal_activos}
            label={`Con acceso al portal · ${metricas && metricas.asociados_activos > 0 ? Math.round(metricas.portal_activos / metricas.asociados_activos * 100) : 0}% adopción`}
            color="#10b981" />
        </div>

        {/* Módulos */}
        <p className="text-[#6aacbc] text-[8px] mb-4 tracking-[4px]">// MÓDULOS DEL SISTEMA</p>
        {(!user?.modulos?.length) && (
          <p className="text-[#6aacbc] text-[10px] tracking-widest py-8 text-center border border-[#00e5ff11] rounded-sm">
            SIN MÓDULOS ASIGNADOS — CONTACTA AL ADMINISTRADOR
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {MODULOS.filter((mod) => user?.modulos?.includes(mod.modulo)).map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.ruta}
                onClick={() => navigate(mod.ruta)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="text-left p-5 bg-[#08101e] border border-[#00e5ff11] hover:border-[#00e5ff33] hover:bg-[#00e5ff05] rounded-sm transition-all relative overflow-hidden group"
              >
                <span className="absolute top-0 left-0 w-0 group-hover:w-full h-[1px] transition-all duration-300"
                  style={{ background: mod.color, boxShadow: `0 0 8px ${mod.color}` }} />
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: mod.color + '66' }} />
                <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: mod.color + '66' }} />
                <Icon size={20} className="mb-4" style={{ color: mod.color, filter: `drop-shadow(0 0 6px ${mod.color}66)` }} />
                <p className="text-[#a0d4e0] font-medium text-sm tracking-wider">{mod.nombre.toUpperCase()}</p>
                <p className="text-[#6aacbc] text-[9px] mt-1 tracking-widest">{mod.descripcion.toUpperCase()}</p>
              </motion.button>
            );
          })}
        </div>

      </div>

      {/* Overlay de búsqueda */}
      <AnimatePresence>
        {busquedaAbierta && <BusquedaGlobal onClose={() => setBusquedaAbierta(false)} />}
      </AnimatePresence>


    </div>
  );
};

const Selector = () => (
  <NotificationProvider endpoint="/notificaciones">
    <SelectorInner />
  </NotificationProvider>
);

export default Selector;
