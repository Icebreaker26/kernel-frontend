import { useState, useEffect } from 'react';
import { X, Building2, AlertTriangle, Clock, CircleCheck, Check, Ban, ShieldCheck, Receipt } from 'lucide-react';
import apiService from '../services/apiService.js';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'PEND. CI',    color: '#a78bfa', icon: CircleCheck },
  verificada:           { label: 'VERIFICADA',  color: '#22d3ee', icon: ShieldCheck },
  autorizada:           { label: 'AUTORIZADA',  color: '#34d399', icon: CircleCheck },
  pagada:               { label: 'PAGADA',      color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADA',   color: '#ef4444', icon: Ban },
};

const EstadoChip = ({ estado }) => {
  const m = ESTADO_META[estado] || {};
  const Icon = m.icon || Clock;
  return (
    <span className="flex items-center gap-1 text-[9px] tracking-wide px-2 py-0.5 rounded-sm border shrink-0"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={9} /> {m.label || estado.toUpperCase()}
    </span>
  );
};

const StatCard = ({ label, valor, color, sub }) => (
  <div className="flex-1 min-w-0 px-4 py-3 rounded-sm border bg-[#05080f]"
    style={{ borderColor: color + '33' }}>
    <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-1">{label}</p>
    <p className="text-base font-black font-mono leading-tight truncate" style={{ color }}>{valor}</p>
    {sub && <p className="text-[9px] text-[#6aacbc] mt-0.5">{sub}</p>}
  </div>
);

const TABS = [
  { key: 'activas', label: 'EN PROCESO' },
  { key: 'pagadas', label: 'PAGADAS' },
  { key: 'rechazadas', label: 'RECHAZADAS' },
];

const ACTIVOS = ['pendiente_aprobacion', 'aprobada', 'verificada', 'autorizada'];

