import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const fmtH = (h) => {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h} h`;
  return `${(h / 24).toFixed(1)} días`;
};

const ESTADO_CFG = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24' },
  aprobada:             { label: 'APROBADA',     color: '#34d399' },
  verificada:           { label: 'VERIFICADA',   color: '#22d3ee' },
  autorizada:           { label: 'AUTORIZADA',   color: '#a78bfa' },
  pagada:               { label: 'PAGADA',       color: '#38bdf8' },
  rechazada:            { label: 'RECHAZADA',    color: '#ef4444' },
};

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Componentes auxiliares ────────────────────────────────────────────────────

const KPI = ({ icon: Icon, label, value, sub, color = ACCENT, alerta }) => (
  <div className="bg-[#08101e] border rounded-sm p-4 relative overflow-hidden"
    style={{ borderColor: (alerta ? '#ef4444' : color) + '33' }}>
    <div className="absolute top-0 left-0 h-[2px] w-1/2"
      style={{ background: alerta ? '#ef4444' : color, boxShadow: `0 0 8px ${alerta ? '#ef4444' : color}88` }} />
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-sm mt-0.5" style={{ background: (alerta ? '#ef4444' : color) + '15' }}>
        <Icon size={14} style={{ color: alerta ? '#ef4444' : color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-1 uppercase">{label}</p>
        <p className="text-xl font-bold leading-none" style={{ color: alerta ? '#ef4444' : '#c8e8f0' }}>{value}</p>
        {sub && <p className="text-[9px] text-[#6aacbc] mt-1">{sub}</p>}
      </div>
    </div>
  </div>
);

const BarH = ({ label, value, max, color, extra }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-[#a0d4e0] truncate pr-2">{label}</span>
        <span className="text-[10px] text-[#6aacbc] shrink-0">{extra}</span>
      </div>
      <div className="h-[6px] bg-[#0d1829] rounded-full">
        <div className="h-[6px] rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }} />
      </div>
    </div>
  );
};

const Etapa = ({ label, horas, color, isLast }) => (
  <div className="flex items-center gap-2">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 rounded-full border-2 shrink-0"
        style={{ borderColor: horas != null ? color : '#1e3a4a', background: horas != null ? color + '33' : 'transparent' }} />
      {!isLast && <div className="w-px flex-1 mt-1" style={{ background: '#1e3a4a', minHeight: 24 }} />}
    </div>
    <div className="pb-4">
      <p className="text-[9px] tracking-wider text-[#6aacbc]">{label}</p>
      <p className="text-sm font-bold" style={{ color: horas != null ? color : '#2a4a5a' }}>
        {fmtH(horas)}
      </p>
    </div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

const EstadisticasFacturas = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    apiService.get('/control_interno/estadisticas')
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Error cargando estadísticas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: ACCENT }} />
    </div>
  );

  if (!data) return null;

  const { pipeline, tiempos, mensual, proveedores, por_area, alertas } = data;

  // Totales derivados
  const totalFacturas = pipeline.reduce((s, r) => s + r.total, 0);
  const montoTotal    = pipeline.reduce((s, r) => s + Number(r.monto), 0);
  const rechazadas    = pipeline.find(r => r.estado === 'rechazada')?.total ?? 0;
  const tasaRechazo   = totalFacturas > 0 ? ((rechazadas / totalFacturas) * 100).toFixed(1) : 0;

  const maxMensualMonto = Math.max(...mensual.map(m => Number(m.monto)), 1);
  const maxProvMonto    = Math.max(...proveedores.map(p => Number(p.monto)), 1);
  const maxAreaMonto    = Math.max(...por_area.map(a => Number(a.monto)), 1);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// CONTROL INTERNO</p>
          <h1 className="text-lg font-bold tracking-[3px]" style={{ color: ACCENT, textShadow: `0 0 12px ${ACCENT}44` }}>
            ESTADÍSTICAS DE FACTURACIÓN
          </h1>
        </div>
        <button onClick={cargar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[9px] tracking-widest transition-colors text-[#6aacbc] hover:text-[#c084fc]"
          style={{ borderColor: ACCENT + '22' }}>
          <RefreshCw size={11} /> ACTUALIZAR
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI icon={TrendingUp}   label="Total facturas"   value={totalFacturas}           sub={fmtCOP(montoTotal) + ' en total'} />
        <KPI icon={CheckCircle2} label="Tiempo promedio"  value={fmtH(tiempos?.total_h)}  sub={`muestra: ${tiempos?.muestra ?? 0} facturas pagadas`} />
        <KPI icon={XCircle}      label="Tasa de rechazo"  value={`${tasaRechazo}%`}        sub={`${rechazadas} rechazadas`} alerta={Number(tasaRechazo) > 20} />
        <KPI icon={AlertTriangle} label="Vencidas en curso" value={alertas?.vencidas ?? 0}
          sub={alertas?.vencidas > 0 ? fmtCOP(alertas.monto_vencidas) : 'Sin vencidas'}
          alerta={alertas?.vencidas > 0} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Pipeline por estado */}
        <div className="bg-[#08101e] border border-[#c084fc11] rounded-sm p-4">
          <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-4">PIPELINE POR ESTADO</p>
          <div className="space-y-3">
            {pipeline.map((r) => {
              const cfg = ESTADO_CFG[r.estado] ?? { label: r.estado, color: '#6aacbc' };
              const maxPipeline = Math.max(...pipeline.map(x => Number(x.monto)), 1);
              return (
                <div key={r.estado}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                    <div className="text-right">
                      <span className="text-[10px] text-[#a0d4e0] font-mono">{r.total}</span>
                      <span className="text-[8px] text-[#6aacbc] ml-2">{fmtCOP(r.monto)}</span>
                    </div>
                  </div>
                  <div className="h-[5px] bg-[#0d1829] rounded-full">
                    <div className="h-[5px] rounded-full"
                      style={{
                        width: `${Math.round((Number(r.monto) / maxPipeline) * 100)}%`,
                        background: cfg.color,
                        boxShadow: `0 0 4px ${cfg.color}66`,
                      }} />
                  </div>
                </div>
              );
            })}
          </div>
          {alertas?.proximas_7d > 0 && (
            <div className="mt-4 px-3 py-2 rounded-sm border border-[#fbbf2422] bg-[#fbbf2408]">
              <p className="text-[9px] text-[#fbbf24]">
                ⚠ {alertas.proximas_7d} factura{alertas.proximas_7d > 1 ? 's' : ''} vence{alertas.proximas_7d === 1 ? '' : 'n'} en los próximos 7 días
              </p>
            </div>
          )}
        </div>

        {/* Tiempos por etapa */}
        <div className="bg-[#08101e] border border-[#c084fc11] rounded-sm p-4">
          <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-4">TIEMPO PROMEDIO POR ETAPA</p>
          {tiempos?.muestra === 0 ? (
            <p className="text-[10px] text-[#2a4a5a] text-center py-6">Sin facturas pagadas con historial completo aún</p>
          ) : (
            <div className="pl-2">
              <Etapa label="Registro → Aprobación área"    horas={tiempos?.pend_aprobada_h}         color="#fbbf24" />
              <Etapa label="Aprobación → Verificación CI"  horas={tiempos?.aprobada_verificada_h}    color="#22d3ee" />
              <Etapa label="Verificación → Autorización"   horas={tiempos?.verificada_autorizada_h}  color="#a78bfa" />
              <Etapa label="Autorización → Pago"           horas={tiempos?.autorizada_pagada_h}      color="#38bdf8" isLast />
            </div>
          )}
          {tiempos?.total_h != null && (
            <div className="mt-3 pt-3 border-t border-[#c084fc11] flex justify-between">
              <span className="text-[9px] tracking-wider text-[#6aacbc]">TOTAL END-TO-END</span>
              <span className="text-sm font-bold" style={{ color: ACCENT }}>{fmtH(tiempos.total_h)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Volumen mensual */}
        <div className="bg-[#08101e] border border-[#c084fc11] rounded-sm p-4">
          <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-4">VOLUMEN MENSUAL</p>
          {mensual.length === 0 ? (
            <p className="text-[10px] text-[#2a4a5a] text-center py-6">Sin datos</p>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {mensual.map((m) => {
                const pct = Math.round((Number(m.monto) / maxMensualMonto) * 100);
                const [year, month] = m.mes.split('-');
                const label = MESES_ES[parseInt(month, 10) - 1];
                return (
                  <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] text-[#6aacbc]">{m.total}</span>
                    <div className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: `${ACCENT}88`,
                        boxShadow: `0 0 6px ${ACCENT}44`,
                      }} />
                    <span className="text-[8px] text-[#6aacbc]">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top proveedores */}
        <div className="bg-[#08101e] border border-[#c084fc11] rounded-sm p-4">
          <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-4">TOP PROVEEDORES</p>
          {proveedores.length === 0 ? (
            <p className="text-[10px] text-[#2a4a5a] text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {proveedores.map((p, i) => (
                <BarH key={p.nombre}
                  label={p.nombre}
                  value={Number(p.monto)}
                  max={maxProvMonto}
                  color={ACCENT}
                  extra={`${p.facturas} fact · ${fmtCOP(p.monto)}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Por área responsable */}
      {por_area.some(a => a.area !== 'Sin área') && (
        <div className="bg-[#08101e] border border-[#c084fc11] rounded-sm p-4">
          <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-4">DISTRIBUCIÓN POR ÁREA</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {por_area.map((a) => (
              <BarH key={a.area}
                label={a.area}
                value={Number(a.monto)}
                max={maxAreaMonto}
                color="#818cf8"
                extra={`${a.total} fact · ${fmtCOP(a.monto)}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasFacturas;
