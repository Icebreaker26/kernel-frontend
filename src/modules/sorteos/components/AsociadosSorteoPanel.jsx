import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Building2, Ticket, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota, coincideBusqueda } from '../../../utils/asociados.js';

const ACCION_COLOR = {
  COMPRA_DIRECTA:       'text-emerald-400',
  ANULACION_DIRECTA:    'text-red-400',
  SOLICITUD_ADQUISICION:'text-blue-400',
  APROBACION:           'text-emerald-400',
  RECHAZO:              'text-red-400',
  SOLICITUD_RETIRO:     'text-amber-400',
  APROBACION_RETIRO:    'text-amber-400',
  RECHAZO_RETIRO:       'text-red-400',
  CANCELACION_ASOCIADO: 'text-slate-400',
};

const fmt = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Modal perfil asociado ────────────────────────────────────────────────────

const PerfilModal = ({ asociado, sorteoId, onClose }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get(`/sorteos/${sorteoId}/asociados/${asociado.codigo}/historial`)
      .then(({ data }) => setHistorial(data))
      .catch(() => toast.error('Error cargando historial'))
      .finally(() => setLoading(false));
  }, [asociado.codigo, sorteoId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <p className="text-white font-bold text-sm">{asociado.nombre} {asociado.apellido}</p>
            <p className="text-slate-500 text-xs mt-0.5">CC {asociado.codigo}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Datos personales */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Phone,     valor: asociado.movil        || '—', label: 'Móvil' },
              { icon: MapPin,    valor: asociado.ciudad        || '—', label: 'Ciudad' },
              { icon: Building2, valor: asociado.nombre_empresa|| '—', label: 'Empresa' },
              { icon: User,      valor: labelClaseCuota(asociado.clase_cuota), label: 'Clase cuota' },
            ].map(({ icon: Icon, valor, label }) => (
              <div key={label} className="bg-slate-900 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Icon size={12} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="text-xs text-slate-200">{valor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bonos activos */}
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">
              Bonos activos ({asociado.boletos_activos})
            </p>
            {asociado.numeros_activos?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {asociado.numeros_activos.map((n) => (
                  <span key={n} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 border border-emerald-800/50 rounded-md text-emerald-400 text-xs font-mono">
                    <Ticket size={10} /> #{String(n).padStart(3, '0')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-xs">Sin bonos activos</p>
            )}
          </div>

          {/* Historial */}
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">Historial en este sorteo</p>
            {loading ? (
              <p className="text-slate-600 text-xs">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-slate-600 text-xs">Sin movimientos registrados</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historial.map((h, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <span className={`text-[10px] font-medium ${ACCION_COLOR[h.accion] ?? 'text-slate-400'}`}>
                          {h.accion.replace(/_/g, ' ')}
                        </span>
                        {h.numero !== null && (
                          <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                            #{String(h.numero).padStart(3, '0')}
                          </span>
                        )}
                        {h.detalle && <p className="text-slate-600 text-[10px] mt-0.5">{h.detalle}</p>}
                      </div>
                    </div>
                    <p className="text-slate-600 text-[10px] shrink-0">{fmt(h.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Panel principal ──────────────────────────────────────────────────────────

const AsociadosSorteoPanel = ({ sorteoId }) => {
  const [asociados, setAsociados] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [empresa, setEmpresa]           = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [pagina, setPagina]             = useState(0);
  const POR_PAGINA = 50;

  const empresas = useMemo(() =>
    [...new Set(asociados.map((a) => a.nombre_empresa).filter(Boolean))].sort()
  , [asociados]);

  useEffect(() => {
    apiService.get(`/sorteos/${sorteoId}/asociados`)
      .then(({ data }) => setAsociados(data))
      .catch(() => toast.error('Error cargando asociados'))
      .finally(() => setLoading(false));
  }, [sorteoId]);

  const filtrados = useMemo(() => {
    setPagina(0);
    return asociados.filter((a) => {
      if (empresa && a.nombre_empresa !== empresa) return false;
      if (busqueda && !coincideBusqueda(busqueda, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '')) return false;
      return true;
    });
  }, [asociados, busqueda, empresa]);

  const paginas     = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles    = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Buscador */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600/60"
          />
        </div>
        <select
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-600/60 cursor-pointer max-w-48"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <p className="text-slate-600 text-xs shrink-0">
          {filtrados.length} de {asociados.length} participantes
        </p>
      </div>

      {/* Tabla */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="text-left px-4 py-3">Asociado</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Bonos activos</th>
              <th className="text-left px-4 py-3">Números</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                  {busqueda ? 'Sin resultados' : 'Ningún asociado tiene bonos en este sorteo'}
                </td>
              </tr>
            ) : visibles.map((a) => (
              <motion.tr
                key={a.codigo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                onClick={() => setSeleccionado(a)}
                className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="text-slate-200">{a.nombre} {a.apellido}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5 font-mono">{a.codigo}</p>
                </td>
                <td className="px-4 py-3 text-slate-400">{a.nombre_empresa || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 text-xs">
                    {a.boletos_activos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(a.numeros_activos ?? []).slice(0, 5).map((n) => (
                      <span key={n} className="font-mono text-[10px] text-slate-400">
                        #{String(n).padStart(3, '0')}
                      </span>
                    ))}
                    {(a.numeros_activos ?? []).length > 5 && (
                      <span className="text-slate-600 text-[10px]">+{a.numeros_activos.length - 5}</span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-slate-600 text-xs">
            {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, filtrados.length)} de {filtrados.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(p - 1, 0))}
              disabled={pagina === 0}
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >← Ant</button>
            {Array.from({ length: paginas }, (_, i) => i)
              .filter((i) => i === 0 || i === paginas - 1 || Math.abs(i - pagina) <= 1)
              .reduce((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…');
                acc.push(i);
                return acc;
              }, [])
              .map((item, i) =>
                item === '…'
                  ? <span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>
                  : <button
                      key={item}
                      onClick={() => setPagina(item)}
                      className={`w-7 h-7 text-xs rounded transition-colors ${item === pagina ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}
                    >{item + 1}</button>
              )}
            <button
              onClick={() => setPagina((p) => Math.min(p + 1, paginas - 1))}
              disabled={pagina === paginas - 1}
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >Sig →</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {seleccionado && (
          <PerfilModal
            asociado={seleccionado}
            sorteoId={sorteoId}
            onClose={() => setSeleccionado(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AsociadosSorteoPanel;
