import { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ESTADO_STYLE = {
  libre:                  'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 cursor-pointer',
  asignado:               'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 cursor-pointer',
  pendiente_adquisicion:  'bg-amber-900/50 text-amber-400 border border-amber-800/50 cursor-pointer',
  pendiente_retiro:       'bg-orange-900/50 text-orange-400 border border-orange-800/50 cursor-pointer',
};

const LEYENDA = [
  { estado: 'libre',               label: 'Libre' },
  { estado: 'asignado',            label: 'Asignado' },
  { estado: 'pendiente_adquisicion', label: 'Pendiente adq.' },
  { estado: 'pendiente_retiro',    label: 'Pendiente retiro' },
];

const BoletosGrid = ({ sorteoId, boletos, onRefresh }) => {
  const [modal, setModal]       = useState(null); // { numero, boleto }
  const [busqueda, setBusqueda] = useState('');
  const [asociado, setAsociado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const abrir = (b) => { setModal({ numero: b.numero, boleto: b }); setBusqueda(''); setAsociado(null); };
  const cerrar = () => { setModal(null); setAsociado(null); setBusqueda(''); };

  const buscarAsociado = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const { data } = await apiService.get(`/asociados?q=${busqueda}`);
      const found = data.find((a) => a.codigo === busqueda || `${a.nombre} ${a.apellido}`.toLowerCase().includes(busqueda.toLowerCase()));
      setAsociado(found ?? null);
      if (!found) toast.error('Asociado no encontrado');
    } catch {
      toast.error('Error al buscar asociado');
    } finally {
      setBuscando(false);
    }
  };

  const asignar = async () => {
    if (!asociado) return;
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/boletos/asignar`, {
        numero: modal.numero,
        asociado_codigo: asociado.codigo,
      });
      toast.success(`Número ${String(modal.numero).padStart(3, '0')} asignado`);
      cerrar();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al asignar');
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async () => {
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/boletos/retirar`, { numero: modal.numero });
      toast.success(`Número ${String(modal.numero).padStart(3, '0')} liberado`);
      cerrar();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al retirar');
    } finally {
      setGuardando(false);
    }
  };

  const b = modal?.boleto;

  return (
    <div>
      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {LEYENDA.map(({ estado, label }) => (
          <div key={estado} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm inline-block ${ESTADO_STYLE[estado].split(' ')[0]}`} />
            <span className="text-slate-500 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(40, minmax(0, 1fr))' }}>
        {boletos.map((b) => (
          <button
            key={b.numero}
            onClick={() => abrir(b)}
            title={b.nombre ? `${b.nombre} ${b.apellido}` : 'Libre'}
            className={`text-[9px] font-mono rounded py-1 text-center leading-none transition-colors ${ESTADO_STYLE[b.estado] ?? ESTADO_STYLE.libre}`}
          >
            {String(b.numero).padStart(3, '0')}
          </button>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">
                Número <span className="text-emerald-400">{String(modal.numero).padStart(3, '0')}</span>
              </h3>
              <button onClick={cerrar}><X size={16} className="text-slate-500 hover:text-white" /></button>
            </div>

            {/* Libre → asignar */}
            {b.estado === 'libre' && (
              <div className="flex flex-col gap-3">
                <p className="text-slate-400 text-xs">Busca el asociado por código o nombre:</p>
                <div className="flex gap-2">
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarAsociado()}
                    placeholder="Cédula o nombre"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button onClick={buscarAsociado} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors">
                    {buscando ? <Loader2 size={14} className="animate-spin text-white" /> : <Search size={14} className="text-white" />}
                  </button>
                </div>
                {asociado && (
                  <div className="bg-slate-800 rounded-lg p-3 text-xs">
                    <p className="text-white font-medium">{asociado.nombre} {asociado.apellido}</p>
                    <p className="text-slate-400">{asociado.codigo} · {asociado.nombre_empresa}</p>
                  </div>
                )}
                <button
                  onClick={asignar}
                  disabled={!asociado || guardando}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {guardando && <Loader2 size={12} className="animate-spin" />}
                  Asignar número
                </button>
              </div>
            )}

            {/* Asignado / pendiente retiro → retirar */}
            {(b.estado === 'asignado' || b.estado === 'pendiente_retiro') && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-xs">
                  <p className="text-slate-400 mb-1">Titular</p>
                  <p className="text-white font-medium">{b.nombre} {b.apellido}</p>
                  <p className="text-slate-400">{b.empresa_codigo} · {b.nombre_empresa}</p>
                  {b.estado === 'pendiente_retiro' && (
                    <p className="text-orange-400 mt-1">⏳ Solicitud de retiro pendiente</p>
                  )}
                </div>
                <button
                  onClick={retirar}
                  disabled={guardando}
                  className="bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {guardando && <Loader2 size={12} className="animate-spin" />}
                  Retirar número directamente
                </button>
              </div>
            )}

            {/* Pendiente adquisicion */}
            {b.estado === 'pendiente_adquisicion' && (
              <div className="bg-slate-800 rounded-lg p-3 text-xs">
                <p className="text-amber-400 text-xs mb-1">⏳ Solicitud de adquisición pendiente</p>
                <p className="text-slate-400">Gestiona la solicitud desde la pestaña <strong className="text-white">Solicitudes</strong>.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoletosGrid;
