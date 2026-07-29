import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Users, Ticket, Banknote, ChevronRight, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import apiService from '../../../services/apiService.js';

const COLOR = '#f97316';

const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : '—';

const fmtMoneyShort = (v) => {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

// ── Primitivos ────────────────────────────────────────────────────────────────

const StatChip = ({ icon: Icon, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <Icon size={11} style={{ color: COLOR + '88' }} />
    <span className="text-[#a0d4e0] font-mono font-bold text-xs">{valor}</span>
    <span className="text-[#6aacbc] text-[9px] tracking-wider">{label}</span>
  </div>
);

const ResumenCard = ({ icon: Icon, label, value, color = COLOR }) => (
  <div className="bg-[#08101e] border rounded-sm p-4 relative overflow-hidden" style={{ borderColor: color + '22' }}>
    <div className="absolute inset-0 opacity-[0.04]"
      style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
    <div className="relative flex items-start justify-between gap-2">
      <div>
        <p className="text-[8px] tracking-[2px] uppercase mb-2" style={{ color: color + 'aa' }}>{label}</p>
        <p className="font-bold font-mono text-xl leading-none" style={{ color, textShadow: `0 0 14px ${color}44` }}>{value}</p>
      </div>
      <Icon size={13} style={{ color: color + '55' }} className="shrink-0 mt-0.5" />
    </div>
  </div>
);

const ChartCard = ({ titulo, children }) => (
  <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm p-5">
    <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-5">{titulo}</p>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-[10px] font-mono"
      style={{ boxShadow: '0 0 20px #00e5ff11' }}>
      <p className="text-[#6aacbc] mb-1 tracking-wider">{payload[0]?.payload?.nombre}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.value != null ? (p.dataKey === 'sum_aportes' ? fmtMoney(p.value) : p.value) : '—'}
        </p>
      ))}
    </div>
  );
};

// ── Tab Estadísticas ──────────────────────────────────────────────────────────

