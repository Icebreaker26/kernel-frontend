import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, UsersRound, Ticket, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/apiService.js';

const ESTADO_COLOR = {
  activo:    '#10b981',
  inactivo:  '#ff3d3d',
  abierto:   '#00e5ff',
  cerrado:   '#6aacbc',
  finalizado:'#6aacbc',
};

const useDebounce = (value, ms) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

const Grupo = ({ icono: Icon, color, titulo, items, renderItem }) => {
  if (!items?.length) return null;
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Icon size={10} style={{ color }} />
        <p className="text-[8px] tracking-[3px] uppercase" style={{ color }}>{titulo}</p>
      </div>
      {items.map(renderItem)}
    </div>
  );
};

const BusquedaGlobal = ({ onClose }) => {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const [q, setQ]               = useState('');
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading]   = useState(false);
  const debouncedQ              = useDebounce(q, 280);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debouncedQ.length < 2) { setResultados(null); return; }
    setLoading(true);
    apiService.get(`/busqueda?q=${encodeURIComponent(debouncedQ)}`)
      .then(({ data }) => setResultados(data))
      .catch(() => setResultados(null))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  const ir = (ruta) => { navigate(ruta); onClose(); };

  const hayResultados = resultados && (
    resultados.asociados?.length ||
    resultados.empresas?.length  ||
    resultados.sorteos?.length
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#020b18cc] backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-xl mx-4"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 bg-[#08101e] border border-[#00e5ff22] rounded-sm px-4 py-3.5"
          style={{ boxShadow: '0 0 40px #00e5ff0a' }}>
          <Search size={14} className="text-[#6aacbc] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar asociado, empresa o sorteo..."
            className="flex-1 bg-transparent text-[#a0d4e0] text-sm font-mono placeholder-[#6aacbc] focus:outline-none tracking-wide"
          />
          {loading
            ? <Loader2 size={13} className="animate-spin text-[#6aacbc] shrink-0" />
            : q && <button onClick={() => setQ('')}><X size={13} className="text-[#6aacbc] hover:text-[#a0d4e0]" /></button>
          }
          <kbd className="hidden sm:block text-[8px] text-[#6aacbc] border border-[#6aacbc33] rounded px-1.5 py-0.5 tracking-widest shrink-0">ESC</kbd>
        </div>

        {/* Resultados */}
        <AnimatePresence>
          {(hayResultados || (q.length >= 2 && !loading && resultados)) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-1 bg-[#08101e] border border-[#00e5ff11] rounded-sm overflow-hidden"
              style={{ boxShadow: '0 16px 48px #00000066' }}
            >
              {!hayResultados ? (
                <p className="px-4 py-6 text-center text-[#6aacbc] text-[10px] tracking-[3px]">SIN RESULTADOS</p>
              ) : (
                <div className="py-2 max-h-[60vh] overflow-y-auto">
                  <Grupo
                    icono={UsersRound} color="#10b981" titulo="Asociados"
                    items={resultados.asociados}
                    renderItem={(a) => (
                      <button key={a.codigo} onClick={() => ir(`/asociados/${a.codigo}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#10b98108] transition-colors text-left group">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: a.is_active ? '#10b981' : '#ff3d3d' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[#a0d4e0] text-[11px] truncate group-hover:text-[#10b981] transition-colors">
                            {a.nombre} {a.apellido}
                          </p>
                          <p className="text-[#6aacbc] text-[9px] tracking-wider">{a.codigo} · {a.nombre_empresa ?? '—'}</p>
                        </div>
                      </button>
                    )}
                  />
                  <Grupo
                    icono={Building2} color="#f97316" titulo="Empresas"
                    items={resultados.empresas}
                    renderItem={(e) => (
                      <button key={e.codigo} onClick={() => ir(`/empresas/${e.codigo}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f9731608] transition-colors text-left group">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: e.is_active ? '#f97316' : '#6aacbc' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[#a0d4e0] text-[11px] truncate group-hover:text-[#f97316] transition-colors">{e.nombre}</p>
                          <p className="text-[#6aacbc] text-[9px] tracking-wider">{e.codigo}</p>
                        </div>
                      </button>
                    )}
                  />
                  <Grupo
                    icono={Ticket} color="#00e5ff" titulo="Sorteos"
                    items={resultados.sorteos}
                    renderItem={(s) => (
                      <button key={s.id} onClick={() => ir(`/sorteos/${s.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#00e5ff08] transition-colors text-left group">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: ESTADO_COLOR[s.estado] ?? '#6aacbc' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[#a0d4e0] text-[11px] truncate group-hover:text-[#00e5ff] transition-colors">{s.nombre}</p>
                          <p className="text-[#6aacbc] text-[9px] tracking-wider uppercase">{s.estado}</p>
                        </div>
                      </button>
                    )}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[#6aacbc33] text-[8px] tracking-[3px] mt-3">
          BUSCA EN ASOCIADOS · EMPRESAS · SORTEOS
        </p>
      </motion.div>
    </motion.div>
  );
};

export default BusquedaGlobal;
