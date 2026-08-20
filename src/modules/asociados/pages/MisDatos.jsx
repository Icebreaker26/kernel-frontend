import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Ticket, X, Loader2, CheckCircle,
  Clock, PauseCircle, Trophy, Lock, ChevronDown, ChevronLeft, ChevronRight,
  Banknote, CalendarDays, Wallet, ShieldCheck, CreditCard, Heart, LayoutList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import { labelClaseCuota } from '../../../utils/asociados.js';
import apiService from '../../../services/apiService.js';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

// ── Frase motivacional ────────────────────────────────────────────────────────

const FRASES = [
  'El ahorro de hoy es la libertad de mañana.',
  'Juntos construimos más de lo que lograríamos solos.',
  'Cada aporte cuenta. El tuyo también.',
  'Cooperar es crecer con propósito.',
  'Tu constancia es el motor de Progresemos.',
  'Un paso a la vez, siempre hacia adelante.',
  'La solidaridad es nuestra mayor fortaleza.',
  'Invertir en la cooperativa es invertir en ti mismo.',
  'Pequeños aportes, grandes sueños posibles.',
  'Gracias por ser parte de esta comunidad.',
  'El progreso real se construye entre todos.',
  'Tu participación hace la diferencia.',
  'Ahorrando hoy, aseguramos el mañana.',
  'Una cooperativa fuerte empieza con miembros comprometidos.',
  'Confía en el proceso. Confía en tu cooperativa.',
];

const fraseDelDia = () => {
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  return FRASES[seed % FRASES.length];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : null;
const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : null;

const calcEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date(); const nac = new Date(fechaNac);
  let años = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) años--;
  return años;
};

