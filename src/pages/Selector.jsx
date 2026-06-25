import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserCircle, Ticket, Bell, Users, RefreshCw, ClipboardList, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { NotificationProvider, useNotifications } from '../context/NotificationContext.jsx';
import apiService from '../services/apiService.js';

const MODULOS = [
  { ruta: '/admin',   nombre: 'Administración', descripcion: 'Usuarios y permisos',        icon: Shield, color: 'text-violet-400', border: 'hover:border-violet-600/40' },
  { ruta: '/sorteos', nombre: 'Sorteos',         descripcion: 'Bonos y gestión de números', icon: Ticket, color: 'text-emerald-400', border: 'hover:border-emerald-600/40' },
];

const MetricaCard = ({ icon: Icon, valor, label, color, alerta }) => (
  <div className={`bg-slate-900 border rounded-xl px-4 py-4 flex items-center gap-3 ${alerta ? 'border-amber-600/40' : 'border-slate-800'}`}>
    <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
      <Icon size={15} />
    </div>
    <div>
      <p className={`text-xl font-bold ${alerta ? 'text-amber-400' : 'text-white'}`}>{valor ?? '—'}</p>
      <p className="text-slate-500 text-xs">{label}</p>
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
    <div className="min-h-screen bg-[#020617] font-mono px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">kernel</h1>
            <p className="text-slate-500 text-xs mt-0.5">Bienvenido, {user?.nombre}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notificaciones')}
              className="relative flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <Bell size={14} />
              Notificaciones
              {sinLeer > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center px-0.5">
                  {sinLeer}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <UserCircle size={14} /> Mi perfil
            </button>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-white transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <MetricaCard icon={Users}        valor={metricas?.asociados_activos}     label="Asociados activos"       color="text-emerald-400" />
          <MetricaCard icon={Ticket}       valor={metricas?.sorteos_activos}       label="Sorteos activos"         color="text-blue-400" />
          <MetricaCard icon={ClipboardList} valor={metricas?.solicitudes_pendientes} label="Solicitudes pendientes" color="text-violet-400"
            alerta={metricas?.solicitudes_pendientes > 0} />
          <MetricaCard icon={UserCheck}    valor={metricas?.usuarios_pendientes}   label="Usuarios por aprobar"    color="text-amber-400"
            alerta={metricas?.usuarios_pendientes > 0} />
        </div>

        {/* Módulos */}
        <p className="text-slate-600 text-xs mb-3 tracking-wider uppercase">Módulos</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {MODULOS.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.ruta}
                onClick={() => navigate(mod.ruta)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`text-left p-5 bg-slate-900 border border-slate-800 ${mod.border} rounded-xl transition-colors`}
              >
                <Icon size={18} className={`${mod.color} mb-3`} />
                <p className="text-white font-medium text-sm">{mod.nombre}</p>
                <p className="text-slate-500 text-xs mt-1">{mod.descripcion}</p>
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
