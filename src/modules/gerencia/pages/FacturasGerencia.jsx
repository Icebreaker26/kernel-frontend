import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, AlertTriangle, Clock, Search, RefreshCw,
  ShieldCheck, User, ArrowLeft, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ACCENT = '#f59e0b';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const diasParaVencer = (fecha) => {
  if (!fecha) return null;
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

// ── Pipeline (6 pasos — incluye aprobación gerencia) ──────────────────────────
const ETAPAS = [
  { key: 'registrada', label: 'REGISTRADA'    },
  { key: 'area',       label: 'APROBAC. ÁREA' },
  { key: 'ci',         label: 'VERIFICAC. CI' },
  { key: 'gerencia',   label: 'APROBAC. GER.' },
  { key: 'tesoreria',  label: 'AUTORIZACIÓN'  },
  { key: 'pago',       label: 'PAGO'          },
];

// Todas las facturas aquí están en estado='verificada' sin aprobación gerencia → paso 4 activo
const etapaActiva = () => 4;

const MiniPasoFactura = () => {
  const activa = etapaActiva();
  const etapaActual = ETAPAS[activa - 1];
  return (
    <div className="flex items-center gap-1.5">
      {ETAPAS.map((_, i) => {
        const num   = i + 1;
        const hecha = num < activa;
        const actual = num === activa;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all"
              style={{
                background: hecha  ? '#34d399' : actual ? ACCENT : `${ACCENT}18`,
                boxShadow:  actual ? `0 0 6px ${ACCENT}88` : 'none',
              }} />
            {i < ETAPAS.length - 1 && (
              <div className="w-3 h-px" style={{ background: hecha ? '#34d39955' : `${ACCENT}18` }} />
            )}
          </div>
        );
      })}
      {etapaActual && (
        <span className="text-[12px] tracking-wide ml-1" style={{ color: ACCENT }}>
          {etapaActual.label}
        </span>
      )}
    </div>
  );
};