const calcAntiguedad = (fechaIngreso, fechaReingreso) => {
  const desde = fechaReingreso ?? fechaIngreso;
  if (!desde) return null;
  const hoy = new Date(); const inicio = new Date(desde);
  let años = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth() - inicio.getMonth();
  if (hoy.getDate() < inicio.getDate()) meses--;
  if (meses < 0) { años--; meses += 12; }
  if (años === 0) return meses === 1 ? '1 mes' : `${meses} meses`;
  return meses === 0
    ? `${años} ${años === 1 ? 'año' : 'años'}`
    : `${años} ${años === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

// ── Primitivos ────────────────────────────────────────────────────────────────

const ModalSW = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
    <div
      className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-sm relative"
      style={{ boxShadow: '0 0 40px #00e5ff11' }}
    >
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[#a0d4e0] font-bold text-base tracking-wider">{titulo}</h3>
        <button onClick={onClose}><X size={16} className="text-[#6aacbc] hover:text-[#a0d4e0]" /></button>
      </div>
      {children}
    </div>
  </div>
);

const Btn = ({ children, onClick, loading, icon, variant = 'primary', type = 'button' }) => {
  const STYLES = {
    primary: 'border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff]',
    danger:  'border border-[#ff3d3d44] hover:border-[#ff3d3d88] bg-[#ff3d3d0d] hover:bg-[#ff3d3d1a] text-[#ff3d3d]',
    ghost:   'text-[#6aacbc] hover:text-[#a0d4e0] border border-transparent',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={!!loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] tracking-widest transition-all disabled:opacity-40 ${STYLES[variant]}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ── Mini card para métricas clave del hero ────────────────────────────────────

const MiniCard = ({ icon: Icon, label, value, sub, color = '#00e5ff' }) => (
  <div
    className="rounded-sm px-3.5 py-3 flex flex-col gap-1.5 relative overflow-hidden"
    style={{ background: color + '0a', border: `1px solid ${color}1a` }}
  >
    <div
      className="absolute top-0 right-0 w-12 h-12 opacity-[0.07]"
      style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }}
    />
    <Icon size={13} style={{ color: color + '99' }} />
    <p className="text-[8px] tracking-[2px] uppercase" style={{ color: color + '88' }}>{label}</p>
    <p className="font-mono font-bold text-sm leading-tight" style={{ color }}>{value ?? '—'}</p>
    {sub && <p className="text-[8px] tracking-[1px] uppercase" style={{ color: color + '66' }}>{sub}</p>}
  </div>
);

// ── Fila de dato dentro del hero ──────────────────────────────────────────────

const FilaDato = ({ label, valor, color }) => (
  valor != null ? (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-[#00e5ff06] last:border-0">
      <p className="text-[#6aacbc] text-[9px] tracking-[2px] uppercase shrink-0">{label}</p>
      <p className={`text-xs font-mono text-right min-w-0 break-words ${color ?? 'text-[#a0d4e0]'}`}>{valor}</p>
    </div>
  ) : null
);

// ── Sección colapsable ────────────────────────────────────────────────────────

const Seccion = ({ titulo, icon: Icon, color = '#00e5ff', defaultOpen = false, badge, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#00e5ff04] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={13} style={{ color: color + '99' }} />
          <span className="text-[9px] tracking-[3px] uppercase" style={{ color: color + 'cc' }}>{titulo}</span>
        </div>
        <div className="flex items-center gap-3">
          {badge != null && (
            <span className="text-xs font-black font-mono" style={{ color }}>{badge}</span>
          )}
          <ChevronDown
            size={13}
            className="transition-transform duration-200"
            style={{ color: color + '55', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#00e5ff08]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Sorteo ────────────────────────────────────────────────────────────────────

const MIS_STYLE = {
  asignado:              { border: '#00e5ff', bg: '#003d4433', label: 'ACTIVO' },
  pendiente_adquisicion: { border: '#ffb700', bg: '#2a1a0033', label: 'PENDIENTE' },
  pendiente_retiro:      { border: '#ff3d3d', bg: '#2a080033', label: 'RETIRANDO' },
};

const SorteoCard = ({ sorteoData, sorteoLoading, onRefresh, asociado }) => {
  const [modal, setModal]             = useState(null);
  const [accion, setAccion]           = useState(null);
  const [procesando, setProcesando]   = useState(false);
  const [verDisponibles, setVerDisponibles] = useState(false);

  const solicitar = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar', { numero, sorteo_id: sorteoData.sorteo.id });
      toast.success(`Solicitud #${String(numero).padStart(3, '0')} enviada`);
      setModal(null); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al solicitar'); }
    finally { setProcesando(false); }
  };

  const solicitarRetiro = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar-retiro', { numero, sorteo_id: sorteoData.sorteo.id });
      toast.success(`Retiro #${String(numero).padStart(3, '0')} solicitado`);
      setAccion(null); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al solicitar retiro'); }
    finally { setProcesando(false); }
  };

  const cancelar = async (solicitudId) => {
    setProcesando(true);
    try {
      await apiService.delete(`/sorteos/portal/solicitudes/${solicitudId}`);
      toast.success('Solicitud cancelada');
      setAccion(null); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al cancelar'); }
    finally { setProcesando(false); }
  };

  if (sorteoLoading) return (
    <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm flex justify-center py-14">
      <Loader2 size={20} className="animate-spin text-[#6aacbc]" />
    </div>
  );

  if (!sorteoData?.sorteo) return (
    <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm text-center py-12">
      <Ticket size={36} className="mx-auto mb-3 opacity-10" style={{ color: '#00e5ff' }} />
      <p className="text-[#6aacbc] text-xs tracking-[3px]">SIN BONO ACTIVO PARA TU EMPRESA</p>
    </div>
  );

  const pausado  = sorteoData.sorteo.estado === 'pausado';
  const esUnico  = sorteoData.sorteo.tipo_pago === 'unico';
  const activos  = sorteoData.mis_boletos.filter(b => b.estado === 'asignado').length;

  // Paleta dinámica: dorado para pago único, cyan para recurrente
  const acento   = esUnico ? '#ffd700' : '#00e5ff';
  const acentoDim = esUnico ? '#ffb700' : '#6aacbc';
  const bgCard   = esUnico ? '#0d0900' : '#08101e';
  const borderCard = esUnico ? '#ffb70030' : '#00e5ff15';
  const borderHeader = esUnico ? '#ffb70018' : '#00e5ff08';
  const bgNum    = esUnico ? '#3d280066' : '#003d4466';
  const bgNumHover = esUnico ? '#ffb70022' : '#00e5ff22';
  const borderNum = esUnico ? '#ffb70044' : '#00e5ff44';
  const borderNumHover = esUnico ? '#ffb70088' : '#00e5ff88';
  const shadowNum = esUnico ? '#ffb70018' : '#00e5ff18';
  const shadowNumHover = esUnico ? '#ffb70033' : '#00e5ff33';
  const bgGrid   = esUnico ? '#3d280055' : '#003d4455';
  const borderGrid = esUnico ? '#ffb70033' : '#00e5ff33';
  const borderGridHover = esUnico ? '#ffb70066' : '#00e5ff66';
  const bgVacia  = esUnico ? '#ffb70008' : '#00e5ff08';
  const borderVacia = esUnico ? '#ffb70022' : '#00e5ff22';

  return (
    <>
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: bgCard,
          border: `1px solid ${borderCard}`,
          boxShadow: esUnico ? '0 0 32px #ffb70012, 0 0 2px #ffb70030' : 'none',
        }}
      >
        {/* Banner especial pago único */}
        {esUnico && (
          <div
            className="flex items-center justify-center gap-2 px-5 py-2"
            style={{
              background: 'linear-gradient(90deg, #1a0e0000, #1a0e00cc, #1a0e0000)',
              borderBottom: '1px solid #ffb70033',
            }}
          >
            <span style={{ color: '#ffd700', fontSize: 13 }}>★</span>
            <p className="text-[9px] font-bold tracking-[4px]" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd70066' }}>
              BONO ESPECIAL · PAGO ÚNICO
            </p>
            <span style={{ color: '#ffd700', fontSize: 13 }}>★</span>
          </div>
        )}

        {/* Cabecera del sorteo */}
        <div className="px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${borderHeader}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] tracking-[3px] mb-1" style={{ color: pausado ? '#997a00' : acentoDim }}>
                {pausado ? 'BONO PAUSADO' : esUnico ? 'BONO ESPECIAL' : 'BONO ACTIVO'}
              </p>
              <p className="font-bold text-base tracking-wide leading-snug" style={{ color: esUnico ? '#ffd700' : '#a0d4e0', textShadow: esUnico ? '0 0 16px #ffd70033' : 'none' }}>
                {sorteoData.sorteo.nombre.toUpperCase()}
              </p>
              {sorteoData?.sorteo?.precio_boleto != null && (
                <p className="text-[9px] tracking-wider mt-1.5" style={{ color: '#ffb70077' }}>
                  VALOR POR BONO:{' '}
                  <span className="font-bold" style={{ color: '#ffb700' }}>
                    {esUnico
                      ? `$${Number(sorteoData.sorteo.precio_boleto).toLocaleString('es-CO')} PAGO ÚNICO`
                      : asociado?.clase_cuota
                        ? String(asociado.clase_cuota).startsWith('2')
                          ? `$${(sorteoData.sorteo.precio_boleto / 2).toLocaleString('es-CO')} QUINCENAL`
                          : `$${Number(sorteoData.sorteo.precio_boleto).toLocaleString('es-CO')} MENSUAL`
                        : `$${Number(sorteoData.sorteo.precio_boleto).toLocaleString('es-CO')}`
                    }
                  </span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] tracking-[2px] mb-1" style={{ color: acentoDim }}>MIS BONOS</p>
              <p
                className="text-4xl font-bold font-mono leading-none"
                style={{ color: acento, textShadow: `0 0 20px ${acento}44` }}
              >
                {activos}
              </p>
            </div>
          </div>
        </div>

        {/* Banner premio */}
        {sorteoData.sorteo.premio && (() => {
          const raw = String(sorteoData.sorteo.premio).replace(/[.$\s]/g, '').replace(/,/g, '');
          const num = Number(raw);
          const esNum = !isNaN(num) && num > 0;
          const fmtPremio = esNum
            ? `$${num.toLocaleString('es-CO')}`
            : sorteoData.sorteo.premio.toUpperCase();
          return (
            <div
              className="px-5 py-5 flex flex-col items-center gap-1"
              style={{
                background: esUnico
                  ? 'linear-gradient(180deg, #1a0e00ee, #0d090099)'
                  : 'linear-gradient(180deg, #001a2299, #08101e99)',
                borderBottom: `1px solid ${borderHeader}`,
              }}
            >
              <p className="text-[8px] tracking-[4px]" style={{ color: esUnico ? '#b8860b' : '#4a7a8a' }}>
                GANA
              </p>
              <p
                className="font-black font-mono leading-none text-center"
                style={{
                  fontSize: 'clamp(1.6rem, 7vw, 2.6rem)',
                  color: esUnico ? '#ffd700' : acento,
                  textShadow: esUnico
                    ? '0 0 30px #ffd70099, 0 0 60px #ffb70044'
                    : `0 0 30px ${acento}88`,
                  letterSpacing: '0.04em',
                }}
              >
                {fmtPremio}
              </p>
              {esNum && (
                <p className="text-[8px] tracking-[3px]" style={{ color: esUnico ? '#b8860b' : acentoDim }}>
                  EN EFECTIVO
                </p>
              )}
            </div>
          );
        })()}

        {/* Banner pausado */}
        {pausado && (
          <div className="flex items-center gap-3 bg-[#1a1000] border-b border-[#ffb70033] px-5 py-3">
            <PauseCircle size={14} className="shrink-0" style={{ color: '#ffb700' }} />
            <p className="text-[#ffb700] text-[10px] font-bold tracking-widest">
              PLAZO DE COMPRA CERRADO TEMPORALMENTE
            </p>
          </div>
        )}

        <div className="px-4 sm:px-5 py-4 space-y-5">

          {/* Mis números */}
          {sorteoData.mis_boletos.length > 0 ? (
            <div>
              <p className="text-[8px] tracking-[3px] mb-3" style={{ color: acentoDim }}>
                MIS NÚMEROS{' '}
                <span style={{ color: acento }}>({sorteoData.mis_boletos.length})</span>
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {sorteoData.mis_boletos.map((b) => {
                  const s = MIS_STYLE[b.estado];
                  const puedeInteractuar = !pausado
                    || b.estado === 'pendiente_adquisicion'
                    || b.estado === 'pendiente_retiro';
                  return (
                    <button
                      key={b.numero}
                      disabled={!puedeInteractuar}
                      onClick={() => {
                        if (!puedeInteractuar) return;
                        if (b.estado === 'asignado')              setAccion({ tipo: 'retirar',      numero: b.numero });
                        if (b.estado === 'pendiente_adquisicion') setAccion({ tipo: 'cancelar_adq', numero: b.numero, solicitudId: b.solicitud_id });
                        if (b.estado === 'pendiente_retiro')      setAccion({ tipo: 'cancelar_ret', numero: b.numero, solicitudId: b.solicitud_id });
                      }}
                      className="rounded-sm py-3 flex flex-col items-center transition-all border"
                      style={{
                        background: s.bg,
                        borderColor: s.border + '55',
                        opacity: puedeInteractuar ? 1 : 0.4,
                        cursor: puedeInteractuar ? 'pointer' : 'default',
                      }}
                    >
                      <span
                        className="text-2xl font-bold font-mono leading-none"
                        style={{ color: s.border, textShadow: `0 0 14px ${s.border}55` }}
                      >
                        {String(b.numero).padStart(3, '0')}
                      </span>
                      <span
                        className="text-[7px] tracking-widest mt-2 flex items-center gap-1 opacity-70"
                        style={{ color: s.border }}
                      >
                        {b.estado !== 'asignado' && <Clock size={7} />}
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[10px] tracking-widest" style={{ color: acentoDim }}>AÚN NO TIENES NÚMEROS EN ESTE BONO</p>
          )}

          {/* Disponibles: preview + expansión */}
          {!pausado && sorteoData.disponibles.length > 0 && (
            <div>
              <p className="text-[8px] tracking-[3px] mb-3" style={{ color: acentoDim }}>
                NÚMEROS DISPONIBLES{' '}
                <span style={{ color: acento }}>({sorteoData.disponibles.length})</span>
              </p>

              {/* Preview: primeros 7 + botón ver todos */}
              {!verDisponibles && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sorteoData.disponibles.slice(0, 7).map(({ numero }) => (
                    <button
                      key={numero}
                      onClick={() => setModal(numero)}
                      className="font-mono px-3 py-2 rounded-sm text-sm font-bold transition-all"
                      style={{
                        background: bgNum,
                        border: `1px solid ${borderNum}`,
                        color: acento,
                        boxShadow: `0 0 8px ${shadowNum}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = bgNumHover; e.currentTarget.style.borderColor = borderNumHover; e.currentTarget.style.boxShadow = `0 0 14px ${shadowNumHover}`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = bgNum; e.currentTarget.style.borderColor = borderNum; e.currentTarget.style.boxShadow = `0 0 8px ${shadowNum}`; }}
                    >
                      {String(numero).padStart(3, '0')}
                    </button>
                  ))}
                  {sorteoData.disponibles.length > 7 && (
                    <button
                      onClick={() => setVerDisponibles(true)}
                      className="font-mono px-3 py-2 rounded-sm text-[10px] tracking-widest transition-all"
                      style={{
                        background: `${acento}0d`,
                        border: `1px dashed ${borderNum}`,
                        color: acentoDim,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = acento; e.currentTarget.style.borderColor = borderNumHover; }}
                      onMouseLeave={e => { e.currentTarget.style.color = acentoDim; e.currentTarget.style.borderColor = borderNum; }}
                    >
                      +{sorteoData.disponibles.length - 7} MÁS
                    </button>
                  )}
                </div>
              )}

              {/* Grid completo expandido */}
              <AnimatePresence initial={false}>
                {verDisponibles && (
                  <motion.div
                    key="disponibles"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                      {sorteoData.disponibles.map(({ numero }) => (
                        <button
                          key={numero}
                          onClick={() => setModal(numero)}
                          className="font-mono py-2 rounded-sm text-xs font-bold transition-colors"
                          style={{ background: bgGrid, border: `1px solid ${borderGrid}`, color: acento }}
                          onMouseEnter={e => { e.currentTarget.style.background = bgNumHover; e.currentTarget.style.borderColor = borderGridHover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = bgGrid; e.currentTarget.style.borderColor = borderGrid; }}
                        >
                          {String(numero).padStart(3, '0')}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setVerDisponibles(false)}
                      className="mt-3 flex items-center gap-1.5 text-[9px] tracking-[2px] transition-colors"
                      style={{ color: acentoDim }}
                      onMouseEnter={e => { e.currentTarget.style.color = acento; }}
                      onMouseLeave={e => { e.currentTarget.style.color = acentoDim; }}
                    >
                      <ChevronDown size={11} style={{ transform: 'rotate(180deg)' }} />
                      OCULTAR
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Sin bonos disponibles */}
          {!pausado && sorteoData.disponibles.length === 0 && (
            <div className="mt-4 p-4 rounded-sm" style={{ background: bgVacia, border: `1px dashed ${borderVacia}` }}>
              <p className="text-[10px] tracking-[2px] leading-relaxed text-center" style={{ color: acentoDim }}>
                TODOS LOS BONOS SE HAN VENDIDO — TE AVISAREMOS CUANDO HAYA NUEVOS DISPONIBLES
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Modal solicitar */}
      {modal !== null && (
        <ModalSW
          titulo={<>SOLICITAR{' '}<span style={{ color: acento, textShadow: `0 0 10px ${acento}66` }}>#{String(modal).padStart(3, '0')}</span></>}
          onClose={() => setModal(null)}
        >
          <p className="text-[#6aacbc] text-sm leading-relaxed mb-6">
            El número quedará bloqueado mientras un empleado aprueba tu solicitud.
          </p>
          <div className="flex gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setModal(null)}>CANCELAR</Btn>
            <Btn onClick={() => solicitar(modal)} loading={procesando} icon={<CheckCircle size={13} />}>CONFIRMAR</Btn>
          </div>
        </ModalSW>
      )}

      {/* Modal acción sobre mis boletos */}
      {accion && (
        <ModalSW
          titulo={<>NÚMERO{' '}<span style={{ color: acento, textShadow: `0 0 10px ${acento}66` }}>#{String(accion.numero).padStart(3, '0')}</span></>}
          onClose={() => setAccion(null)}
        >
          {accion.tipo === 'retirar' && (
            <>
              <p className="text-[#a0d4e0] text-sm leading-relaxed mb-6">
                ¿Quieres solicitar el retiro de este número? Un empleado deberá aprobarlo.
              </p>
              <div className="flex gap-2 justify-end">
                <Btn variant="ghost" onClick={() => setAccion(null)}>CANCELAR</Btn>
                <Btn variant="danger" onClick={() => solicitarRetiro(accion.numero)} loading={procesando} icon={<X size={13} />}>SOLICITAR RETIRO</Btn>
              </div>
            </>
          )}
          {(accion.tipo === 'cancelar_adq' || accion.tipo === 'cancelar_ret') && (
            <>
              <p className="text-[#a0d4e0] text-sm mb-2">
                {accion.tipo === 'cancelar_adq' ? 'Solicitud de adquisición pendiente.' : 'Solicitud de retiro pendiente.'}
              </p>
              <p className="text-[#6aacbc] text-sm mb-6">¿Quieres cancelar esta solicitud?</p>
              <div className="flex gap-2 justify-end">
                <Btn variant="ghost" onClick={() => setAccion(null)}>CERRAR</Btn>
                <Btn variant="danger" onClick={() => cancelar(accion.solicitudId)} loading={procesando} icon={<X size={13} />}>CANCELAR SOLICITUD</Btn>
              </div>
            </>
          )}
        </ModalSW>
      )}
    </>
  );
};

// ── Ganadores ─────────────────────────────────────────────────────────────────

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .toUpperCase();
};

// ── Descuentos ────────────────────────────────────────────────────────────────

const CreditoCard = ({ d, color }) => {
  const pagado   = d.valor_obligacion != null && d.saldo_credito != null
    ? Math.max(0, Number(d.valor_obligacion) - Number(d.saldo_credito))
    : null;
  const pct      = pagado != null && Number(d.valor_obligacion) > 0
    ? Math.min(100, (pagado / Number(d.valor_obligacion)) * 100)
    : null;

  return (
    <div className="p-4" style={{ background: '#05080f', borderBottom: `1px solid ${color}12` }}>

      {/* Encabezado: nombre + cuota */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-[#a0d4e0] leading-snug tracking-wide">{d.nombre_linea}</p>
        <div className="text-right shrink-0">
          <p className="text-xl font-black font-mono" style={{ color }}>{fmtCOP(d.valor)}</p>
          <p className="text-[9px] tracking-[2px] text-[#6aacbc] mt-0.5">CUOTA MENSUAL</p>
        </div>
      </div>

      {/* Barra de progreso */}
      {pct != null && (
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs tracking-[1.5px] text-[#34d399] font-bold">
              {pct.toFixed(0)}% pagado
            </span>
            <span className="text-xs tracking-[1px] text-[#6aacbc]">
              {(100 - pct).toFixed(0)}% pendiente
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: pct >= 75
                  ? 'linear-gradient(to right, #059669, #34d399)'
                  : pct >= 40
                    ? 'linear-gradient(to right, #0ea5e9, #6ee7b7)'
                    : 'linear-gradient(to right, #818cf8, #a5b4fc)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
        {d.valor_obligacion != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">OBLIGACIÓN</p>
            <p className="text-base font-bold font-mono text-[#a0d4e0]">{fmtCOP(d.valor_obligacion)}</p>
          </div>
        )}
        {pagado != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">PAGADO</p>
            <p className="text-base font-bold font-mono text-[#34d399]">{fmtCOP(pagado)}</p>
          </div>
        )}
        {d.saldo_credito != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">SALDO PENDIENTE</p>
            <p
              className="text-base font-bold font-mono"
              style={{ color: Number(d.saldo_credito) > 0 ? '#f87171' : '#34d399' }}
            >
              {fmtCOP(d.saldo_credito)}
            </p>
          </div>
        )}
        {d.num_cuotas != null && (
          <div>
            <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-1">N.° DE CUOTAS</p>
            <p className="text-base font-bold font-mono text-[#a0d4e0]">{d.num_cuotas}</p>
          </div>
        )}
      </div>

      {/* Pie: tasa + vencimiento */}
      {(d.tasa_interes != null || d.fecha_vencimiento) && (
        <div
          className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3"
          style={{ borderTop: `1px solid ${color}10` }}
        >
          {d.tasa_interes != null && (
            <span className="text-xs text-[#6aacbc]">
              Tasa&nbsp;
              <span className="text-[#a0d4e0] font-mono font-semibold">
                {Number(d.tasa_interes).toFixed(2)}%
              </span>
              &nbsp;M.V.
            </span>
          )}
          {d.fecha_vencimiento && (
            <span className="text-xs text-[#6aacbc]">
              Vence&nbsp;
              <span className="text-[#a0d4e0] font-mono font-semibold">{fmtFecha(d.fecha_vencimiento)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const GRUPOS_DESCUENTOS = [
  {
    key: 'seguros', label: 'SEGUROS Y PÓLIZAS', icon: ShieldCheck, color: '#34d399',
    lineas: new Set([4,5,10,11,12,13,16,18,19,23,24,1007,1011,1012,1018,1019,1027,1032,1033,1034,1040,1041]),
  },
  {
    key: 'creditos', label: 'CRÉDITOS Y PRÉSTAMOS', icon: CreditCard, color: '#818cf8',
    lineas: new Set([1002,1003,1004,1005,1006,1008,1009,1010,1013,1015,1016,1021,1023,1025,1028,1029,1030,1036,1039]),
  },
  {
    key: 'bienestar', label: 'SERVICIOS DE BIENESTAR', icon: Heart, color: '#f472b6',
    lineas: new Set([17,20,22,1014]),
  },
  {
    key: 'otros', label: 'OTROS DESCUENTOS', icon: LayoutList, color: '#fb923c',
    lineas: new Set([3,14,21,1017,1020,1024,1031,1035]),
  },
];

const fmtCOP = (v) => `$${Number(v).toLocaleString('es-CO')}`;

// ── Helpers de período ────────────────────────────────────────────────────────

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

// Devuelve 'activa' | 'antes' | 'despues' | null (sin datos suficientes)
const estadoLineaEnMes = (d, periodoYYYYMM) => {
  if (!d.fecha_pri_descuento) return null;
  const [ty, tm] = periodoYYYYMM.split('-').map(Number);
  const target    = new Date(ty, tm - 1, 1);
  const inicio    = new Date(d.fecha_pri_descuento);
  const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  if (target < inicioMes) return 'antes';
  // Si tiene fecha_vencimiento, usarla como límite superior
  if (d.fecha_vencimiento) {
    const venc    = new Date(d.fecha_vencimiento);
    const vencMes = new Date(venc.getFullYear(), venc.getMonth(), 1);
    if (target > vencMes) return 'despues';
  }
  return 'activa';
};

const useDescuentos = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.get('/asociados/descuentos')
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  const total = items.reduce((s, d) => s + Number(d.valor ?? 0), 0);
  return { items, loading, total };
};

const DescuentosSection = ({ items, loading }) => {
  const [abierto, setAbierto] = useState(null);
  const [periodo, setPeriodo] = useState(hoyPeriodo);
  const hoy    = hoyPeriodo();
  const esHoy  = periodo === hoy;

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={18} className="animate-spin text-[#6aacbc]" />
    </div>
  );

  if (items.length === 0) return (
    <p className="text-[#6aacbc] text-[10px] tracking-[3px] text-center py-6">
      SIN DESCUENTOS REGISTRADOS — SINCRONIZA EL PADRÓN PARA VER TUS SERVICIOS
    </p>
  );

  const itemsConEstado = items.map((d) => ({ ...d, _estado: estadoLineaEnMes(d, periodo) }));
  const totalPeriodo = itemsConEstado
    .filter((d) => d._estado !== 'antes' && d._estado !== 'despues')
    .reduce((s, d) => s + Number(d.valor ?? 0), 0);

  return (
    <div className="space-y-2">

      {/* Selector de período */}
      <div className="flex items-center justify-between mb-1 px-1">
        <button
          onClick={() => setPeriodo((p) => shiftMes(p, -1))}
          className="p-1 text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="text-center">
          <input
            type="month"
            value={periodo}
            max={hoy}
            onChange={(e) => e.target.value && setPeriodo(e.target.value)}
            className="bg-transparent border-0 text-xs font-semibold text-[#a0d4e0] text-center cursor-pointer outline-none"
            style={{ colorScheme: 'dark' }}
          />
          {!esHoy && (
            <button
              onClick={() => setPeriodo(hoy)}
              className="block w-full text-[9px] text-[#6aacbc] hover:text-[#10b981] tracking-widest transition-colors"
            >
              IR AL MES ACTUAL
            </button>
          )}
        </div>
        <button
          onClick={() => setPeriodo((p) => shiftMes(p, 1))}
          disabled={periodo >= hoy}
          className="p-1 text-[#6aacbc] hover:text-[#a0d4e0] transition-colors disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Total del período */}
      <div className="flex items-baseline justify-between px-1 mb-3">
        <p className="text-[8px] tracking-[3px] text-[#6aacbc]">
          {esHoy ? 'TOTAL DESCUENTOS' : 'ESTIMADO PARA ESTE MES'}
        </p>
        <p className="text-base font-black font-mono text-[#a0d4e0]">{fmtCOP(totalPeriodo)}</p>
      </div>

      {GRUPOS_DESCUENTOS.map((grupo) => {
        const filas = itemsConEstado.filter((d) => grupo.lineas.has(d.linea_id));
        if (filas.length === 0) return null;
        const filasActivas = filas.filter((d) => d._estado !== 'antes' && d._estado !== 'despues');
        const totalGrupo   = filasActivas.reduce((s, d) => s + Number(d.valor ?? 0), 0);
        const tieneActivas = filasActivas.length > 0;
        const abiertaEsta  = abierto === grupo.key;
        const Icon = grupo.icon;
        const clr  = tieneActivas ? grupo.color : '#4a5568';

        return (
          <div key={grupo.key} className="rounded-sm overflow-hidden" style={{ border: `1px solid ${clr}22` }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 transition-colors"
              style={{ background: abiertaEsta ? `${clr}10` : '#08101e' }}
              onClick={() => setAbierto(abiertaEsta ? null : grupo.key)}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={13} style={{ color: clr }} />
                <span className="text-[9px] font-bold tracking-[2px]" style={{ color: clr }}>
                  {grupo.label}
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono" style={{ background: `${clr}18`, color: clr }}>
                  {filasActivas.length}/{filas.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black font-mono" style={{ color: clr }}>{fmtCOP(totalGrupo)}</span>
                <ChevronDown size={12} style={{ color: clr, transform: abiertaEsta ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {abiertaEsta && (
                <motion.div
                  key="detalle"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div style={{ borderTop: `1px solid ${grupo.color}12` }}>
                    {filas.map((d) => {
                      const inactiva = d._estado === 'antes' || d._estado === 'despues';
                      if (grupo.key === 'creditos') {
                        if (inactiva) return (
                          <div key={d.linea_id} className="flex items-center justify-between px-4 py-2.5 opacity-35"
                            style={{ background: '#05080f', borderBottom: `1px solid ${grupo.color}08` }}>
                            <p className="text-[9px] tracking-wider text-[#6aacbc] truncate pr-4">{d.nombre_linea}</p>
                            <p className="text-[9px] tracking-widest text-[#4a5568]">
                              {d._estado === 'antes' ? 'AÚN NO INICIADO' : 'YA CANCELADO'}
                            </p>
                          </div>
                        );
                        return <CreditoCard key={d.linea_id} d={d} color={grupo.color} />;
                      }
                      return (
                        <div key={d.linea_id} className={`flex items-center justify-between px-4 py-2.5 ${inactiva ? 'opacity-35' : ''}`}
                          style={{ background: '#05080f', borderBottom: `1px solid ${grupo.color}08` }}>
                          <div className="flex items-center gap-2 min-w-0 pr-4">
                            <p className="text-[9px] tracking-wider text-[#6aacbc] truncate">{d.nombre_linea}</p>
                            {!esHoy && !inactiva && (
                              <span className="text-[7px] px-1 py-0.5 rounded-sm tracking-widest shrink-0"
                                style={{ background: `${grupo.color}15`, color: grupo.color }}>APROX.</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold font-mono shrink-0" style={{ color: inactiva ? '#4a5568' : grupo.color }}>
                            {inactiva ? (d._estado === 'antes' ? 'AÚN NO' : 'CANCELADO') : fmtCOP(d.valor)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

const GanadoresSection = () => {
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get('/sorteos/portal/ganadores')
      .then(({ data }) => setGanadores(Array.isArray(data) ? data : []))
      .catch(() => setGanadores([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={18} className="animate-spin text-[#6aacbc]" />
    </div>
  );

  if (ganadores.length === 0) return (
    <div className="text-center py-8">
      <Trophy size={32} className="mx-auto mb-3 opacity-10" style={{ color: '#ffb700' }} />
      <p className="text-[#6aacbc] text-xs tracking-[3px]">SIN GANADORES REGISTRADOS AÚN</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {ganadores.map((g, i) => (
        <div
          key={i}
          className="border border-[#ffb70022] bg-[#ffb70006] rounded-sm p-3 sm:p-3.5 flex items-start sm:items-center gap-3"
        >
          <p className="text-[#ffb700] font-bold font-mono text-xl leading-none shrink-0" style={{ textShadow: '0 0 10px #ffb70044' }}>
            #{String(g.numero).padStart(3, '0')}
          </p>
          <div className="flex-1 min-w-0">
            <p className="text-[#a0d4e0] font-semibold text-sm truncate">{g.nombre_completo ?? '—'}</p>
            {g.empresa && <p className="text-[#e2e8f0] text-xs truncate">{g.empresa}</p>}
            <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">{g.sorteo_nombre}</p>
            <span className="sm:hidden text-[8px] border border-[#ffb70033] text-[#ffb700] px-1.5 py-0.5 tracking-wider mt-1 inline-block">
              {formatMes(g.mes_premiacion)}
            </span>
          </div>
          <span className="hidden sm:inline text-[9px] border border-[#ffb70033] text-[#ffb700] px-2 py-0.5 tracking-widest whitespace-nowrap shrink-0">
            {formatMes(g.mes_premiacion)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Seguridad ─────────────────────────────────────────────────────────────────

const SeguridadSection = () => {
  const [form, setForm]       = useState({ actual: '', nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/password', { password_actual: form.actual, password_nueva: form.nueva });
      toast.success('Contraseña actualizada');
      setForm({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { label: 'Contraseña actual',    key: 'actual' },
        { label: 'Nueva contraseña',     key: 'nueva',     min: 8, placeholder: 'Mínimo 8 caracteres' },
        { label: 'Confirmar contraseña', key: 'confirmar', min: 8 },
      ].map(({ label, key, min, placeholder }) => (
        <div key={key}>
          <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">{label}</label>
          <input
            type="password"
            value={form[key]}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            minLength={min}
            required
            placeholder={placeholder ?? ''}
            className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono placeholder-[#6aacbc]"
          />
        </div>
      ))}
      <div className="flex justify-end pt-1">
        <Btn type="submit" loading={loading}>
          {loading ? 'GUARDANDO...' : 'ACTUALIZAR CONTRASEÑA'}
        </Btn>
      </div>
    </form>
  );
};

// ── Pantalla de primer login ──────────────────────────────────────────────────

const PrimerLogin = ({ asociado, onDone }) => {
  const [paso, setPaso]       = useState('terminos'); // 'terminos' | 'password'
  const [form, setForm]       = useState({ inicial: '', nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const aceptarTerminos = async () => {
    setLoading(true);
    try {
      await apiService.post('/asociados/aceptar-terminos');
      setPaso('password');
    } catch (_) {
      toast.error('No fue posible registrar la aceptación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    if (form.nueva.length < 8) { toast.error('La nueva contraseña debe tener mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/password', { password_actual: form.inicial, password_nueva: form.nueva });
      toast.success('Contraseña creada correctamente');
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear contraseña');
    } finally { setLoading(false); }
  };

  const campo = (key, label, placeholder = '') => (
    <div>
      <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">{label}</label>
      <input
        type="password"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required
        placeholder={placeholder}
        className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
      />
    </div>
  );

  const cornerDecor = (
    <>
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff55]" />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff55]" />
    </>
  );

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex items-center justify-center px-4 py-10 relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }}
      />

      {paso === 'terminos' && (
        <div className="w-full max-w-sm relative z-[2]">
          <div className="mb-8">
            <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// PRIMER ACCESO</p>
            <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">
              BIENVENIDO, {asociado.nombre.toUpperCase()}
            </h1>
          </div>
          <div
            className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-6 relative"
            style={{ boxShadow: '0 0 40px #00e5ff08' }}
          >
            {cornerDecor}
            <p className="text-[#6aacbc] text-[9px] tracking-[3px] uppercase mb-4">
              Antes de continuar, ten en cuenta:
            </p>
            <ul className="space-y-3 mb-6">
              {[
                'Al afiliarte a la cooperativa firmaste la autorización de tratamiento de tus datos personales.',
                'Este portal te permite consultar tu información y gestionar tu participación en sorteos.',
                'Tus credenciales son personales — no las compartas con nadie.',
                'La información mostrada proviene del sistema de administración de la cooperativa.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-[#00e5ff55] mt-0.5 shrink-0">—</span>
                  <span className="text-[#a0d4e0] text-xs leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[#6aacbc] text-[9px] leading-relaxed mb-5">
              Puedes consultar en cualquier momento la{' '}
              <Link to="/portal/politica-privacidad" target="_blank" className="text-[#00e5ff] hover:underline">
                Política de Privacidad
              </Link>
              {' '}y los{' '}
              <Link to="/portal/terminos-condiciones" target="_blank" className="text-[#00e5ff] hover:underline">
                Términos y Condiciones
              </Link>
              {' '}del portal.
            </p>
            <button
              onClick={aceptarTerminos}
              disabled={loading}
              className="w-full py-2.5 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] disabled:opacity-40 text-[#00e5ff] text-[10px] tracking-[3px] rounded-sm transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              ENTENDIDO, CONTINUAR
            </button>
          </div>
        </div>
      )}

      {paso === 'password' && (
        <div className="w-full max-w-sm relative z-[2]">
          <div className="mb-8">
            <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// CREAR CONTRASEÑA PERSONAL</p>
            <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">
              {asociado.nombre.toUpperCase()}
            </h1>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">
              Ingresa la contraseña inicial que te entregó la cooperativa y crea una nueva contraseña personal.
            </p>
          </div>
          <div
            className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-6 relative"
            style={{ boxShadow: '0 0 40px #00e5ff08' }}
          >
            {cornerDecor}
            <form onSubmit={handleSubmit} className="space-y-5">
              {campo('inicial',   'Contraseña inicial (entregada por la cooperativa)', '••••••••••')}
              {campo('nueva',     'Nueva contraseña', 'Mínimo 8 caracteres')}
              {campo('confirmar', 'Confirmar nueva contraseña')}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] disabled:opacity-40 text-[#00e5ff] text-[10px] tracking-[3px] rounded-sm transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                {loading ? 'GUARDANDO...' : 'CREAR CONTRASEÑA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Modal: registrar email ────────────────────────────────────────────────────

const ModalEmail = ({ onGuardado, onDespues }) => {
  const [form, setForm]       = useState({ email: '', emailConfirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.email !== form.emailConfirm) { toast.error('Los correos no coinciden'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/email', { email: form.email.trim().toLowerCase(), emailConfirm: form.emailConfirm.trim().toLowerCase() });
      toast.success('Correo registrado correctamente');
      await onGuardado();
    } catch (err) {
      toast.error(err.response?.status === 409
        ? 'Ese correo ya está registrado en otro asociado'
        : 'No se pudo guardar el correo. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 40px #00e5ff11' }}
      >
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff55]" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff55]" />

        <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-1">// COMPLETA TU PERFIL</p>
        <h3 className="text-[#a0d4e0] font-bold text-base tracking-wider mb-2">Registra tu correo</h3>
        <p className="text-[#6aacbc] text-xs leading-relaxed mb-5">
          Necesitamos tu correo electrónico para enviarte notificaciones importantes y recuperar el acceso si lo pierdes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Correo electrónico</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              required
              className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono placeholder-[#6aacbc]"
            />
          </div>
          <div>
            <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Confirmar correo</label>
            <input
              type="email"
              autoComplete="email"
              value={form.emailConfirm}
              onChange={(e) => setForm(f => ({ ...f, emailConfirm: e.target.value }))}
              placeholder="correo@ejemplo.com"
              required
              className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono placeholder-[#6aacbc]"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onDespues}
              className="px-4 py-2 text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest transition-colors"
            >
              DESPUÉS
            </button>
            <Btn type="submit" loading={loading}>
              {loading ? 'GUARDANDO...' : 'GUARDAR'}
            </Btn>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const MisDatos = () => {
  const { asociado, logout, refreshMe } = useAsociado();
  const [sorteosData, setSorteosData]     = useState([]);
  const [sorteoLoading, setSorteoLoading] = useState(true);
  const [emailDismissed, setEmailDismissed] = useState(false);
  const { items: descItems, loading: descLoading, total: descTotal } = useDescuentos();

  const cargarSorteo = useCallback(() => {
    setSorteoLoading(true);
    apiService.get('/sorteos/portal/activo')
      .then(({ data }) => setSorteosData(data.sorteos ?? []))
      .catch(() => setSorteosData([]))
      .finally(() => setSorteoLoading(false));
  }, []);

  useEffect(() => { cargarSorteo(); }, [cargarSorteo]);

  if (!asociado) return null;
  if (asociado.primer_login) return <PrimerLogin asociado={asociado} onDone={refreshMe} />;

  const saldo      = asociado.saldo_aporte != null ? Number(asociado.saldo_aporte) : null;
  const antiguedad = calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso);
  const edad       = calcEdad(asociado.fecha_nacimiento);

  const mostrarModalEmail = !asociado.email && !emailDismissed;

  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }}
      />

      {mostrarModalEmail && (
        <ModalEmail
          onGuardado={refreshMe}
          onDespues={() => setEmailDismissed(true)}
        />
      )}

      <div className="relative z-[2] max-w-2xl mx-auto px-3 sm:px-5 py-6 sm:py-8 space-y-4">

        {/* ── Hero: identidad + datos clave ── */}
        <div className="bg-[#08101e] border border-[#00e5ff15] rounded-sm overflow-hidden">

          {/* Barra superior: nombre + acciones */}
          <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-5 pb-4 border-b border-[#00e5ff08]">
            <div className="min-w-0">
              <p className="text-[#6aacbc] text-[7px] tracking-[4px] mb-1.5">
                // PORTAL DEL ASOCIADO · COOPERATIVA PROGRESEMOS
              </p>
              <h1 className="text-lg font-bold text-[#a0d4e0] tracking-wider leading-snug">
                {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()}
              </h1>
              <p className="text-[#6aacbc] text-[9px] tracking-widest mt-1">CC {asociado.codigo}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 mt-1">
              <NotificationBell openUp={false} alignRight />
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-colors tracking-widest"
              >
                <LogOut size={12} /> SALIR
              </button>
            </div>
          </div>

          {/* Datos de contacto e identidad */}
          <div className="px-4 sm:px-5 pt-3 pb-1">
            <FilaDato label="Empresa"    valor={asociado.nombre_empresa} />
            <FilaDato label="Teléfono"   valor={asociado.movil} />
            <FilaDato label="Dirección"  valor={asociado.direccion} />
            <FilaDato label="Ciudad"     valor={asociado.ciudad} />
          </div>

          {/* Mini cards: métricas clave */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 px-4 sm:px-5 py-3">
            <MiniCard
              icon={CalendarDays}
              label="Antigüedad"
              value={antiguedad ?? '—'}
              sub={asociado.fecha_ingreso ? `desde ${fmtFecha(asociado.fecha_ingreso)}` : undefined}
              color="#a78bfa"
            />
            <MiniCard
              icon={Banknote}
              label="Cuota"
              value={asociado.valor_aporte != null ? fmtMoney(asociado.valor_aporte) : '—'}
              sub={labelClaseCuota(asociado.clase_cuota) ?? undefined}
              color="#00e5ff"
            />
            <MiniCard
              icon={Wallet}
              label="Saldo de aporte"
              value={saldo != null ? fmtMoney(Math.abs(saldo)) : '—'}
              sub={saldo != null ? (saldo < 0 ? 'A TU FAVOR' : saldo > 0 ? 'PENDIENTE' : 'AL DÍA') : undefined}
              color={saldo == null ? '#6aacbc' : saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#6aacbc'}
            />
          </div>

          {/* Total mensual */}
          {(asociado.valor_aporte > 0 || descTotal > 0) && (
            <div
              className="flex items-center justify-between px-4 sm:px-5 py-3 mt-1"
              style={{ borderTop: '1px solid #00e5ff0c', background: '#00e5ff04' }}
            >
              <div>
                <p className="text-xs tracking-[2px] text-[#6aacbc] mb-0.5">TOTAL DESCONTADO MENSUALMENTE</p>
                {!descLoading && descTotal > 0 && asociado.valor_aporte > 0 && (
                  <p className="text-xs text-[#6aacbc]">
                    aporte {fmtMoney(asociado.valor_aporte)} · otros descuentos {fmtCOP(descTotal)}
                  </p>
                )}
              </div>
              <p className="text-2xl font-black font-mono text-[#10b981]">
                {fmtCOP(Number(asociado.valor_aporte ?? 0) + (descLoading ? 0 : descTotal))}
              </p>
            </div>
          )}
        </div>

        {/* ── Frase del día ── */}
        <div
          className="rounded-sm px-5 py-3.5 text-center relative overflow-hidden"
          style={{ background: '#00e5ff05', border: '1px solid #00e5ff0f' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, #00e5ff08 0%, transparent 70%)' }}
          />
          <p className="text-[#6aacbc] text-[8px] tracking-[3px] uppercase mb-1.5">// MENSAJE DEL DÍA</p>
          <p className="text-[#a0d4e0cc] text-[11px] tracking-wide italic">"{fraseDelDia()}"</p>
        </div>

        {/* ── Mis descuentos ── */}
        <Seccion
          titulo="Mis Descuentos"
          icon={LayoutList}
          color="#a0d4e0"
          badge={!descLoading && descTotal > 0 ? fmtCOP(descTotal) : undefined}
        >
          <DescuentosSection items={descItems} loading={descLoading} />
        </Seccion>

        {/* ── Sorteos activos ── */}
        {sorteoLoading || sorteosData.length === 0
          ? <SorteoCard sorteoData={null} sorteoLoading={sorteoLoading} onRefresh={cargarSorteo} asociado={asociado} />
          : sorteosData.map((item) => (
              <SorteoCard
                key={item.sorteo.id}
                sorteoData={item}
                sorteoLoading={false}
                onRefresh={cargarSorteo}
                asociado={asociado}
              />
            ))
        }

        {/* ── Ganadores ── */}
        <Seccion titulo="Ganadores" icon={Trophy} color="#ffb700">
          <GanadoresSection />
        </Seccion>

        {/* ── Seguridad ── */}
        <Seccion titulo="Seguridad · Cambiar contraseña" icon={Lock} color="#a78bfa">
          <SeguridadSection />
        </Seccion>

        {/* ── Footer legal ── */}
        <div className="pt-2 pb-4 text-center space-x-4">
          <Link
            to="/portal/politica-privacidad"
            className="text-[#6aacbc] hover:text-[#a0d4e0] text-[8px] tracking-[2px] transition-colors"
          >
            POLÍTICA DE PRIVACIDAD
          </Link>
          <span className="text-[#00e5ff22] text-[8px]">·</span>
          <Link
            to="/portal/terminos-condiciones"
            className="text-[#6aacbc] hover:text-[#a0d4e0] text-[8px] tracking-[2px] transition-colors"
          >
            TÉRMINOS Y CONDICIONES
          </Link>
        </div>

      </div>
    </div>
  );
};

const MisDatosWithNotifications = () => (
  <NotificationProvider endpoint="/asociados/notificaciones">
    <MisDatos />
  </NotificationProvider>
);

export default MisDatosWithNotifications;
