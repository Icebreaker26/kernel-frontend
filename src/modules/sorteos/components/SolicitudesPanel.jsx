import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const TIPO_LABEL = { adquisicion: 'Adquisición', retiro: 'Retiro' };
const TIPO_COLOR = { adquisicion: 'text-emerald-400', retiro: 'text-orange-400' };

const SolicitudesPanel = ({ sorteoId, solicitudes, onRefresh }) => {
  const [procesando, setProcesando] = useState(null);
  const [notas, setNotas]           = useState({});

  const gestionar = async (sid, accion) => {
    setProcesando(sid);
    try {
      await apiService.post(`/sorteos/${sorteoId}/solicitudes/${sid}/${accion}`, {
        notas: notas[sid] ?? '',
      });
      toast.success(accion === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al gestionar solicitud');
    } finally {
      setProcesando(null);
    }
  };

  if (solicitudes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600">
        <Inbox size={32} className="mb-3" />
        <p className="text-sm">Sin solicitudes pendientes</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {solicitudes.map((s) => (
        <div key={s.id} className="border border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${TIPO_COLOR[s.tipo]}`}>
                  {TIPO_LABEL[s.tipo]}
                </span>
                <span className="text-white font-mono font-bold">
                  #{String(s.numero).padStart(3, '0')}
                </span>
              </div>
              <p className="text-white text-sm">{s.nombre} {s.apellido}</p>
              <p className="text-slate-400 text-xs">{s.asociado_codigo} · {s.nombre_empresa}</p>
              <p className="text-slate-600 text-xs mt-1">
                {new Date(s.created_at).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <input
                placeholder="Notas (opcional)"
                value={notas[s.id] ?? ''}
                onChange={(e) => setNotas({ ...notas, [s.id]: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-500 w-44"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => gestionar(s.id, 'rechazar')}
                  disabled={procesando === s.id}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {procesando === s.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <XCircle size={12} />}
                  Rechazar
                </button>
                <button
                  onClick={() => gestionar(s.id, 'aprobar')}
                  disabled={procesando === s.id}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {procesando === s.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <CheckCircle size={12} />}
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SolicitudesPanel;
