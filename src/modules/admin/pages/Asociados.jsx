import { useEffect, useState, useMemo } from 'react';
import { Search, Upload, X, FileSpreadsheet, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota, CLASE_CUOTA, coincideBusqueda } from '../../../utils/asociados.js';
import { exportarExcel } from '../../../services/exportService.js';

const unicos = (lista, campo) =>
  [...new Set(lista.map((a) => a[campo]).filter(Boolean))].sort();

const SelectFiltro = ({ label, value, onChange, opciones, labelFn = (o) => o }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none focus:border-[#00e5ff33] cursor-pointer font-mono"
  >
    <option value="">{label}</option>
    {opciones.map((o) => <option key={o} value={o}>{labelFn(o)}</option>)}
  </select>
);

const FILTROS_INIT = { ciudad: '', clase_cuota: '', nombre_empresa: '', estado: '', portal: '' };

// ── Modal de activación de portal ─────────────────────────────────────────────

const ModalPortal = ({ asociado, onClose, onDone }) => {
  const [loading, setLoading]     = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado]     = useState(false);

  const activar = async () => {
    setLoading(true);
    try {
      const { data } = await apiService.post(`/asociados/${asociado.codigo}/activar-portal`);
      setResultado(data);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al activar portal');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async () => {
    setLoading(true);
    try {
      await apiService.post(`/asociados/${asociado.codigo}/desactivar-portal`);
      toast.success('Acceso al portal desactivado');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(resultado.password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div
        className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 40px #00e5ff11' }}
      >
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#a0d4e0] font-bold text-sm tracking-wider">ACCESO AL PORTAL</h3>
          <button onClick={onClose}><X size={15} className="text-[#1a4a55] hover:text-[#a0d4e0]" /></button>
        </div>

        <p className="text-[#1a4a55] text-[9px] tracking-wider mb-4">
          {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()} · {asociado.codigo}
        </p>

        {resultado ? (
          /* Contraseña generada — mostrar una sola vez */
          <div>
            <p className="text-[#ffb700] text-[9px] tracking-wider mb-3">
              ⚠ Copia esta contraseña ahora. No se volverá a mostrar.
            </p>
            <div className="bg-[#0d1829] border border-[#00e5ff33] rounded-sm px-4 py-3 flex items-center justify-between mb-4">
              <span className="font-mono text-[#00e5ff] text-lg tracking-widest" style={{ textShadow: '0 0 12px #00e5ff44' }}>
                {resultado.password}
              </span>
              <button onClick={copiar} className="ml-3 text-[#1a4a55] hover:text-[#00e5ff] transition-colors">
                {copiado ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[#1a4a55] text-[9px] tracking-wider mb-4">
              Entrega esta contraseña al asociado de forma segura. Deberá cambiarla en su primer ingreso.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all"
            >
              ENTENDIDO
            </button>
          </div>
        ) : asociado.portal_activo ? (
          /* Ya activado: opción de desactivar */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} style={{ color: '#00e5ff' }} />
              <span className="text-[#00e5ff] text-[10px] tracking-wider">
                {asociado.primer_login ? 'ACTIVADO · Pendiente primer ingreso' : 'ACTIVADO'}
              </span>
            </div>
            <p className="text-[#1a4a55] text-[9px] tracking-wider mb-5">
              El asociado tiene acceso al portal. Puedes desactivarlo o generar una nueva contraseña.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={activar}
                disabled={loading}
                className="w-full py-2 border border-[#ffb70044] hover:border-[#ffb70088] bg-[#ffb7000d] hover:bg-[#ffb7001a] text-[#ffb700] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                GENERAR NUEVA CONTRASEÑA
              </button>
              <button
                onClick={desactivar}
                disabled={loading}
                className="w-full py-2 border border-[#ff3d3d44] hover:border-[#ff3d3d88] bg-[#ff3d3d0d] hover:bg-[#ff3d3d1a] text-[#ff3d3d] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                DESACTIVAR ACCESO
              </button>
            </div>
          </div>
        ) : (
          /* Sin activar: activar */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldOff size={14} className="text-[#1a4a55]" />
              <span className="text-[#1a4a55] text-[10px] tracking-wider">SIN ACCESO AL PORTAL</span>
            </div>
            <p className="text-[#1a4a55] text-[9px] tracking-wider mb-5">
              Genera una contraseña inicial para este asociado y entrégasela de forma segura.
            </p>
            <button
              onClick={activar}
              disabled={loading}
              className="w-full py-2 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
            >
              ACTIVAR PORTAL Y GENERAR CONTRASEÑA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const Asociados = () => {
  const [asociados, setAsociados]   = useState([]);
  const [busqueda, setBusqueda]     = useState('');
  const [filtros, setFiltros]       = useState(FILTROS_INIT);
  const [loading, setLoading]       = useState(true);
  const [pagina, setPagina]         = useState(0);
  const [modalPortal, setModalPortal] = useState(null);
  const navigate                    = useNavigate();
  const POR_PAGINA = 75;

  const cargar = () => {
    apiService.get('/asociados')
      .then(({ data }) => setAsociados(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Error cargando asociados'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const setFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const hayFiltros = busqueda || Object.values(filtros).some(Boolean);
  const limpiar = () => { setBusqueda(''); setFiltros(FILTROS_INIT); };

  const opciones = useMemo(() => ({
    ciudad:         unicos(asociados, 'ciudad'),
    clase_cuota:    unicos(asociados, 'clase_cuota'),
    nombre_empresa: unicos(asociados, 'nombre_empresa'),
  }), [asociados]);

  const filtrados = useMemo(() => asociados.filter((a) => {
    if (busqueda && !coincideBusqueda(busqueda, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '', a.ciudad ?? '')) return false;
    if (filtros.ciudad         && a.ciudad         !== filtros.ciudad)         return false;
    if (filtros.clase_cuota    && a.clase_cuota    !== filtros.clase_cuota)    return false;
    if (filtros.nombre_empresa && a.nombre_empresa !== filtros.nombre_empresa) return false;
    if (filtros.estado === 'activo'   && !a.is_active)  return false;
    if (filtros.estado === 'inactivo' &&  a.is_active)  return false;
    if (filtros.portal === 'activo'   && !a.portal_activo) return false;
    if (filtros.portal === 'inactivo' &&  a.portal_activo) return false;
    return true;
  }), [asociados, busqueda, filtros]);

  useEffect(() => { setPagina(0); }, [filtrados]);

  const paginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (loading) return <p className="text-[#1a4a55] text-xs tracking-widest">CARGANDO...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#1a4a55] text-[8px] tracking-[3px] mb-1">// DIRECTORIO</p>
          <h1 className="text-[#a0d4e0] font-bold text-lg tracking-wider">ASOCIADOS</h1>
          <p className="text-[#1a4a55] text-[9px] tracking-widest mt-0.5">{asociados.length} REGISTRADOS</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarExcel(filtrados, [
              { campo: 'codigo',        header: 'Cédula' },
              { campo: 'nombre',        header: 'Nombre' },
              { campo: 'apellido',      header: 'Apellido' },
              { campo: 'movil',         header: 'Móvil' },
              { campo: 'ciudad',        header: 'Ciudad' },
              { campo: 'nombre_empresa',header: 'Empresa' },
              { campo: 'clase_cuota',   header: 'Clase cuota' },
              { campo: 'is_active',     header: 'Activo' },
            ], `asociados_${new Date().toISOString().slice(0,10)}`)}
            className="flex items-center gap-2 px-4 py-2 border border-[#00e5ff11] hover:border-[#00e5ff33] text-[#1a4a55] hover:text-[#00e5ff] text-[9px] rounded-sm transition-colors tracking-widest"
          >
            <FileSpreadsheet size={13} /> EXPORTAR
          </button>
          <button
            onClick={() => navigate('/admin/asociados/importar')}
            className="flex items-center gap-2 px-4 py-2 border border-[#a855f744] hover:border-[#a855f788] bg-[#a855f711] hover:bg-[#a855f722] text-[#a855f7] text-[9px] rounded-sm transition-colors tracking-widest"
          >
            <Upload size={13} /> IMPORTAR CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a4a55]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full bg-[#08101e] border border-[#00e5ff11] rounded-sm pl-9 pr-4 py-2 text-[10px] text-[#a0d4e0] placeholder-[#1a4a55] focus:outline-none focus:border-[#00e5ff33] font-mono"
          />
        </div>

        <SelectFiltro label="Ciudad"  value={filtros.ciudad}         onChange={(v) => setFiltro('ciudad', v)}         opciones={opciones.ciudad} />
        <SelectFiltro label="Cuota"   value={filtros.clase_cuota}    onChange={(v) => setFiltro('clase_cuota', v)}    opciones={opciones.clase_cuota} labelFn={labelClaseCuota} />
        <SelectFiltro label="Empresa" value={filtros.nombre_empresa} onChange={(v) => setFiltro('nombre_empresa', v)} opciones={opciones.nombre_empresa} />

        <select value={filtros.estado} onChange={(e) => setFiltro('estado', e.target.value)}
          className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
          <option value="">Estado</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        <select value={filtros.portal} onChange={(e) => setFiltro('portal', e.target.value)}
          className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
          <option value="">Portal</option>
          <option value="activo">Con acceso</option>
          <option value="inactivo">Sin acceso</option>
        </select>

        {hayFiltros && (
          <button onClick={limpiar} className="flex items-center gap-1 px-3 py-2 text-[10px] text-[#1a4a55] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors">
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="border border-[#00e5ff11] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff11] bg-[#00e5ff05]">
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">CÉDULA</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">NOMBRE</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">MÓVIL</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">CUOTA</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">EMPRESA</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">CIUDAD</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">ESTADO</th>
              <th className="text-left px-4 py-3 text-[#1a4a55] tracking-[2px] font-normal">PORTAL</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#1a4a55] tracking-widest text-[9px]">
                  {hayFiltros ? 'SIN RESULTADOS PARA LOS FILTROS APLICADOS' : 'NO HAY ASOCIADOS REGISTRADOS'}
                </td>
              </tr>
            ) : visibles.map((a) => (
              <motion.tr
                key={a.codigo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="border-b border-[#00e5ff08] hover:bg-[#00e5ff05] transition-colors"
              >
                <td className="px-4 py-3 text-[#1a4a55] font-mono">{a.codigo}</td>
                <td className="px-4 py-3 text-[#a0d4e0]">{a.nombre} {a.apellido}</td>
                <td className="px-4 py-3 text-[#1a4a55]">{a.movil || '—'}</td>
                <td className="px-4 py-3 text-[#1a4a55]">{labelClaseCuota(a.clase_cuota)}</td>
                <td className="px-4 py-3 text-[#1a4a55]">{a.nombre_empresa || '—'}</td>
                <td className="px-4 py-3 text-[#1a4a55]">{a.ciudad || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-sm border text-[9px] tracking-wider ${
                    a.is_active
                      ? 'bg-[#00e5ff11] text-[#00e5ff] border-[#00e5ff33]'
                      : 'bg-[#ff3d3d11] text-[#ff3d3d] border-[#ff3d3d33]'
                  }`}>
                    {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setModalPortal(a)}
                    title={a.portal_activo ? 'Gestionar acceso al portal' : 'Activar portal'}
                    className="transition-colors"
                  >
                    {a.portal_activo
                      ? <ShieldCheck size={15} style={{ color: '#00e5ff', filter: 'drop-shadow(0 0 4px #00e5ff55)' }} />
                      : <ShieldOff size={15} className="text-[#1a4a55] hover:text-[#a0d4e0]" />
                    }
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-[#1a4a55] text-[9px] tracking-wider">
          {filtrados.length === asociados.length
            ? `${asociados.length} asociados`
            : `${filtrados.length} de ${asociados.length}`}
          {paginas > 1 && ` · PÁGINA ${pagina + 1} DE ${paginas}`}
        </p>
        {paginas > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina((p) => Math.max(p - 1, 0))} disabled={pagina === 0}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#1a4a55] hover:text-[#a0d4e0] disabled:opacity-30 transition-colors">← ANT</button>
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
                  : <button key={item} onClick={() => setPagina(item)}
                      className={`w-7 h-7 text-[9px] rounded-sm transition-colors ${item === pagina ? 'bg-[#a855f7] text-white' : 'bg-[#08101e] border border-[#00e5ff11] text-[#1a4a55] hover:text-[#a0d4e0]'}`}
                    >{item + 1}</button>
              )}
            <button onClick={() => setPagina((p) => Math.min(p + 1, paginas - 1))} disabled={pagina === paginas - 1}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#1a4a55] hover:text-[#a0d4e0] disabled:opacity-30 transition-colors">SIG →</button>
          </div>
        )}
      </div>

      {modalPortal && (
        <ModalPortal
          asociado={modalPortal}
          onClose={() => setModalPortal(null)}
          onDone={() => {
            cargar();
            // Actualizar el objeto local para que el ícono cambie sin recargar toda la página
            setModalPortal(a => a ? { ...a, portal_activo: true, primer_login: true } : null);
          }}
        />
      )}
    </div>
  );
};

export default Asociados;
