import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, ArrowLeft, X, Loader2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { useAsociado } from '../../../context/AsociadoContext.jsx';

const ESTADO_STYLE = {
  libre:                 'bg-slate-800 text-slate-500 hover:bg-slate-700 cursor-pointer',
  pendiente_adquisicion: 'bg-amber-900/50 text-amber-400 border border-amber-800/50',
  asignado:              'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50',
  pendiente_retiro:      'bg-orange-900/50 text-orange-400 border border-orange-800/50',
};

const PortalSorteos = () => {
  const navigate               = useNavigate();
  const { asociado }           = useAsociado();
  const [data, setData]        = useState(null);
  const [loading, setLoading]  = useState(true);
  const [modal, setModal]      = useState(null); // número a solicitar
  const [accion, setAccion]    = useState(null); // { tipo: 'solicitar'|'retirar', numero, solicitudId }
  const [procesando, setProcesando] = useState(false);

  const cargar = () =>
    apiService.get('/sorteos/portal/activo')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));

  useEffect(() => { cargar(); }, []);

  const solicitar = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar', { numero, sorteo_id: data.sorteo.id });
      toast.success(`Solicitud para el #${String(numero).padStart(3, '0')} enviada`);
      setModal(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al solicitar');
    } finally {
      setProcesando(false);
    }
  };

  const solicitarRetiro = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar-retiro', { numero, sorteo_id: data.sorteo.id });
      toast.success(`Solicitud de retiro para el #${String(numero).padStart(3, '0')} enviada`);
      setAccion(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al solicitar retiro');
    } finally {
      setProcesando(false);
    }
  };

  const cancelar = async (solicitudId) => {
    setProcesando(true);
    try {
      await apiService.delete(`/sorteos/portal/solicitudes/${solicitudId}`);
      toast.success('Solicitud cancelada');
      setAccion(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al cancelar');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <Loader2 size={24} className="animate-spin text-slate-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-white p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/portal')}
        className="flex items-center gap-2 text-slate-500 hover:text-white text-xs mb-6 transition-colors">
        <ArrowLeft size={14} /> Volver a mis datos
      </button>

      <div className="flex items-center gap-2 mb-6">
        <Ticket size={18} className="text-emerald-400" />
        <h1 className="text-lg font-bold">Mis bonos</h1>
      </div>

      {!data?.sorteo ? (
        <div className="text-center py-20 text-slate-600">
          <Ticket size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">No hay un sorteo activo para tu empresa</p>
        </div>
      ) : (
        <>
          {/* Info sorteo */}
          <div className="border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{data.sorteo.nombre}</p>
                {data.sorteo.descripcion && <p className="text-slate-500 text-xs mt-0.5">{data.sorteo.descripcion}</p>}
              </div>
              <span className="text-emerald-400 text-xs bg-emerald-900/40 px-2 py-1 rounded">activo</span>
            </div>
          </div>

          {/* Mis boletos */}
          {data.mis_boletos.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-3">Mis números</h2>
              <div className="flex flex-wrap gap-2">
                {data.mis_boletos.map((b) => (
                  <button
                    key={b.numero}
                    onClick={() => {
                      if (b.estado === 'asignado') setAccion({ tipo: 'retirar', numero: b.numero });
                      if (b.estado === 'pendiente_adquisicion') setAccion({ tipo: 'cancelar_adq', numero: b.numero, solicitudId: b.solicitud_id });
                      if (b.estado === 'pendiente_retiro') setAccion({ tipo: 'cancelar_ret', numero: b.numero, solicitudId: b.solicitud_id });
                    }}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs transition-colors ${ESTADO_STYLE[b.estado]}`}
                  >
                    <span className="font-bold font-mono text-sm">{String(b.numero).padStart(3, '0')}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">
                      {b.estado === 'asignado' && 'tuyo'}
                      {b.estado === 'pendiente_adquisicion' && <><Clock size={9} className="inline mr-0.5" />pendiente</>}
                      {b.estado === 'pendiente_retiro' && <><Clock size={9} className="inline mr-0.5" />retirando</>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Disponibles */}
          <section>
            <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-3">
              Números disponibles ({data.disponibles.length})
            </h2>
            {data.disponibles.length === 0 ? (
              <p className="text-slate-600 text-xs">No hay números disponibles</p>
            ) : (
              <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
                {data.disponibles.map(({ numero }) => (
                  <button
                    key={numero}
                    onClick={() => setModal(numero)}
                    className="text-[10px] font-mono py-1.5 rounded bg-slate-800 text-slate-400 hover:bg-emerald-900/40 hover:text-emerald-400 transition-colors"
                  >
                    {String(numero).padStart(3, '0')}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modal solicitar adquisición */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Solicitar número</h3>
              <button onClick={() => setModal(null)}><X size={16} className="text-slate-500" /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              ¿Confirmas que quieres solicitar el número{' '}
              <span className="text-white font-bold font-mono">#{String(modal).padStart(3, '0')}</span>?
            </p>
            <p className="text-slate-600 text-xs mb-5">
              El número quedará bloqueado mientras un empleado aprueba tu solicitud.
              El valor mensual es <strong className="text-white">$3.000</strong> o <strong className="text-white">$1.500</strong> quincenal según tu clase de cuota.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="text-xs text-slate-400 hover:text-white px-4 py-2 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => solicitar(modal)}
                disabled={procesando}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
              >
                {procesando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Confirmar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal acciones sobre mis boletos */}
      {accion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">
                Número <span className="font-mono text-emerald-400">#{String(accion.numero).padStart(3, '0')}</span>
              </h3>
              <button onClick={() => setAccion(null)}><X size={16} className="text-slate-500" /></button>
            </div>

            {accion.tipo === 'retirar' && (
              <>
                <p className="text-slate-400 text-sm mb-5">¿Quieres solicitar el retiro de este número? Un empleado deberá aprobarlo.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAccion(null)} className="text-xs text-slate-400 hover:text-white px-4 py-2 transition-colors">Cancelar</button>
                  <button
                    onClick={() => solicitarRetiro(accion.numero)}
                    disabled={procesando}
                    className="flex items-center gap-2 bg-orange-600/80 hover:bg-orange-600 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                  >
                    {procesando ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Solicitar retiro
                  </button>
                </div>
              </>
            )}

            {(accion.tipo === 'cancelar_adq' || accion.tipo === 'cancelar_ret') && (
              <>
                <p className="text-slate-400 text-sm mb-2">
                  {accion.tipo === 'cancelar_adq'
                    ? 'Tu solicitud de adquisición está pendiente de aprobación.'
                    : 'Tu solicitud de retiro está pendiente de aprobación.'}
                </p>
                <p className="text-slate-500 text-xs mb-5">¿Quieres cancelar esta solicitud?</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAccion(null)} className="text-xs text-slate-400 hover:text-white px-4 py-2 transition-colors">Cerrar</button>
                  <button
                    onClick={() => cancelar(accion.solicitudId)}
                    disabled={procesando}
                    className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                  >
                    {procesando ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Cancelar solicitud
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalSorteos;
