import { useEffect, useState, useMemo } from 'react';
import { Search, Upload, X, KeyRound, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota, CLASE_CUOTA, coincideBusqueda } from '../../../utils/asociados.js';
import { exportarExcel } from '../../../services/exportService.js';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';

const unicos = (lista, campo) =>
  [...new Set(lista.map((a) => a[campo]).filter(Boolean))].sort();

const SelectFiltro = ({ label, value, onChange, opciones, labelFn = (o) => o }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-600/60 cursor-pointer"
  >
    <option value="">{label}</option>
    {opciones.map((o) => <option key={o} value={o}>{labelFn(o)}</option>)}
  </select>
);

const FILTROS_INIT = { ciudad: '', clase_cuota: '', nombre_empresa: '', estado: '' };

const Asociados = () => {
  const [asociados, setAsociados] = useState([]);
  const [busqueda, setBusqueda]   = useState('');
  const [filtros, setFiltros]     = useState(FILTROS_INIT);
  const [loading, setLoading]     = useState(true);
  const [pagina, setPagina]       = useState(0);
  const navigate                    = useNavigate();
  const [modalReset, setModalReset] = useState(null);
  const POR_PAGINA = 75;

  useEffect(() => {
    apiService.get('/asociados')
      .then(({ data }) => setAsociados(data))
      .catch(() => toast.error('Error cargando asociados'))
      .finally(() => setLoading(false));
  }, []);

  const setFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

  const hayFiltros = busqueda || Object.values(filtros).some(Boolean);

  const limpiar = () => { setBusqueda(''); setFiltros(FILTROS_INIT); };

  const opciones = useMemo(() => ({
    ciudad:         unicos(asociados, 'ciudad'),
    clase_cuota:    unicos(asociados, 'clase_cuota'),
    nombre_empresa: unicos(asociados, 'nombre_empresa'),
  }), [asociados]);

  const filtrados = useMemo(() => {
    setPagina(0);
    return asociados.filter((a) => {
      if (busqueda && !coincideBusqueda(busqueda, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '', a.ciudad ?? '')) return false;
      if (filtros.ciudad         && a.ciudad         !== filtros.ciudad)         return false;
      if (filtros.clase_cuota    && a.clase_cuota    !== filtros.clase_cuota)    return false;
      if (filtros.nombre_empresa && a.nombre_empresa !== filtros.nombre_empresa) return false;
      if (filtros.estado === 'activo'   && !a.is_active)  return false;
      if (filtros.estado === 'inactivo' &&  a.is_active)  return false;
      return true;
    });
  }, [asociados, busqueda, filtros]);

  const paginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg mb-1">Asociados</h1>
          <p className="text-slate-500 text-xs">{asociados.length} registrados</p>
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
            className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-emerald-600/60 text-slate-400 hover:text-emerald-400 text-xs rounded-lg transition-colors"
          >
            <FileSpreadsheet size={13} /> Exportar Excel
          </button>
          <button
            onClick={() => navigate('/admin/asociados/importar')}
            className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-violet-600/60 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
          >
            <Upload size={13} /> Importar CSV
          </button>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-600/60"
          />
        </div>

        <SelectFiltro label="Ciudad"  value={filtros.ciudad}         onChange={(v) => setFiltro('ciudad', v)}         opciones={opciones.ciudad} />
        <SelectFiltro label="Cuota"   value={filtros.clase_cuota}    onChange={(v) => setFiltro('clase_cuota', v)}    opciones={opciones.clase_cuota} labelFn={labelClaseCuota} />
        <SelectFiltro label="Empresa" value={filtros.nombre_empresa} onChange={(v) => setFiltro('nombre_empresa', v)} opciones={opciones.nombre_empresa} />

        <select
          value={filtros.estado}
          onChange={(e) => setFiltro('estado', e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-600/60 cursor-pointer"
        >
          <option value="">Estado</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        {hayFiltros && (
          <button
            onClick={limpiar}
            className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-white border border-slate-800 rounded-lg transition-colors"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="text-left px-4 py-3">Cédula</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Móvil</th>
              <th className="text-left px-4 py-3">Clase cuota</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Ciudad</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                  {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay asociados registrados'}
                </td>
              </tr>
            ) : (
              visibles.map((a) => (
                <motion.tr
                  key={a.codigo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 font-mono">{a.codigo}</td>
                  <td className="px-4 py-3 text-slate-200">{a.nombre} {a.apellido}</td>
                  <td className="px-4 py-3 text-slate-400">{a.movil || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{labelClaseCuota(a.clase_cuota)}</td>
                  <td className="px-4 py-3 text-slate-400">{a.nombre_empresa || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{a.ciudad || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${
                      a.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {a.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModalReset(a)}
                      title="Resetear contraseña"
                      className="text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <KeyRound size={15} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-slate-600 text-xs">
          {filtrados.length === asociados.length
            ? `${asociados.length} asociados`
            : `${filtrados.length} de ${asociados.length}`}
          {paginas > 1 && ` · página ${pagina + 1} de ${paginas}`}
        </p>
        {paginas > 1 && (
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
                      className={`w-7 h-7 text-xs rounded transition-colors ${item === pagina ? 'bg-violet-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}
                    >{item + 1}</button>
              )}
            <button
              onClick={() => setPagina((p) => Math.min(p + 1, paginas - 1))}
              disabled={pagina === paginas - 1}
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >Sig →</button>
          </div>
        )}
      </div>

      {modalReset && (
        <ResetPasswordModal
          nombre={`${modalReset.nombre} ${modalReset.apellido}`}
          apiPath={`/admin/asociados/${modalReset.codigo}/password`}
          onClose={() => setModalReset(null)}
        />
      )}
    </div>
  );
};

export default Asociados;
