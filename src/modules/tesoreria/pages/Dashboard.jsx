import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, CreditCard, RefreshCw, AlertTriangle, Clock, Check, Ban, Building2 } from 'lucide-react';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const TIPO_ICON  = { banco: '🏦', caja: '💵', tarjeta: '💳' };
const TIPO_LABEL = { banco: 'BANCO', caja: 'CAJA', tarjeta: 'TARJETA' };

const mesesES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const mesLabel  = (m) => { const [y,mo] = m.split('-'); return `${mesesES[Number(mo)-1]} ${y}`; };
const navMes    = (m, delta) => { const [y,mo] = m.split('-').map(Number); const d = new Date(y, mo-1+delta, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const Stat = ({ label, value, sub, color = ACCENT, border }) => (
  <div className="p-4 rounded-sm border" style={{ borderColor: border || color + '22', background: color + '06' }}>
    <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">{label}</p>
    <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
    {sub && <p className="text-[8px] text-[#6aacbc] mt-1 opacity-70">{sub}</p>}
  </div>
);

const TipoChip = ({ tipo }) => (
  <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
    style={{ color: ACCENT, borderColor: ACCENT + '44', background: ACCENT + '11' }}>
    {TIPO_LABEL[tipo] || tipo?.toUpperCase()}
  </span>
);

const MovRow = ({ m }) => {
  const color = m.tipo === 'ingreso' ? '#22c55e' : m.tipo === 'egreso' ? '#ef4444' : '#38bdf8';
  const sign  = m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '-' : '↔';
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#34d39908]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold" style={{ color }}>{sign}</span>
        <div className="min-w-0">
          <p className="text-[10px] text-[#a0d4e0] truncate">{m.descripcion || m.categoria_nombre || '—'}</p>
          <p className="text-[8px] text-[#6aacbc]">{m.cuenta_nombre} · {m.fecha?.slice(0,10)}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-sm font-bold font-mono" style={{ color }}>{fmtCOP(m.monto)}</p>
        {m.categoria_nombre && (
          <span className="text-[7px] tracking-wider px-1 py-0.5 rounded-sm"
            style={{ background: (m.categoria_color || '#64748b') + '22', color: m.categoria_color || '#64748b' }}>
            {m.categoria_nombre}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Sección facturas ───────────────────────────────────────────────────────────

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PENDIENTES CI',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'APROBADAS',       color: ACCENT,    icon: Check },
  pagada:               { label: 'PAGADAS',         color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADAS',      color: '#ef4444', icon: Ban  },
};

const estadoOrden = ['pendiente_aprobacion', 'aprobada', 'pagada', 'rechazada'];

const FacturasEstado = ({ porEstado }) => {
  const map = Object.fromEntries(porEstado.map(r => [r.estado, r]));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {estadoOrden.map(e => {
        const meta = ESTADO_META[e];
        const Icon = meta.icon;
        const row  = map[e] || { cantidad: 0, monto_total: 0 };
        return (
          <div key={e} className="p-4 rounded-sm border" style={{ borderColor: meta.color + '22', background: meta.color + '06' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={10} style={{ color: meta.color }} />
              <p className="text-[8px] tracking-[2px]" style={{ color: meta.color }}>{meta.label}</p>
            </div>
            <p className="text-xl font-black font-mono" style={{ color: meta.color }}>{row.cantidad}</p>
            <p className="text-[8px] text-[#6aacbc] mt-0.5">{fmtCOP(row.monto_total)}</p>
          </div>
        );
      })}
    </div>
  );
};

const Alertas = ({ alertas }) => {
  if (!alertas || (alertas.vencidas === 0 && alertas.urgentes === 0)) return null;
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {alertas.vencidas > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#ef444433] bg-[#ef444410]">
          <AlertTriangle size={11} color="#ef4444" />
          <span className="text-[9px] tracking-widest text-[#ef4444]">
            {alertas.vencidas} VENCIDA{alertas.vencidas > 1 ? 'S' : ''} — {fmtCOP(alertas.monto_vencido)}
          </span>
        </div>
      )}
      {alertas.urgentes > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#fbbf2433] bg-[#fbbf2410]">
          <Clock size={11} color="#fbbf24" />
          <span className="text-[9px] tracking-widest text-[#fbbf24]">
            {alertas.urgentes} VENCE{alertas.urgentes > 1 ? 'N' : ''} ESTA SEMANA
          </span>
        </div>
      )}
      {alertas.monto_pendiente > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#a78bfa33] bg-[#a78bfa10]">
          <span className="text-[9px] tracking-widest text-[#a78bfa]">
            {fmtCOP(alertas.monto_pendiente)} PENDIENTE DE PAGO
          </span>
        </div>
      )}
    </div>
  );
};

const Eficiencia = ({ eficiencia }) => {
  if (!eficiencia) return null;
  const tasaRechazo = eficiencia.total_procesadas > 0
    ? Math.round(eficiencia.total_rechazadas / eficiencia.total_procesadas * 100)
    : 0;

  const dias = (v, label) => v != null
    ? <div key={label} className="text-center">
        <p className="text-2xl font-black font-mono" style={{ color: v <= 2 ? ACCENT : v <= 5 ? '#fbbf24' : '#ef4444' }}>{v}d</p>
        <p className="text-[7px] tracking-[2px] text-[#6aacbc] mt-0.5">{label}</p>
      </div>
    : null;

  return (
    <div className="p-4 rounded-sm border border-[#34d39915] bg-[#34d39904] mb-6">
      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-4">EFICIENCIA DEL FLUJO — PROMEDIO DE DÍAS</p>
      <div className="flex items-center justify-around gap-4 flex-wrap">
        {dias(eficiencia.avg_dias_area_contable,    'ÁREA CONTABLE')}
        {eficiencia.avg_dias_area_contable != null && <span className="text-[#34d39933] text-lg">→</span>}
        {dias(eficiencia.avg_dias_control_interno,  'CONTROL INTERNO')}
        {eficiencia.avg_dias_control_interno != null && <span className="text-[#34d39933] text-lg">→</span>}
        {dias(eficiencia.avg_dias_tesoreria,        'TESORERÍA')}
        <div className="text-center border-l border-[#34d39922] pl-4 ml-2">
          <p className="text-2xl font-black font-mono" style={{ color: tasaRechazo > 20 ? '#ef4444' : tasaRechazo > 10 ? '#fbbf24' : ACCENT }}>
            {tasaRechazo}%
          </p>
          <p className="text-[7px] tracking-[2px] text-[#6aacbc] mt-0.5">TASA RECHAZO</p>
          <p className="text-[7px] text-[#6aacbc] opacity-50">{eficiencia.total_rechazadas}/{eficiencia.total_procesadas}</p>
        </div>
      </div>
    </div>
  );
};

const Tendencia = ({ tendencia }) => {
  if (!tendencia?.length) return null;
  const max = Math.max(...tendencia.map(t => Number(t.monto_total)), 1);
  return (
    <div>
      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">PAGOS — ÚLTIMOS 6 MESES</p>
      <div className="space-y-2">
        {tendencia.map(t => {
          const pct = Math.round(Number(t.monto_total) / max * 100);
          const [y, mo] = t.mes.split('-');
          return (
            <div key={t.mes} className="flex items-center gap-2">
              <span className="text-[8px] text-[#6aacbc] w-10 shrink-0">{mesesES[Number(mo)-1]} {y.slice(2)}</span>
              <div className="flex-1 h-4 bg-[#34d39910] rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, background: ACCENT + 'aa' }} />
              </div>
              <span className="text-[8px] font-mono text-[#a0d4e0] w-28 text-right shrink-0">{fmtCOP(t.monto_total)}</span>
              <span className="text-[7px] text-[#6aacbc] opacity-50 w-8 shrink-0">{t.cantidad}f</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopProveedores = ({ top }) => {
  if (!top?.length) return <p className="text-[9px] text-[#6aacbc] opacity-50">Sin pagos registrados</p>;
  const max = Math.max(...top.map(p => Number(p.monto_total)), 1);
  return (
    <div>
      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">TOP PROVEEDORES (PAGADOS)</p>
      <div className="space-y-2">
        {top.map((p, i) => (
          <div key={p.nombre} className="flex items-center gap-2">
            <span className="text-[8px] text-[#6aacbc] opacity-40 w-4 shrink-0">{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-[#a0d4e0] truncate">{p.nombre}</p>
              <div className="h-1 mt-1 bg-[#34d39910] rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${Math.round(Number(p.monto_total)/max*100)}%`, background: ACCENT + '88' }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-mono" style={{ color: ACCENT }}>{fmtCOP(p.monto_total)}</p>
              <p className="text-[7px] text-[#6aacbc] opacity-50">{p.total_facturas} fact.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PorArea = ({ porArea }) => {
  if (!porArea?.length) return null;
  const max = Math.max(...porArea.map(a => Number(a.monto_total)), 1);
  return (
    <div>
      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">COMPROMETIDO POR ÁREA</p>
      <div className="space-y-2">
        {porArea.map(a => (
          <div key={a.area_responsable} className="flex items-center gap-2">
            <Building2 size={9} color="#6aacbc" className="shrink-0" />
            <span className="text-[8px] text-[#a0d4e0] flex-1 truncate">{a.area_responsable}</span>
            <div className="w-16 h-1 bg-[#34d39910] rounded-sm overflow-hidden shrink-0">
              <div className="h-full rounded-sm" style={{ width: `${Math.round(Number(a.monto_total)/max*100)}%`, background: '#a78bfa88' }} />
            </div>
            <span className="text-[8px] font-mono text-[#a0d4e0] w-24 text-right shrink-0">{fmtCOP(a.monto_total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [mes,     setMes]     = useState(mesActual);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/tesoreria/dashboard?mes=${mes}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const flujoNeto = data ? Number(data.flujo.ingresos) - Number(data.flujo.egresos) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            TESORERÍA
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// DASHBOARD</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMes(m => navMes(m, -1))}
            className="px-3 py-1.5 text-[10px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-all">‹</button>
          <span className="text-[10px] tracking-widest text-[#a0d4e0] min-w-[80px] text-center">{mesLabel(mes)}</span>
          <button onClick={() => setMes(m => navMes(m, +1))} disabled={mes >= mesActual()}
            className="px-3 py-1.5 text-[10px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-all disabled:opacity-30">›</button>
          <button onClick={cargar} className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-20 text-[#6aacbc] text-[10px] tracking-widest animate-pulse">CARGANDO...</div>}

      {!loading && data && (
        <>
          {/* Alertas de facturas */}
          <Alertas alertas={data.facturas?.alertas} />

          {/* Flujo del mes */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label="INGRESOS" value={fmtCOP(data.flujo.ingresos)} color="#22c55e" />
            <Stat label="EGRESOS"  value={fmtCOP(data.flujo.egresos)}  color="#ef4444" />
            <Stat label="NETO MES" value={(flujoNeto >= 0 ? '+' : '') + fmtCOP(flujoNeto)}
              color={flujoNeto >= 0 ? ACCENT : '#f97316'} />
          </div>

          {/* Saldos por cuenta */}
          <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">SALDOS POR CUENTA</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {data.cuentas.map(c => (
              <div key={c.id} className="p-4 rounded-sm border border-[#34d39915] bg-[#34d39906]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">{TIPO_ICON[c.tipo]}</span>
                  <TipoChip tipo={c.tipo} />
                </div>
                <p className="text-[9px] tracking-widest text-[#6aacbc] mb-1 truncate">{c.nombre.toUpperCase()}</p>
                <p className="text-xl font-black font-mono" style={{ color: Number(c.saldo_actual) >= 0 ? ACCENT : '#ef4444' }}>
                  {fmtCOP(c.saldo_actual)}
                </p>
                {c.entidad && <p className="text-[7px] text-[#6aacbc] mt-1 opacity-60">{c.entidad}</p>}
              </div>
            ))}
          </div>

          {/* ── FACTURAS ── */}
          <div className="border-t border-[#34d39911] pt-6 mb-6">
            <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-4">FACTURAS — ESTADO GENERAL</p>
            <FacturasEstado porEstado={data.facturas?.por_estado || []} />
            <Eficiencia eficiencia={data.facturas?.eficiencia} />
          </div>

          {/* Grid inferior */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-6">
              <TopProveedores top={data.facturas?.top_proveedores} />
              {data.facturas?.por_area?.length > 0 && <PorArea porArea={data.facturas.por_area} />}
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
              <Tendencia tendencia={data.facturas?.tendencia} />

              {/* Por categoría de movimientos */}
              {data.por_categoria.length > 0 && (
                <div>
                  <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">MOVIMIENTOS POR CATEGORÍA</p>
                  <div className="space-y-2">
                    {data.por_categoria.slice(0, 6).map(c => (
                      <div key={c.nombre} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                        <span className="text-[9px] text-[#a0d4e0] flex-1 truncate">{c.nombre}</span>
                        <span className="text-[10px] font-mono" style={{ color: c.tipo === 'ingreso' ? '#22c55e' : '#ef4444' }}>
                          {c.tipo === 'ingreso' ? '+' : '-'}{fmtCOP(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Últimos movimientos */}
              <div>
                <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">ÚLTIMOS MOVIMIENTOS</p>
                {data.ultimos_movimientos.length === 0
                  ? <p className="text-[9px] text-[#6aacbc] opacity-50">Sin movimientos registrados</p>
                  : data.ultimos_movimientos.slice(0, 6).map(m => <MovRow key={m.id} m={m} />)
                }
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-20 text-[#6aacbc] text-[10px] tracking-widest opacity-50">
          ERROR AL CARGAR DASHBOARD
        </div>
      )}
    </div>
  );
}
