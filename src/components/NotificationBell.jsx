import { Bell } from 'lucide-react';
import { useState } from 'react';

const NotificationBell = ({ notificaciones = [] }) => {
  const [open, setOpen] = useState(false);
  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {sinLeer > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {sinLeer}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50">
          <p className="text-xs text-slate-500 px-4 py-3 border-b border-slate-800">Notificaciones</p>
          {notificaciones.length === 0 ? (
            <p className="text-slate-500 text-xs px-4 py-4">Sin notificaciones</p>
          ) : (
            notificaciones.slice(0, 8).map((n, i) => (
              <div key={i} className={`px-4 py-3 text-xs border-b border-slate-800 ${n.leida ? 'text-slate-500' : 'text-slate-200'}`}>
                <p className="font-medium">{n.mensaje}</p>
                <p className="text-slate-600 mt-1">{n.modulo}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
