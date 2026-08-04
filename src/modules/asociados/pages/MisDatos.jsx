import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Ticket, X, Loader2, CheckCircle,
  Clock, PauseCircle, Trophy, Lock, ChevronDown,
  Banknote, CalendarDays, Wallet,
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

const Seccion = ({ titulo, icon: Icon, color = '#00e5ff', defaultOpen = false, children }) => {
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
        <ChevronDown
          size={13}
          className="transition-transform duration-200"
          style={{ color: color + '55', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
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
      <p className="text-[#6aacbc] text-xs tracking-[3px]">SIN SORTEO ACTIVO PARA TU EMPRESA</p>
    </div>
  );

  const pausado = sorteoData.sorteo.estado === 'pausado';
  const activos = sorteoData.mis_boletos.filter(b => b.estado === 'asignado').length;

  return (
    <>
      <div className="bg-[#08101e] border border-[#00e5ff15] rounded-sm overflow-hidden">

        {/* Cabecera del sorteo */}
        <div className="px-4 sm:px-5 py-4 border-b border-[#00e5ff08]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] tracking-[3px] mb-1" style={{ color: pausado ? '#997a00' : '#6aacbc' }}>
                {pausado ? 'SORTEO PAUSADO' : 'SORTEO ACTIVO'}
              </p>
              <p className="text-[#a0d4e0] font-bold text-base tracking-wide leading-snug">
                {sorteoData.sorteo.nombre.toUpperCase()}
              </p>
              {asociado?.clase_cuota && (
                <p className="text-[9px] tracking-wider mt-1.5" style={{ color: '#ffb70077' }}>
                  VALOR POR BONO:{' '}
                  <span className="font-bold" style={{ color: '#ffb700' }}>
                    {asociado.clase_cuota === '1' ? '$1.500 QUINCENAL' : '$3.000 MENSUAL'}
                  </span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-1">MIS BONOS</p>
              <p
                className="text-4xl font-bold font-mono leading-none"
                style={{ color: '#00e5ff', textShadow: '0 0 20px #00e5ff44' }}
              >
                {activos}
              </p>
            </div>
          </div>
        </div>

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
              <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">
                MIS NÚMEROS{' '}
                <span style={{ color: '#00e5ff' }}>({sorteoData.mis_boletos.length})</span>
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
            <p className="text-[#6aacbc] text-[10px] tracking-widest">AÚN NO TIENES NÚMEROS EN ESTE SORTEO</p>
          )}

          {/* Disponibles: preview + expansión */}
          {!pausado && sorteoData.disponibles.length > 0 && (
            <div>
              <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">
                NÚMEROS DISPONIBLES{' '}
                <span style={{ color: '#00e5ff' }}>({sorteoData.disponibles.length})</span>
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
                        background: '#003d4466',
                        border: '1px solid #00e5ff44',
                        color: '#00e5ff',
                        boxShadow: '0 0 8px #00e5ff18',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#00e5ff22'; e.currentTarget.style.borderColor = '#00e5ff88'; e.currentTarget.style.boxShadow = '0 0 14px #00e5ff33'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#003d4466'; e.currentTarget.style.borderColor = '#00e5ff44'; e.currentTarget.style.boxShadow = '0 0 8px #00e5ff18'; }}
                    >
                      {String(numero).padStart(3, '0')}
                    </button>
                  ))}
                  {sorteoData.disponibles.length > 7 && (
                    <button
                      onClick={() => setVerDisponibles(true)}
                      className="font-mono px-3 py-2 rounded-sm text-[10px] tracking-widest transition-all"
                      style={{
                        background: '#00e5ff0d',
                        border: '1px dashed #00e5ff44',
                        color: '#6aacbc',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#00e5ff'; e.currentTarget.style.borderColor = '#00e5ff77'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#6aacbc'; e.currentTarget.style.borderColor = '#00e5ff44'; }}
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
                          style={{ background: '#003d4455', border: '1px solid #00e5ff33', color: '#00e5ff' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#00e5ff22'; e.currentTarget.style.borderColor = '#00e5ff66'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#003d4455'; e.currentTarget.style.borderColor = '#00e5ff33'; }}
                        >
                          {String(numero).padStart(3, '0')}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setVerDisponibles(false)}
                      className="mt-3 flex items-center gap-1.5 text-[9px] tracking-[2px] text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
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
            <div className="mt-4 p-4 rounded-sm" style={{ background: '#00e5ff08', border: '1px dashed #00e5ff22' }}>
              <p className="text-[#6aacbc] text-[10px] tracking-[2px] leading-relaxed text-center">
                TODOS LOS BONOS SE HAN VENDIDO — TE AVISAREMOS CUANDO HAYA NUEVOS DISPONIBLES
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Modal solicitar */}
      {modal !== null && (
        <ModalSW
          titulo={<>SOLICITAR{' '}<span style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff66' }}>#{String(modal).padStart(3, '0')}</span></>}
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
          titulo={<>NÚMERO{' '}<span style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff66' }}>#{String(accion.numero).padStart(3, '0')}</span></>}
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

// ── Página principal ──────────────────────────────────────────────────────────

const MisDatos = () => {
  const { asociado, logout, refreshMe } = useAsociado();
  const [sorteoData, setSorteoData]       = useState(null);
  const [sorteoLoading, setSorteoLoading] = useState(true);

  const cargarSorteo = useCallback(() => {
    setSorteoLoading(true);
    apiService.get('/sorteos/portal/activo')
      .then(({ data }) => setSorteoData(data))
      .catch(() => setSorteoData(null))
      .finally(() => setSorteoLoading(false));
  }, []);

  useEffect(() => { cargarSorteo(); }, [cargarSorteo]);

  if (!asociado) return null;
  if (asociado.primer_login) return <PrimerLogin asociado={asociado} onDone={refreshMe} />;

  const saldo      = asociado.saldo_aporte != null ? Number(asociado.saldo_aporte) : null;
  const antiguedad = calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso);
  const edad       = calcEdad(asociado.fecha_nacimiento);

  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }}
      />

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

        {/* ── Sorteo activo ── */}
        <SorteoCard
          sorteoData={sorteoData}
          sorteoLoading={sorteoLoading}
          onRefresh={cargarSorteo}
          asociado={asociado}
        />

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
