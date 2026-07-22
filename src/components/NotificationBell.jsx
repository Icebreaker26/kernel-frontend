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

const NotificationBell = () => {
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
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell size={18} />
        {sinLeer > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center px-0.5">
            {sinLeer > 99 ? '99+' : sinLeer}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-80 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Notificaciones</p>
            {sinLeer > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors"
              >
                <CheckCheck size={12} /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="text-slate-600 text-xs px-4 py-6 text-center">Sin notificaciones</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    n.leida ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.leida && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                    <div className={n.leida ? 'ml-3.5' : ''}>
                      <p className={`text-xs font-medium ${TIPO_COLOR[n.tipo] ?? 'text-slate-200'}`}>
                        {n.mensaje}
                      </p>
                      <p className="text-slate-600 text-[10px] mt-0.5 capitalize">{n.modulo}</p>
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
