import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext.jsx';

const TIPO_COLOR = {
  usuario_pendiente:         'text-amber-400',
  sincronizacion_completada: 'text-blue-400',
  solicitud_bono:            'text-violet-400',
  solicitud_aprobada:        'text-emerald-400',
  solicitud_rechazada:       'text-red-400',
  ganador_sorteo:            'text-yellow-400',
  solicitud_portal:          'text-amber-400',
};

const TIPO_RUTA = {
  solicitud_portal: '/admin/asociados',
  solicitud_bono:   '/sorteos',
};

// `claro`: versión para el Portal del Asociado (personas externas), con la estética pública en vez de la de Kernel
const NotificationBell = ({ openUp = true, alignRight = false, claro = false }) => {
  const { notificaciones, marcarLeida, marcarTodasLeidas } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const navigate        = useNavigate();
  const sinLeer         = notificaciones.filter((n) => !n.leida).length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (notif) => {
    if (!notif.leida) marcarLeida(notif.id);
    const ruta = TIPO_RUTA[notif.tipo];
    if (ruta) { setOpen(false); navigate(ruta); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className={`relative p-2 transition-colors ${claro ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
      >
        <Bell size={18} />
        {sinLeer > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center px-0.5">
            {sinLeer > 99 ? '99+' : sinLeer}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute w-80 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl z-50 ${claro ? 'bg-white border border-slate-200' : 'bg-[#0f172a] border border-slate-800'} ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} ${alignRight ? 'right-0' : 'left-0'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${claro ? 'border-slate-200' : 'border-slate-800'}`}>
            <p className={`font-medium ${claro ? 'text-sm text-slate-600' : 'text-xs text-slate-400'}`}>Notificaciones</p>
            {sinLeer > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className={`flex items-center gap-1 transition-colors ${claro ? 'text-xs text-slate-500 hover:text-slate-900' : 'text-[10px] text-slate-500 hover:text-white'}`}
              >
                <CheckCheck size={12} /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className={`px-4 py-6 text-center ${claro ? 'text-sm text-slate-500' : 'text-slate-600 text-xs'}`}>Sin notificaciones</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`px-4 py-3 border-b cursor-pointer transition-colors ${claro ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-800/50 hover:bg-slate-800/40'} ${
                    n.leida ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.leida && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                    <div className={n.leida ? 'ml-3.5' : ''}>
                      <p className={`font-medium ${claro ? 'text-sm text-slate-800' : `text-xs ${TIPO_COLOR[n.tipo] ?? 'text-slate-200'}`}`}>
                        {n.mensaje}
                      </p>
                      <p className={`mt-0.5 capitalize ${claro ? 'text-xs text-slate-500' : 'text-slate-600 text-[10px]'}`}>{n.modulo}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
