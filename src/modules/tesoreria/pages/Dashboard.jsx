import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, CreditCard, RefreshCw } from 'lucide-react';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const A_DIM  = '#1e7a5a';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const TIPO_ICON   = { banco: '🏦', caja: '💵', tarjeta: '💳' };
const TIPO_LABEL  = { banco: 'BANCO', caja: 'CAJA', tarjeta: 'TARJETA' };

const mesesES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const mesLabel = (m) => {
  const [y, mo] = m.split('-');
  return `${mesesES[Number(mo) - 1]} ${y}`;
};

const navMes = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

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
          <p className="text-[8px] text-[#6aacbc]">{m.cuenta_nombre} · {m.fecha?.slice(0, 10)}</p>
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

export default function Dashboard() {
  const [mes,      setMes]      = useState(mesActual);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);

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
            className="px-3 py-1.5 text-[10px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-all">
            ‹
          </button>
          <span className="text-[10px] tracking-widest text-[#a0d4e0] min-w-[80px] text-center">{mesLabel(mes)}</span>
          <button onClick={() => setMes(m => navMes(m, +1))}
            disabled={mes >= mesActual()}
            className="px-3 py-1.5 text-[10px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-all disabled:opacity-30">
            ›
          </button>
          <button onClick={cargar} className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-[#6aacbc] text-[10px] tracking-widest animate-pulse">CARGANDO...</div>
      )}

      {!loading && data && (
        <>
          {/* Flujo del mes */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-sm border border-[#22c55e22] bg-[#22c55e08]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={12} color="#22c55e" />
                <p className="text-[8px] tracking-[3px] text-[#6aacbc]">INGRESOS</p>
              </div>
              <p className="text-2xl font-black font-mono text-[#22c55e]">{fmtCOP(data.flujo.ingresos)}</p>
            </div>
            <div className="p-4 rounded-sm border border-[#ef444422] bg-[#ef444408]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={12} color="#ef4444" />
                <p className="text-[8px] tracking-[3px] text-[#6aacbc]">EGRESOS</p>
              </div>
              <p className="text-2xl font-black font-mono text-[#ef4444]">{fmtCOP(data.flujo.egresos)}</p>
            </div>
            <div className={`p-4 rounded-sm border ${flujoNeto >= 0 ? 'border-[#34d39922] bg-[#34d39908]' : 'border-[#f9731622] bg-[#f9731608]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={12} color={flujoNeto >= 0 ? ACCENT : '#f97316'} />
                <p className="text-[8px] tracking-[3px] text-[#6aacbc]">NETO MES</p>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: flujoNeto >= 0 ? ACCENT : '#f97316' }}>
                {flujoNeto >= 0 ? '+' : ''}{fmtCOP(flujoNeto)}
              </p>
            </div>
          </div>

          {/* Cuentas */}
          <div className="mb-6">
            <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">SALDOS POR CUENTA</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por categoría */}
            {data.por_categoria.length > 0 && (
              <div>
                <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">POR CATEGORÍA</p>
                <div className="space-y-2">
                  {data.por_categoria.slice(0, 8).map(c => (
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
                : data.ultimos_movimientos.map(m => <MovRow key={m.id} m={m} />)
              }
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
