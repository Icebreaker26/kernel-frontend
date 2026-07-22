import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Building2, Ticket, Search, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota, coincideBusqueda } from '../../../utils/asociados.js';
import { exportarExcel } from '../../../services/exportService.js';

const ACCION_COLOR = {
  COMPRA_DIRECTA:        'text-[#00e5ff]',
  ANULACION_DIRECTA:     'text-[#ff3d3d]',
  SOLICITUD_ADQUISICION: 'text-[#ffb700]',
  APROBACION:            'text-[#00e5ff]',
  RECHAZO:               'text-[#ff3d3d]',
  SOLICITUD_RETIRO:      'text-orange-400',
  APROBACION_RETIRO:     'text-[#ffb700]',
  RECHAZO_RETIRO:        'text-[#ff3d3d]',
  CANCELACION_ASOCIADO:  'text-[#1a4a55]',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[#08101e] border border-[#00e5ff33] rounded-sm w-full max-w-lg max-h-[85vh] flex flex-col relative"
        style={{ boxShadow: '0 0 40px #00e5ff11' }}
      >
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00e5ff]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00e5ff]" />

        <div className="flex items-start justify-between px-6 py-5 border-b border-[#00e5ff11]">
          <div>
            <p className="text-[#a0d4e0] font-bold text-sm tracking-wider">
              {asociado.nombre} {asociado.apellido}
            </p>
            <p className="text-[#1a4a55] text-[10px] mt-0.5 font-mono">CC {asociado.codigo}</p>
          </div>
          <button onClick={onClose} className="text-[#1a4a55] hover:text-[#a0d4e0] transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Phone,     valor: asociado.movil         || '—', label: 'MÓVIL' },
              { icon: MapPin,    valor: asociado.ciudad         || '—', label: 'CIUDAD' },
              { icon: Building2, valor: asociado.nombre_empresa || '—', label: 'EMPRESA' },
              { icon: User,      valor: labelClaseCuota(asociado.clase_cuota), label: 'CLASE CUOTA' },
            ].map(({ icon: Icon, valor, label }) => (
              <div key={label} className="bg-[#0d1829] border border-[#00e5ff0a] rounded-sm px-3 py-2.5 flex items-center gap-2">
                <Icon size={12} className="text-[#1a4a55] shrink-0" />
                <div>
                  <p className="text-[9px] text-[#1a4a55] tracking-widest">{label}</p>
                  <p className="text-[11px] text-[#a0d4e0]">{valor}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[#1a4a55] text-[9px] uppercase tracking-[3px] mb-2">
              BONOS ACTIVOS ({asociado.boletos_activos})
            </p>
            {asociado.numeros_activos?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {asociado.numeros_activos.map((n) => (
                  <span
                    key={n}
                    className="flex items-center gap-1 px-2 py-0.5 border border-[#00e5ff33] bg-[#00e5ff08] rounded-sm text-[#00e5ff] text-[10px] font-mono"
                  >
                    <Ticket size={10} /> #{String(n).padStart(3, '0')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#1a4a55] text-[10px] tracking-wider">SIN BONOS ACTIVOS</p>
            )}
          </div>

          <div>
            <p className="text-[#1a4a55] text-[9px] uppercase tracking-[3px] mb-2">HISTORIAL EN ESTE SORTEO</p>
            {loading ? (
              <p className="text-[#1a4a55] text-[10px] tracking-wider">CARGANDO...</p>
            ) : historial.length === 0 ? (
              <p className="text-[#1a4a55] text-[10px] tracking-wider">SIN MOVIMIENTOS REGISTRADOS</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historial.map((h, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-[#00e5ff08] last:border-0">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <span className={`text-[10px] font-medium tracking-wider ${ACCION_COLOR[h.accion] ?? 'text-[#1a4a55]'}`}>
                          {h.accion.replace(/_/g, ' ')}
                        </span>
                        {h.numero !== null && (
                          <span className="text-[#1a4a55] text-[10px] ml-1.5 font-mono">
                            #{String(h.numero).padStart(3, '0')}
                          </span>
                        )}
                        {h.detalle && <p className="text-[#1a4a55] text-[10px] mt-0.5">{h.detalle}</p>}
                      </div>
                    </div>
                    <p className="text-[#1a4a55] text-[10px] shrink-0">{fmt(h.created_at)}</p>
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

const COLUMNAS_REPORTE = [
  { campo: 'cedula',          header: 'Cédula' },
  { campo: 'nombre',          header: 'Nombre' },
  { campo: 'apellido',        header: 'Apellido' },
  { campo: 'ciudad',          header: 'Ciudad' },
  { campo: 'empresa',         header: 'Empresa' },
  { campo: 'clase_cuota',     header: 'Tipo cuota' },
  { campo: 'valor_cuota',     header: 'Valor cuota ($)' },
  { campo: 'bonos',           header: 'Bonos activos' },
  { campo: 'numeros',         header: 'Números' },
];

const AsociadosSorteoPanel = ({ sorteoId, sorteoNombre }) => {
  const [asociados, setAsociados]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [exportando, setExportando]   = useState(false);
  const [busqueda, setBusqueda]       = useState('');
  const [empresa, setEmpresa]         = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [pagina, setPagina]           = useState(0);
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

  const exportar = async () => {
    setExportando(true);
    try {
      const { data } = await apiService.get(`/sorteos/${sorteoId}/reporte-participantes`);
      const nombre = sorteoNombre
        ? `participantes_${sorteoNombre.replace(/\s+/g, '_')}`
        : `participantes_${sorteoId}`;
      exportarExcel(data, COLUMNAS_REPORTE, nombre);
    } catch {
      toast.error('Error generando el reporte');
    } finally {
      setExportando(false);
    }
  };

  const filtrados = useMemo(() => {
    setPagina(0);
    return asociados.filter((a) => {
      if (empresa && a.nombre_empresa !== empresa) return false;
      if (busqueda && !coincideBusqueda(busqueda, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '')) return false;
      return true;
    });
  }, [asociados, busqueda, empresa]);

  const paginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (loading) return <p className="text-[#1a4a55] text-sm tracking-widest">CARGANDO...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a4a55]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="BUSCAR POR CÉDULA O NOMBRE..."
            className="w-full bg-[#08101e] border border-[#00e5ff11] rounded-sm pl-8 pr-3 py-2 text-[10px] text-[#a0d4e0] placeholder-[#1a4a55] focus:outline-none focus:border-[#00e5ff33] font-mono tracking-wider transition-colors"
          />
        </div>
        <select
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none focus:border-[#00e5ff33] cursor-pointer font-mono tracking-wider transition-colors"
        >
          <option value="">TODAS LAS EMPRESAS</option>
          {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <button
          onClick={exportar}
          disabled={exportando || asociados.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-[#00e5ff11] hover:border-[#00e5ff33] text-[#1a4a55] hover:text-[#00e5ff] text-[10px] rounded-sm transition-all disabled:opacity-40 tracking-widest"
        >
          <FileSpreadsheet size={13} />
          {exportando ? 'GENERANDO...' : 'EXPORTAR EXCEL'}
        </button>

        <p className="text-[#1a4a55] text-[9px] ml-auto tracking-wider">
          {filtrados.length} DE {asociados.length} PARTICIPANTES
        </p>
      </div>

      <div className="border border-[#00e5ff11] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff11] bg-[#08101e]">
              {['ASOCIADO', 'EMPRESA', 'BONOS ACTIVOS', 'NÚMEROS'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#1a4a55] tracking-widest">
                  {busqueda ? 'SIN RESULTADOS' : 'NINGÚN ASOCIADO TIENE BONOS EN ESTE SORTEO'}
                </td>
              </tr>
            ) : visibles.map((a) => (
              <motion.tr
                key={a.codigo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                onClick={() => setSeleccionado(a)}
                className="border-b border-[#00e5ff08] hover:bg-[#00e5ff05] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="text-[#a0d4e0] tracking-wider">{a.nombre} {a.apellido}</p>
                  <p className="text-[#1a4a55] text-[9px] mt-0.5 font-mono">{a.codigo}</p>
                </td>
                <td className="px-4 py-3 text-[#1a4a55] tracking-wider">{a.nombre_empresa || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 border border-[#00e5ff33] bg-[#00e5ff0a] text-[#00e5ff] text-[10px] rounded-sm font-mono"
                    style={{ textShadow: '0 0 6px #00e5ff44' }}
                  >
                    {a.boletos_activos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(a.numeros_activos ?? []).slice(0, 5).map((n) => (
                      <span key={n} className="font-mono text-[9px] text-[#1a4a55]">
                        #{String(n).padStart(3, '0')}
                      </span>
                    ))}
                    {(a.numeros_activos ?? []).length > 5 && (
                      <span className="text-[#1a4a55] text-[9px]">+{a.numeros_activos.length - 5}</span>
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
          <p className="text-[#1a4a55] text-[9px] tracking-wider">
            {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, filtrados.length)} DE {filtrados.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(p - 1, 0))}
              disabled={pagina === 0}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#1a4a55] hover:text-[#00e5ff] disabled:opacity-30 transition-colors tracking-widest"
            >← ANT</button>
            {Array.from({ length: paginas }, (_, i) => i)
              .filter((i) => i === 0 || i === paginas - 1 || Math.abs(i - pagina) <= 1)
              .reduce((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…');
                acc.push(i);
                return acc;
              }, [])
              .map((item, i) =>
                item === '…'
                  ? <span key={`e${i}`} className="px-1 text-[#1a4a55] text-[9px]">…</span>
                  : <button
                      key={item}
                      onClick={() => setPagina(item)}
                      className={`w-7 h-7 text-[9px] rounded-sm transition-all ${
                        item === pagina
                          ? 'border border-[#00e5ff55] bg-[#00e5ff11] text-[#00e5ff]'
                          : 'bg-[#08101e] border border-[#00e5ff0a] text-[#1a4a55] hover:text-[#a0d4e0]'
                      }`}
                    >{item + 1}</button>
              )}
            <button
              onClick={() => setPagina((p) => Math.min(p + 1, paginas - 1))}
              disabled={pagina === paginas - 1}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#1a4a55] hover:text-[#00e5ff] disabled:opacity-30 transition-colors tracking-widest"
            >SIG →</button>
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
