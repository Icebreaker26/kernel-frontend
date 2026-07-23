import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserCircle, Ticket, Bell, Users, ClipboardList, UserCheck, LogOut, Banknote } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { NotificationProvider, useNotifications } from '../context/NotificationContext.jsx';
import apiService from '../services/apiService.js';
import GeometricBackground from '../components/GeometricBackground.jsx';

const MODULOS = [
  {
    modulo: 'admin',
    ruta: '/admin',
    nombre: 'Administración',
    descripcion: 'Usuarios y permisos',
    icon: Shield,
    color: '#a855f7',
  },
  {
    modulo: 'sorteos',
    ruta: '/sorteos',
    nombre: 'Sorteos',
    descripcion: 'Bonos y gestión de números',
    icon: Ticket,
    color: '#00e5ff',
  },
  {
    modulo: 'patronales',
    ruta: '/patronales',
    nombre: 'Patronales',
    descripcion: 'Cuentas de cobro a empresas',
    icon: Banknote,
    color: '#f59e0b',
  },
];

const MetricaCard = ({ icon: Icon, valor, label, color, alerta }) => (
  <div
    className="bg-[#08101e] border rounded-sm px-4 py-4 flex items-center gap-3 relative overflow-hidden"
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
  const [metricas, setMetricas] = useState(null);

  useEffect(() => {
    apiService.get('/admin/metricas')
      .then(({ data }) => setMetricas(data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#05080f] font-mono px-6 py-10 relative">
      <GeometricBackground />
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
        }}
      />

      <div className="max-w-4xl mx-auto relative z-[2]">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// SISTEMA DE GESTIÓN COOPERATIVA</p>
            <h1
              className="text-3xl font-bold text-[#00e5ff] tracking-[4px]"
              style={{ textShadow: '0 0 24px #00e5ff55' }}
            >
              KERNEL
            </h1>
            <p className="text-[#6aacbc] text-[10px] mt-1 tracking-[2px]">
              BIENVENIDO, {user?.nombre?.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/notificaciones')}
              className="relative flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#00e5ff] transition-colors tracking-widest"
            >
              <Bell size={13} />
              NOTIFICACIONES
              {sinLeer > 0 && (
                <span
                  className="absolute -top-1.5 -right-3 min-w-[16px] h-4 bg-[#ff3d3d] rounded-sm text-white text-[9px] flex items-center justify-center px-0.5"
                  style={{ boxShadow: '0 0 6px #ff3d3d88' }}
                >
                  {sinLeer}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#00e5ff] transition-colors tracking-widest"
            >
              <UserCircle size={13} /> MI PERFIL
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d55] text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-all tracking-widest"
            >
              <LogOut size={12} /> CERRAR SESIÓN
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <MetricaCard icon={Users}         valor={metricas?.asociados_activos}      label="Asociados activos"      color="#00e5ff" />
          <MetricaCard icon={Ticket}        valor={metricas?.sorteos_activos}        label="Sorteos activos"        color="#3b82f6" />
          <MetricaCard icon={ClipboardList} valor={metricas?.solicitudes_pendientes} label="Solicitudes pendientes" color="#a855f7"
            alerta={metricas?.solicitudes_pendientes > 0} />
          <MetricaCard icon={UserCheck}     valor={metricas?.usuarios_pendientes}    label="Usuarios por aprobar"   color="#ffb700"
            alerta={metricas?.usuarios_pendientes > 0} />
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
                <span
                  className="absolute top-0 left-0 w-0 group-hover:w-full h-[1px] transition-all duration-300"
                  style={{ background: mod.color, boxShadow: `0 0 8px ${mod.color}` }}
                />
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: mod.color + '66' }} />
                <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: mod.color + '66' }} />

                <Icon
                  size={20}
                  className="mb-4"
                  style={{ color: mod.color, filter: `drop-shadow(0 0 6px ${mod.color}66)` }}
                />
                <p className="text-[#a0d4e0] font-medium text-sm tracking-wider">{mod.nombre.toUpperCase()}</p>
                <p className="text-[#6aacbc] text-[9px] mt-1 tracking-widest">{mod.descripcion.toUpperCase()}</p>
              </motion.button>
            );
          })}
        </div>

      </div>
    </div>
  );
};

const Selector = () => (
  <NotificationProvider endpoint="/notificaciones">
    <SelectorInner />
  </NotificationProvider>
);

export default Selector;
