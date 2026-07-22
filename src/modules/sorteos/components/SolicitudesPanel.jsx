import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const TIPO_COLOR   = { adquisicion: 'text-[#00e5ff]', retiro: 'text-orange-400' };
const TIPO_BORDER  = { adquisicion: 'border-l-[#00e5ff55]', retiro: 'border-l-orange-500/40' };
const TIPO_LABEL   = { adquisicion: 'ADQUISICIÓN', retiro: 'RETIRO' };

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
      <div className="flex flex-col items-center justify-center py-20 text-[#1a4a55]">
        <Inbox size={32} className="mb-3 opacity-40" />
        <p className="text-sm tracking-widest">SIN SOLICITUDES PENDIENTES</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {solicitudes.map((s) => (
        <div
          key={s.id}
          className={`border border-[#00e5ff11] bg-[#08101e] rounded-sm p-4 border-l-2 ${TIPO_BORDER[s.tipo]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-bold tracking-widest ${TIPO_COLOR[s.tipo]}`}>
                  {TIPO_LABEL[s.tipo]}
                </span>
                <span
                  className="text-[#00e5ff] font-mono font-bold text-base"
                  style={{ textShadow: '0 0 8px #00e5ff44' }}
                >
                  #{String(s.numero).padStart(3, '0')}
                </span>
              </div>
              <p className="text-[#a0d4e0] text-sm">{s.nombre} {s.apellido}</p>
              <p className="text-[#1a4a55] text-[10px] font-mono mt-0.5">{s.asociado_codigo} · {s.nombre_empresa}</p>
              <p className="text-[#1a4a55] text-[9px] mt-1 tracking-wider">
                {new Date(s.created_at).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <input
                placeholder="Notas (opcional)"
                value={notas[s.id] ?? ''}
                onChange={(e) => setNotas({ ...notas, [s.id]: e.target.value })}
                className="bg-[#0d1829] border border-[#00e5ff11] rounded-sm px-2 py-1 text-[10px] text-[#a0d4e0] placeholder-[#1a4a55] focus:outline-none focus:border-[#00e5ff33] w-44 font-mono transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => gestionar(s.id, 'rechazar')}
                  disabled={procesando === s.id}
                  className="flex items-center gap-1 text-[10px] text-[#ff3d3d] border border-[#ff3d3d33] bg-[#ff3d3d0a] hover:bg-[#ff3d3d1a] px-3 py-1.5 rounded-sm transition-all disabled:opacity-40 tracking-widest"
                >
                  {procesando === s.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <XCircle size={12} />}
                  RECHAZAR
                </button>
                <button
                  onClick={() => gestionar(s.id, 'aprobar')}
                  disabled={procesando === s.id}
                  className="flex items-center gap-1 text-[10px] text-[#00e5ff] border border-[#00e5ff33] bg-[#00e5ff0a] hover:bg-[#00e5ff1a] px-3 py-1.5 rounded-sm transition-all disabled:opacity-40 tracking-widest"
                >
                  {procesando === s.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <CheckCircle size={12} />}
                  APROBAR
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
