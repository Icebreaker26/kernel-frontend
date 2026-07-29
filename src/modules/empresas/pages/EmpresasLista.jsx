import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Users, Ticket, Banknote, ChevronRight, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const COLOR = '#f97316';

const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : '—';

const StatChip = ({ icon: Icon, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <Icon size={11} style={{ color: COLOR + '88' }} />
    <span className="text-[#a0d4e0] font-mono font-bold text-xs">{valor}</span>
    <span className="text-[#6aacbc] text-[9px] tracking-wider">{label}</span>
  </div>
);

const EmpresasLista = () => {
  const navigate          = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState('');
  const [estado, setEstado]     = useState('');

  useEffect(() => {
    apiService.get('/empresas')
      .then(({ data }) => setEmpresas(data))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(() => empresas.filter((e) => {
    if (q) {
      const s = q.toLowerCase();
      if (!e.codigo.toLowerCase().includes(s) && !e.nombre.toLowerCase().includes(s)) return false;
    }
    if (estado === 'activa'   && !e.is_active)  return false;
    if (estado === 'retirada' &&  e.is_active)  return false;
    return true;
  }), [empresas, q, estado]);

  const activas   = empresas.filter(e => e.is_active).length;
  const retiradas = empresas.filter(e => !e.is_active).length;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// MÓDULO</p>
          <h1 className="text-2xl font-bold tracking-wider" style={{ color: COLOR, textShadow: `0 0 20px ${COLOR}44` }}>
            EMPRESAS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">
            {activas} ACTIVAS · {retiradas} RETIRADAS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 bg-[#08101e] border rounded-sm px-4 py-2.5 w-64 transition-colors"
            style={{ borderColor: COLOR + '22' }}
          >
            <Search size={13} className="text-[#6aacbc] shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono tracking-wider"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2.5 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono"
          >
            <option value="">Todas</option>
            <option value="activa">Activas</option>
            <option value="retirada">Retiradas</option>
          </select>
          {(q || estado) && (
            <button
              onClick={() => { setQ(''); setEstado(''); }}
              className="flex items-center gap-1 px-3 py-2.5 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors"
            >
              <X size={11} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 size={22} className="animate-spin" style={{ color: COLOR }} />
        </div>
      )}

      {!loading && filtradas.length === 0 && (
        <div className="text-center py-24">
          <Building2 size={40} className="mx-auto mb-4 opacity-10" style={{ color: COLOR }} />
          <p className="text-[#6aacbc] text-xs tracking-[3px]">SIN RESULTADOS</p>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtradas.map((e, i) => (
            <motion.button
              key={e.codigo}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              onClick={() => navigate(`/empresas/${e.codigo}`)}
              className="w-full text-left bg-[#08101e] border rounded-sm px-5 py-4 hover:bg-[#0d1829] transition-all group relative overflow-hidden"
              style={{ borderColor: e.is_active ? COLOR + '1a' : '#ffffff08' }}
            >
              <span
                className="absolute top-0 left-0 h-[1px] w-0 group-hover:w-full transition-all duration-300"
                style={{ background: COLOR, boxShadow: `0 0 6px ${COLOR}` }}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="shrink-0 w-9 h-9 rounded-sm flex items-center justify-center"
                    style={{ background: COLOR + '11', border: `1px solid ${COLOR}22` }}
                  >
                    <Building2 size={15} style={{ color: COLOR + (e.is_active ? 'cc' : '44') }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[#a0d4e0] font-bold text-sm tracking-wide truncate">{e.nombre}</p>
                      <span
                        className="shrink-0 text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border"
                        style={e.is_active
                          ? { color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }
                          : { color: '#6aacbc', borderColor: '#6aacbc33', background: '#6aacbc11' }
                        }
                      >
                        {e.is_active ? 'ACTIVA' : 'RETIRADA'}
                      </span>
                    </div>
                    <p className="text-[#6aacbc] text-[9px] tracking-widest">{e.codigo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <StatChip icon={Users}   valor={e.asociados_activos} label="asociados" />
                  <StatChip icon={Ticket}  valor={e.bonos_activos}     label="bonos" />
                  <StatChip icon={Banknote} valor={fmtMoney(e.sum_aportes)} label="en aportes" />
                  <ChevronRight size={14} className="text-[#6aacbc] group-hover:text-[#f97316] transition-colors" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {!loading && (
        <p className="text-[#6aacbc] text-[9px] tracking-wider mt-4">
          {filtradas.length === empresas.length
            ? `${empresas.length} empresas`
            : `${filtradas.length} de ${empresas.length}`}
        </p>
      )}
    </>
  );
};

export default EmpresasLista;
