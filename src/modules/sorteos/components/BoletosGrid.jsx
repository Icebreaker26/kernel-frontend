import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search, Loader2, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { coincideBusqueda } from '../../../utils/asociados.js';

const ESTADO_STYLE = {
  libre:                 'bg-slate-800 text-slate-500',
  asignado:              'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50',
  pendiente_adquisicion: 'bg-amber-900/50  text-amber-400  border border-amber-800/50',
  pendiente_retiro:      'bg-orange-900/50 text-orange-400 border border-orange-800/50',
};

const LEYENDA = [
  { estado: 'libre',                label: 'Libre' },
  { estado: 'asignado',             label: 'Asignado' },
  { estado: 'pendiente_adquisicion', label: 'Pendiente adq.' },
  { estado: 'pendiente_retiro',     label: 'Pendiente retiro' },
];

// ── Buscador de asociado con dropdown ───────────────────────────────────────

const BuscadorAsociado = ({ onSelect }) => {
  const [q, setQ]               = useState('');
  const [todos, setTodos]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto]   = useState(false);
  const ref                     = useRef(null);

  useEffect(() => {
    apiService.get('/asociados')
      .then(({ data }) => setTodos(data))
      .finally(() => setCargando(false));

    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    return todos.filter((a) => coincideBusqueda(q, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '')).slice(0, 8);
  }, [q, todos]);

  const seleccionar = (a) => {
    onSelect(a);
    setQ('');
    setAbierto(false);
  };

  return (
    <div ref={ref} className="relative w-72">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-emerald-600/60">
        {cargando
          ? <Loader2 size={13} className="text-slate-500 shrink-0 animate-spin" />
          : <Search size={13} className="text-slate-500 shrink-0" />}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar asociado..."
          className="bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none w-full"
        />
        {q && (
          <button onClick={() => { setQ(''); setAbierto(false); }} className="text-slate-600 hover:text-white">
            <X size={11} />
          </button>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden z-30 shadow-xl">
          {resultados.map((a) => (
            <button
              key={a.codigo}
              onMouseDown={() => seleccionar(a)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
            >
              <p className="text-xs text-white">{a.nombre} {a.apellido}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{a.codigo} · {a.nombre_empresa ?? '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Modal para boleto asignado / pendiente ───────────────────────────────────

const ModalBoleto = ({ modal, onCerrar, onRetirar, guardando }) => {
  const b = modal.boleto;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">
            Número <span className="text-emerald-400 font-mono">{String(modal.numero).padStart(3, '0')}</span>
          </h3>
          <button onClick={onCerrar}><X size={16} className="text-slate-500 hover:text-white" /></button>
        </div>

        {(b.estado === 'asignado' || b.estado === 'pendiente_retiro') && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-xs">
              <p className="text-slate-400 mb-1">Titular</p>
              <p className="text-white font-medium">{b.nombre} {b.apellido}</p>
              <p className="text-slate-400 font-mono">{b.empresa_codigo} · {b.nombre_empresa}</p>
              {b.estado === 'pendiente_retiro' && (
                <p className="text-orange-400 mt-1.5 text-[10px]">⏳ Solicitud de retiro pendiente</p>
              )}
            </div>
            <button
              onClick={onRetirar}
              disabled={guardando}
              className="bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {guardando && <Loader2 size={12} className="animate-spin" />}
              Retirar número directamente
            </button>
          </div>
        )}

        {b.estado === 'pendiente_adquisicion' && (
          <div className="bg-slate-800 rounded-lg p-3 text-xs">
            <p className="text-amber-400 mb-1">⏳ Solicitud de adquisición pendiente</p>
            <p className="text-slate-400">Gestiona desde la pestaña <strong className="text-white">Solicitudes</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Grid principal ───────────────────────────────────────────────────────────

const BoletosGrid = ({ sorteoId, boletos, onRefresh }) => {
  const [asociado, setAsociado]   = useState(null);
  const [modal, setModal]         = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cerrarModal = () => setModal(null);

  const handleClick = async (b) => {
    if (b.estado === 'libre') {
      if (!asociado) return;
      setGuardando(true);
      try {
        await apiService.post(`/sorteos/${sorteoId}/boletos/asignar`, {
          numero: b.numero,
          asociado_codigo: asociado.codigo,
        });
        toast.success(`#${String(b.numero).padStart(3, '0')} asignado a ${asociado.nombre} ${asociado.apellido}`);
        onRefresh();
      } catch (err) {
        toast.error(err.response?.data?.error ?? 'Error al asignar');
      } finally {
        setGuardando(false);
      }
      return;
    }
    setModal({ numero: b.numero, boleto: b });
  };

  const retirar = async () => {
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/boletos/retirar`, { numero: modal.numero });
      toast.success(`#${String(modal.numero).padStart(3, '0')} liberado`);
      cerrarModal();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al retirar');
    } finally {
      setGuardando(false);
    }
  };

  const modoAsignacion = !!asociado;

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {!asociado ? (
          <BuscadorAsociado onSelect={setAsociado} />
        ) : (
          <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-3 py-2">
            <UserCheck size={13} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-white font-medium leading-none">{asociado.nombre} {asociado.apellido}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{asociado.codigo}</p>
            </div>
            <button
              onClick={() => setAsociado(null)}
              className="ml-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {modoAsignacion && (
          <p className="text-emerald-400/70 text-xs">
            Haz click en un boleto libre para asignarlo
          </p>
        )}

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 ml-auto">
          {LEYENDA.map(({ estado, label }) => (
            <div key={estado} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm inline-block ${ESTADO_STYLE[estado].split(' ')[0]}`} />
              <span className="text-slate-500 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(40, minmax(0, 1fr))' }}>
        {boletos.map((b) => {
          const esLibre = b.estado === 'libre';
          const clickable = !esLibre || modoAsignacion;
          return (
            <button
              key={b.numero}
              onClick={() => clickable && handleClick(b)}
              title={
                esLibre && modoAsignacion
                  ? `Asignar a ${asociado.nombre} ${asociado.apellido}`
                  : b.nombre ? `${b.nombre} ${b.apellido}` : 'Libre'
              }
              disabled={guardando && esLibre}
              className={`text-[9px] font-mono rounded py-1 text-center leading-none transition-colors ${
                esLibre && modoAsignacion
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/60 hover:bg-emerald-700/50 cursor-pointer'
                  : esLibre
                  ? 'bg-slate-800 text-slate-600 cursor-default'
                  : `${ESTADO_STYLE[b.estado]} cursor-pointer hover:opacity-80`
              }`}
            >
              {String(b.numero).padStart(3, '0')}
            </button>
          );
        })}
      </div>

      {/* Modal para boletos asignados/pendientes */}
      {modal && (
        <ModalBoleto
          modal={modal}
          onCerrar={cerrarModal}
          onRetirar={retirar}
          guardando={guardando}
        />
      )}
    </div>
  );
};

export default BoletosGrid;