const TabEstadisticas = ({ empresas }) => {
  const activas = useMemo(() => empresas.filter(e => e.is_active), [empresas]);

  const topAsociados = useMemo(() =>
    [...activas].sort((a, b) => Number(b.asociados_activos) - Number(a.asociados_activos)).slice(0, 10)
      .map(e => ({ nombre: e.nombre.length > 20 ? e.nombre.slice(0, 18) + '…' : e.nombre, asociados_activos: Number(e.asociados_activos), codigo: e.codigo }))
  , [activas]);

  const topAportes = useMemo(() =>
    [...activas].sort((a, b) => Number(b.sum_aportes) - Number(a.sum_aportes)).slice(0, 10)
      .map(e => ({ nombre: e.nombre.length > 20 ? e.nombre.slice(0, 18) + '…' : e.nombre, sum_aportes: Number(e.sum_aportes), codigo: e.codigo }))
  , [activas]);

  const topBonos = useMemo(() =>
    [...activas].sort((a, b) => Number(b.bonos_activos) - Number(a.bonos_activos)).slice(0, 10)
      .map(e => ({ nombre: e.nombre.length > 20 ? e.nombre.slice(0, 18) + '…' : e.nombre, bonos_activos: Number(e.bonos_activos), codigo: e.codigo }))
  , [activas]);

  const totalAsociados = activas.reduce((s, e) => s + Number(e.asociados_activos ?? 0), 0);
  const totalAportes   = activas.reduce((s, e) => s + Number(e.sum_aportes ?? 0), 0);
  const totalBonos     = activas.reduce((s, e) => s + Number(e.bonos_activos ?? 0), 0);
  const promedioAsoc   = activas.length ? Math.round(totalAsociados / activas.length) : 0;

  const BAR_H = (n) => n * 38 + 20;

  return (
    <div className="space-y-5">

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResumenCard icon={Building2} label="Empresas activas"     value={activas.length}          color={COLOR} />
        <ResumenCard icon={Users}     label="Asociados totales"    value={totalAsociados}           color="#00e5ff" />
        <ResumenCard icon={Banknote}  label="Aportes mensuales"    value={fmtMoneyShort(totalAportes)} color="#a78bfa" />
        <ResumenCard icon={Ticket}    label="Bonos activos"        value={totalBonos}               color="#10b981" />
      </div>

      {/* Gráficas comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <ChartCard titulo="TOP 10 — ASOCIADOS ACTIVOS POR EMPRESA">
          {topAsociados.length === 0
            ? <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p>
            : (
              <ResponsiveContainer width="100%" height={BAR_H(topAsociados.length)}>
                <BarChart data={topAsociados} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category" dataKey="nombre" width={130}
                    tick={{ fill: '#6aacbc', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#00e5ff05' }} />
                  <Bar dataKey="asociados_activos" radius={[0, 3, 3, 0]} maxBarSize={16} label={{ position: 'right', fill: '#6aacbc', fontSize: 9 }}>
                    {topAsociados.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? COLOR : i === 1 ? COLOR + 'bb' : COLOR + '66'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartCard>

        <ChartCard titulo="TOP 10 — APORTES MENSUALES POR EMPRESA">
          {topAportes.length === 0
            ? <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p>
            : (
              <ResponsiveContainer width="100%" height={BAR_H(topAportes.length)}>
                <BarChart data={topAportes} layout="vertical" margin={{ left: 0, right: 56, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category" dataKey="nombre" width={130}
                    tick={{ fill: '#6aacbc', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#00e5ff05' }} />
                  <Bar dataKey="sum_aportes" radius={[0, 3, 3, 0]} maxBarSize={16}
                    label={{ position: 'right', fill: '#6aacbc', fontSize: 9, formatter: fmtMoneyShort }}>
                    {topAportes.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#a78bfa' : i === 1 ? '#a78bfabb' : '#a78bfa66'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartCard>

      </div>

      <ChartCard titulo="TOP 10 — BONOS ACTIVOS POR EMPRESA">
        {topBonos.filter(e => e.bonos_activos > 0).length === 0
          ? <p className="text-[#6aacbc] text-xs text-center py-8">Ninguna empresa tiene bonos activos</p>
          : (
            <ResponsiveContainer width="100%" height={BAR_H(Math.min(topBonos.filter(e => e.bonos_activos > 0).length, 10))}>
              <BarChart
                data={topBonos.filter(e => e.bonos_activos > 0)}
                layout="vertical"
                margin={{ left: 0, right: 24, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="nombre" width={130}
                  tick={{ fill: '#6aacbc', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={false} axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#00e5ff05' }} />
                <Bar dataKey="bonos_activos" radius={[0, 3, 3, 0]} maxBarSize={16} label={{ position: 'right', fill: '#6aacbc', fontSize: 9 }}>
                  {topBonos.filter(e => e.bonos_activos > 0).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#10b981' : i === 1 ? '#10b981bb' : '#10b98166'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>

      <p className="text-[#6aacbc] text-[9px] tracking-wider">
        PROMEDIO DE ASOCIADOS POR EMPRESA ACTIVA: <span style={{ color: COLOR }}>{promedioAsoc}</span>
      </p>
    </div>
  );
};

// ── Tab Lista ─────────────────────────────────────────────────────────────────

const ORDEN_OPTS = [
  ['',             'Orden por defecto'],
  ['aportes_desc', 'Mayor aporte'],
  ['aportes_asc',  'Menor aporte'],
  ['asoc_desc',    'Más asociados'],
  ['asoc_asc',     'Menos asociados'],
  ['bonos_desc',   'Más bonos'],
  ['bonos_asc',    'Menos bonos'],
  ['nombre_asc',   'Nombre A→Z'],
  ['nombre_desc',  'Nombre Z→A'],
];

const SORT_FN = {
  aportes_desc: (a, b) => Number(b.sum_aportes)       - Number(a.sum_aportes),
  aportes_asc:  (a, b) => Number(a.sum_aportes)       - Number(b.sum_aportes),
  asoc_desc:    (a, b) => Number(b.asociados_activos)  - Number(a.asociados_activos),
  asoc_asc:     (a, b) => Number(a.asociados_activos)  - Number(b.asociados_activos),
  bonos_desc:   (a, b) => Number(b.bonos_activos)      - Number(a.bonos_activos),
  bonos_asc:    (a, b) => Number(a.bonos_activos)      - Number(b.bonos_activos),
  nombre_asc:   (a, b) => a.nombre.localeCompare(b.nombre),
  nombre_desc:  (a, b) => b.nombre.localeCompare(a.nombre),
};

const TabLista = ({ empresas, loading }) => {
  const navigate            = useNavigate();
  const [q, setQ]           = useState('');
  const [estado, setEstado] = useState('');
  const [orden, setOrden]   = useState('');

  const filtradas = useMemo(() => {
    let result = empresas.filter((e) => {
      if (q) {
        const s = q.toLowerCase();
        if (!e.codigo.toLowerCase().includes(s) && !e.nombre.toLowerCase().includes(s)) return false;
      }
      if (estado === 'activa'   && !e.is_active) return false;
      if (estado === 'retirada' &&  e.is_active) return false;
      return true;
    });
    if (SORT_FN[orden]) result = [...result].sort(SORT_FN[orden]);
    return result;
  }, [empresas, q, estado, orden]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-[#08101e] border rounded-sm px-4 py-2.5 flex-1 min-w-48 max-w-72 transition-colors"
          style={{ borderColor: COLOR + '22' }}>
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
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2.5 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono"
        >
          {ORDEN_OPTS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {(q || estado || orden) && (
          <button
            onClick={() => { setQ(''); setEstado(''); setOrden(''); }}
            className="flex items-center gap-1 px-3 py-2.5 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors"
          >
            <X size={11} /> Limpiar
          </button>
        )}
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
              <span className="absolute top-0 left-0 h-[1px] w-0 group-hover:w-full transition-all duration-300"
                style={{ background: COLOR, boxShadow: `0 0 6px ${COLOR}` }} />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 w-9 h-9 rounded-sm flex items-center justify-center"
                    style={{ background: COLOR + '11', border: `1px solid ${COLOR}22` }}>
                    <Building2 size={15} style={{ color: COLOR + (e.is_active ? 'cc' : '44') }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[#a0d4e0] font-bold text-sm tracking-wide truncate">{e.nombre}</p>
                      <span className="shrink-0 text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border"
                        style={e.is_active
                          ? { color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }
                          : { color: '#6aacbc', borderColor: '#6aacbc33', background: '#6aacbc11' }}>
                        {e.is_active ? 'ACTIVA' : 'RETIRADA'}
                      </span>
                    </div>
                    <p className="text-[#6aacbc] text-[9px] tracking-widest">{e.codigo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <StatChip icon={Users}    valor={e.asociados_activos}    label="asociados" />
                  <StatChip icon={Ticket}   valor={e.bonos_activos}        label="bonos" />
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

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'lista',        label: 'EMPRESAS' },
  { id: 'estadisticas', label: 'ESTADÍSTICAS' },
];

const EmpresasLista = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('lista');

  useEffect(() => {
    apiService.get('/empresas')
      .then(({ data }) => setEmpresas(data))
      .finally(() => setLoading(false));
  }, []);

  const activas   = empresas.filter(e => e.is_active).length;
  const retiradas = empresas.filter(e => !e.is_active).length;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// MÓDULO</p>
        <h1 className="text-2xl font-bold tracking-wider" style={{ color: COLOR, textShadow: `0 0 20px ${COLOR}44` }}>
          EMPRESAS
        </h1>
        <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">
          {activas} ACTIVAS · {retiradas} RETIRADAS
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#00e5ff11] mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-3 text-[9px] tracking-[2px] transition-all border-b-2 -mb-px ${
              tab === id ? 'border-[#f97316]' : 'text-[#6aacbc] border-transparent hover:text-[#a0d4e0]'
            }`}
            style={tab === id ? { color: COLOR, textShadow: `0 0 8px ${COLOR}44` } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.12 }}
        >
          {tab === 'lista'        && <TabLista empresas={empresas} loading={loading} />}
          {tab === 'estadisticas' && <TabEstadisticas empresas={empresas} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default EmpresasLista;
