import { useState, useEffect, useMemo } from 'react';
import { X, Building2, AlertTriangle, Clock, CircleCheck, Check, Ban, ShieldCheck, Receipt, Search } from 'lucide-react';
import apiService from '../services/apiService.js';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
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
    <span className="flex items-center gap-1.5 text-[10px] tracking-wide px-2.5 py-1 rounded-sm border shrink-0"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={11} /> {m.label || estado.toUpperCase()}
    </span>
  );
};

const StatCard = ({ label, valor, color, sub }) => (
  <div className="flex-1 min-w-0 px-5 py-4 rounded-sm border bg-[#05080f]"
    style={{ borderColor: color + '33' }}>
    <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-1.5">{label}</p>
    <p className="text-xl font-black font-mono leading-tight truncate" style={{ color }}>{valor}</p>
    {sub && <p className="text-xs text-[#6aacbc] mt-1">{sub}</p>}
  </div>
);

const TABS = [
  { key: 'activas',    label: 'EN PROCESO' },
  { key: 'pagadas',    label: 'PAGADAS' },
  { key: 'rechazadas', label: 'RECHAZADAS' },
];

const ACTIVOS = ['pendiente_aprobacion', 'aprobada', 'verificada', 'autorizada'];

const inputCls = (accent) =>
  `bg-[#05080f] border rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc]/50
   focus:outline-none transition-colors border-[${accent}22] focus:border-[${accent}55]`;