export default function PerfilProveedor({ proveedor, apiBase, accent, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('activas');

  useEffect(() => {
    setLoading(true);
    apiService.get(`${apiBase}/proveedores/${proveedor.id}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proveedor.id, apiBase]);

  const facturas = data?.facturas || [];
  const stats    = data?.stats    || {};

  const filtradas = tab === 'activas'
    ? facturas.filter(f => ACTIVOS.includes(f.estado))
    : tab === 'pagadas'
      ? facturas.filter(f => f.estado === 'pagada')
      : facturas.filter(f => f.estado === 'rechazada');

  const accentBorder = accent + '33';
  const accentBg     = accent + '10';

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
        style={{ borderColor: accentBorder }}>
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: accent }} />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: accent }} />

        {/* Header fijo */}
        <div className="px-6 py-5 border-b" style={{ borderColor: accentBorder }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={14} style={{ color: accent }} />
                <p className="text-[8px] tracking-[3px] text-[#6aacbc]">PERFIL DE PROVEEDOR</p>
              </div>
              <h2 className="text-xl font-bold tracking-wide text-[#c8e8f0] leading-tight">{proveedor.nombre}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {proveedor.nit && (
                  <span className="text-[10px] text-[#6aacbc]">NIT {proveedor.nit}</span>
                )}
                {proveedor.email && (
                  <span className="text-[10px] text-[#6aacbc]">{proveedor.email}</span>
                )}
                {proveedor.telefono && (
                  <span className="text-[10px] text-[#6aacbc]">{proveedor.telefono}</span>
                )}
                {proveedor.categoria && (
                  <span className="text-[9px] px-2 py-0.5 rounded-sm border border-[#6aacbc33] text-[#6aacbc]">
                    {proveedor.categoria}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] shrink-0 mt-1">
              <X size={16} />
            </button>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-3 mt-4">
              <StatCard
                label="TOTAL PAGADO"
                valor={fmtCOP(stats.total_pagado)}
                color="#38bdf8"
                sub={`${stats.por_estado?.pagada || 0} factura${(stats.por_estado?.pagada || 0) !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="EN PROCESO"
                valor={fmtCOP(stats.total_en_curso)}
                color="#fbbf24"
                sub={`${ACTIVOS.reduce((s, e) => s + (stats.por_estado?.[e] || 0), 0)} factura${ACTIVOS.reduce((s, e) => s + (stats.por_estado?.[e] || 0), 0) !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="TOTAL FACTURAS"
                valor={stats.total_facturas ?? '—'}
                color={accent}
                sub={stats.por_estado?.rechazada ? `${stats.por_estado.rechazada} rechazada${stats.por_estado.rechazada > 1 ? 's' : ''}` : 'sin rechazos'}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6" style={{ borderColor: accentBorder }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-3 text-[9px] tracking-[2px] border-b-2 transition-all"
              style={{
                borderColor: tab === t.key ? accent : 'transparent',
                color: tab === t.key ? accent : '#6aacbc',
              }}>
              {t.label}
              {!loading && (
                <span className="ml-1.5 opacity-60">
                  ({t.key === 'activas'
                    ? ACTIVOS.reduce((s, e) => s + (stats.por_estado?.[e] || 0), 0)
                    : t.key === 'pagadas'
                      ? (stats.por_estado?.pagada || 0)
                      : (stats.por_estado?.rechazada || 0)})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista facturas — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-12">CARGANDO...</p>
          )}

          {!loading && filtradas.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-sm" style={{ borderColor: accentBorder }}>
              <Receipt size={20} style={{ color: accent }} className="mx-auto mb-2 opacity-30" />
              <p className="text-[#6aacbc] text-[9px] tracking-widest">
                {tab === 'activas' ? 'SIN FACTURAS EN PROCESO' : tab === 'pagadas' ? 'SIN FACTURAS PAGADAS' : 'SIN FACTURAS RECHAZADAS'}
              </p>
            </div>
          )}

          {!loading && filtradas.length > 0 && (
            <div className="space-y-2">
              {filtradas.map(f => {
                const dias    = diasParaVencer(f.fecha_vencimiento);
                const vencida = f.vencida || dias < 0;
                const urgente = !vencida && dias >= 0 && dias <= 5;
                const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
                return (
                  <div key={f.id} className="px-4 py-3 rounded-sm border transition-colors"
                    style={{
                      borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : accentBorder,
                      background:  vencida ? '#ef444406' : accentBg,
                    }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        {f.descripcion && (
                          <p className="text-xs text-[#c8e8f0] leading-tight truncate">{f.descripcion}</p>
                        )}
                        {f.numero_factura && (
                          <p className="text-[10px] font-mono text-[#7ec8d8] opacity-70 mt-0.5">{f.numero_factura}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black font-mono" style={{ color: accent }}>{fmtCOP(f.monto)}</p>
                        {tieneRet && (
                          <p className="text-[9px] text-[#6aacbc] opacity-70">neto {fmtCOP(f.monto_neto)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <EstadoChip estado={f.estado} />
                      {f.area_responsable && (
                        <span className="text-[9px] text-[#6aacbc] opacity-70">{f.area_responsable}</span>
                      )}
                      {f.estado === 'pagada' && f.fecha_pago && (
                        <span className="text-[9px] text-[#38bdf8]">pagada {fmtDate(f.fecha_pago)}</span>
                      )}
                      {f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                        <span className="flex items-center gap-1 text-[9px]"
                          style={{ color: vencida ? '#ef4444' : urgente ? '#fbbf24' : '#6aacbc' }}>
                          {(vencida || urgente) && <AlertTriangle size={9} />}
                          {vencida
                            ? `Vencida hace ${Math.abs(dias)}d`
                            : urgente
                              ? `Vence en ${dias}d`
                              : `Vence ${fmtDate(f.fecha_vencimiento)}`}
                        </span>
                      )}
                      {f.estado === 'rechazada' && f.rechazo_motivo && (
                        <span className="text-[9px] text-[#ef4444] opacity-80">· {f.rechazo_motivo}</span>
                      )}
                      <span className="text-[9px] text-[#6aacbc] opacity-40 ml-auto">{fmtDate(f.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
