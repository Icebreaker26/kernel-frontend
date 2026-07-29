import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Users, Ticket, Banknote, Wallet,
  Loader2, ChevronRight, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

const COLOR = '#f97316';

const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : '—';
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

// ── Primitivos ────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color = COLOR }) => (
  <div className="bg-[#08101e] border rounded-sm p-4 relative overflow-hidden" style={{ borderColor: color + '22' }}>
    <div className="absolute inset-0 opacity-[0.05]"
      style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
    <div className="relative">
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-[8px] tracking-[2px] uppercase" style={{ color: color + 'aa' }}>{label}</p>
        <Icon size={13} style={{ color: color + '55' }} className="shrink-0 mt-0.5" />
      </div>
      <p className="font-bold font-mono text-xl leading-none" style={{ color, textShadow: `0 0 16px ${color}44` }}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-[8px] tracking-[2px] mt-1.5 uppercase" style={{ color: color + '77' }}>{sub}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-[10px] font-mono"
      style={{ boxShadow: '0 0 20px #00e5ff11' }}>
      {label && <p className="text-[#6aacbc] mb-1 tracking-wider">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const ChartCard = ({ titulo, children }) => (
  <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm p-5">
    <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-5">{titulo}</p>
    {children}
  </div>
);

const SelectFiltro = ({ value, onChange, opciones }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono"
  >
    {opciones.map(([val, label]) => (
      <option key={val} value={val}>{label}</option>
    ))}
  </select>
);

// ── Tab Asociados ─────────────────────────────────────────────────────────────

const FILTROS_INIT = { estado: '', cuota: '', saldo: '', portal: '' };

const TabAsociados = ({ asociados, navigate }) => {
  const [q, setQ]           = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INIT);

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }));
  const hayFiltros = q || Object.values(filtros).some(Boolean);

  const filtrados = useMemo(() => asociados.filter((a) => {
    if (q) {
      const s = q.toLowerCase();
      if (!a.codigo.toLowerCase().includes(s) &&
          !a.nombre.toLowerCase().includes(s) &&
          !a.apellido.toLowerCase().includes(s)) return false;
    }
    if (filtros.estado === 'activo'   && !a.is_active) return false;
    if (filtros.estado === 'inactivo' &&  a.is_active) return false;
    if (filtros.cuota && a.clase_cuota !== filtros.cuota) return false;
    if (filtros.portal === 'si' && !a.portal_activo) return false;
    if (filtros.portal === 'no' &&  a.portal_activo) return false;
    if (filtros.saldo) {
      const s = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
      if (filtros.saldo === 'favor'    && !(s < 0))   return false;
      if (filtros.saldo === 'pendiente' && !(s > 0))  return false;
      if (filtros.saldo === 'aldia'    && !(s === 0)) return false;
    }
    return true;
  }), [asociados, q, filtros]);

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 flex-1 min-w-48">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono"
          />
        </div>
        <SelectFiltro
          value={filtros.estado}
          onChange={(v) => setF('estado', v)}
          opciones={[['', 'Estado'], ['activo', 'Activos'], ['inactivo', 'Inactivos']]}
        />
        <SelectFiltro
          value={filtros.cuota}
          onChange={(v) => setF('cuota', v)}
          opciones={[['', 'Cuota'], ['1', 'Quincenal'], ['2', 'Mensual']]}
        />
        <SelectFiltro
          value={filtros.saldo}
          onChange={(v) => setF('saldo', v)}
          opciones={[['', 'Saldo'], ['favor', 'A favor'], ['aldia', 'Al día'], ['pendiente', 'Pendiente']]}
        />
        <SelectFiltro
          value={filtros.portal}
          onChange={(v) => setF('portal', v)}
          opciones={[['', 'Portal'], ['si', 'Con acceso'], ['no', 'Sin acceso']]}
        />
        {hayFiltros && (
          <button
            onClick={() => { setQ(''); setFiltros(FILTROS_INIT); }}
            className="flex items-center gap-1 px-3 py-2 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors"
          >
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">
        ASOCIADOS{' '}
        <span style={{ color: COLOR }}>
          ({filtrados.length}{filtrados.length !== asociados.length ? ` de ${asociados.length}` : ''})
        </span>
      </p>

      <div className="border border-[#00e5ff0d] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff08] bg-[#00e5ff04]">
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">NOMBRE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CÉDULA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CUOTA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">APORTE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">SALDO</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ESTADO</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6aacbc] tracking-widest text-[9px]">
                  SIN RESULTADOS
                </td>
              </tr>
            ) : filtrados.map((a, i) => {
              const saldo = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
              return (
                <motion.tr
                  key={a.codigo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.2) }}
                  onClick={() => navigate(`/asociados/${a.codigo}`)}
                  className="border-b border-[#00e5ff06] hover:bg-[#00e5ff04] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-[#a0d4e0]">{a.nombre} {a.apellido}</td>
                  <td className="px-4 py-3 text-[#6aacbc] font-mono">{a.codigo}</td>
                  <td className="px-4 py-3 text-[#6aacbc]">{labelClaseCuota(a.clase_cuota)}</td>
                  <td className="px-4 py-3 text-[#a0d4e0] font-mono">{fmtMoney(a.valor_aporte)}</td>
                  <td className="px-4 py-3 font-mono">
                    {saldo != null ? (
                      <span style={{ color: saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#6aacbc' }}>
                        {saldo === 0 ? 'AL DÍA' : fmtMoney(Math.abs(saldo))}
                        {saldo < 0 && <span className="text-[8px] ml-1 opacity-70">FAV</span>}
                        {saldo > 0 && <span className="text-[8px] ml-1 opacity-70">PEND</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded-sm border text-[8px] tracking-wider ${
                      a.is_active
                        ? 'bg-[#00e5ff0d] text-[#00e5ff] border-[#00e5ff22]'
                        : 'bg-[#ff3d3d0d] text-[#ff3d3d] border-[#ff3d3d22]'
                    }`}>
                      {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLOR }} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Tab Estadísticas ──────────────────────────────────────────────────────────

const TabEstadisticas = ({ asociados, stats }) => {
  const activos = asociados.filter(a => a.is_active);

  // Distribución por clase de cuota
  const distCuota = useMemo(() => {
    const map = {};
    activos.forEach(a => {
      const label = labelClaseCuota(a.clase_cuota) ?? 'Sin cuota';
      map[label] = (map[label] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activos]);

  // Estado de saldo
  const distSaldo = useMemo(() => {
    let favor = 0, aldia = 0, pendiente = 0;
    activos.forEach(a => {
      const s = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
      if (s == null) return;
      if (s < 0) favor++;
      else if (s > 0) pendiente++;
      else aldia++;
    });
    return [
      { name: 'A favor',   value: favor,     fill: '#10b981' },
      { name: 'Al día',    value: aldia,     fill: '#6aacbc' },
      { name: 'Pendiente', value: pendiente, fill: '#ff3d3d' },
    ].filter(d => d.value > 0);
  }, [activos]);

  // Top 10 por aporte mensual
  const topAportes = useMemo(() =>
    [...activos]
      .filter(a => a.valor_aporte != null)
      .sort((a, b) => Number(b.valor_aporte) - Number(a.valor_aporte))
      .slice(0, 10)
      .map(a => ({
        name: `${a.nombre} ${a.apellido}`.slice(0, 20),
        value: Number(a.valor_aporte),
      }))
  , [activos]);

  // Portal adoption
  const conPortal = activos.filter(a => a.portal_activo).length;
  const sinPortal = activos.length - conPortal;
  const distPortal = [
    { name: 'Con acceso', value: conPortal, fill: COLOR },
    { name: 'Sin acceso', value: sinPortal, fill: '#6aacbc33' },
  ].filter(d => d.value > 0);

  const PIE_COLORS = [COLOR, '#00e5ff', '#a78bfa', '#ffb700', '#10b981'];

  return (
    <div className="space-y-5">

      {/* Fila superior: 2 pies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <ChartCard titulo="DISTRIBUCIÓN POR CLASE DE CUOTA">
          {distCuota.length === 0 ? (
            <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distCuota} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {distCuota.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {distCuota.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[9px] text-[#6aacbc]">{d.name}</span>
                <span className="text-[9px] font-bold text-[#a0d4e0]">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard titulo="ESTADO DE SALDO DE ASOCIADOS ACTIVOS">
          {distSaldo.length === 0 ? (
            <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distSaldo} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {distSaldo.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {distSaldo.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                <span className="text-[9px] text-[#6aacbc]">{d.name}</span>
                <span className="text-[9px] font-bold text-[#a0d4e0]">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

      </div>

      {/* Top aportes */}
      {topAportes.length > 0 && (
        <ChartCard titulo="TOP 10 — CUOTA DE APORTE MENSUAL">
          <ResponsiveContainer width="100%" height={topAportes.length * 36 + 20}>
            <BarChart data={topAportes} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: '#6aacbc', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-[10px] font-mono">
                      <p style={{ color: COLOR }}>{fmtMoney(payload[0].value)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill={COLOR} radius={[0, 3, 3, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Portal */}
      <ChartCard titulo="ADOPCIÓN DEL PORTAL">
        <div className="flex items-center gap-8">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={distPortal} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {distPortal.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <div>
              <p className="text-[#6aacbc] text-[8px] tracking-[2px] mb-1">CON ACCESO AL PORTAL</p>
              <p className="font-mono font-bold text-2xl" style={{ color: COLOR }}>{conPortal}</p>
              <p className="text-[8px] text-[#6aacbc] mt-0.5">
                {activos.length > 0 ? `${Math.round(conPortal / activos.length * 100)}% del total activos` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[#6aacbc] text-[8px] tracking-[2px] mb-1">SIN ACCESO</p>
              <p className="font-mono font-bold text-2xl text-[#6aacbc]">{sinPortal}</p>
            </div>
          </div>
        </div>
      </ChartCard>

    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'asociados',    label: 'ASOCIADOS' },
  { id: 'estadisticas', label: 'ESTADÍSTICAS' },
];

const EmpresaPerfil = () => {
  const { codigo }        = useParams();
  const navigate          = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState('asociados');

  useEffect(() => {
    apiService.get(`/empresas/${codigo}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Error cargando empresa'))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={22} className="animate-spin" style={{ color: COLOR }} />
    </div>
  );

  if (!data) return (
    <div className="text-center py-24">
      <p className="text-[#6aacbc] text-xs tracking-[3px]">EMPRESA NO ENCONTRADA</p>
    </div>
  );

  const { empresa, stats, asociados } = data;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// PERFIL DE EMPRESA</p>
        <h1 className="text-2xl font-bold tracking-wider leading-snug" style={{ color: COLOR, textShadow: `0 0 20px ${COLOR}44` }}>
          {empresa.nombre.toUpperCase()}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[#6aacbc] text-[9px] tracking-widest">{empresa.codigo}</p>
          <span
            className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border"
            style={empresa.is_active
              ? { color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }
              : { color: '#6aacbc', borderColor: '#6aacbc33', background: '#6aacbc11' }
            }
          >
            {empresa.is_active ? 'ACTIVA' : 'RETIRADA'}
          </span>
          {empresa.fecha_ingreso && (
            <span className="text-[#6aacbc] text-[9px]">Desde {fmtFecha(empresa.fecha_ingreso)}</span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Users}   label="Asociados activos"  value={stats.asociados_activos} sub={`${stats.asociados_total} en total`} color={COLOR} />
        <StatCard icon={Ticket}  label="Bonos activos"      value={stats.bonos_activos}     sub="en sorteos"                          color="#00e5ff" />
        <StatCard icon={Banknote} label="Aportes mensuales" value={fmtMoney(stats.sum_aportes)} sub="suma cuotas activas"             color="#a78bfa" />
        <StatCard icon={Wallet}  label="Saldo a favor"      value={fmtMoney(stats.saldo_favor)}
          sub={Number(stats.saldo_pendiente) > 0 ? `${fmtMoney(stats.saldo_pendiente)} pendiente` : 'sin pendientes'}
          color="#10b981"
        />
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

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.12 }}
        >
          {tab === 'asociados'    && <TabAsociados asociados={asociados} navigate={navigate} />}
          {tab === 'estadisticas' && <TabEstadisticas asociados={asociados} stats={stats} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default EmpresaPerfil;
