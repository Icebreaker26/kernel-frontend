import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, User, Phone, MapPin, Building2, CreditCard,
  Ticket, X, Loader2, CheckCircle, Clock, PauseCircle, Trophy,
  Banknote, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import { labelClaseCuota } from '../../../utils/asociados.js';
import apiService from '../../../services/apiService.js';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

// ── Primitivos SW ─────────────────────────────────────────────────────────────

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

// ── Tab: MIS BONOS ────────────────────────────────────────────────────────────

const MIS_STYLE = {
  asignado:              { border: '#00e5ff', bg: '#003d4433', label: 'ACTIVO' },
  pendiente_adquisicion: { border: '#ffb700', bg: '#2a1a0033', label: 'PENDIENTE' },
  pendiente_retiro:      { border: '#ff3d3d', bg: '#2a080033', label: 'RETIRANDO' },
};

const BonosTab = ({ asociado }) => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [accion, setAccion]         = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/sorteos/portal/activo')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const solicitar = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar', { numero, sorteo_id: data.sorteo.id });
      toast.success(`Solicitud #${String(numero).padStart(3, '0')} enviada`);
      setModal(null); cargar();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al solicitar'); }
    finally { setProcesando(false); }
  };

  const solicitarRetiro = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar-retiro', { numero, sorteo_id: data.sorteo.id });
      toast.success(`Retiro #${String(numero).padStart(3, '0')} solicitado`);
      setAccion(null); cargar();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al solicitar retiro'); }
    finally { setProcesando(false); }
  };

  const cancelar = async (solicitudId) => {
    setProcesando(true);
    try {
      await apiService.delete(`/sorteos/portal/solicitudes/${solicitudId}`);
      toast.success('Solicitud cancelada');
      setAccion(null); cargar();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al cancelar'); }
    finally { setProcesando(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={22} className="animate-spin text-[#6aacbc]" />
    </div>
  );

  if (!data?.sorteo) return (
    <div className="text-center py-24">
      <Ticket size={44} className="mx-auto mb-5 opacity-15" style={{ color: '#00e5ff' }} />
      <p className="text-[#6aacbc] text-sm tracking-[3px]">SIN SORTEO ACTIVO PARA TU EMPRESA</p>
    </div>
  );

  const pausado = data.sorteo.estado === 'pausado';
  const activos = (data.mis_boletos ?? []).filter(b => b.estado === 'asignado').length;

  return (
    <>
      {/* Banner sorteo pausado */}
      {pausado && (
        <div className="flex items-center gap-3 bg-[#1a1000] border border-[#ffb70044] rounded-sm px-4 py-3 mb-6">
          <PauseCircle size={16} className="shrink-0" style={{ color: '#ffb700' }} />
          <div>
            <p className="text-[#ffb700] text-xs font-bold tracking-widest">PLAZO DE COMPRA CERRADO TEMPORALMENTE</p>
            <p className="text-[#997a00] text-[10px] tracking-wider mt-0.5">
              Puedes cancelar solicitudes pendientes. Las compras y retiros se reanudarán pronto.
            </p>
          </div>
        </div>
      )}

      {/* Info sorteo */}
      <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-5 mb-8 relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00e5ff44]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00e5ff44]" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] tracking-[3px] mb-2" style={{ color: pausado ? '#997a00' : '#6aacbc' }}>
              {pausado ? 'SORTEO PAUSADO' : 'SORTEO ACTIVO'}
            </p>
            <p className="text-[#a0d4e0] font-bold text-xl tracking-wider leading-tight">
              {data.sorteo.nombre.toUpperCase()}
            </p>
            {data.sorteo.descripcion && (
              <p className="text-[#6aacbc] text-xs mt-1 tracking-wider">{data.sorteo.descripcion}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-6">
            <p className="text-[#6aacbc] text-[8px] tracking-[2px] mb-1">MIS BONOS ACTIVOS</p>
            <p
              className="text-5xl font-bold font-mono text-[#00e5ff]"
              style={{ textShadow: '0 0 24px #00e5ff55' }}
            >
              {activos}
            </p>
          </div>
        </div>
        {asociado?.clase_cuota && (
          <div className="mt-4 pt-4 border-t border-[#00e5ff08]">
            <p className="text-[#6aacbc] text-[9px] tracking-wider">
              VALOR POR BONO:{' '}
              <span className="text-[#ffb700] font-bold">
                {asociado.clase_cuota === '1' ? '$1.500 QUINCENAL' : '$3.000 MENSUAL'}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Mis números */}
      {data.mis_boletos.length > 0 && (
        <section className="mb-10">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-5">
            MIS NÚMEROS <span className="text-[#00e5ff]">({data.mis_boletos.length})</span>
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {data.mis_boletos.map((b) => {
              const s = MIS_STYLE[b.estado];
              // Pausado: solo se puede cancelar solicitudes pendientes, no solicitar retiro ni compra
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
                  className="rounded-sm py-5 px-2 flex flex-col items-center transition-all border"
                  style={{ background: s.bg, borderColor: s.border + '66', opacity: puedeInteractuar ? 1 : 0.4, cursor: puedeInteractuar ? 'pointer' : 'default' }}
                >
                  <span
                    className="text-4xl font-bold font-mono leading-none"
                    style={{ color: s.border, textShadow: `0 0 18px ${s.border}55` }}
                  >
                    {String(b.numero).padStart(3, '0')}
                  </span>
                  <span
                    className="text-[8px] tracking-widest mt-3 flex items-center gap-1 opacity-80"
                    style={{ color: s.border }}
                  >
                    {b.estado !== 'asignado' && <Clock size={9} />}
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Disponibles — oculto si pausado */}
      {pausado ? null : <section>
        <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-5">
          NÚMEROS DISPONIBLES <span className="text-[#00e5ff]">({data.disponibles.length})</span>
        </p>
        {data.disponibles.length === 0 ? (
          <p className="text-[#6aacbc] text-sm tracking-widest">NO HAY NÚMEROS DISPONIBLES</p>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
            {data.disponibles.map(({ numero }) => (
              <button
                key={numero}
                onClick={() => setModal(numero)}
                className="font-mono py-2.5 rounded-sm text-sm font-bold transition-colors"
                style={{
                  background: '#003d4455',
                  border: '1px solid #00e5ff33',
                  color: '#00e5ff',
                  boxShadow: '0 0 4px #00e5ff11',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#00e5ff22'; e.currentTarget.style.borderColor = '#00e5ff66'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#003d4455'; e.currentTarget.style.borderColor = '#00e5ff33'; }}
              >
                {String(numero).padStart(3, '0')}
              </button>
            ))}
          </div>
        )}
      </section>}

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

// ── Tab: GANADORES ────────────────────────────────────────────────────────────

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .toUpperCase();
};

const GanadoresTab = () => {
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get('/sorteos/portal/ganadores')
      .then(({ data }) => setGanadores(Array.isArray(data) ? data : []))
      .catch(() => setGanadores([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={22} className="animate-spin text-[#6aacbc]" />
    </div>
  );

  if (ganadores.length === 0) return (
    <div className="text-center py-24">
      <Trophy size={44} className="mx-auto mb-5 opacity-15" style={{ color: '#ffb700' }} />
      <p className="text-[#6aacbc] text-sm tracking-[3px]">SIN GANADORES REGISTRADOS AÚN</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {ganadores.map((g, i) => (
        <div
          key={i}
          className="border border-[#ffb70033] bg-[#ffb70008] rounded-sm p-4 flex items-center gap-4"
        >
          <div className="text-center shrink-0">
            <p className="text-[#ffb700] font-bold font-mono text-2xl leading-none" style={{ textShadow: '0 0 10px #ffb70044' }}>
              #{String(g.numero).padStart(3, '0')}
            </p>
            <Trophy size={14} className="mx-auto mt-1.5" style={{ color: '#ffb700', opacity: 0.5 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#a0d4e0] font-semibold text-sm truncate">{g.nombre_completo ?? '—'}</p>
            {g.empresa && (
              <p className="text-[#e2e8f0] text-xs truncate">{g.empresa}</p>
            )}
            <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">{g.sorteo_nombre}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[9px] border border-[#ffb70033] text-[#ffb700] px-2 py-0.5 tracking-widest whitespace-nowrap">
              {formatMes(g.mes_premiacion)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Tab: MIS DATOS ────────────────────────────────────────────────────────────

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

const SeccionPortal = ({ icon: Icon, titulo, children }) => (
  <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[#00e5ff0a]">
      <Icon size={13} className="text-[#00e5ff] opacity-60" />
      <p className="text-[9px] tracking-[3px] uppercase text-[#00e5ff] opacity-70">{titulo}</p>
    </div>
    <div className="px-5 py-3">{children}</div>
  </div>
);

const CampoPortal = ({ label, valor, highlight }) => (
  <div className="flex items-baseline justify-between py-2.5 border-b border-[#00e5ff05] last:border-0">
    <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">{label}</p>
    <p className={`text-[11px] text-right ${highlight ?? 'text-[#a0d4e0]'}`}>
      {valor ?? <span className="text-[#6aacbc] italic text-[10px]">—</span>}
    </p>
  </div>
);

const DatosTab = ({ asociado }) => {
  const edad       = calcEdad(asociado.fecha_nacimiento);
  const antiguedad = calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso);
  const saldo      = asociado.saldo_aporte != null ? Number(asociado.saldo_aporte) : null;

  return (
    <div className="space-y-4">

      <SeccionPortal icon={User} titulo="Datos personales">
        <CampoPortal label="Nombre"    valor={`${asociado.nombre} ${asociado.apellido}`} />
        <CampoPortal label="Cédula"    valor={asociado.codigo} />
        {asociado.fecha_nacimiento && (
          <CampoPortal label="Fecha de nacimiento" valor={fmtFecha(asociado.fecha_nacimiento)} />
        )}
        {edad != null && (
          <CampoPortal label="Edad" valor={`${edad} años`} />
        )}
        <CampoPortal label="Teléfono"  valor={asociado.movil} />
        <CampoPortal label="Dirección" valor={asociado.direccion} />
        <CampoPortal label="Ciudad"    valor={asociado.ciudad} />
      </SeccionPortal>

      <SeccionPortal icon={Building2} titulo="Empresa">
        <CampoPortal label="Empresa"      valor={asociado.nombre_empresa} />
        <CampoPortal label="Clase cuota"  valor={labelClaseCuota(asociado.clase_cuota)} />
        {antiguedad && (
          <CampoPortal label="Antigüedad en la cooperativa" valor={antiguedad} highlight="text-[#00e5ff]" />
        )}
        {asociado.fecha_ingreso && (
          <CampoPortal label="Miembro desde" valor={fmtFecha(asociado.fecha_ingreso)} />
        )}
      </SeccionPortal>

      {(asociado.valor_aporte != null || saldo != null) && (
        <SeccionPortal icon={Banknote} titulo="Mi aporte">
          {asociado.valor_aporte != null && (
            <CampoPortal label="Cuota de aporte" valor={fmtMoney(asociado.valor_aporte)} />
          )}
          {asociado.fecha_credito && (
            <CampoPortal label="Inicio del aporte" valor={fmtFecha(asociado.fecha_credito)} />
          )}
          {saldo != null && (
            <div className="flex items-center justify-between py-2.5 border-b border-[#00e5ff05] last:border-0">
              <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">Saldo en cuenta</p>
              <div className="text-right">
                <p className={`text-[11px] font-bold ${saldo < 0 ? 'text-[#10b981]' : saldo > 0 ? 'text-[#ff3d3d]' : 'text-[#a0d4e0]'}`}>
                  {fmtMoney(Math.abs(saldo))}
                </p>
                <p className="text-[8px] tracking-widest mt-0.5" style={{ color: saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#6aacbc' }}>
                  {saldo < 0 ? 'A TU FAVOR' : saldo > 0 ? 'PENDIENTE DE PAGO' : 'AL DÍA'}
                </p>
              </div>
            </div>
          )}
        </SeccionPortal>
      )}

    </div>
  );
};

// ── Tab: SEGURIDAD ────────────────────────────────────────────────────────────

const SeguridadTab = () => {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-6">
        <p className="text-[#6aacbc] text-[8px] tracking-[3px] uppercase mb-6">Cambiar contraseña</p>
        <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-sm rounded-sm px-4 py-3 focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono placeholder-[#6aacbc]"
              />
            </div>
          ))}
          <Btn type="submit" loading={loading} icon={null}>
            {loading ? 'GUARDANDO...' : 'ACTUALIZAR CONTRASEÑA'}
          </Btn>
        </form>
      </div>
    </div>
  );
};

// ── Pantalla de primer login (forzar cambio de clave) ────────────────────────

const PrimerLogin = ({ asociado, onDone }) => {
  const [form, setForm]       = useState({ inicial: '', nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    if (form.nueva.length < 8) { toast.error('La nueva contraseña debe tener mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/password', {
        password_actual: form.inicial,
        password_nueva:  form.nueva,
      });
      toast.success('Contraseña creada correctamente');
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear contraseña');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex items-center justify-center px-4 relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }} />

      <div className="w-full max-w-sm relative z-[2]">
        <div className="mb-8">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// PRIMER ACCESO</p>
          <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">
            BIENVENIDO, {asociado.nombre.toUpperCase()}
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">
            Ingresa la contraseña inicial que te entregó la cooperativa y crea una nueva contraseña personal.
          </p>
        </div>

        <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-6 relative" style={{ boxShadow: '0 0 40px #00e5ff08' }}>
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff55]" />

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
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'bonos',      label: 'MIS BONOS' },
  { id: 'ganadores',  label: 'GANADORES' },
  { id: 'datos',      label: 'MIS DATOS' },
  { id: 'seguridad',  label: 'SEGURIDAD' },
];

const MisDatos = () => {
  const { asociado, logout, refreshMe } = useAsociado();
  const [tab, setTab]                   = useState('bonos');

  if (!asociado) return null;

  // Primer login: forzar cambio de contraseña antes de continuar
  if (asociado.primer_login) {
    return <PrimerLogin asociado={asociado} onDone={refreshMe} />;
  }

  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
        }}
      />

      <div className="relative z-[2] max-w-2xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[#6aacbc] text-[7px] tracking-[4px] mb-1">// PORTAL DEL ASOCIADO · COOPERATIVA PROGRESEMOS</p>
            <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">
              {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()}
            </h1>
            <p className="text-[#6aacbc] text-[9px] tracking-widest mt-1">CC {asociado.codigo}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <NotificationBell />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-colors tracking-widest"
            >
              <LogOut size={12} /> SALIR
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#00e5ff11] mb-8">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-3 text-[9px] tracking-[2px] transition-all border-b-2 -mb-px ${
                tab === id
                  ? 'text-[#00e5ff] border-[#00e5ff]'
                  : 'text-[#6aacbc] border-transparent hover:text-[#a0d4e0]'
              }`}
              style={tab === id ? { textShadow: '0 0 8px #00e5ff44' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
          >
            {tab === 'bonos'     && <BonosTab asociado={asociado} />}
            {tab === 'ganadores' && <GanadoresTab />}
            {tab === 'datos'     && <DatosTab asociado={asociado} />}
            {tab === 'seguridad' && <SeguridadTab />}
          </motion.div>
        </AnimatePresence>

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
