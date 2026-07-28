import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import { coincideBusqueda } from '../../../utils/asociados.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

const AsociadosLista = () => {
  const navigate        = useNavigate();
  const [todos, setTodos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]           = useState('');

  useEffect(() => {
    apiService.get('/asociados')
      .then(({ data }) => setTodos(data))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => {
    if (!q.trim()) return todos;
    return todos.filter((a) =>
      coincideBusqueda(q, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '', a.ciudad ?? '')
    );
  }, [q, todos]);

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// MÓDULO</p>
          <h1 className="text-2xl font-bold text-[#10b981] tracking-wider" style={{ textShadow: '0 0 20px #10b98144' }}>
            ASOCIADOS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">{todos.length} REGISTROS</p>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2 bg-[#08101e] border border-[#10b98122] rounded-sm px-4 py-2.5 w-72 focus-within:border-[#10b98155] transition-colors">
          <Search size={13} className="text-[#6aacbc] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, CC, empresa..."
            className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono tracking-wider"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 size={22} className="animate-spin text-[#10b981]" />
        </div>
      )}

      {!loading && filtrados.length === 0 && (
        <div className="text-center py-24">
          <Users size={40} className="mx-auto mb-4 opacity-10" style={{ color: '#10b981' }} />
          <p className="text-[#6aacbc] text-sm tracking-[3px]">SIN RESULTADOS</p>
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {filtrados.map((a, i) => (
            <motion.button
              key={a.codigo}
              onClick={() => navigate(`/asociados/${a.codigo}`)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="w-full text-left flex items-center gap-4 px-5 py-4 bg-[#08101e] border border-[#10b98111] hover:border-[#10b98133] hover:bg-[#10b9810a] rounded-sm transition-all group"
            >
              {/* CC */}
              <div className="shrink-0 w-24">
                <p className="text-[#10b981] text-[10px] font-bold font-mono tracking-wider">{a.codigo}</p>
                <p className="text-[#6aacbc] text-[8px] tracking-widest mt-0.5">{labelClaseCuota(a.clase_cuota)}</p>
              </div>

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className="text-[#a0d4e0] text-sm font-medium">{a.nombre} {a.apellido}</p>
                <p className="text-[#6aacbc] text-[9px] tracking-wider truncate">{a.nombre_empresa ?? '—'} {a.ciudad ? `· ${a.ciudad}` : ''}</p>
              </div>

              {/* Estado */}
              <div className="shrink-0 flex items-center gap-2">
                <span className={`text-[8px] tracking-widest px-2 py-0.5 border rounded-sm ${
                  a.is_active
                    ? 'border-[#10b98133] text-[#10b981] bg-[#10b9810a]'
                    : 'border-[#ff3d3d33] text-[#ff3d3d] bg-[#ff3d3d0a]'
                }`}>
                  {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                </span>
                {a.portal_activo && (
                  <span className="text-[8px] tracking-widest px-2 py-0.5 border border-[#00e5ff22] text-[#00e5ff] bg-[#00e5ff08] rounded-sm">
                    PORTAL
                  </span>
                )}
                <ChevronRight size={14} className="text-[#6aacbc] group-hover:text-[#10b981] transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </>
  );
};

export default AsociadosLista;
