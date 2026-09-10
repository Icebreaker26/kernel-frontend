import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, AlertTriangle, Clock, RefreshCw, ShieldCheck,
  ArrowLeft, ChevronRight, Building2, User, FileText, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

const diasParaVencer = (fecha) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha + 'T00:00:00') - hoy) / 86400000);
};

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24' },
  aprobada:             { label: 'PEND. CI',    color: '#818cf8' },
  verificada:           { label: 'VERIFICADA',  color: '#22d3ee' },
  autorizada:           { label: 'AUTORIZADA',  color: '#34d399' },
  pagada:               { label: 'PAGADA',      color: '#a3e635' },
  rechazada:            { label: 'RECHAZADA',   color: '#ef4444' },
};

/* ── Modal de detalle completo ─────────────────────────────────────────── */
function DetalleModal({ facturaId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get(`/aprobaciones/${facturaId}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('Error al cargar detalle'); onClose(); })
      .finally(() => setLoading(false));
  }, [facturaId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <p className="text-[#34d399] text-[10px] tracking-widest animate-pulse">CARGANDO...</p>
    </div>
  );
  if (!data) return null;

  const em = ESTADO_META[data.estado] || { label: data.estado?.toUpperCase(), color: '#6aacbc' };
  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#34d39908]">
      <span className="text-[9px] tracking-[2px] text-[#6aacbc] shrink-0">{label}</span>
      <span className="text-[10px] text-[#c8e8f0] text-right">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#34d399]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#34d399]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#34d39918]">
          <div>
            <p className="text-base font-bold text-[#c8e8f0]">{data.proveedor_nombre}</p>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mt-0.5">
              {data.numero_factura ? `N° ${data.numero_factura}` : 'SIN NÚMERO'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] tracking-[2px] px-2 py-1 rounded-sm border"
              style={{ color: em.color, borderColor: em.color + '44', background: em.color + '11' }}>
              {em.label}
            </span>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#c8e8f0] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Monto principal */}
          <div className="text-center py-4 border border-[#34d39922] rounded-sm bg-[#34d39906]">
            <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-1">MONTO TOTAL</p>
            <p className="text-3xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(data.monto)}</p>
            {data.monto_neto && Number(data.monto_neto) !== Number(data.monto) && (
              <p className="text-[10px] text-[#7ec8d8] mt-1">Neto a pagar: <span className="font-bold">{fmtCOP(data.monto_neto)}</span></p>
            )}
          </div>

          {/* Retenciones */}
          {(data.retencion_fuente || data.retencion_ica || data.retencion_iva) && (
            <div>
              <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">RETENCIONES</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'FUENTE',  val: data.retencion_fuente },
                  { label: 'ICA',     val: data.retencion_ica },
                  { label: 'IVA',     val: data.retencion_iva },
                ].filter(r => r.val).map(r => (
                  <div key={r.label} className="border border-[#34d39918] rounded-sm p-3 text-center bg-[#34d39905]">
                    <p className="text-[8px] tracking-[2px] text-[#6aacbc]">{r.label}</p>
                    <p className="text-[11px] font-mono text-[#a0d4e0] mt-1">{fmtCOP(r.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info factura */}
          <div>
            <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">FACTURA</p>
            <Row label="DESCRIPCIÓN"        value={data.descripcion} />
            <Row label="ÁREA RESPONSABLE"   value={data.area_responsable} />
            <Row label="FECHA RECIBIDA"     value={fmtFecha(data.fecha_recibida)} />
            <Row label="FECHA VENCIMIENTO"  value={fmtFecha(data.fecha_vencimiento)} />
            <Row label="ENTREGA AL ÁREA"    value={fmtFecha(data.fecha_entrega_area)} />
            <Row label="REGISTRADO POR"     value={data.registrado_por_nombre} />
            <Row label="REGISTRADO EL"      value={fmtFecha(data.created_at)} />
          </div>

          {/* Info proveedor */}
          <div>
            <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">PROVEEDOR</p>
            <Row label="NIT"        value={data.proveedor_nit} />
            <Row label="EMAIL"      value={data.proveedor_email} />
            <Row label="TELÉFONO"   value={data.proveedor_telefono} />
            <Row label="CATEGORÍA"  value={data.proveedor_categoria} />
            <Row label="TIPO PAGO"  value={data.proveedor_tipo?.toUpperCase()} />
            <Row label="BANCO"      value={data.proveedor_banco} />
            <Row label="CUENTA"     value={data.proveedor_cuenta} />
          </div>

          {/* Aprobación / rechazo */}
          {(data.aprobado_at || data.rechazo_motivo) && (
            <div>
              <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">TRAZABILIDAD</p>
              <Row label="APROBADO POR"   value={data.aprobado_por_nombre} />
              <Row label="APROBADO EL"    value={data.aprobado_at ? fmtFecha(data.aprobado_at) : null} />
              {data.rechazo_motivo && (
                <div className="mt-2 p-3 border border-[#ef444422] rounded-sm bg-[#ef444408]">
                  <p className="text-[8px] tracking-[2px] text-[#ef4444] mb-1">MOTIVO DE RECHAZO</p>
                  <p className="text-[10px] text-[#c8e8f0]">{data.rechazo_motivo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Modal de rechazo ──────────────────────────────────────────────────── */
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
        <p className="text-[11px] text-[#c8e8f0] mb-1">{factura.proveedor_nombre}</p>
        <p className="text-[10px] text-[#6aacbc] mb-4">{fmtCOP(factura.monto)}</p>
        <label className="text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block">MOTIVO *</label>
        <textarea
          className="w-full bg-[#05080f] border border-[#ef444422] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#ef444455] transition-colors resize-none"
          rows={3}
          placeholder="Indique el motivo del rechazo..."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
        />
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

/* ── Tarjeta de factura (pendiente o historial) ────────────────────────── */
function FacturaCard({ f, onAprobar, onRechazar, onDetalle, isPending }) {
  const dias    = f.fecha_vencimiento ? diasParaVencer(f.fecha_vencimiento) : null;
  const vencida = dias !== null && dias < 0;
  const urgente = dias !== null && dias >= 0 && dias <= 5;
  const em      = ESTADO_META[f.estado] || { label: f.estado?.toUpperCase(), color: '#6aacbc' };

  return (
    <div
      className="px-5 py-4 rounded-sm border transition-colors cursor-pointer group"
      style={{
        borderColor: isPending ? (vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#34d39918') : '#34d39912',
        background:  isPending ? (vencida ? '#ef444406' : '#34d39904') : '#34d39902',
      }}
      onClick={() => onDetalle(f.id)}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#c8e8f0] leading-tight group-hover:text-white transition-colors">
            {f.proveedor_nombre}
          </p>
          {f.descripcion && (
            <p className="text-xs text-[#7ec8d8] mt-0.5 truncate max-w-[360px]">{f.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isPending && (
            <span className="text-[8px] tracking-[2px] px-1.5 py-0.5 rounded-sm border"
              style={{ color: em.color, borderColor: em.color + '44', background: em.color + '11' }}>
              {em.label}
            </span>
          )}
          <p className="text-lg font-black font-mono leading-tight" style={{ color: ACCENT }}>
            {fmtCOP(f.monto)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {f.area_responsable && (
            <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
              {f.area_responsable.toUpperCase()}
            </span>
          )}
          {f.numero_factura && (
            <span className="text-[10px] font-mono text-[#a0d4e0] opacity-70">N° {f.numero_factura}</span>
          )}
          {isPending && dias !== null && (
            (vencida || urgente) ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                <AlertTriangle size={11} />
                {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
              </span>
            ) : (
              <span className="text-[10px] text-[#7ec8d8] opacity-50">
                <Clock size={9} className="inline mr-1" />vence {f.fecha_vencimiento}
              </span>
            )
          )}
          {!isPending && (
            <span className="text-[10px] text-[#6aacbc] opacity-50">{fmtFecha(f.created_at)}</span>
          )}
          {f.registrado_por_nombre && (
            <span className="text-[10px] text-[#6aacbc] opacity-50">por {f.registrado_por_nombre}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onDetalle(f.id)}
            className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-colors">
            <ChevronRight size={12} />
          </button>
          {isPending && (
            <>
              <button onClick={() => onRechazar(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
                style={{ borderColor: '#ef444444', background: '#ef444410', color: '#ef4444' }}>
                <X size={10} /> RECHAZAR
              </button>
              <button onClick={() => onAprobar(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
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

/* ── Página principal ──────────────────────────────────────────────────── */
export default function MisAprobaciones() {
  const navigate = useNavigate();
  const [tab,       setTab]       = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [rechazando, setRechazando] = useState(null);
  const [rechazarLoading, setRechazarLoading] = useState(false);

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
      toast.success(`Factura rechazada`);
      setPendientes(prev => prev.filter(x => x.id !== rechazando.id));
      setRechazando(null);
      cargarHistorial();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setRechazarLoading(false); }
  };

  const historialSinPendientes = historial.filter(f => f.estado !== 'pendiente_aprobacion');

  return (
    <div className="min-h-screen bg-[#05080f] font-mono p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/selector')}
              className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ShieldCheck size={16} style={{ color: ACCENT }} />
                <h1 className="text-lg font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 16px ${ACCENT}55` }}>
                  MIS APROBACIONES
                </h1>
              </div>
              <p className="text-[#7ec8d8] text-[10px] tracking-[2px]">// FACTURAS ASIGNADAS A TI</p>
            </div>
          </div>
          <button onClick={cargar}
            className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-[#34d39915]">
          {[
            { key: 'pendientes', label: 'PENDIENTES', icon: ShieldCheck, count: pendientes.length },
            { key: 'historial',  label: 'HISTORIAL',  icon: History,     count: historialSinPendientes.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-widest transition-all border-b-2 -mb-px ${
                tab === key
                  ? 'border-[#34d399] text-[#34d399]'
                  : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0]'
              }`}>
              <Icon size={11} />
              {label}
              <span className={`ml-1 text-[8px] px-1.5 py-0.5 rounded-sm border ${
                tab === key
                  ? 'border-[#34d39944] bg-[#34d39915] text-[#34d399]'
                  : 'border-[#34d39922] text-[#6aacbc]'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-center text-[#7ec8d8] text-xs tracking-wide animate-pulse py-20">CARGANDO...</p>
        )}

        {/* Tab: Pendientes */}
        {!loading && tab === 'pendientes' && (
          <>
            {pendientes.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[#34d39922] rounded-sm">
                <ShieldCheck size={28} color={ACCENT} className="mx-auto mb-4 opacity-30" />
                <p className="text-[#7ec8d8] text-xs tracking-widest">SIN FACTURAS PENDIENTES</p>
                <p className="text-[#6aacbc] text-[10px] mt-2 opacity-60">
                  Cuando alguien te asigne una factura para aprobar, aparecerá aquí.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-4">
                  {pendientes.length} FACTURA{pendientes.length !== 1 ? 'S' : ''} PENDIENTE{pendientes.length !== 1 ? 'S' : ''}
                </p>
                <div className="space-y-3">
                  {pendientes.map(f => (
                    <FacturaCard
                      key={f.id}
                      f={{ ...f, saving: saving === f.id }}
                      onAprobar={aprobar}
                      onRechazar={setRechazando}
                      onDetalle={setDetalleId}
                      isPending
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Tab: Historial */}
        {!loading && tab === 'historial' && (
          <>
            {historialSinPendientes.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[#34d39922] rounded-sm">
                <History size={28} color={ACCENT} className="mx-auto mb-4 opacity-30" />
                <p className="text-[#7ec8d8] text-xs tracking-widest">SIN HISTORIAL</p>
                <p className="text-[#6aacbc] text-[10px] mt-2 opacity-60">
                  Las facturas que apruebes o rechaces aparecerán aquí.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-4">
                  {historialSinPendientes.length} FACTURA{historialSinPendientes.length !== 1 ? 'S' : ''} EN HISTORIAL
                </p>
                <div className="space-y-3">
                  {historialSinPendientes.map(f => (
                    <FacturaCard
                      key={f.id}
                      f={f}
                      onAprobar={() => {}}
                      onRechazar={() => {}}
                      onDetalle={setDetalleId}
                      isPending={false}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modales */}
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
