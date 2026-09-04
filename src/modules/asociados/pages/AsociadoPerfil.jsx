import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, User, Ticket, Trophy, Clock, ArrowLeft, CheckCircle, XCircle,
  Banknote, Activity, ExternalLink, MessageCircle, Zap, Copy, Check,
  ShieldCheck, ShieldOff, KeyRound, ThumbsUp, ThumbsDown, Bell, TrendingUp,
  CreditCard, Heart, LayoutList, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v) =>
  v != null
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
    : '—';

const fmtMes = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m] = dateStr.slice(0, 7).split('-');
  return new Date(y, Number(m) - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase();
};

const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '—');

const hoyPeriodo = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const periodoLabel = (yyyymm) => {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase();
};

const shiftMes = (yyyymm, delta) => {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const estadoLineaEnMes = (d, periodoYYYYMM) => {
  if (!d.fecha_pri_descuento) return null;
  const [ty, tm] = periodoYYYYMM.split('-').map(Number);
  const target    = new Date(ty, tm - 1, 1);
  const inicio    = new Date(d.fecha_pri_descuento);
  const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  if (target < inicioMes) return 'antes';
  if (d.fecha_vencimiento) {
    const venc    = new Date(d.fecha_vencimiento);
    const vencMes = new Date(venc.getFullYear(), venc.getMonth(), 1);
    if (target > vencMes) return 'despues';
  }
  return 'activa';
};

const CreditoCardAdmin = ({ d, color }) => {
  const pagado = d.valor_obligacion != null && d.saldo_credito != null
    ? Math.max(0, Number(d.valor_obligacion) - Number(d.saldo_credito))
    : null;
  const pct = pagado != null && Number(d.valor_obligacion) > 0
    ? Math.min(100, (pagado / Number(d.valor_obligacion)) * 100)
    : null;
  return (
    <div className="p-4" style={{ background: '#05080f', borderBottom: `1px solid ${color}12` }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-[#a0d4e0] leading-snug tracking-wide">{d.nombre_linea}</p>
        <div className="text-right shrink-0">
          <p className="text-xl font-black font-mono" style={{ color }}>{fmt(d.valor)}</p>
          <p className="text-[9px] tracking-[2px] text-[#6aacbc] mt-0.5">CUOTA MENSUAL</p>
        </div>
      </div>
      {pct != null && (
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs tracking-[1.5px] text-[#34d399] font-bold">{pct.toFixed(0)}% pagado</span>
            <span className="text-xs text-[#6aacbc]">{(100 - pct).toFixed(0)}% pendiente</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="h-full rounded-full" style={{
              width: `${pct}%`,
              background: pct >= 75
                ? 'linear-gradient(to right, #059669, #34d399)'
                : pct >= 40
                  ? 'linear-gradient(to right, #0ea5e9, #6ee7b7)'
                  : 'linear-gradient(to right, #818cf8, #a5b4fc)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
        {d.valor_obligacion != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">OBLIGACIÓN</p>
            <p className="text-base font-bold font-mono text-[#a0d4e0]">{fmt(d.valor_obligacion)}</p>
          </div>
        )}
        {pagado != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">PAGADO</p>
            <p className="text-base font-bold font-mono text-[#34d399]">{fmt(pagado)}</p>
          </div>
        )}
        {d.saldo_credito != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">SALDO PENDIENTE</p>
            <p className="text-base font-bold font-mono" style={{ color: Number(d.saldo_credito) > 0 ? '#f87171' : '#34d399' }}>{fmt(d.saldo_credito)}</p>
          </div>
        )}
        {d.num_cuotas != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">N.° DE CUOTAS</p>
            <p className="text-base font-bold font-mono text-[#a0d4e0]">{d.num_cuotas}</p>
          </div>
        )}
      </div>
      {(d.tasa_interes != null || d.fecha_vencimiento) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3" style={{ borderTop: `1px solid ${color}10` }}>
          {d.tasa_interes != null && (
            <span className="text-xs text-[#6aacbc]">Tasa <span className="text-[#a0d4e0] font-mono font-semibold">{Number(d.tasa_interes).toFixed(2)}%</span> M.V.</span>
          )}
          {d.fecha_vencimiento && (
            <span className="text-xs text-[#6aacbc]">Vence <span className="text-[#a0d4e0] font-mono font-semibold">{fmtFecha(d.fecha_vencimiento)}</span></span>
          )}
        </div>
      )}
    </div>
  );
};

const calcEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy  = new Date();
  const nac  = new Date(fechaNac);
  let años   = hoy.getFullYear() - nac.getFullYear();
  const diff = hoy.getMonth() - nac.getMonth() || hoy.getDate() - nac.getDate();
  if (diff < 0) años--;
  return años;
};

const calcAntiguedad = (fechaIngreso, fechaReingreso) => {
  const desde = fechaReingreso ?? fechaIngreso;
  if (!desde) return null;
  const hoy    = new Date();
  const inicio = new Date(desde);
  let años  = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth()    - inicio.getMonth();
  if (hoy.getDate() < inicio.getDate()) meses--;
  if (meses < 0) { años--; meses += 12; }
  if (años === 0) return meses === 1 ? '1 mes' : `${meses} meses`;
  return meses === 0
    ? `${años} ${años === 1 ? 'año' : 'años'}`
    : `${años} ${años === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

const ESTADO_BONO = {
  asignado:              { label: 'ACTIVO',    color: '#00e5ff' },
  pendiente_retiro:      { label: 'RETIRANDO', color: '#ff3d3d' },
  pendiente_adquisicion: { label: 'PENDIENTE', color: '#ffb700' },
};

const ESTADO_FACTURA = {
  pendiente:    { label: 'PENDIENTE',    color: '#ffb700' },
  pago_parcial: { label: 'PAGO PARCIAL', color: '#f59e0b' },
  vencida:      { label: 'VENCIDA',      color: '#ff3d3d' },
  pagada:       { label: 'PAGADA',       color: '#10b981' },
};

const ACCION_LABEL = {
  COMPRA_DIRECTA:            'Compra directa',
  ANULACION_DIRECTA:         'Anulación directa',
  SOLICITUD_ADQUISICION:     'Solicitó número',
  APROBACION:                'Solicitud aprobada',
  RECHAZO:                   'Solicitud rechazada',
  CANCELACION_ASOCIADO:      'Canceló solicitud',
  SOLICITUD_RETIRO:          'Solicitó retiro',
  APROBACION_RETIRO:         'Retiro aprobado',
  RECHAZO_RETIRO:            'Retiro rechazado',
  LIBERACION_POR_RETIRO_CSV: 'Liberado por retiro',
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

const Seccion = ({ icon: Icon, titulo, color = '#10b981', onNav, children }) => (
  <div className="bg-[#08101e] border border-[#10b98111] rounded-sm overflow-hidden">
    <div
      className={`flex items-center justify-between gap-3 px-5 py-3 border-b border-[#10b98111] ${onNav ? 'cursor-pointer hover:bg-[#ffffff05] transition-colors' : ''}`}
      onClick={onNav}
    >
      <div className="flex items-center gap-3">
        <Icon size={13} style={{ color }} />
        <p className="text-[9px] tracking-[3px] uppercase" style={{ color }}>{titulo}</p>
      </div>
      {onNav && <ExternalLink size={11} style={{ color, opacity: 0.5 }} />}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Campo = ({ label, valor }) => (
  <div className="flex items-baseline justify-between py-2 border-b border-[#10b98108] last:border-0">
    <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">{label}</p>
    <p className="text-[#a0d4e0] text-[11px] text-right">{valor || <span className="text-[#6aacbc] italic text-[10px]">—</span>}</p>
  </div>
);

const Chip = ({ label, valor, color }) => (
  <div
    className="flex flex-col items-center px-4 py-2 rounded-sm border text-center"
    style={{ borderColor: color + '33', background: color + '0d' }}
  >
    <p className="text-lg font-bold font-mono" style={{ color }}>{valor}</p>
    <p className="text-[8px] tracking-widest mt-0.5" style={{ color, opacity: 0.7 }}>{label}</p>
  </div>
);

const BtnAccion = ({ icon: Icon, label, color, onClick, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className="flex items-center gap-2 px-3 py-2 rounded-sm border text-[10px] tracking-widest transition-all disabled:opacity-40"
    style={{
      borderColor: color + '44',
      background:  color + '0d',
      color,
    }}
    onMouseEnter={(e) => { if (!loading && !disabled) e.currentTarget.style.background = color + '22'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = color + '0d'; }}
  >
    {loading ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
    {label}
  </button>
);

// ── Acciones del portal ───────────────────────────────────────────────────────

const AccionesPortal = ({ asociado, onRefresh }) => {
  const [loadingKey, setLoadingKey] = useState(null);
  const [password,   setPassword]   = useState(null);
  const [copiado,    setCopiado]    = useState(false);

  const run = async (key, fn) => {
    setLoadingKey(key);
    try { await fn(); }
    finally { setLoadingKey(null); }
  };

  const activar = () => run('activar', async () => {
    const { data } = await apiService.post(`/asociados/${asociado.codigo}/activar-portal`);
    setPassword(data.password);
    toast.success('Portal activado');
    onRefresh();
  });

  const regenerar = () => run('regenerar', async () => {
    const { data } = await apiService.post(`/asociados/${asociado.codigo}/activar-portal`);
    setPassword(data.password);
    toast.success('Contraseña regenerada');
    onRefresh();
  });

  const desactivar = () => run('desactivar', async () => {
    await apiService.post(`/asociados/${asociado.codigo}/desactivar-portal`);
    setPassword(null);
    toast.success('Portal desactivado');
    onRefresh();
  });

  const rechazarSolicitud = () => run('rechazar', async () => {
    await apiService.post(`/asociados/${asociado.codigo}/rechazar-solicitud`);
    toast('Solicitud rechazada', { icon: '✕' });
    onRefresh();
  });

  const copiar = () => {
    navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Seccion icon={Zap} titulo="Acciones rápidas" color="#a855f7">
      <div className="flex flex-wrap gap-2">
        {!asociado.portal_activo && !asociado.solicitud_portal_at && (
          <BtnAccion icon={ShieldCheck} label="ACTIVAR PORTAL" color="#10b981"
            onClick={activar} loading={loadingKey === 'activar'} />
        )}

        {!asociado.portal_activo && asociado.solicitud_portal_at && (
          <>
            <div className="w-full mb-1">
              <p className="text-[9px] text-[#ffb700] tracking-widest flex items-center gap-1.5">
                <Bell size={10} /> SOLICITUD DE ACCESO PENDIENTE — {fmtFecha(asociado.solicitud_portal_at)}
              </p>
            </div>
            <BtnAccion icon={ShieldCheck} label="APROBAR Y ACTIVAR" color="#10b981"
              onClick={activar} loading={loadingKey === 'activar'} />
            <BtnAccion icon={ThumbsDown} label="RECHAZAR" color="#ff3d3d"
              onClick={rechazarSolicitud} loading={loadingKey === 'rechazar'} />
          </>
        )}

        {asociado.portal_activo && (
          <>
            <BtnAccion icon={KeyRound} label="REGENERAR CONTRASEÑA" color="#ffb700"
              onClick={regenerar} loading={loadingKey === 'regenerar'} />
            <BtnAccion icon={ShieldOff} label="DESACTIVAR PORTAL" color="#ff3d3d"
              onClick={desactivar} loading={loadingKey === 'desactivar'} />
          </>
        )}
      </div>

      {password && (
        <div className="mt-4 flex items-center gap-3 bg-[#10b98108] border border-[#10b98133] rounded-sm px-4 py-3">
          <div className="flex-1">
            <p className="text-[8px] text-[#10b981] tracking-widest mb-1">CONTRASEÑA TEMPORAL — entrégala al asociado</p>
            <p className="font-mono text-[#a0d4e0] text-sm tracking-widest">{password}</p>
          </div>
          <button onClick={copiar} className="text-[#6aacbc] hover:text-[#10b981] transition-colors">
            {copiado ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </Seccion>
  );
};

// ── Solicitudes de bono pendientes ────────────────────────────────────────────

const SolicitudesPendientes = ({ solicitudes, onRefresh }) => {
  const [loadingId, setLoadingId] = useState(null);

  const gestionar = async (sol, accion) => {
    setLoadingId(sol.id);
    try {
      await apiService.post(`/sorteos/${sol.sorteo_id}/solicitudes/${sol.id}/${accion}`, {});
      toast.success(accion === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      onRefresh();
    } catch {
      toast.error('Error al gestionar la solicitud');
    } finally {
      setLoadingId(null);
    }
  };

  if (!solicitudes.length) return null;

  return (
    <div className="md:col-span-2">
      <Seccion icon={Bell} titulo={`Solicitudes pendientes (${solicitudes.length})`} color="#ffb700">
        <div className="flex flex-col gap-2">
          {solicitudes.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2.5 border-b border-[#ffb70011] last:border-0"
            >
              <div>
                <p className="text-[#a0d4e0] text-[10px]">
                  {s.tipo === 'adquisicion' ? 'Solicitud de número' : 'Solicitud de retiro'}
                  <span className="text-[#6aacbc] ml-2">· {s.sorteo_nombre}</span>
                </p>
                <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">{fmtFecha(s.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <BtnAccion
                  icon={loadingId === s.id ? Loader2 : ThumbsUp}
                  label="APROBAR"
                  color="#10b981"
                  onClick={() => gestionar(s, 'aprobar')}
                  loading={loadingId === s.id}
                />
                <BtnAccion
                  icon={ThumbsDown}
                  label="RECHAZAR"
                  color="#ff3d3d"
                  onClick={() => gestionar(s, 'rechazar')}
                  disabled={loadingId === s.id}
                />
              </div>
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const AsociadoPerfil = () => {
  const { codigo } = useParams();
  const navigate   = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const [historialAporte, setHistorialAporte] = useState([]);
  const [periodoDesc,    setPeriodoDesc]    = useState(hoyPeriodo);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/asociados/${codigo}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [codigo]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    apiService.get(`/asociados/${codigo}/historial-aporte`)
      .then(({ data }) => setHistorialAporte(data))
      .catch(() => {});
  }, [codigo]);

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 size={24} className="animate-spin text-[#10b981]" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-32">
      <p className="text-[#ff3d3d] text-sm tracking-widest">ASOCIADO NO ENCONTRADO</p>
      <button onClick={() => navigate('/asociados')}
        className="mt-4 text-[#6aacbc] text-[10px] hover:text-[#10b981] transition-colors tracking-widest">
        ← VOLVER AL LISTADO
      </button>
    </div>
  );

  const { asociado, bonosActivos, premios, historial, cuotas, solicitudesPendientes, descuentos = [] } = data;

  const totalBonos    = bonosActivos.filter((b) => b.estado === 'asignado').length;
  const valorTotalBonos = bonosActivos
    .filter((b) => b.estado === 'asignado')
    .reduce((acc, b) => acc + Number(b.precio_boleto ?? 0), 0);

  const hoy   = hoyPeriodo();
  const esHoy = periodoDesc === hoy;

  const GRUPOS_DESC = [
    { key: 'seguros',   label: 'SEGUROS Y PÓLIZAS',       icon: ShieldCheck, color: '#34d399', lineas: new Set([4,5,10,11,12,13,16,18,19,23,24,1007,1011,1012,1018,1019,1027,1032,1033,1034,1040,1041]) },
    { key: 'creditos',  label: 'CRÉDITOS Y PRÉSTAMOS',     icon: CreditCard,  color: '#818cf8', lineas: new Set([1002,1003,1004,1005,1006,1008,1009,1010,1013,1015,1016,1021,1023,1025,1028,1029,1030,1036,1039]) },
    { key: 'bienestar', label: 'SERVICIOS DE BIENESTAR',   icon: Heart,       color: '#f472b6', lineas: new Set([17,20,22,1014]) },
    { key: 'otros',     label: 'OTROS DESCUENTOS',         icon: LayoutList,  color: '#fb923c', lineas: new Set([3,14,21,1017,1020,1024,1031,1035]) },
  ];
  const descConEstado   = descuentos.map((d) => ({ ...d, _estado: estadoLineaEnMes(d, periodoDesc) }));
  const totalDescuentos = descuentos.reduce((s, d) => s + Number(d.valor ?? 0), 0);
  const totalPeriodoDesc = descConEstado
    .filter((d) => d._estado !== 'antes')
    .reduce((s, d) => s + Number(d.valor ?? 0), 0);
  const totalMensual = Number(asociado.valor_aporte ?? 0) + totalDescuentos;

  const bonesPorSorteo = bonosActivos.reduce((acc, b) => {
    const key = b.sorteo_id;
    if (!acc[key]) acc[key] = { sorteo_id: b.sorteo_id, sorteo_nombre: b.sorteo_nombre, sorteo_estado: b.sorteo_estado, precio_boleto: b.precio_boleto, boletos: [] };
    acc[key].boletos.push(b);
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => navigate('/asociados')} className="mt-1 text-[#6aacbc] hover:text-[#10b981] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">CC {asociado.codigo}</p>
          <h1 className="text-2xl font-bold text-[#a0d4e0] tracking-wider">
            {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()}
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">{asociado.nombre_empresa ?? '—'}</p>

          {/* Total mensual */}
          {totalMensual > 0 && (
            <div className="flex items-baseline gap-3 mt-3 pl-1">
              <p className="text-xs tracking-[2px] text-[#6aacbc] shrink-0">TOTAL MENSUAL</p>
              <p className="text-2xl font-black font-mono text-[#10b981] leading-none">{fmt(totalMensual)}</p>
              {descuentos.length > 0 && asociado.valor_aporte > 0 && (
                <p className="text-xs text-[#6aacbc] self-end mb-0.5">
                  aporte {fmt(asociado.valor_aporte)} · descuentos {fmt(totalDescuentos)}
                </p>
              )}
            </div>
          )}

          {/* Chips de resumen */}
          {(totalBonos > 0 || premios.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {totalBonos > 0 && (
                <Chip label="BONOS ACTIVOS" valor={totalBonos} color="#00e5ff" />
              )}
              {valorTotalBonos > 0 && (
                <Chip label="VALOR EN BONOS" valor={fmt(valorTotalBonos)} color="#00e5ff" />
              )}
              {premios.length > 0 && (
                <Chip label="PREMIOS GANADOS" valor={premios.length} color="#ffb700" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {asociado.is_active
            ? <span className="flex items-center gap-1 text-[#10b981] text-[9px] tracking-widest"><CheckCircle size={11} /> ACTIVO</span>
            : <span className="flex items-center gap-1 text-[#ff3d3d] text-[9px] tracking-widest"><XCircle size={11} /> INACTIVO</span>
          }
          {asociado.portal_activo && (
            <span className="text-[8px] px-2 py-0.5 border border-[#00e5ff22] text-[#00e5ff] rounded-sm tracking-widest">PORTAL ACTIVO</span>
          )}
          {!asociado.portal_activo && asociado.solicitud_portal_at && (
            <span className="text-[8px] px-2 py-0.5 border border-[#ffb70033] text-[#ffb700] rounded-sm tracking-widest animate-pulse">SOLICITUD PENDIENTE</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Solicitudes de bono pendientes ── */}
        <SolicitudesPendientes solicitudes={solicitudesPendientes} onRefresh={cargar} />

        {/* ── Acciones rápidas ── */}
        <div className="md:col-span-2">
          <AccionesPortal asociado={asociado} onRefresh={cargar} />
        </div>

        {/* ── Datos personales ── */}
        <Seccion icon={User} titulo="Datos personales">
          <Campo label="Cédula"           valor={asociado.codigo} />
          <Campo label="Nombre"           valor={`${asociado.nombre} ${asociado.apellido}`} />
          <Campo label="Fecha nacimiento" valor={fmtFecha(asociado.fecha_nacimiento)} />
          {calcEdad(asociado.fecha_nacimiento) != null && (
            <Campo label="Edad" valor={`${calcEdad(asociado.fecha_nacimiento)} años`} />
          )}
          <div className="flex items-center justify-between py-2 border-b border-[#10b98108]">
            <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">Móvil</p>
            <div className="flex items-center gap-2">
              <p className="text-[#a0d4e0] text-[11px]">{asociado.movil || <span className="text-[#6aacbc] italic text-[10px]">—</span>}</p>
              {asociado.movil && (
                <a
                  href={`https://wa.me/57${asociado.movil.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-sm border border-[#25d36622] bg-[#25d3660d] hover:bg-[#25d3661a] hover:border-[#25d36644] transition-colors text-[#25d366] text-[9px] tracking-widest"
                >
                  <MessageCircle size={10} />
                  WA
                </a>
              )}
            </div>
          </div>
          <Campo label="Dirección"    valor={asociado.direccion} />
          <Campo label="Ciudad"       valor={asociado.ciudad} />
          <Campo label="Clase cuota"  valor={labelClaseCuota(asociado.clase_cuota)} />
          <Campo label="Empresa"      valor={asociado.nombre_empresa} />
          <Campo label="Empresa dsto" valor={asociado.empresa_dsto} />
          {!asociado.is_active && (
            <div className="flex items-baseline justify-between py-2 last:border-0">
              <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">Fecha retiro</p>
              <p className="text-[#ff3d3d] text-[11px] text-right">{fmtFecha(asociado.fecha_retiro)}</p>
            </div>
          )}
        </Seccion>

        {/* ── Aporte patronal ── */}
        <Seccion icon={Banknote} titulo="Aporte patronal" color="#f59e0b">
          <Campo label="Cuota de aporte"  valor={fmt(asociado.valor_aporte)} />
          <Campo label="Fecha crédito"    valor={fmtFecha(asociado.fecha_credito)} />
          <Campo label="Primer descuento" valor={fmtFecha(asociado.fecha_pri_descuento)} />
          <Campo label="Fecha ingreso"    valor={fmtFecha(asociado.fecha_ingreso)} />
          <Campo label="Fecha reingreso"  valor={fmtFecha(asociado.fecha_reingreso)} />
          {calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso) && (
            <Campo label="Antigüedad" valor={calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso)} />
          )}

          <div className="flex items-baseline justify-between py-2 border-b border-[#10b98108]">
            <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">Saldo aporte</p>
            {asociado.saldo_aporte != null ? (
              <div className="text-right">
                <p className={`text-[11px] font-bold ${Number(asociado.saldo_aporte) < 0 ? 'text-[#10b981]' : Number(asociado.saldo_aporte) > 0 ? 'text-[#ff3d3d]' : 'text-[#a0d4e0]'}`}>
                  {fmt(Math.abs(asociado.saldo_aporte))}
                </p>
                <p className="text-[8px] tracking-widest mt-0.5" style={{ color: Number(asociado.saldo_aporte) < 0 ? '#10b981' : Number(asociado.saldo_aporte) > 0 ? '#ff3d3d' : '#6aacbc' }}>
                  {Number(asociado.saldo_aporte) < 0 ? 'A FAVOR DEL ASOCIADO' : Number(asociado.saldo_aporte) > 0 ? 'DEBE A LA COOPERATIVA' : 'AL DÍA'}
                </p>
              </div>
            ) : (
              <span className="text-[#6aacbc] italic text-[10px]">—</span>
            )}
          </div>

          {cuotas.length > 0 && (
            <div className="mt-4">
              <p className="text-[9px] text-[#6aacbc] tracking-[2px] mb-2">ÚLTIMAS CUOTAS PATRONALES</p>
              <div className="flex flex-col">
                {cuotas.map((c, i) => {
                  const est = ESTADO_FACTURA[c.factura_estado] ?? { label: c.factura_estado, color: '#6aacbc' };
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/patronales/facturas/${c.factura_id}`)}
                      className="flex items-center justify-between text-[10px] py-2 border-b border-[#f59e0b08] last:border-0 hover:bg-[#f59e0b05] -mx-5 px-5 transition-colors group"
                    >
                      <div className="text-left">
                        <span className="text-[#a0d4e0] font-mono">{c.periodo}</span>
                        <span className="text-[#6aacbc] ml-2 text-[9px]">{c.empresa_nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#a0d4e0]">{fmt(c.valor_aporte_snapshot)}</span>
                        {c.bonos_monto > 0 && (
                          <span className="text-[#00e5ff] text-[9px]">+{fmt(c.bonos_monto)} bonos</span>
                        )}
                        <span className="text-[8px] px-1.5 py-0.5 border rounded-sm" style={{ borderColor: est.color + '44', color: est.color }}>
                          {est.label}
                        </span>
                        <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {cuotas.length === 0 && (
            <p className="text-[#6aacbc] text-[10px] tracking-widest mt-4">SIN CUOTAS REGISTRADAS</p>
          )}
        </Seccion>

        {/* ── Descuentos CSV ── */}
        {descuentos.length > 0 && (
          <div className="md:col-span-2">
            <Seccion icon={LayoutList} titulo="Descuentos del CSV" color="#a0d4e0">

              {/* Selector de período */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPeriodoDesc((p) => shiftMes(p, -1))}
                  className="p-1 text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <div className="text-center">
                  <input
                    type="month"
                    value={periodoDesc}
                    max={hoy}
                    onChange={(e) => e.target.value && setPeriodoDesc(e.target.value)}
                    className="bg-transparent border-0 text-xs font-semibold text-[#a0d4e0] text-center cursor-pointer outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                  {!esHoy && (
                    <button onClick={() => setPeriodoDesc(hoy)}
                      className="block w-full text-[9px] text-[#6aacbc] hover:text-[#10b981] tracking-widest transition-colors">
                      MES ACTUAL
                    </button>
                  )}
                </div>
                <button onClick={() => setPeriodoDesc((p) => shiftMes(p, 1))}
                  disabled={periodoDesc >= hoy}
                  className="p-1 text-[#6aacbc] hover:text-[#a0d4e0] transition-colors disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Total del período */}
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[8px] tracking-[3px] text-[#6aacbc]">
                  {esHoy ? 'TOTAL DESCUENTOS' : 'ESTIMADO PARA ESTE MES'}
                </p>
                <p className="text-sm font-black font-mono text-[#a0d4e0]">{fmt(totalPeriodoDesc)}</p>
              </div>

              <div className="space-y-1.5">
                {GRUPOS_DESC.map((g) => {
                  const filas = descConEstado.filter((d) => g.lineas.has(d.linea_id));
                  if (!filas.length) return null;
                  const filasActivas = filas.filter((d) => d._estado !== 'antes');
                  const totalG  = filasActivas.reduce((s, d) => s + Number(d.valor ?? 0), 0);
                  const tieneAc = filasActivas.length > 0;
                  const clr     = tieneAc ? g.color : '#4a5568';
                  const Icon = g.icon;
                  return (
                    <details key={g.key} className="rounded-sm overflow-hidden" style={{ border: `1px solid ${clr}22` }}>
                      <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer list-none"
                        style={{ background: '#08101e' }}>
                        <div className="flex items-center gap-2">
                          <Icon size={12} style={{ color: clr }} />
                          <span className="text-[9px] font-bold tracking-[2px]" style={{ color: clr }}>{g.label}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono"
                            style={{ background: `${clr}18`, color: clr }}>{filasActivas.length}/{filas.length}</span>
                        </div>
                        <span className="text-xs font-black font-mono" style={{ color: clr }}>{fmt(totalG)}</span>
                      </summary>
                      <div style={{ borderTop: `1px solid ${g.color}12` }}>
                        {filas.map((d) => {
                          // Si está en asociado_descuentos fue traído por el último sync → está activo.
                          // fecha_vencimiento es informativa (fin programado), no determina actividad.
                          const aunNoInicia = d._estado === 'antes';
                          if (g.key === 'creditos') {
                            if (aunNoInicia) return (
                              <div key={d.linea_id} className="flex items-center justify-between px-3 py-2 opacity-40"
                                style={{ background: '#05080f', borderBottom: `1px solid ${g.color}08` }}>
                                <p className="text-[9px] tracking-wider text-[#6aacbc] truncate pr-4">{d.nombre_linea}</p>
                                <p className="text-[9px] tracking-widest text-[#4a5568]">AÚN NO INICIADO</p>
                              </div>
                            );
                            return <CreditoCardAdmin key={d.linea_id} d={d} color={g.color} />;
                          }
                          return (
                            <div key={d.linea_id} className={`flex items-center justify-between px-3 py-2 ${aunNoInicia ? 'opacity-40' : ''}`}
                              style={{ background: '#05080f', borderBottom: `1px solid ${g.color}08` }}>
                              <div className="flex items-center gap-2 min-w-0 pr-4">
                                <p className="text-[9px] tracking-wider text-[#6aacbc] truncate">{d.nombre_linea}</p>
                                {!esHoy && !aunNoInicia && (
                                  <span className="text-[7px] px-1 py-0.5 rounded-sm tracking-widest shrink-0"
                                    style={{ background: `${clr}15`, color: clr }}>APROX.</span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold font-mono shrink-0"
                                style={{ color: aunNoInicia ? '#4a5568' : g.color }}>
                                {aunNoInicia ? 'AÚN NO' : fmt(d.valor)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </Seccion>
          </div>
        )}

        {/* ── Bonos en sorteos ── */}
        <Seccion icon={Ticket} titulo="Bonos en sorteos" color="#00e5ff">
          {Object.values(bonesPorSorteo).length === 0 ? (
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN BONOS ACTIVOS</p>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.values(bonesPorSorteo).map((s) => (
                <div key={s.sorteo_id}>
                  <button
                    onClick={() => navigate(`/sorteos/${s.sorteo_id}`)}
                    className="flex items-center justify-between w-full mb-2 group"
                  >
                    <p className="text-[#a0d4e0] text-[10px] font-semibold tracking-wider group-hover:text-[#00e5ff] transition-colors">
                      {s.sorteo_nombre}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-[#6aacbc] tracking-widest">{fmt(s.precio_boleto)}/bono</span>
                      <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {s.boletos.map((b) => {
                      const est = ESTADO_BONO[b.estado] ?? { label: b.estado, color: '#6aacbc' };
                      return (
                        <div
                          key={b.numero}
                          className="flex flex-col items-center px-2.5 py-2 rounded-sm border text-center"
                          style={{ borderColor: est.color + '44', background: est.color + '0d' }}
                        >
                          <span className="font-mono font-bold text-sm" style={{ color: est.color }}>
                            {String(b.numero).padStart(3, '0')}
                          </span>
                          <span className="text-[7px] tracking-widest mt-0.5" style={{ color: est.color, opacity: 0.7 }}>
                            {est.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        {/* ── Premios ganados ── */}
        <Seccion icon={Trophy} titulo="Premios ganados" color="#ffb700">
          {premios.length === 0 ? (
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN PREMIOS REGISTRADOS</p>
          ) : (
            <div className="flex flex-col gap-2">
              {premios.map((p, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/sorteos/${p.sorteo_id}`)}
                  className="flex items-center gap-4 py-2 border-b border-[#ffb70011] last:border-0 hover:bg-[#ffb7000a] -mx-5 px-5 transition-colors group"
                >
                  <p className="text-[#ffb700] font-bold font-mono text-lg" style={{ textShadow: '0 0 8px #ffb70044' }}>
                    #{String(p.numero).padStart(3, '0')}
                  </p>
                  <div className="flex-1 text-left">
                    <p className="text-[#a0d4e0] text-[10px]">{p.sorteo_nombre}</p>
                    <p className="text-[#6aacbc] text-[9px] tracking-widest">{fmtMes(p.mes_premiacion)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#6aacbc] text-[9px]">{fmtFecha(p.fecha_premiacion)}</p>
                    <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Seccion>

        {/* ── Historial de aportes y saldo ── */}
        {historialAporte.length > 0 && (
          <div className="md:col-span-2">
            <Seccion icon={TrendingUp} titulo="Historial de aportes y saldo" color="#f59e0b">
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#f59e0b22]" />
                <div className="flex flex-col gap-0">
                  {historialAporte.map((h, i) => {
                    const esCuota  = h.campo === 'valor_aporte';
                    const anterior = h.valor_anterior != null ? Number(h.valor_anterior) : null;
                    const nuevo    = h.valor_nuevo    != null ? Number(h.valor_nuevo)    : null;
                    const subio    = nuevo != null && anterior != null && nuevo > anterior;
                    const bajo     = nuevo != null && anterior != null && nuevo < anterior;
                    // para saldo: subir es malo (más deuda), bajar es bueno (pagó)
                    const colorEvento = esCuota
                      ? (subio ? '#10b981' : '#ffb700')
                      : (bajo  ? '#10b981' : subio ? '#ff3d3d' : '#6aacbc');
                    return (
                      <div key={h.id ?? i} className="flex items-start gap-4 py-3 border-b border-[#f59e0b08] last:border-0">
                        {/* Dot */}
                        <div className="relative shrink-0 mt-1">
                          <div className="w-2.5 h-2.5 rounded-full border-2 z-10 relative"
                            style={{ borderColor: colorEvento, background: colorEvento + '33' }} />
                        </div>
                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[10px] text-[#a0d4e0] tracking-wide">
                              {esCuota ? 'Cambio de cuota de aporte' : 'Movimiento de saldo'}
                            </p>
                            <p className="text-[9px] text-[#6aacbc] shrink-0">
                              {new Date(h.changed_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[11px] text-[#6aacbc]">
                              {anterior != null ? fmt(Math.abs(anterior)) : '—'}
                            </span>
                            <span className="text-[#6aacbc] text-[9px]">→</span>
                            <span className="font-mono text-[11px] font-bold" style={{ color: colorEvento }}>
                              {nuevo != null ? fmt(Math.abs(nuevo)) : '—'}
                            </span>
                            {!esCuota && nuevo != null && (
                              <span className="text-[8px] tracking-widest" style={{ color: colorEvento }}>
                                {nuevo < 0 ? 'A FAVOR' : nuevo > 0 ? 'PENDIENTE' : 'AL DÍA'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Seccion>
          </div>
        )}

        {/* ── Historial de movimientos ── */}
        {historial.length > 0 && (
          <div className="md:col-span-2">
            <Seccion icon={Activity} titulo="Últimos movimientos en sorteos" color="#a855f7">
              <div className="flex flex-col">
                {historial.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/sorteos/${h.sorteo_id}`)}
                    className="flex items-center gap-4 py-2.5 border-b border-[#a855f708] last:border-0 hover:bg-[#a855f70a] -mx-5 px-5 transition-colors group"
                  >
                    <Clock size={11} className="shrink-0 text-[#6aacbc]" />
                    <div className="flex-1 text-left">
                      <span className="text-[#a0d4e0] text-[10px]">{ACCION_LABEL[h.accion] ?? h.accion}</span>
                      {h.numero != null && (
                        <span className="text-[#a855f7] font-mono text-[10px] ml-2">#{String(h.numero).padStart(3, '0')}</span>
                      )}
                      <span className="text-[#6aacbc] text-[9px] ml-2">· {h.sorteo_nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-[#6aacbc] text-[9px]">
                        {new Date(h.created_at).toLocaleDateString('es-CO')}
                      </p>
                      <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </Seccion>
          </div>
        )}

      </div>
    </>
  );
};

export default AsociadoPerfil;
