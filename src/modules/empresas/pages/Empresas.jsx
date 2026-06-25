import { useEffect, useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-CO') : '—';

const Empresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiService.get('/empresas')
      .then(({ data }) => setEmpresas(data))
      .catch(() => toast.error('Error cargando empresas'))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(() => empresas.filter((e) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!e.codigo.toLowerCase().includes(q) && !e.nombre.toLowerCase().includes(q)) return false;
    }
    if (estado === 'activa'   &&  !e.is_active) return false;
    if (estado === 'retirada' &&   e.is_active) return false;
    return true;
  }), [empresas, busqueda, estado]);

  const hayFiltros = busqueda || estado;

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white font-bold text-lg mb-1">Empresas</h1>
        <p className="text-slate-500 text-xs">
          {empresas.filter(e => e.is_active).length} activas · {empresas.filter(e => !e.is_active).length} retiradas
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-600/60"
          />
        </div>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-600/60 cursor-pointer"
        >
          <option value="">Estado</option>
          <option value="activa">Activa</option>
          <option value="retirada">Retirada</option>
        </select>

        {hayFiltros && (
          <button
            onClick={() => { setBusqueda(''); setEstado(''); }}
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
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Asociados activos</th>
              <th className="text-left px-4 py-3">Fecha ingreso</th>
              <th className="text-left px-4 py-3">Fecha retiro</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                  {hayFiltros ? 'Sin resultados' : 'No hay empresas registradas'}
                </td>
              </tr>
            ) : (
              filtradas.map((e, i) => (
                <motion.tr
                  key={e.codigo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 font-mono">{e.codigo}</td>
                  <td className="px-4 py-3 text-slate-200">{e.nombre}</td>
                  <td className="px-4 py-3 text-slate-400 text-center">{e.asociados_activos}</td>
                  <td className="px-4 py-3 text-slate-400">{fmt(e.fecha_ingreso)}</td>
                  <td className="px-4 py-3 text-slate-400">{fmt(e.fecha_retiro)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${
                      e.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {e.is_active ? 'Activa' : 'Retirada'}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-slate-600 text-xs mt-3">
        Mostrando {filtradas.length} de {empresas.length}
      </p>
    </div>
  );
};

export default Empresas;
