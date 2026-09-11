import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, AlertTriangle, Ban, CircleCheck, RefreshCw, ShieldCheck,
  ArrowLeft, User, FileText, History, Eye, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT     = '#34d399';
const POR_PAGINA = 10;

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '—';

const diasParaVencer = (fecha) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha + 'T00:00:00') - hoy) / 86400000);
};

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24' },
  aprobada:             { label: 'APROBADA',     color: '#34d399' },
  verificada:           { label: 'VERIFICADA',   color: '#22d3ee' },
  autorizada:           { label: 'AUTORIZADA',   color: '#a78bfa' },
  pagada:               { label: 'PAGADA',       color: '#38bdf8' },
  rechazada:            { label: 'RECHAZADA',    color: '#ef4444' },
};

const ETAPAS = [
  { key: 'registrada', label: 'REGISTRADA' },
  { key: 'area',       label: 'APROBACIÓN ÁREA' },
  { key: 'ci',         label: 'VERIFICACIÓN CI' },
  { key: 'tesoreria',  label: 'AUTORIZACIÓN' },
  { key: 'pago',       label: 'PAGO' },
];

const etapaActiva = (estado) => {
  if (estado === 'rechazada') return -1;
  return { pendiente_aprobacion: 1, aprobada: 2, verificada: 3, autorizada: 4, pagada: 5 }[estado] ?? 1;
};

const MiniPasoFactura = ({ estado }) => {
  if (estado === 'rechazada') {
    return (
      <span className="flex items-center gap-1 text-[9px] tracking-wide px-2 py-0.5 rounded-sm border border-[#ef444433] text-[#ef4444] bg-[#ef444411]">
        <Ban size={9} /> RECHAZADA
      </span>
    );
  }
  const activa     = etapaActiva(estado);
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
                background: hecha ? '#34d399' : actual ? ACCENT : '#34d39918',
                boxShadow:  actual ? `0 0 6px ${ACCENT}88` : 'none',
              }} />
            {i < ETAPAS.length - 1 && (
              <div className="w-3 h-px" style={{ background: hecha ? '#34d39955' : '#34d39918' }} />
            )}
          </div>
        );
      })}
      {etapaActual && (
        <span className="text-[9px] tracking-wide ml-1" style={{ color: ACCENT }}>
          {etapaActual.label}
        </span>
      )}
    </div>
  );
};

const Paginacion = ({ total, pagina, porPagina, onChange }) => {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fin    = Math.min(pagina * porPagina, total);
  const Btn = ({ p, children, disabled }) => (
    <button onClick={() => !disabled && onChange(p)} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-[10px] rounded-sm border transition-all disabled:opacity-30"
      style={p === pagina
        ? { borderColor: ACCENT + '88', background: ACCENT + '20', color: ACCENT }
        : { borderColor: '#34d39918', background: 'transparent', color: '#6aacbc' }}>
      {children}
    </button>
  );
  const nums = [];
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || Math.abs(i - pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#34d39911]">
      <p className="text-[11px] text-[#4a7a8a]">{inicio}–{fin} <span className="opacity-60">de {total}</span></p>
      <div className="flex items-center gap-1">
        <Btn p={pagina - 1} disabled={pagina === 1}>‹</Btn>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="w-7 text-center text-[10px] text-[#6aacbc]">…</span>
          : <Btn key={n} p={n}>{n}</Btn>
        )}
        <Btn p={pagina + 1} disabled={pagina === totalPags}>›</Btn>
      </div>
    </div>
  );
};