export default function PerfilProveedor({ proveedor, apiBase, accent, onClose }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('activas');
  const [busqueda,  setBusqueda]  = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    setLoading(true);
    apiService.get(`${apiBase}/proveedores/${proveedor.id}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proveedor.id, apiBase]);

  // Resetear filtros al cambiar tab
  const handleTab = (key) => {
    setTab(key);
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const facturas = data?.facturas || [];
  const stats    = data?.stats    || {};

  const porTab = tab === 'activas'
    ? facturas.filter(f => ACTIVOS.includes(f.estado))
    : tab === 'pagadas'
      ? facturas.filter(f => f.estado === 'pagada')
      : facturas.filter(f => f.estado === 'rechazada');

  const filtradas = useMemo(() => {
    let list = porTab;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(f =>
        f.descripcion?.toLowerCase().includes(q) ||
        f.numero_factura?.toLowerCase().includes(q) ||
        f.area_responsable?.toLowerCase().includes(q)
      );
    }
    if (fechaDesde) list = list.filter(f => f.created_at >= fechaDesde);
    if (fechaHasta) list = list.filter(f => f.created_at <= fechaHasta + 'T23:59:59');
    return list;
  }, [porTab, busqueda, fechaDesde, fechaHasta]);

  const accentBorder = accent + '33';
  const accentBg     = accent + '10';

  const cntActivas    = ACTIVOS.reduce((s, e) => s + (stats.por_estado?.[e] || 0), 0);
  const cntPagadas    = stats.por_estado?.pagada    || 0;
  const cntRechazadas = stats.por_estado?.rechazada || 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#08101e] border rounded-sm w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative"
        style={{ borderColor: accentBorder }}
      >
        <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: accent }} />
        <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: accent }} />

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="px-8 pt-7 pb-5 border-b" style={{ borderColor: accentBorder }}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={15} style={{ color: accent }} />
                <p className="text-[9px] tracking-[4px] text-[#6aacbc]">PERFIL DE PROVEEDOR</p>
              </div>
              <h2 className="text-2xl font-bold tracking-wide text-[#c8e8f0] leading-tight">{proveedor.nombre}</h2>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {proveedor.nit && (
                  <span className="text-sm text-[#6aacbc]">NIT {proveedor.nit}</span>
                )}
                {proveedor.email && (
                  <span className="text-sm text-[#6aacbc]">{proveedor.email}</span>
                )}
                {proveedor.telefono && (
                  <span className="text-sm text-[#6aacbc]">{proveedor.telefono}</span>
                )}
                {proveedor.categoria && (
                  <span className="text-xs px-2.5 py-1 rounded-sm border border-[#6aacbc33] text-[#6aacbc]">
                    {proveedor.categoria}
                  </span>
                )}
                {proveedor.notas && (
                  <span className="text-xs text-[#6aacbc] opacity-60 italic">{proveedor.notas}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] shrink-0 mt-1">
              <X size={18} />
            </button>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-4">
              <StatCard
                label="TOTAL PAGADO"
                valor={fmtCOP(stats.total_pagado)}
                color="#38bdf8"
                sub={`${cntPagadas} factura${cntPagadas !== 1 ? 's' : ''} pagada${cntPagadas !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="EN PROCESO"
                valor={fmtCOP(stats.total_en_curso)}
                color="#fbbf24"
                sub={`${cntActivas} factura${cntActivas !== 1 ? 's' : ''} activa${cntActivas !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="TOTAL FACTURAS"
                valor={stats.total_facturas ?? '—'}
                color={accent}
                sub={cntRechazadas ? `${cntRechazadas} rechazada${cntRechazadas > 1 ? 's' : ''}` : 'sin rechazos'}
              />
            </div>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex border-b px-8" style={{ borderColor: accentBorder }}>
          {TABS.map(t => {
            const cnt = t.key === 'activas' ? cntActivas : t.key === 'pagadas' ? cntPagadas : cntRechazadas;
            return (
              <button key={t.key} onClick={() => handleTab(t.key)}
                className="px-5 py-3.5 text-xs tracking-[2px] border-b-2 transition-all"
                style={{
                  borderColor: tab === t.key ? accent : 'transparent',
                  color: tab === t.key ? accent : '#6aacbc',
                }}>
                {t.label}
                {!loading && (
                  <span className="ml-2 text-[10px] opacity-60">({cnt})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────────────── */}
        {!loading && (
          <div className="px-8 py-3 border-b flex gap-3 items-center" style={{ borderColor: accentBorder }}>
            {/* Buscador */}
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc] opacity-50" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por concepto, N° factura, área..."
                className="w-full bg-[#05080f] border rounded-sm pl-9 pr-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc]/40 focus:outline-none transition-colors"
                style={{ borderColor: busqueda ? accent + '55' : accentBorder }}
              />
            </div>
            {/* Fecha desde */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[9px] tracking-[2px] text-[#6aacbc] whitespace-nowrap">DESDE</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="bg-[#05080f] border rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none transition-colors"
                style={{ borderColor: fechaDesde ? accent + '55' : accentBorder }}
              />
            </div>
            {/* Fecha hasta */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[9px] tracking-[2px] text-[#6aacbc] whitespace-nowrap">HASTA</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="bg-[#05080f] border rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none transition-colors"
                style={{ borderColor: fechaHasta ? accent + '55' : accentBorder }}
              />
            </div>
            {/* Limpiar */}
            {(busqueda || fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); }}
                className="text-[10px] tracking-wide text-[#6aacbc] hover:text-[#a0d4e0] transition-colors whitespace-nowrap px-2 py-2 border rounded-sm"
                style={{ borderColor: accentBorder }}
              >
                LIMPIAR
              </button>
            )}
          </div>
        )}

        {/* ── Lista facturas — scrollable ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {loading && (
            <p className="text-center text-[#6aacbc] text-sm tracking-widest animate-pulse py-16">CARGANDO...</p>
          )}

          {!loading && filtradas.length === 0 && (
            <div className="text-center py-16 border border-dashed rounded-sm" style={{ borderColor: accentBorder }}>
              <Receipt size={28} style={{ color: accent }} className="mx-auto mb-3 opacity-30" />
              <p className="text-[#6aacbc] text-sm tracking-widest">
                {busqueda || fechaDesde || fechaHasta
                  ? 'SIN RESULTADOS PARA LOS FILTROS APLICADOS'
                  : tab === 'activas' ? 'SIN FACTURAS EN PROCESO'
                  : tab === 'pagadas' ? 'SIN FACTURAS PAGADAS'
                  : 'SIN FACTURAS RECHAZADAS'}
              </p>
            </div>
          )}

          {!loading && filtradas.length > 0 && (
            <div className="space-y-3">
              {filtradas.map(f => {
                const dias     = diasParaVencer(f.fecha_vencimiento);
                const vencida  = f.vencida || dias < 0;
                const urgente  = !vencida && dias >= 0 && dias <= 5;
                const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
                return (
                  <div key={f.id} className="px-5 py-4 rounded-sm border transition-colors"
                    style={{
                      borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : accentBorder,
                      background:  vencida ? '#ef444406' : accentBg,
                    }}>
                    {/* Fila principal: descripción + monto */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        {f.descripcion
                          ? <p className="text-sm font-medium text-[#c8e8f0] leading-snug">{f.descripcion}</p>
                          : <p className="text-sm text-[#6aacbc] italic opacity-60">Sin concepto</p>
                        }
                        {f.numero_factura && (
                          <p className="text-xs font-mono text-[#7ec8d8] opacity-70 mt-0.5">{f.numero_factura}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black font-mono leading-tight" style={{ color: accent }}>{fmtCOP(f.monto)}</p>
                        {tieneRet && (
                          <p className="text-xs text-[#6aacbc] opacity-70 mt-0.5">neto {fmtCOP(f.monto_neto)}</p>
                        )}
                      </div>
                    </div>

                    {/* Fila chips y fechas */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <EstadoChip estado={f.estado} />
                      {f.area_responsable && (
                        <span className="text-xs text-[#6aacbc] opacity-70">{f.area_responsable}</span>
                      )}
                      {f.estado === 'pagada' && f.fecha_pago && (
                        <span className="text-xs text-[#38bdf8]">Pagada el {fmtDate(f.fecha_pago)}</span>
                      )}
                      {f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                        <span className="flex items-center gap-1.5 text-xs"
                          style={{ color: vencida ? '#ef4444' : urgente ? '#fbbf24' : '#6aacbc' }}>
                          {(vencida || urgente) && <AlertTriangle size={11} />}
                          {vencida
                            ? `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
                            : urgente
                              ? `Vence en ${dias} día${dias !== 1 ? 's' : ''}`
                              : `Vence el ${fmtDate(f.fecha_vencimiento)}`}
                        </span>
                      )}
                      {f.estado === 'rechazada' && f.rechazo_motivo && (
                        <span className="text-xs text-[#ef4444] opacity-80">· {f.rechazo_motivo}</span>
                      )}
                      <span className="text-xs text-[#6aacbc] opacity-40 ml-auto">
                        Registrada {fmtDate(f.created_at)}
                      </span>
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
