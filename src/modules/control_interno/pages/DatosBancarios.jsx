import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Check, X, Building2, CreditCard, RefreshCw, Clock,
  Eye, FileText, Search, Ban, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtFecha = (d) => {
  if (!d) return '—';
  return String(d).slice(0, 10);
};

const fmtFechaLarga = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();
};

// ── Pipeline de datos bancarios ────────────────────────────────────────────────
const ETAPAS_DB = [
  { key: 'registro',      label: 'REGISTRO' },
  { key: 'pendiente_ci',  label: 'VERIFICACIÓN CI' },
  { key: 'verificado',    label: 'APROBADO' },
];

const etapaActiva = (estado) => {
  if (estado === 'rechazado')    return -1;
  if (estado === 'pendiente_ci') return 2;
  if (estado === 'verificado')   return 3;
  return 1;
};

const MiniPasoDB = ({ estado }) => {
  if (estado === 'rechazado') {
    return (
      <span className="flex items-center gap-1 text-[12px] tracking-wide px-2 py-0.5 rounded-sm border border-[#ef444433] text-[#ef4444] bg-[#ef444411]">
        <Ban size={9} /> RECHAZADO
      </span>
    );
  }
  const activa = etapaActiva(estado);
  const etapaActual = ETAPAS_DB[activa - 1];
  return (
    <div className="flex items-center gap-1.5">
      {ETAPAS_DB.map((_, i) => {
        const num    = i + 1;
        const hecha  = num < activa;
        const actual = num === activa;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all"
              style={{
                background: hecha  ? '#34d399' : actual ? ACCENT : '#c084fc18',
                boxShadow:  actual ? `0 0 6px ${ACCENT}88` : 'none',
              }} />
            {i < ETAPAS_DB.length - 1 && (
              <div className="w-3 h-px" style={{ background: hecha ? '#34d39955' : '#c084fc18' }} />
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

const PasoDB = ({ estado }) => {
  if (estado === 'rechazado') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-sm border border-[#ef444433] bg-[#ef444408]">
        <Ban size={13} className="text-[#ef4444] shrink-0" />
        <span className="text-base text-[#ef4444] tracking-wide">SOLICITUD RECHAZADA</span>
      </div>
    );
  }
  const activa = etapaActiva(estado);
  return (
    <div className="flex items-center gap-0">
      {ETAPAS_DB.map((etapa, i) => {
        const num    = i + 1;
        const hecha  = num < activa;
        const actual = num === activa;
        const ultimo = i === ETAPAS_DB.length - 1;
        return (
          <div key={etapa.key} className="flex items-center" style={{ flex: ultimo ? '0 0 auto' : 1, minWidth: 0 }}>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
                style={{
                  borderColor: hecha ? '#34d399' : actual ? ACCENT : '#c084fc22',
                  background:  hecha ? '#34d39922' : actual ? ACCENT + '22' : 'transparent',
                }}>
                {hecha
                  ? <Check size={11} className="text-[#34d399]" strokeWidth={3} />
                  : <span className="text-[11px] font-bold" style={{ color: actual ? ACCENT : '#6aacbc55' }}>{num}</span>
                }
              </div>
              <span className="text-[10px] tracking-wide mt-1 whitespace-nowrap"
                style={{ color: hecha ? '#34d399' : actual ? ACCENT : '#6aacbc44' }}>
                {etapa.label}
              </span>
            </div>
            {!ultimo && (
              <div className="h-px mx-1 transition-all" style={{ flex: 1, background: hecha ? '#34d39955' : '#c084fc18' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Preview certificado ────────────────────────────────────────────────────────
const PreviewCertModal = ({ solicitudId, nombre, onClose }) => {
  const [url,     setUrl]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);

  useEffect(() => {
    apiService.get(`/control_interno/datos-bancarios/${solicitudId}/certificado`)
      .then(({ data }) => setUrl(data.url))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [solicitudId]);

  return (
    <div className="fixed inset-0 bg-black/85 flex flex-col z-[60]" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#c084fc22] bg-[#08101e] shrink-0"
        onClick={e => e.stopPropagation()}>
        <p className="text-base tracking-wide text-[#c084fc] truncate max-w-[400px]">
          {nombre || 'CERTIFICADO BANCARIO'}
        </p>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-wide rounded-sm border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444410] transition-all">
          <X size={10} /> CERRAR
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={e => e.stopPropagation()}>
        {loading && <p className="text-[#7ec8d8] text-base tracking-wide animate-pulse">CARGANDO...</p>}
        {err && (
          <div className="text-center text-[#7ec8d8]">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-base tracking-wide">Sin certificado adjunto</p>
          </div>
        )}
        {url && !loading && (
          <iframe src={url} title="Certificado bancario"
            className="w-full h-full border-0 rounded-sm bg-white" style={{ maxWidth: '900px' }} />
        )}
      </div>
    </div>
  );
};

// ── Modal rechazo ──────────────────────────────────────────────────────────────
const ModalRechazar = ({ solicitud, onRechazar, onClose, loading }) => {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#ef444433] rounded-sm w-full max-w-md relative p-6">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]" />
        <p className="text-[10px] tracking-[3px] text-[#ef4444] mb-5">RECHAZAR SOLICITUD</p>
        <p className="text-[11px] text-[#a0d4e0] mb-0.5">{solicitud.proveedor_nombre}</p>
        <p className="text-base font-mono text-[#7ec8d8] mb-5">
          {solicitud.banco} · {solicitud.numero_cuenta}
        </p>
        <div className="mb-5">
          <label className="text-[10px] tracking-wide text-[#7ec8d8] mb-1 block">MOTIVO DE RECHAZO *</label>
          <textarea
            className="w-full bg-[#05080f] border border-[#ef444422] rounded-sm px-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#ef444455] transition-colors resize-none"
            rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Explica el motivo del rechazo..." />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[10px] tracking-wide border border-[#ef444422] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">
            CANCELAR
          </button>
          <button onClick={() => onRechazar(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444455] bg-[#ef444415] text-[#ef4444]">
            <Ban size={11} /> {loading ? 'RECHAZANDO...' : 'CONFIRMAR RECHAZO'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detalle de solicitud ───────────────────────────────────────────────────────
const DetalleSolicitud = ({ s, onClose, onVerificar, onRechazar, saving }) => {
  const accentBorder = ACCENT + '33';

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
              <p className="text-[11px] tracking-[4px] text-[#6aacbc] mb-1">DATOS BANCARIOS · SOLICITUD</p>
              <h2 className="text-2xl font-bold text-[#c8e8f0]">{s.proveedor_nombre}</h2>
              {s.proveedor_nit && (
                <p className="text-base text-[#7ec8d8] mt-0.5">NIT {s.proveedor_nit}</p>
              )}
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="mb-4"><PasoDB estado={s.estado} /></div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

          {/* Datos bancarios propuestos */}
          <div>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">DATOS BANCARIOS PROPUESTOS</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 rounded-sm border"
              style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
              <Campo label="BANCO"           valor={s.banco} />
              <Campo label="TIPO DE CUENTA"  valor={s.tipo_cuenta?.toUpperCase()} />
              <Campo label="NÚMERO DE CUENTA" valor={s.numero_cuenta} mono />
              <Campo label="TITULAR"          valor={s.titular_cuenta} />
            </div>
          </div>

          {/* Trazabilidad */}
          <div className="border-t pt-4" style={{ borderColor: accentBorder }}>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              {s.solicitado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Registrado por</span>
                  <span className="text-[#c8e8f0]">{s.solicitado_por_nombre} · {fmtFecha(s.created_at)}</span>
                </div>
              )}
              {s.verificado_por_nombre && s.estado === 'verificado' && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Verificado por CI</span>
                  <span className="text-[#34d399]">{s.verificado_por_nombre} · {fmtFecha(s.verificado_at)}</span>
                </div>
              )}
              {s.estado === 'rechazado' && (
                <>
                  {s.verificado_por_nombre && (
                    <div className="flex items-center justify-between text-base">
                      <span className="text-[#7ec8d8]">Rechazado por</span>
                      <span className="text-[#ef4444]">{s.verificado_por_nombre} · {fmtFecha(s.verificado_at)}</span>
                    </div>
                  )}
                  {s.motivo_rechazo && (
                    <div className="flex items-start justify-between text-base gap-4">
                      <span className="text-[#ef4444] shrink-0">Motivo</span>
                      <span className="text-[#ef4444] text-right opacity-80">{s.motivo_rechazo}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: accentBorder }}>
          {s.estado === 'pendiente_ci' && (
            <>
              <button onClick={() => { onRechazar(s); onClose(); }} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
                <X size={11} /> RECHAZAR
              </button>
              <button onClick={() => { onVerificar(s); onClose(); }} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <ShieldCheck size={11} /> VERIFICAR
              </button>
            </>
          )}
          <button onClick={onClose}
            className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
            style={{ borderColor: accentBorder }}>
            CERRAR
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
        borderColor: active ? ACCENT + '55' : '#c084fc22',
        background:  active ? ACCENT + '15' : 'transparent',
        color:       active ? ACCENT : disabled ? '#4a7a8a55' : '#7ec8d8',
        cursor:      disabled ? 'default' : 'pointer',
      }}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#c084fc11]">
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

// ── Página principal ───────────────────────────────────────────────────────────
const FILTROS = ['pendiente_ci', 'verificado', 'rechazado'];
const FILTRO_LABEL = {
  pendiente_ci: 'PEND. VERIFICAR',
  verificado:   'VERIFICADAS',
  rechazado:    'RECHAZADAS',
};
const POR_PAGINA = 10;

export default function DatosBancarios() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(null);
  const [filtro,      setFiltro]      = useState('pendiente_ci');
  const [busqueda,    setBusqueda]    = useState('');
  const [pagina,      setPagina]      = useState(1);
  const [detalle,     setDetalle]     = useState(null);
  const [rechazar,    setRechazar]    = useState(null);
  const [certPreview, setCertPreview] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/control_interno/datos-bancarios?estado=${filtro}`)
      .then(({ data }) => setSolicitudes(data))
      .catch(() => toast.error('Error al cargar solicitudes'))
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, filtro]);

  const solicitudesFiltradas = useMemo(() => {
    if (!busqueda) return solicitudes;
    const q = busqueda.toLowerCase();
    return solicitudes.filter(s =>
      s.proveedor_nombre?.toLowerCase().includes(q) ||
      s.proveedor_nit?.toLowerCase().includes(q) ||
      s.banco?.toLowerCase().includes(q) ||
      s.numero_cuenta?.toLowerCase().includes(q) ||
      s.titular_cuenta?.toLowerCase().includes(q)
    );
  }, [solicitudes, busqueda]);

  const solicitudesPagina = solicitudesFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const verificar = async (s) => {
    setSaving(s.id);
    try {
      await apiService.put(`/control_interno/datos-bancarios/${s.id}/verificar`);
      toast.success(`Datos bancarios de ${s.proveedor_nombre} verificados`);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al verificar');
    } finally { setSaving(null); }
  };

  const confirmarRechazo = async (motivo) => {
    setSaving(rechazar.id);
    try {
      await apiService.put(`/control_interno/datos-bancarios/${rechazar.id}/rechazar`, { motivo });
      toast.success('Solicitud rechazada');
      setRechazar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setSaving(null); }
  };

  return (
    <div className="p-8 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            DATOS BANCARIOS
          </h1>
          <p className="text-[#7ec8d8] text-[13px] tracking-[2px] mt-0.5">// VERIFICACIÓN DE PROVEEDORES — CONTROL INTERNO</p>
        </div>
        <button onClick={cargar}
          className="p-2 border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-stretch gap-px mb-4 border border-[#c084fc1a] rounded-sm overflow-hidden">
          {[
            { label: 'SOLICITUDES',  value: solicitudesFiltradas.length, color: '#c8e8f0' },
            { label: 'PROVEEDORES',  value: new Set(solicitudesFiltradas.map(s => s.proveedor_id)).size, color: '#c8e8f0' },
            { label: 'PENDIENTES',   value: filtro === 'pendiente_ci' ? solicitudesFiltradas.length : '—', color: '#fbbf24' },
            { label: 'RECHAZADAS',   value: filtro === 'rechazado'    ? solicitudesFiltradas.length : '—', color: '#ef4444' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
              <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar proveedor, NIT, banco, número de cuenta..."
          className="w-full bg-[#05080f] border border-[#c084fc22] rounded-sm pl-8 pr-3 py-2 text-base text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#c084fc55] transition-colors"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-0 mb-5 border border-[#c084fc1a] rounded-sm overflow-hidden">
        {FILTROS.map(v => {
          const active = filtro === v;
          return (
            <button key={v} onClick={() => setFiltro(v)}
              className="px-4 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap border-r border-[#c084fc1a]"
              style={{
                background:   active ? ACCENT + '18' : 'transparent',
                color:        active ? ACCENT : '#4a7a8a',
                fontWeight:   active ? 700 : 400,
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              {FILTRO_LABEL[v]}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-center text-[#7ec8d8] text-base tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && solicitudesFiltradas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#c084fc22] rounded-sm">
          <CreditCard size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-base tracking-wide">
            {filtro === 'pendiente_ci' ? 'SIN SOLICITUDES PENDIENTES DE VERIFICACIÓN' : 'SIN REGISTROS'}
          </p>
        </div>
      )}

      {!loading && solicitudesFiltradas.length > 0 && (
        <div className="space-y-2">
          {solicitudesPagina.map(s => {
            const procesando = saving === s.id;
            return (
              <div key={s.id}
                onClick={() => setDetalle(s)}
                className="px-5 py-4 rounded-sm border transition-colors cursor-pointer hover:border-[#c084fc40] hover:bg-[#c084fc0a]"
                style={{
                  borderColor: s.estado === 'rechazado' ? '#ef444433' : '#c084fc18',
                  background:  '#c084fc04',
                }}>

                {/* Fila 1: proveedor + fecha */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <Building2 size={14} color={ACCENT} className="shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-[#c8e8f0] leading-tight">{s.proveedor_nombre}</p>
                      {s.proveedor_nit && (
                        <p className="text-base text-[#7ec8d8] mt-0.5">NIT {s.proveedor_nit}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-base text-[#6aacbc] shrink-0">
                    <Clock size={11} />
                    {fmtFechaLarga(s.created_at)}
                  </div>
                </div>

                {/* Fila 2: Pipeline */}
                <div className="mb-3">
                  <MiniPasoDB estado={s.estado} />
                </div>

                {/* Fila 3: datos bancarios */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border border-[#c084fc33] text-[#c084fc] bg-[#c084fc10]">
                    {s.banco}
                  </span>
                  <span className="text-base text-[#7ec8d8] uppercase">{s.tipo_cuenta}</span>
                  <span className="text-base font-mono text-[#a0d4e0]">{s.numero_cuenta}</span>
                  <span className="text-base text-[#7ec8d8] truncate max-w-[200px]">{s.titular_cuenta}</span>
                </div>

                {/* Fila 4: trazabilidad + acciones */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {s.estado === 'rechazado' ? (
                      <span className="text-base text-[#ef4444] opacity-80">
                        {s.motivo_rechazo ? `Rechazado · ${s.motivo_rechazo}` : 'Rechazado'}
                      </span>
                    ) : s.estado === 'verificado' ? (
                      <span className="text-base text-[#34d399] opacity-80">
                        Verificado por {s.verificado_por_nombre || 'CI'} · {fmtFecha(s.verificado_at)}
                      </span>
                    ) : (
                      s.solicitado_por_nombre && (
                        <span className="text-base text-[#7ec8d8] opacity-60">
                          Solicitado por {s.solicitado_por_nombre}
                        </span>
                      )
                    )}
                  </div>
                  {s.estado === 'pendiente_ci' && (
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setCertPreview(s.id)} disabled={procesando}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                        style={{ borderColor: '#c084fc33', background: '#c084fc08', color: '#6aacbc' }}>
                        <Eye size={11} /> CERT.
                      </button>
                      <button onClick={() => setRechazar(s)} disabled={procesando}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
                        <X size={11} /> RECHAZAR
                      </button>
                      <button onClick={() => verificar(s)} disabled={procesando}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                        style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                        <ShieldCheck size={11} /> {procesando ? '...' : 'VERIFICAR'}
                      </button>
                    </div>
                  )}
                  {s.estado === 'verificado' && (
                    <div onClick={e => e.stopPropagation()}>
                      <button onClick={() => setCertPreview(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all"
                        style={{ borderColor: '#c084fc33', background: '#c084fc08', color: '#6aacbc' }}>
                        <Eye size={11} /> CERTIFICADO
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Paginacion total={solicitudesFiltradas.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
        </div>
      )}

      {detalle && (
        <DetalleSolicitud
          s={detalle}
          onClose={() => setDetalle(null)}
          onVerificar={(s) => verificar(s)}
          onRechazar={(s) => setRechazar(s)}
          saving={!!saving}
        />
      )}

      {rechazar && (
        <ModalRechazar
          solicitud={rechazar}
          onRechazar={confirmarRechazo}
          onClose={() => setRechazar(null)}
          loading={!!saving}
        />
      )}

      {certPreview && (
        <PreviewCertModal
          solicitudId={certPreview}
          onClose={() => setCertPreview(null)}
        />
      )}
    </div>
  );
}