/* ── Modal vista previa adjunto ─────────────────────────────────────────── */
function PreviewModal({ facturaId, adjunto, onClose }) {
  const [url,     setUrl]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get(`/aprobaciones/${facturaId}/adjunto`)
      .then(({ data }) => setUrl(data.url))
      .catch(() => { toast.error('No se pudo cargar el adjunto'); onClose(); })
      .finally(() => setLoading(false));
  }, [facturaId]);

  const isPdf = adjunto?.mime_type === 'application/pdf';
  const isImg = adjunto?.mime_type?.startsWith('image/');

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[60] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>{adjunto?.nombre || 'ADJUNTO'}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-white transition-colors"><X size={16} /></button>
      </div>
      <div className="flex-1 min-h-0 rounded-sm overflow-hidden border border-[#34d39922]">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[10px] tracking-widest animate-pulse" style={{ color: ACCENT }}>CARGANDO...</p>
          </div>
        )}
        {!loading && url && isPdf && <iframe src={url} className="w-full h-full border-0" title="Vista previa PDF" />}
        {!loading && url && isImg && <img src={url} alt={adjunto?.nombre} className="w-full h-full object-contain bg-[#05080f]" />}
        {!loading && url && !isPdf && !isImg && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <FileText size={40} color={ACCENT} className="opacity-40" />
            <a href={url} target="_blank" rel="noreferrer"
              className="text-[10px] tracking-widest px-4 py-2 border rounded-sm transition-colors"
              style={{ borderColor: ACCENT + '44', color: ACCENT }}>
              DESCARGAR ARCHIVO
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal detalle completo ─────────────────────────────────────────────── */
function DetalleModal({ facturaId, onClose }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [verPreview, setVerPreview] = useState(false);

  useEffect(() => {
    apiService.get(`/aprobaciones/${facturaId}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('Error al cargar detalle'); onClose(); })
      .finally(() => setLoading(false));
  }, [facturaId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <p className="text-[10px] tracking-widest animate-pulse" style={{ color: ACCENT }}>CARGANDO...</p>
    </div>
  );
  if (!data) return null;

  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#34d39908]">
      <span className="text-[9px] tracking-[2px] text-[#6aacbc] shrink-0">{label}</span>
      <span className="text-[10px] text-[#c8e8f0] text-right">{value}</span>
    </div>
  ) : null;

  const tieneRet = Number(data.retencion_fuente) + Number(data.retencion_ica) + Number(data.retencion_iva) > 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col relative"
        style={{ borderColor: ACCENT + '33' }}>
        <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: ACCENT }} />
        <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: ACCENT }} />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b" style={{ borderColor: ACCENT + '22' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[4px] text-[#6aacbc] mb-1">DETALLE DE FACTURA</p>
              <h2 className="text-2xl font-bold text-[#c8e8f0]">{data.proveedor_nombre}</h2>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="mb-4">
            <MiniPasoFactura estado={data.estado} />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">MONTO BRUTO</p>
              <p className="text-3xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(data.monto)}</p>
            </div>
            {tieneRet && (
              <>
                <div className="text-[#6aacbc] text-2xl mb-1">→</div>
                <div>
                  <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">NETO A PAGAR</p>
                  <p className="text-3xl font-black font-mono text-[#34d399]">{fmtCOP(data.monto_neto)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {tieneRet && (
            <div className="p-4 rounded-sm border space-y-2" style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">RETENCIONES</p>
              {[
                ['Retención en la Fuente', data.retencion_fuente],
                ['Retención ICA',          data.retencion_ica],
                ['Retención IVA',          data.retencion_iva],
              ].filter(([, v]) => Number(v) > 0).map(([lbl, v]) => (
                <div key={lbl} className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">{lbl}</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(v)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base pt-2 border-t" style={{ borderColor: ACCENT + '22' }}>
                <span className="text-[#c8e8f0] font-semibold">Neto a pagar</span>
                <span className="font-mono font-bold text-[#34d399]">{fmtCOP(data.monto_neto)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {data.descripcion && (
              <div className="col-span-3">
                <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">CONCEPTO</p>
                <p className="text-base text-[#c8e8f0]">{data.descripcion}</p>
              </div>
            )}
            {data.numero_factura   && <div><p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">N° FACTURA</p><p className="text-base text-[#c8e8f0] font-mono">{data.numero_factura}</p></div>}
            {data.area_responsable && <div><p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">ÁREA</p><p className="text-base text-[#c8e8f0]">{data.area_responsable}</p></div>}
            <div><p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">VENCIMIENTO</p><p className="text-base text-[#c8e8f0]">{fmtFecha(data.fecha_vencimiento)}</p></div>
            <div><p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">RECIBIDA</p><p className="text-base text-[#c8e8f0]">{fmtFecha(data.fecha_recibida)}</p></div>
            {data.proveedor_nit    && <div><p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">NIT PROVEEDOR</p><p className="text-base text-[#c8e8f0] font-mono">{data.proveedor_nit}</p></div>}
          </div>

          <div className="border-t pt-4" style={{ borderColor: ACCENT + '22' }}>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              <Row label="REGISTRADO POR" value={data.registrado_por_nombre ? `${data.registrado_por_nombre} · ${fmtFecha(data.created_at)}` : null} />
              <Row label="APROBADO POR"   value={data.aprobado_por_nombre   ? `${data.aprobado_por_nombre}   · ${fmtFecha(data.aprobado_at)}`  : null} />
              {data.rechazo_motivo && (
                <div className="mt-2 p-3 border border-[#ef444422] rounded-sm bg-[#ef444408]">
                  <p className="text-[9px] tracking-[2px] text-[#ef4444] mb-1">MOTIVO DE RECHAZO</p>
                  <p className="text-[11px] text-[#c8e8f0]">{data.rechazo_motivo}</p>
                </div>
              )}
            </div>
          </div>

          {data.adjunto && (
            <div>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-2">DOCUMENTO ADJUNTO</p>
              <button onClick={() => setVerPreview(true)}
                className="w-full flex items-center gap-3 p-3 border rounded-sm transition-colors"
                style={{ borderColor: ACCENT + '33', background: ACCENT + '06' }}>
                <Eye size={14} style={{ color: ACCENT }} />
                <div className="text-left min-w-0">
                  <p className="text-[11px] text-[#c8e8f0] truncate">{data.adjunto.nombre}</p>
                  <p className="text-[9px] text-[#6aacbc] tracking-wide mt-0.5">
                    {data.adjunto.mime_type} · {data.adjunto.size_bytes ? `${(data.adjunto.size_bytes / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
                <span className="ml-auto text-[9px] tracking-widest shrink-0" style={{ color: ACCENT }}>VER PDF</span>
              </button>
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t flex justify-end" style={{ borderColor: ACCENT + '22' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
            style={{ borderColor: ACCENT + '33' }}>
            CERRAR
          </button>
        </div>
      </div>

      {verPreview && (
        <PreviewModal facturaId={facturaId} adjunto={data?.adjunto} onClose={() => setVerPreview(false)} />
      )}
    </div>
  );
}

/* ── Modal rechazo ──────────────────────────────────────────────────────── */
function RechazarModal({ factura, onConfirm, onClose, loading }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#ef444433] rounded-sm w-full max-w-md relative p-6">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]" />
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] tracking-[3px] text-[#ef4444]">RECHAZAR FACTURA</p>
          <button onClick={onClose} className="text-[#6aacbc] hover:text-[#c8e8f0]"><X size={14} /></button>
        </div>
        <p className="text-base font-semibold text-[#c8e8f0] mb-0.5">{factura.proveedor_nombre}</p>
        <p className="text-[11px] text-[#6aacbc] mb-4 font-mono">{fmtCOP(factura.monto)}</p>
        <label className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1 block">MOTIVO *</label>
        <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Indique el motivo del rechazo..."
          className="w-full bg-[#05080f] border border-[#ef444422] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#ef444455] transition-colors resize-none" />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
            CANCELAR
          </button>
          <button onClick={() => onConfirm(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: '#ef444455', background: '#ef444415', color: '#ef4444' }}>
            <X size={11} /> {loading ? 'RECHAZANDO...' : 'CONFIRMAR RECHAZO'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */
function FacturaCard({ f, onAprobar, onRechazar, onDetalle, onPreview, isPending, saving }) {
  const dias    = f.fecha_vencimiento ? diasParaVencer(f.fecha_vencimiento) : null;
  const vencida = dias !== null && dias < 0;
  const urgente = dias !== null && dias >= 0 && dias <= 5;
  const tieneRet = Number(f.monto_neto) > 0 && Number(f.monto_neto) !== Number(f.monto);

  return (
    <div
      onClick={() => onDetalle(f.id)}
      className="px-5 py-4 rounded-sm border transition-colors cursor-pointer hover:border-[#34d39940] hover:bg-[#34d3990a]"
      style={{
        borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#34d39918',
        background:  vencida ? '#ef444406' : '#34d39905',
      }}
    >
      {/* Fila 1: proveedor + monto */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
          {f.descripcion && <p className="text-base text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black font-mono leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
          {tieneRet && <p className="text-[12px] text-[#7ec8d8] opacity-70 mt-0.5">neto {fmtCOP(f.monto_neto)}</p>}
        </div>
      </div>

      {/* Fila 2: stepper */}
      <div className="mb-3">
        <MiniPasoFactura estado={f.estado} />
      </div>

      {/* Fila 3: metadata */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {f.numero_factura && <span className="text-base font-mono text-[#a0d4e0]">{f.numero_factura}</span>}
        {f.area_responsable && (
          <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
            {f.area_responsable.toUpperCase()}
          </span>
        )}
        {f.registrado_por_nombre && (
          <span className="flex items-center gap-1.5 text-base text-[#7ec8d8]">
            <User size={11} /> {f.registrado_por_nombre}
          </span>
        )}
        {!isPending && (() => {
          const em = ESTADO_META[f.estado] || { label: f.estado?.toUpperCase(), color: '#6aacbc' };
          return (
            <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border"
              style={{ color: em.color, borderColor: em.color + '44', background: em.color + '11' }}>
              {em.label}
            </span>
          );
        })()}
      </div>

      {/* Fila 4: countdown + acciones */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {isPending && dias !== null && f.estado !== 'rechazada' && (
            <span className="flex items-center gap-1.5 text-base font-medium"
              style={{ color: vencida ? '#ef4444' : dias <= 5 ? '#fbbf24' : dias <= 15 ? '#f97316' : '#7ec8d8' }}>
              {(vencida || dias <= 5) && <AlertTriangle size={11} />}
              {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias}d · ${f.fecha_vencimiento}`}
            </span>
          )}
          {!isPending && (
            <span className="text-[11px] text-[#6aacbc] opacity-50">{fmtFecha(f.created_at)}</span>
          )}
        </div>
        <div className="flex gap-2 shrink-0 items-center" onClick={e => e.stopPropagation()}>
          {f.adjunto && (
            <button onClick={() => onPreview(f)}
              className="flex items-center gap-1 text-[10px] tracking-wide px-2 py-1 rounded-sm border transition-all"
              style={{ color: ACCENT, borderColor: ACCENT + '33', background: ACCENT + '0d' }}>
              <Eye size={9} /> VER PDF
            </button>
          )}
          {isPending && (
            <>
              <button onClick={() => onRechazar(f)} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: '#ef444444', background: '#ef444410', color: '#ef4444' }}>
                <X size={10} /> RECHAZAR
              </button>
              <button onClick={() => onAprobar(f)} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Check size={10} /> APROBAR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function MisAprobaciones() {
  const navigate = useNavigate();
  const [tab,             setTab]             = useState('pendientes');
  const [pendientes,      setPendientes]      = useState([]);
  const [historial,       setHistorial]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(null);
  const [detalleId,       setDetalleId]       = useState(null);
  const [previewFact,     setPreviewFact]     = useState(null);
  const [rechazando,      setRechazando]      = useState(null);
  const [rechazarLoading, setRechazarLoading] = useState(false);
  const [busqueda,        setBusqueda]        = useState('');
  const [pagina,          setPagina]          = useState(1);

  const cargarPendientes = useCallback(() =>
    apiService.get('/aprobaciones').then(({ data }) => setPendientes(data)), []);

  const cargarHistorial = useCallback(() =>
    apiService.get('/aprobaciones/historial').then(({ data }) => setHistorial(data)), []);

  const cargar = useCallback(() => {
    setLoading(true);
    Promise.all([cargarPendientes(), cargarHistorial()])
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [cargarPendientes, cargarHistorial]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, tab]);

  const historialSinPendientes = historial.filter(f => f.estado !== 'pendiente_aprobacion');
  const listaActiva = tab === 'pendientes' ? pendientes : historialSinPendientes;

  const listaVisible = useMemo(() => {
    if (!busqueda) return listaActiva;
    const q = busqueda.toLowerCase();
    return listaActiva.filter(f =>
      f.proveedor_nombre?.toLowerCase().includes(q) ||
      f.numero_factura?.toLowerCase().includes(q) ||
      f.descripcion?.toLowerCase().includes(q) ||
      f.area_responsable?.toLowerCase().includes(q)
    );
  }, [listaActiva, busqueda]);

  const listaPagina = listaVisible.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const aprobar = async (f) => {
    setSaving(f.id);
    try {
      await apiService.put(`/aprobaciones/${f.id}/aprobar`);
      toast.success(`Factura de ${f.proveedor_nombre} aprobada — pasa a Control Interno`);
      setPendientes(prev => prev.filter(x => x.id !== f.id));
      cargarHistorial();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al aprobar');
    } finally { setSaving(null); }
  };

  const confirmarRechazo = async (motivo) => {
    setRechazarLoading(true);
    try {
      await apiService.put(`/aprobaciones/${rechazando.id}/rechazar`, { motivo });
      toast.success('Factura rechazada');
      setPendientes(prev => prev.filter(x => x.id !== rechazando.id));
      setRechazando(null);
      cargarHistorial();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setRechazarLoading(false); }
  };

  const montoTotal = pendientes.reduce((s, f) => s + Number(f.monto || 0), 0);
  const urgentes   = pendientes.filter(f => {
    if (!f.fecha_vencimiento) return false;
    const d = diasParaVencer(f.fecha_vencimiento);
    return d >= 0 && d <= 5;
  }).length;
  const aprobadas  = historialSinPendientes.filter(f => f.estado !== 'rechazada').length;
  const rechazadas = historialSinPendientes.filter(f => f.estado === 'rechazada').length;

  return (
    <div className="min-h-screen bg-[#05080f] font-mono p-8 flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/selector')}
            className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
              MIS APROBACIONES
            </h1>
            <p className="text-[#6aacbc] text-[10px] tracking-[3px] mt-0.5">// FACTURAS ASIGNADAS A TI</p>
          </div>
        </div>
        <button onClick={cargar}
          className="p-2 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex items-stretch gap-px mb-4 border border-[#34d3991a] rounded-sm overflow-hidden">
          {[
            { label: 'PENDIENTES',  value: pendientes.length,                          color: ACCENT,                                    fmt: false },
            { label: 'URGENTES',    value: urgentes,                                   color: urgentes   > 0 ? '#fbbf24' : '#6aacbc',    fmt: false },
            { label: 'APROBADAS',   value: aprobadas,                                  color: aprobadas  > 0 ? '#34d399' : '#6aacbc',    fmt: false },
            { label: 'RECHAZADAS',  value: rechazadas,                                 color: rechazadas > 0 ? '#ef4444' : '#6aacbc',    fmt: false },
            { label: 'MONTO PEND.', value: fmtCOP(montoTotal),                        color: '#a0d4e0',                                 fmt: true  },
          ].map(({ label, value, color, fmt }, i) => (
            <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
              <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
              <p className={fmt ? 'text-sm font-bold leading-none mt-1' : 'text-2xl font-bold leading-none'} style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips + búsqueda */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
          {[
            { key: 'pendientes', label: 'PENDIENTES', count: pendientes.length },
            { key: 'historial',  label: 'HISTORIAL',  count: historialSinPendientes.length },
          ].map(({ key, label, count }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className="px-3 py-2 text-[9px] tracking-[2px] transition-all flex items-center gap-1.5"
                style={{
                  color:        active ? ACCENT : '#6aacbc',
                  background:   active ? ACCENT + '10' : 'transparent',
                  borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}>
                {label}
                <span className="text-[8px] px-1 py-0.5 rounded-sm border"
                  style={{
                    color:       active ? ACCENT : '#6aacbc',
                    borderColor: active ? ACCENT + '44' : '#34d39922',
                    background:  active ? ACCENT + '15' : 'transparent',
                  }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="BUSCAR PROVEEDOR, # FACTURA, CONCEPTO..."
            className="w-full bg-[#05080f] border border-[#34d3991a] rounded-sm pl-8 pr-4 py-2 text-xs text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39944] transition-colors tracking-wide" />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1">
        {loading && (
          <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>
        )}

        {!loading && listaVisible.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
            {tab === 'pendientes'
              ? <ShieldCheck size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
              : <History size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
            }
            <p className="text-[#6aacbc] text-[10px] tracking-widest">
              {busqueda ? 'SIN RESULTADOS' : tab === 'pendientes' ? 'SIN FACTURAS PENDIENTES' : 'SIN HISTORIAL'}
            </p>
          </div>
        )}

        {!loading && listaPagina.length > 0 && (
          <div className="space-y-2">
            {listaPagina.map(f => (
              <FacturaCard
                key={f.id}
                f={f}
                onAprobar={aprobar}
                onRechazar={setRechazando}
                onDetalle={setDetalleId}
                onPreview={setPreviewFact}
                isPending={tab === 'pendientes'}
                saving={saving === f.id}
              />
            ))}
            <Paginacion total={listaVisible.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
          </div>
        )}
      </div>

      {/* Modales */}
      {previewFact && (
        <PreviewModal facturaId={previewFact.id} adjunto={previewFact.adjunto} onClose={() => setPreviewFact(null)} />
      )}
      {detalleId && <DetalleModal facturaId={detalleId} onClose={() => setDetalleId(null)} />}
      {rechazando && (
        <RechazarModal
          factura={rechazando}
          onConfirm={confirmarRechazo}
          onClose={() => setRechazando(null)}
          loading={rechazarLoading}
        />
      )}
    </div>
  );
}
