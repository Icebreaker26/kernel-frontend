import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, ChevronLeft } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const TIPO_COLOR = {
  usuario_pendiente:         'border-l-amber-400',
  sincronizacion_completada: 'border-l-blue-400',
  solicitud_bono:            'border-l-violet-400',
  solicitud_aprobada:        'border-l-emerald-400',
  solicitud_rechazada:       'border-l-red-400',
  ganador_sorteo:            'border-l-yellow-400',
};

const TIPO_LABEL = {
  usuario_pendiente:         'Admin',
  sincronizacion_completada: 'Asociados',
  solicitud_bono:            'Sorteos',
  solicitud_aprobada:        'Sorteos',
  solicitud_rechazada:       'Sorteos',
  ganador_sorteo:            'Sorteos',
};

const formatFecha = (fecha) => {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Notificaciones = () => {
  const navigate = useNavigate();
  const { notificaciones, marcarLeida, marcarTodasLeidas } = useNotifications();
  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="min-h-screen bg-[#020617] font-mono px-6 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/selector')}
              className="flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-3 transition-colors"
            >
              <ChevronLeft size={13} /> Selector
            </button>
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-violet-400" />
              <h1 className="text-white font-bold text-lg">Notificaciones</h1>
              {sinLeer > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 text-xs">
                  {sinLeer} sin leer
                </span>
              )}
            </div>
          </div>
          {sinLeer > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 px-3 py-2 rounded-lg transition-colors"
            >
              <CheckCheck size={13} /> Marcar todas como leídas
            </button>
          )}
        </div>

        {notificaciones.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">Sin notificaciones</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notificaciones.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => { if (!n.leida) marcarLeida(n.id); }}
                className={`border border-slate-800 border-l-2 ${TIPO_COLOR[n.tipo] ?? 'border-l-slate-600'} rounded-xl px-5 py-4 cursor-pointer hover:bg-slate-900/60 transition-colors ${n.leida ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                        {TIPO_LABEL[n.tipo] ?? n.modulo}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm">{n.mensaje}</p>
                  </div>
                  <p className="text-slate-600 text-[10px] shrink-0 mt-0.5">{formatFecha(n.created_at)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;