const PasoFactura = () => {
  const activa = etapaActiva();
  return (
    <div className="flex items-center gap-0">
      {ETAPAS.map((etapa, i) => {
        const num    = i + 1;
        const hecha  = num < activa;
        const actual = num === activa;
        const ultimo = i === ETAPAS.length - 1;
        return (
          <div key={etapa.key} className="flex items-center" style={{ flex: ultimo ? '0 0 auto' : 1, minWidth: 0 }}>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
                style={{
                  borderColor: hecha ? '#34d399' : actual ? ACCENT : `${ACCENT}22`,
                  background:  hecha ? '#34d39922' : actual ? ACCENT + '22' : 'transparent',
                }}>
                {hecha
                  ? <Check size={11} className="text-[#34d399]" strokeWidth={3} />
                  : <span className="text-[11px] font-bold" style={{ color: actual ? ACCENT : `${ACCENT}55` }}>{num}</span>
                }
              </div>
              <span className="text-[10px] tracking-wide mt-1 whitespace-nowrap"
                style={{ color: hecha ? '#34d399' : actual ? ACCENT : `${ACCENT}44` }}>
                {etapa.label}
              </span>
            </div>
            {!ultimo && (
              <div className="h-px mx-1 transition-all" style={{ flex: 1, background: hecha ? '#34d39955' : `${ACCENT}18` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Modal de rechazo ──────────────────────────────────────────────────────────
const ModalRechazar = ({ factura, onRechazar, onClose, loading }) => {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#08101e] border border-[#ef444433] rounded-sm w-full max-w-md relative p-6">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]" />
        <p className="text-[10px] tracking-[3px] text-[#ef4444] mb-5">DEVOLVER A CONTROL INTERNO</p>
        <p className="text-[11px] text-[#a0d4e0] mb-1">{factura.proveedor_nombre}</p>
        <p className="text-lg font-black font-mono text-[#ef4444] mb-5">{fmtCOP(factura.monto)}</p>
        <p className="text-[10px] text-[#475569] mb-4 leading-relaxed">
          La factura regresa a la cola de CI con tu observación. CI podrá re-verificarla antes de enviártela de nuevo.
        </p>
        <div className="mb-5">
          <label className="text-[10px] tracking-wide text-[#7ec8d8] mb-1 block">OBSERVACIÓN *</label>
          <textarea
            className="w-full bg-[#05080f] border border-[#ef444422] rounded-sm px-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#ef444455] transition-colors resize-none"
            rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Indica qué debe revisar o corregir Control Interno..." />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[10px] tracking-wide border border-[#ef444422] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">
            CANCELAR
          </button>
          <button onClick={() => onRechazar(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444455] bg-[#ef444415] text-[#ef4444]">
            <Ban size={11} /> {loading ? 'DEVOLVIENDO...' : 'DEVOLVER A CI'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detalle de factura ────────────────────────────────────────────────────────
const DetalleFactura = ({ factura: f, onClose, onAprobar, onRechazar, saving }) => {
  const accentBorder = ACCENT + '33';
  const montoNeto = Number(f.monto) - Number(f.retencion_fuente || 0) - Number(f.retencion_ica || 0) - Number(f.retencion_iva || 0);
  const tieneRet  = montoNeto < Number(f.monto);
  const diasVenc  = diasParaVencer(f.fecha_vencimiento);
  const diasGer   = diasParaVencer(f.aprobacion_vence_at);

  const Campo = ({ label, valor, mono }) => (
    <div>
      <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">{label}</p>
      <p className={`text-base text-[#c8e8f0] ${mono ? 'font-mono' : ''}`}>{valor || '—'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col relative"
        style={{ borderColor: accentBorder }}>
        <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: ACCENT }} />
        <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: ACCENT }} />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b" style={{ borderColor: accentBorder }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[4px] text-[#6aacbc] mb-1">APROBACIÓN GERENCIA</p>
              <h2 className="text-2xl font-bold text-[#c8e8f0]">{f.proveedor_nombre}</h2>
              <p className="text-[11px] text-[#475569] mt-0.5">NIT {f.proveedor_nit}</p>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="mb-4"><PasoFactura /></div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">MONTO BRUTO</p>
              <p className="text-3xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
            </div>
            {tieneRet && (
              <>
                <div className="text-[#6aacbc] text-2xl mb-1">→</div>
                <div>
                  <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">NETO A PAGAR</p>
                  <p className="text-3xl font-black font-mono text-[#34d399]">{fmtCOP(montoNeto)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

          {/* Alerta plazo gerencia */}
          {diasGer != null && diasGer <= 3 && (
            <div className="flex items-center gap-2 p-3 rounded-sm border"
              style={{ borderColor: diasGer <= 0 ? '#ef444444' : '#f9731644', background: diasGer <= 0 ? '#ef444411' : '#f9731611' }}>
              <AlertTriangle size={13} style={{ color: diasGer <= 0 ? '#ef4444' : '#f97316' }} />
              <p className="text-[11px]" style={{ color: diasGer <= 0 ? '#ef4444' : '#f97316' }}>
                {diasGer <= 0
                  ? 'Plazo de aprobación gerencia vencido'
                  : `Plazo de aprobación vence en ${diasGer} día${diasGer !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          {/* Retenciones */}
          {tieneRet && (
            <div className="p-4 rounded-sm border space-y-2" style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">RETENCIONES</p>
              {Number(f.retencion_fuente) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención en la Fuente</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_fuente)}</span>
                </div>
              )}
              {Number(f.retencion_ica) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención ICA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_ica)}</span>
                </div>
              )}
              {Number(f.retencion_iva) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención IVA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_iva)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-2 border-t" style={{ borderColor: ACCENT + '22' }}>
                <span className="text-[#c8e8f0] font-semibold">Neto a pagar</span>
                <span className="font-mono font-bold text-[#34d399]">{fmtCOP(montoNeto)}</span>
              </div>
            </div>
          )}

          {/* Datos generales */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {f.descripcion && (
              <div className="col-span-3">
                <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">CONCEPTO</p>
                <p className="text-base text-[#c8e8f0]">{f.descripcion}</p>
              </div>
            )}
            {f.numero_factura && <Campo label="N° FACTURA" valor={f.numero_factura} mono />}
            {f.area_responsable && <Campo label="ÁREA RESPONSABLE" valor={f.area_responsable} />}
            <Campo label="FECHA RECIBIDA" valor={fmtDate(f.fecha_recibida)} />
            <Campo label="FECHA VENCIMIENTO" valor={
              f.fecha_vencimiento
                ? <span className="flex items-center gap-2">
                    <span>{fmtDate(f.fecha_vencimiento)}</span>
                    {diasVenc !== null && (
                      <span className="text-base font-medium" style={{
                        color: diasVenc < 0 ? '#ef4444' : diasVenc <= 5 ? '#fbbf24' : '#7ec8d8',
                      }}>
                        {diasVenc < 0 ? `· vencida hace ${Math.abs(diasVenc)}d` : diasVenc === 0 ? '· vence hoy' : `· en ${diasVenc}d`}
                      </span>
                    )}
                  </span>
                : '—'
            } />
            <Campo label="VERIFICADA POR CI" valor={f.verificada_por_nombre} />
            <Campo label="VERIFICADA EN" valor={fmtDate(f.verificada_at)} />
            <Campo label="PLAZO APROBACIÓN" valor={
              f.aprobacion_vence_at
                ? `${fmtDate(f.aprobacion_vence_at)}${diasGer != null ? ` (${diasGer}d)` : ''}`
                : '—'
            } />
          </div>

          {/* Trazabilidad */}
          <div className="border-t pt-4" style={{ borderColor: accentBorder }}>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              {f.registrado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Registrado por</span>
                  <span className="text-[#c8e8f0]">{f.registrado_por_nombre} · {fmtDate(f.fecha_recibida)}</span>
                </div>
              )}
              {f.verificada_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Verificado CI por</span>
                  <span className="text-[#c8e8f0]">{f.verificada_por_nombre} · {fmtDate(f.verificada_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: accentBorder }}>
          <button onClick={onClose}
            className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
            style={{ borderColor: accentBorder }}>
            CERRAR
          </button>
          <button onClick={() => { onRechazar(f); onClose(); }} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
            <X size={11} /> DEVOLVER A CI
          </button>
          <button onClick={() => onAprobar(f.id)} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
            <ShieldCheck size={11} /> {saving ? 'APROBANDO...' : 'APROBAR FACTURA'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Paginación ─────────────────────────────────────────────────────────────────
const Paginacion = ({ total, pagina, porPagina, onChange }) => {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fin    = Math.min(pagina * porPagina, total);
  const nums   = [];
  if (totalPags <= 7) {
    for (let i = 1; i <= totalPags; i++) nums.push(i);
  } else {
    nums.push(1);
    if (pagina > 3) nums.push('…');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(totalPags - 1, pagina + 1); i++) nums.push(i);
    if (pagina < totalPags - 2) nums.push('…');
    nums.push(totalPags);
  }
  const Btn = ({ label, to, disabled, active }) => (
    <button onClick={() => !disabled && onChange(to)} disabled={disabled}
      className="min-w-[2rem] px-2 py-1 text-[11px] tracking-wide rounded-sm border transition-all"
      style={{
        borderColor: active ? ACCENT + '55' : `${ACCENT}22`,
        background:  active ? ACCENT + '15' : 'transparent',
        color:       active ? ACCENT : disabled ? '#4a7a8a55' : '#7ec8d8',
        cursor:      disabled ? 'default' : 'pointer',
      }}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: `${ACCENT}11` }}>
      <p className="text-[11px] text-[#4a7a8a]">{inicio}–{fin} <span className="opacity-60">de {total}</span></p>
      <div className="flex items-center gap-1">
        <Btn label="←" to={pagina - 1} disabled={pagina === 1} />
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="px-1 text-[11px] text-[#4a7a8a]">…</span>
          : <Btn key={n} label={n} to={n} active={n === pagina} />
        )}
        <Btn label="→" to={pagina + 1} disabled={pagina === totalPags} />
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const POR_PAGINA = 10;

export default function FacturasGerencia() {
  const navigate = useNavigate();
  const [facturas,  setFacturas]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null);
  const [busqueda,  setBusqueda]  = useState('');
  const [pagina,    setPagina]    = useState(1);
  const [detalle,   setDetalle]   = useState(null);
  const [rechazar,  setRechazar]  = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/gerencia/facturas-pendientes')
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda]);

  const facturasVisibles = useMemo(() => {
    if (!busqueda) return facturas;
    const q = busqueda.toLowerCase();
    return facturas.filter(f =>
      f.proveedor_nombre?.toLowerCase().includes(q) ||
      f.proveedor_nit?.toLowerCase().includes(q) ||
      f.numero_factura?.toLowerCase().includes(q) ||
      f.descripcion?.toLowerCase().includes(q) ||
      f.area_responsable?.toLowerCase().includes(q)
    );
  }, [facturas, busqueda]);

  const facturasPagina = facturasVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const aprobar = async (id) => {
    setSaving(id);
    try {
      const f = facturas.find(x => x.id === id);
      await apiService.put(`/tesoreria/facturas/${id}/aprobar-gerencia`);
      toast.success(`Factura de ${f?.proveedor_nombre} aprobada — pasa a Tesorería`);
      setDetalle(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al aprobar');
    } finally { setSaving(null); }
  };

  const confirmarRechazo = async (motivo) => {
    setSaving(rechazar.id);
    try {
      await apiService.put(`/tesoreria/facturas/${rechazar.id}/rechazar-gerencia`, { motivo });
      toast.success('Factura devuelta a Control Interno con observación');
      setRechazar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setSaving(null); }
  };

  const fmt = n => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;
  const montoTotal = facturasVisibles.reduce((s, f) => s + Number(f.monto), 0);
  const vencidas   = facturasVisibles.filter(f => diasParaVencer(f.fecha_vencimiento) !== null && diasParaVencer(f.fecha_vencimiento) < 0).length;
  const urgentes   = facturasVisibles.filter(f => { const d = diasParaVencer(f.fecha_vencimiento); return d !== null && d >= 0 && d <= 5; }).length;

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-[#a0d4e0] relative">
      <GeometricBackground />
      <div className="relative z-10 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/gerencia')} className="text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
              FACTURAS
            </h1>
            <p className="text-[#7ec8d8] text-[13px] tracking-[2px] mt-0.5">// APROBACIÓN GERENCIA — ALTO MONTO</p>
          </div>
        </div>
        <button onClick={cargar}
          className="p-2 border rounded-sm text-[#6aacbc] hover:text-[#f59e0b] transition-all"
          style={{ borderColor: `${ACCENT}22` }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-stretch gap-px mb-4 border rounded-sm overflow-hidden" style={{ borderColor: `${ACCENT}1a` }}>
          {[
            { label: 'FACTURAS',     value: facturasVisibles.length, color: '#c8e8f0' },
            { label: 'MONTO TOTAL',  value: fmt(montoTotal),          color: '#c8e8f0' },
            { label: 'VENC. PAGO',   value: vencidas,                 color: vencidas > 0 ? '#ef4444' : '#4a7a8a' },
            { label: '≤ 5 DÍAS',     value: urgentes,                 color: urgentes > 0 ? '#fbbf24' : '#4a7a8a' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
              <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar proveedor, NIT, # factura, concepto, área..."
          className="w-full bg-[#05080f] border rounded-sm pl-8 pr-3 py-2 text-base text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none transition-colors"
          style={{ borderColor: `${ACCENT}22`, outlineColor: `${ACCENT}55` }}
          onFocus={e => e.target.style.borderColor = `${ACCENT}55`}
          onBlur={e => e.target.style.borderColor = `${ACCENT}22`}
        />
      </div>

      {loading && (
        <p className="text-center text-[#7ec8d8] text-base tracking-wide animate-pulse py-16">CARGANDO...</p>
      )}

      {!loading && facturasVisibles.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-sm" style={{ borderColor: `${ACCENT}22` }}>
          <Clock size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-base tracking-wide">
            {busqueda ? 'SIN COINCIDENCIAS' : 'SIN FACTURAS PENDIENTES DE APROBACIÓN'}
          </p>
        </div>
      )}

      {!loading && facturasVisibles.length > 0 && (
        <div className="space-y-2">
          {facturasPagina.map(f => {
            const dias       = diasParaVencer(f.fecha_vencimiento);
            const vencida    = dias !== null && dias < 0;
            const urgente    = dias !== null && dias >= 0 && dias <= 5;
            const diasGer    = diasParaVencer(f.aprobacion_vence_at);
            const gerUrgente = diasGer !== null && diasGer <= 3;
            const montoNeto  = Number(f.monto) - Number(f.retencion_fuente || 0) - Number(f.retencion_ica || 0) - Number(f.retencion_iva || 0);
            const tieneRet   = montoNeto < Number(f.monto);
            const procesando = saving === f.id;

            return (
              <div key={f.id}
                onClick={() => setDetalle(f)}
                className="px-5 py-4 rounded-sm border transition-colors cursor-pointer"
                style={{
                  borderColor: vencida ? '#ef444433' : urgente || gerUrgente ? '#fbbf2433' : `${ACCENT}18`,
                  background: `${ACCENT}04`,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${ACCENT}40`}
                onMouseLeave={e => e.currentTarget.style.borderColor = vencida ? '#ef444433' : urgente || gerUrgente ? '#fbbf2433' : `${ACCENT}18`}>

                {/* Fila 1: proveedor + monto */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                    <p className="text-[11px] text-[#475569]">NIT {f.proveedor_nit}</p>
                    {f.descripcion && (
                      <p className="text-base text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black font-mono leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                    {tieneRet && (
                      <p className="text-[12px] text-[#7ec8d8] opacity-70 mt-0.5">neto {fmtCOP(montoNeto)}</p>
                    )}
                  </div>
                </div>

                {/* Fila 2: pipeline */}
                <div className="mb-3">
                  <MiniPasoFactura />
                </div>

                {/* Fila 3: metadata chips */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {f.numero_factura && (
                    <span className="text-base font-mono text-[#a0d4e0]">{f.numero_factura}</span>
                  )}
                  {f.area_responsable && (
                    <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border"
                      style={{ borderColor: `${ACCENT}33`, color: ACCENT, background: `${ACCENT}10` }}>
                      {f.area_responsable.toUpperCase()}
                    </span>
                  )}
                  {f.verificada_por_nombre && (
                    <span className="flex items-center gap-1.5 text-base text-[#7ec8d8]">
                      <User size={11} /> {f.verificada_por_nombre}
                    </span>
                  )}
                </div>

                {/* Fila 4: countdown + acción */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="flex items-center gap-1.5 text-base font-medium"
                      style={{ color: vencida ? '#ef4444' : urgente ? '#fbbf24' : '#7ec8d8' }}>
                      {(vencida || urgente) && <AlertTriangle size={11} />}
                      {vencida
                        ? `Pago vencido hace ${Math.abs(dias)}d`
                        : dias === 0 ? 'Vence hoy'
                        : dias !== null ? `Vence en ${dias}d · ${f.fecha_vencimiento}`
                        : `Recibida ${fmtDate(f.fecha_recibida)}`}
                    </span>
                    {gerUrgente && (
                      <span className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: diasGer <= 0 ? '#ef4444' : '#f97316' }}>
                        <AlertTriangle size={10} />
                        {diasGer <= 0 ? 'Plazo aprobación vencido' : `Plazo aprobación: ${diasGer}d`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setRechazar(f)} disabled={procesando}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
                      <X size={11} /> DEVOLVER
                    </button>
                    <button onClick={() => aprobar(f.id)} disabled={procesando}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                      style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                      <ShieldCheck size={11} /> {procesando ? '...' : 'APROBAR'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <Paginacion total={facturasVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
        </div>
      )}

      {detalle && (
        <DetalleFactura
          factura={detalle}
          onClose={() => setDetalle(null)}
          onAprobar={aprobar}
          onRechazar={(f) => setRechazar(f)}
          saving={!!saving}
        />
      )}

      {rechazar && (
        <ModalRechazar
          factura={rechazar}
          onRechazar={confirmarRechazo}
          onClose={() => setRechazar(null)}
          loading={!!saving}
        />
      )}
      </div>
    </div>
  );
}
