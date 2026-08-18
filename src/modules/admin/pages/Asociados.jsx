import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, Upload, X, FileSpreadsheet, ShieldCheck, ShieldOff, ShieldAlert, Copy, Check, MessageCircle, Loader2, Ticket, Trophy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import { useNotifications } from '../../../context/NotificationContext.jsx';
import { labelClaseCuota, CLASE_CUOTA, coincideBusqueda } from '../../../utils/asociados.js';
import { exportarExcel } from '../../../services/exportService.js';

// ── Helpers perfil ────────────────────────────────────────────────────────────

const fmtF = (d) => d ? new Date(d).toLocaleDateString('es-CO') : null;
const fmtM = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : null;
const calcAnt = (fi, fr) => {
  const desde = fr ?? fi;
  if (!desde) return null;
  const hoy = new Date(); const ini = new Date(desde);
  let a = hoy.getFullYear() - ini.getFullYear();
  let m = hoy.getMonth() - ini.getMonth();
  if (hoy.getDate() < ini.getDate()) m--;
  if (m < 0) { a--; m += 12; }
  if (a === 0) return m === 1 ? '1 mes' : `${m} meses`;
  return m === 0 ? `${a} ${a === 1 ? 'año' : 'años'}` : `${a} ${a === 1 ? 'año' : 'años'} y ${m} ${m === 1 ? 'mes' : 'meses'}`;
};
const calcEdad = (fn) => {
  if (!fn) return null;
  const hoy = new Date(); const n = new Date(fn);
  let a = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() - n.getMonth() < 0 || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) a--;
  return a;
};

// ── Modal de perfil del asociado ──────────────────────────────────────────────

const FilaP = ({ label, valor, color }) =>
  valor ? (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[#00e5ff05] last:border-0">
      <p className="text-[#6aacbc] text-[9px] tracking-[2px] uppercase shrink-0">{label}</p>
      <p className={`text-[11px] text-right font-mono ${color ?? 'text-[#a0d4e0]'}`}>{valor}</p>
    </div>
  ) : null;

const ModalPerfil = ({ codigo, onClose }) => {
  const [perfil, setPerfil]   = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  useEffect(() => {
    apiService.get(`/asociados/${codigo}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('Error cargando perfil'))
      .finally(() => setLoading(false));
  }, [codigo]);

  const a   = perfil?.asociado;
  const ant = a ? calcAnt(a.fecha_ingreso, a.fecha_reingreso) : null;
  const edad = a ? calcEdad(a.fecha_nacimiento) : null;
  const saldo = a?.saldo_aporte != null ? Number(a.saldo_aporte) : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#08101e] border border-[#00e5ff22] rounded-sm w-full max-w-md relative overflow-hidden"
        style={{ boxShadow: '0 0 50px #00e5ff0d', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />

        {/* Header fijo */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#00e5ff08]">
          {loading || !a ? (
            <div>
              <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-1">CARGANDO...</p>
              <div className="h-5 w-48 bg-[#00e5ff08] rounded-sm animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-1">// PERFIL DEL ASOCIADO</p>
              <h3 className="text-[#a0d4e0] font-bold text-base tracking-wider leading-snug">
                {a.nombre.toUpperCase()} {a.apellido.toUpperCase()}
              </h3>
              <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">CC {a.codigo}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border ${
                  a.is_active
                    ? 'bg-[#00e5ff0d] text-[#00e5ff] border-[#00e5ff33]'
                    : 'bg-[#ff3d3d0d] text-[#ff3d3d] border-[#ff3d3d33]'
                }`}>
                  {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                </span>
                {a.portal_activo && (
                  <span className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border bg-[#a855f70d] text-[#a855f7] border-[#a855f733]">
                    PORTAL ACTIVO
                  </span>
                )}
              </div>
            </div>
          )}
          <button onClick={onClose} className="shrink-0 ml-4">
            <X size={15} className="text-[#6aacbc] hover:text-[#a0d4e0]" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[#6aacbc]" />
            </div>
          ) : !a ? (
            <p className="text-[#6aacbc] text-xs text-center py-8">No se pudo cargar el perfil</p>
          ) : (
            <>
              {/* Datos de contacto */}
              <div>
                <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">CONTACTO</p>
                <FilaP label="Empresa"   valor={a.nombre_empresa} />
                <FilaP label="Teléfono"  valor={a.movil} />
                <FilaP label="Ciudad"    valor={a.ciudad} />
                <FilaP label="Dirección" valor={a.direccion} />
                {edad != null && <FilaP label="Edad" valor={`${edad} años`} />}
              </div>

              {/* Aporte */}
              <div>
                <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">APORTE</p>
                <FilaP label="Clase cuota"  valor={labelClaseCuota(a.clase_cuota)} />
                <FilaP label="Cuota"        valor={fmtM(a.valor_aporte)} />
                <FilaP label="Antigüedad"   valor={ant} color="text-[#a78bfa]" />
                <FilaP label="Miembro desde" valor={fmtF(a.fecha_ingreso)} />
                {saldo != null && (
                  <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[#00e5ff05] last:border-0">
                    <p className="text-[#6aacbc] text-[9px] tracking-[2px] uppercase shrink-0">Saldo de aporte</p>
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-bold" style={{ color: saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#a0d4e0' }}>
                        {fmtM(Math.abs(saldo))}
                      </span>
                      <span className="text-[8px] tracking-widest ml-1.5" style={{ color: saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#6aacbc' }}>
                        {saldo < 0 ? 'A FAVOR' : saldo > 0 ? 'PENDIENTE' : 'AL DÍA'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bonos activos */}
              {perfil.bonosActivos?.length > 0 && (
                <div>
                  <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-2">
                    BONOS ACTIVOS <span style={{ color: '#00e5ff' }}>({perfil.bonosActivos.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {perfil.bonosActivos.map((b) => (
                      <span
                        key={`${b.sorteo_id}-${b.numero}`}
                        className="font-mono text-xs px-2 py-1 rounded-sm"
                        style={{ background: '#003d4433', border: '1px solid #00e5ff33', color: '#00e5ff' }}
                      >
                        #{String(b.numero).padStart(3, '0')}
                        <span className="text-[8px] text-[#6aacbc] ml-1">{b.sorteo_nombre}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Premios */}
              {perfil.premios?.length > 0 && (
                <div>
                  <p className="text-[8px] tracking-[3px] text-[#ffb700] mb-2">
                    PREMIOS GANADOS <span>({perfil.premios.length})</span>
                  </p>
                  {perfil.premios.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#ffb70008] last:border-0">
                      <div className="flex items-center gap-2">
                        <Trophy size={11} style={{ color: '#ffb700' }} />
                        <span className="text-[#a0d4e0] text-[10px]">#{String(p.numero).padStart(3, '0')} · {p.sorteo_nombre}</span>
                      </div>
                      <span className="text-[#ffb700] text-[9px]">{fmtF(p.mes_premiacion)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Ir al perfil completo */}
              <button
                onClick={() => { onClose(); navigate(`/asociados/${a.codigo}`); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#00e5ff22] hover:border-[#00e5ff44] text-[#6aacbc] hover:text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all"
              >
                <ExternalLink size={12} /> VER PERFIL COMPLETO
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const unicos = (lista, campo) =>
  [...new Set(lista.map((a) => a[campo]).filter(Boolean))].sort();

const SelectFiltro = ({ label, value, onChange, opciones, labelFn = (o) => o }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none focus:border-[#00e5ff33] cursor-pointer font-mono"
  >
    <option value="">{label}</option>
    {opciones.map((o) => <option key={o} value={o}>{labelFn(o)}</option>)}
  </select>
);

const FILTROS_INIT = { ciudad: '', clase_cuota: '', nombre_empresa: '', estado: '', portal: '', solicitud: '' };

// ── Modal de activación de portal ─────────────────────────────────────────────

const ModalPortal = ({ asociado, onClose, onDone }) => {
  const [loading, setLoading]     = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado]     = useState(false);

  const activar = async () => {
    setLoading(true);
    try {
      const { data } = await apiService.post(`/asociados/${asociado.codigo}/activar-portal`);
      setResultado(data);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al activar portal');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async () => {
    setLoading(true);
    try {
      await apiService.post(`/asociados/${asociado.codigo}/desactivar-portal`);
      toast.success('Acceso al portal desactivado');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar');
    } finally {
      setLoading(false);
    }
  };

  const rechazar = async () => {
    setLoading(true);
    try {
      await apiService.post(`/asociados/${asociado.codigo}/rechazar-solicitud`);
      toast.success('Solicitud rechazada');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al rechazar');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(resultado.password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const abrirWhatsApp = () => {
    const numero = (asociado.movil ?? '').replace(/\D/g, '');
    const tel    = numero.length === 10 && numero.startsWith('3') ? `57${numero}` : numero;
    const url    = `${window.location.origin}/portal/login`;
    const msg    =
      `Hola ${asociado.nombre}, tu acceso al portal de la Cooperativa Progresemos ya está listo.\n\n` +
      `Ingresa en: ${url}\n` +
      `Usuario (tu cédula): ${asociado.codigo}\n` +
      `Contraseña: ${resultado.password}\n\n` +
      `Te recomendamos cambiar tu contraseña después de tu primer ingreso.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div
        className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 40px #00e5ff11' }}
      >
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#a0d4e0] font-bold text-sm tracking-wider">ACCESO AL PORTAL</h3>
          <button onClick={onClose}><X size={15} className="text-[#6aacbc] hover:text-[#a0d4e0]" /></button>
        </div>

        <p className="text-[#6aacbc] text-[9px] tracking-wider mb-4">
          {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()} · {asociado.codigo}
        </p>

        {resultado ? (
          /* Contraseña generada — mostrar una sola vez */
          <div>
            <p className="text-[#ffb700] text-[9px] tracking-wider mb-3">
              ⚠ Copia esta contraseña ahora. No se volverá a mostrar.
            </p>
            <div className="bg-[#0d1829] border border-[#00e5ff33] rounded-sm px-4 py-3 flex items-center justify-between mb-4">
              <span className="font-mono text-[#00e5ff] text-lg tracking-widest" style={{ textShadow: '0 0 12px #00e5ff44' }}>
                {resultado.password}
              </span>
              <button onClick={copiar} className="ml-3 text-[#6aacbc] hover:text-[#00e5ff] transition-colors">
                {copiado ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mb-4">
              Entrega esta contraseña al asociado de forma segura. Deberá cambiarla en su primer ingreso.
            </p>
            <div className="flex flex-col gap-2">
              {asociado.movil && (
                <button
                  onClick={abrirWhatsApp}
                  className="w-full py-2.5 border border-[#25d36644] hover:border-[#25d36688] bg-[#25d3660d] hover:bg-[#25d3661a] text-[#25d366] text-[9px] tracking-widest rounded-sm transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={13} />
                  ENVIAR POR WHATSAPP
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2 border border-[#00e5ff22] hover:border-[#00e5ff44] text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest rounded-sm transition-all"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        ) : asociado.portal_activo ? (
          /* Ya activado: opción de desactivar */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} style={{ color: '#00e5ff' }} />
              <span className="text-[#00e5ff] text-[10px] tracking-wider">
                {asociado.primer_login ? 'ACTIVADO · Pendiente primer ingreso' : 'ACTIVADO'}
              </span>
            </div>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mb-5">
              El asociado tiene acceso al portal. Puedes desactivarlo o generar una nueva contraseña.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={activar}
                disabled={loading}
                className="w-full py-2 border border-[#ffb70044] hover:border-[#ffb70088] bg-[#ffb7000d] hover:bg-[#ffb7001a] text-[#ffb700] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                GENERAR NUEVA CONTRASEÑA
              </button>
              <button
                onClick={desactivar}
                disabled={loading}
                className="w-full py-2 border border-[#ff3d3d44] hover:border-[#ff3d3d88] bg-[#ff3d3d0d] hover:bg-[#ff3d3d1a] text-[#ff3d3d] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                DESACTIVAR ACCESO
              </button>
            </div>
          </div>
        ) : asociado.solicitud_portal_at ? (
          /* Solicitud pendiente: aprobar o rechazar */
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={14} style={{ color: '#ffb700' }} />
              <span className="text-[#ffb700] text-[10px] tracking-wider">SOLICITUD PENDIENTE</span>
            </div>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mb-5">
              El asociado solicitó acceso al portal. Aprueba para generar su contraseña inicial o rechaza la solicitud.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={activar}
                disabled={loading}
                className="w-full py-2 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                APROBAR Y GENERAR CONTRASEÑA
              </button>
              <button
                onClick={rechazar}
                disabled={loading}
                className="w-full py-2 border border-[#ff3d3d44] hover:border-[#ff3d3d88] bg-[#ff3d3d0d] hover:bg-[#ff3d3d1a] text-[#ff3d3d] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
              >
                RECHAZAR SOLICITUD
              </button>
            </div>
          </div>
        ) : (
          /* Sin activar: activar */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldOff size={14} className="text-[#6aacbc]" />
              <span className="text-[#6aacbc] text-[10px] tracking-wider">SIN ACCESO AL PORTAL</span>
            </div>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mb-5">
              Genera una contraseña inicial para este asociado y entrégasela de forma segura.
            </p>
            <button
              onClick={activar}
              disabled={loading}
              className="w-full py-2 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all disabled:opacity-40"
            >
              ACTIVAR PORTAL Y GENERAR CONTRASEÑA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const Asociados = () => {
  const [asociados, setAsociados]   = useState([]);
  const [busqueda, setBusqueda]     = useState('');
  const [filtros, setFiltros]       = useState(FILTROS_INIT);
  const [loading, setLoading]       = useState(true);
  const [pagina, setPagina]         = useState(0);
  const [modalPortal, setModalPortal] = useState(null);
  const [modalPerfil, setModalPerfil] = useState(null);
  const navigate                    = useNavigate();
  const POR_PAGINA = 75;

  const { notificaciones } = useNotifications();

  const cargar = () => {
    apiService.get('/asociados')
      .then(({ data }) => setAsociados(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Error cargando asociados'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // Recargar lista en tiempo real cuando llega solicitud de portal
  const ultimaNotifIdRef = useRef(null);
  useEffect(() => {
    const ultima = notificaciones[0];
    if (!ultima || ultima.id === ultimaNotifIdRef.current) return;
    ultimaNotifIdRef.current = ultima.id;
    if (ultima.tipo === 'solicitud_portal') cargar();
  }, [notificaciones]);

  const setFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const hayFiltros = busqueda || Object.values(filtros).some(Boolean);
  const limpiar = () => { setBusqueda(''); setFiltros(FILTROS_INIT); };

  const opciones = useMemo(() => ({
    ciudad:         unicos(asociados, 'ciudad'),
    clase_cuota:    unicos(asociados, 'clase_cuota'),
    nombre_empresa: unicos(asociados, 'nombre_empresa'),
  }), [asociados]);

  const filtrados = useMemo(() => asociados.filter((a) => {
    if (busqueda && !coincideBusqueda(busqueda, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '', a.ciudad ?? '')) return false;
    if (filtros.ciudad         && a.ciudad         !== filtros.ciudad)         return false;
    if (filtros.clase_cuota    && a.clase_cuota    !== filtros.clase_cuota)    return false;
    if (filtros.nombre_empresa && a.nombre_empresa !== filtros.nombre_empresa) return false;
    if (filtros.estado === 'activo'   && !a.is_active)  return false;
    if (filtros.estado === 'inactivo' &&  a.is_active)  return false;
    if (filtros.portal === 'activo'    && !a.portal_activo)         return false;
    if (filtros.portal === 'inactivo'  &&  a.portal_activo)         return false;
    if (filtros.solicitud === 'si'     && !a.solicitud_portal_at)   return false;
    return true;
  }), [asociados, busqueda, filtros]);

  useEffect(() => { setPagina(0); }, [filtrados]);

  const paginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (loading) return <p className="text-[#6aacbc] text-xs tracking-widest">CARGANDO...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-1">// DIRECTORIO</p>
          <h1 className="text-[#a0d4e0] font-bold text-lg tracking-wider">ASOCIADOS</h1>
          <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">{asociados.length} REGISTRADOS</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportarExcel(filtrados, [
              { campo: 'codigo',        header: 'Cédula' },
              { campo: 'nombre',        header: 'Nombre' },
              { campo: 'apellido',      header: 'Apellido' },
              { campo: 'movil',         header: 'Móvil' },
              { campo: 'ciudad',        header: 'Ciudad' },
              { campo: 'nombre_empresa',header: 'Empresa' },
              { campo: 'clase_cuota',   header: 'Clase cuota' },
              { campo: 'is_active',     header: 'Activo' },
            ], `asociados_${new Date().toISOString().slice(0,10)}`)}
            className="flex items-center gap-2 px-4 py-2 border border-[#00e5ff11] hover:border-[#00e5ff33] text-[#6aacbc] hover:text-[#00e5ff] text-[9px] rounded-sm transition-colors tracking-widest"
          >
            <FileSpreadsheet size={13} /> EXPORTAR
          </button>
          <button
            onClick={() => navigate('/admin/asociados/importar')}
            className="flex items-center gap-2 px-4 py-2 border border-[#a855f744] hover:border-[#a855f788] bg-[#a855f711] hover:bg-[#a855f722] text-[#a855f7] text-[9px] rounded-sm transition-colors tracking-widest"
          >
            <Upload size={13} /> IMPORTAR CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full bg-[#08101e] border border-[#00e5ff11] rounded-sm pl-9 pr-4 py-2 text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff33] font-mono"
          />
        </div>

        <div className="grid grid-cols-2 sm:contents gap-2">
          <SelectFiltro label="Ciudad"  value={filtros.ciudad}         onChange={(v) => setFiltro('ciudad', v)}         opciones={opciones.ciudad} />
          <SelectFiltro label="Cuota"   value={filtros.clase_cuota}    onChange={(v) => setFiltro('clase_cuota', v)}    opciones={opciones.clase_cuota} labelFn={labelClaseCuota} />
          <SelectFiltro label="Empresa" value={filtros.nombre_empresa} onChange={(v) => setFiltro('nombre_empresa', v)} opciones={opciones.nombre_empresa} />

          <select value={filtros.estado} onChange={(e) => setFiltro('estado', e.target.value)}
            className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
            <option value="">Estado</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <select value={filtros.portal} onChange={(e) => setFiltro('portal', e.target.value)}
            className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
            <option value="">Portal</option>
            <option value="activo">Con acceso</option>
            <option value="inactivo">Sin acceso</option>
          </select>

          <select value={filtros.solicitud} onChange={(e) => setFiltro('solicitud', e.target.value)}
            className="bg-[#08101e] border border-[#ffb70022] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
            <option value="">Solicitudes</option>
            <option value="si">Pendiente</option>
          </select>
        </div>

        {hayFiltros && (
          <button onClick={limpiar} className="flex items-center gap-1 px-3 py-2 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors self-start">
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="sm:hidden flex flex-col gap-2">
        {filtrados.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#6aacbc] tracking-widest text-[9px] border border-[#00e5ff11] rounded-sm">
            {hayFiltros ? 'SIN RESULTADOS PARA LOS FILTROS APLICADOS' : 'NO HAY ASOCIADOS REGISTRADOS'}
          </div>
        ) : visibles.map((a) => (
          <motion.div
            key={a.codigo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            onClick={() => setModalPerfil(a.codigo)}
            className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-4 cursor-pointer hover:border-[#00e5ff22] transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-[#a0d4e0] text-xs tracking-wider">{a.nombre} {a.apellido}</p>
                <p className="text-[#6aacbc] text-[9px] font-mono mt-0.5">{a.codigo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-sm border text-[9px] tracking-wider ${
                  a.is_active
                    ? 'bg-[#00e5ff11] text-[#00e5ff] border-[#00e5ff33]'
                    : 'bg-[#ff3d3d11] text-[#ff3d3d] border-[#ff3d3d33]'
                }`}>
                  {a.is_active ? 'ACT' : 'INA'}
                </span>
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModalPortal(a)} className="transition-colors">
                    {a.portal_activo
                      ? <ShieldCheck size={15} style={{ color: '#00e5ff', filter: 'drop-shadow(0 0 4px #00e5ff55)' }} />
                      : a.solicitud_portal_at
                        ? <ShieldAlert size={15} style={{ color: '#ffb700', filter: 'drop-shadow(0 0 4px #ffb70055)' }} />
                        : <ShieldOff size={15} className="text-[#6aacbc]" />
                    }
                  </button>
                </div>
              </div>
            </div>
            {a.nombre_empresa && (
              <p className="text-[#6aacbc] text-[10px] tracking-wider mb-1 leading-snug">{a.nombre_empresa}</p>
            )}
            <div className="flex items-center gap-3 text-[9px] text-[#6aacbc]">
              {a.ciudad && <span>{a.ciudad}</span>}
              {a.movil && <span>{a.movil}</span>}
              {a.clase_cuota && <span>{labelClaseCuota(a.clase_cuota)}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block border border-[#00e5ff11] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff11] bg-[#00e5ff05]">
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CÉDULA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">NOMBRE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">MÓVIL</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CUOTA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">EMPRESA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CIUDAD</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ESTADO</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">PORTAL</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#6aacbc] tracking-widest text-[9px]">
                  {hayFiltros ? 'SIN RESULTADOS PARA LOS FILTROS APLICADOS' : 'NO HAY ASOCIADOS REGISTRADOS'}
                </td>
              </tr>
            ) : visibles.map((a) => (
              <motion.tr
                key={a.codigo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                onClick={() => setModalPerfil(a.codigo)}
                className="border-b border-[#00e5ff08] hover:bg-[#00e5ff05] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-[#6aacbc] font-mono">{a.codigo}</td>
                <td className="px-4 py-3 text-[#a0d4e0]">{a.nombre} {a.apellido}</td>
                <td className="px-4 py-3 text-[#6aacbc]">{a.movil || '—'}</td>
                <td className="px-4 py-3 text-[#6aacbc]">{labelClaseCuota(a.clase_cuota)}</td>
                <td className="px-4 py-3 text-[#6aacbc]">{a.nombre_empresa || '—'}</td>
                <td className="px-4 py-3 text-[#6aacbc]">{a.ciudad || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-sm border text-[9px] tracking-wider ${
                    a.is_active
                      ? 'bg-[#00e5ff11] text-[#00e5ff] border-[#00e5ff33]'
                      : 'bg-[#ff3d3d11] text-[#ff3d3d] border-[#ff3d3d33]'
                  }`}>
                    {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setModalPortal(a)}
                    title={
                      a.portal_activo
                        ? 'Gestionar acceso al portal'
                        : a.solicitud_portal_at
                          ? 'Solicitud pendiente de activación'
                          : 'Activar portal'
                    }
                    className="transition-colors"
                  >
                    {a.portal_activo
                      ? <ShieldCheck size={15} style={{ color: '#00e5ff', filter: 'drop-shadow(0 0 4px #00e5ff55)' }} />
                      : a.solicitud_portal_at
                        ? <ShieldAlert size={15} style={{ color: '#ffb700', filter: 'drop-shadow(0 0 4px #ffb70055)' }} />
                        : <ShieldOff size={15} className="text-[#6aacbc] hover:text-[#a0d4e0]" />
                    }
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-[#6aacbc] text-[9px] tracking-wider">
          {filtrados.length === asociados.length
            ? `${asociados.length} asociados`
            : `${filtrados.length} de ${asociados.length}`}
          {paginas > 1 && ` · PÁGINA ${pagina + 1} DE ${paginas}`}
        </p>
        {paginas > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina((p) => Math.max(p - 1, 0))} disabled={pagina === 0}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] disabled:opacity-30 transition-colors">← ANT</button>
            {Array.from({ length: paginas }, (_, i) => i)
              .filter((i) => i === 0 || i === paginas - 1 || Math.abs(i - pagina) <= 1)
              .reduce((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…');
                acc.push(i);
                return acc;
              }, [])
              .map((item, i) =>
                item === '…'
                  ? <span key={`e${i}`} className="px-1 text-[#6aacbc] text-[9px]">…</span>
                  : <button key={item} onClick={() => setPagina(item)}
                      className={`w-7 h-7 text-[9px] rounded-sm transition-colors ${item === pagina ? 'bg-[#a855f7] text-white' : 'bg-[#08101e] border border-[#00e5ff11] text-[#6aacbc] hover:text-[#a0d4e0]'}`}
                    >{item + 1}</button>
              )}
            <button onClick={() => setPagina((p) => Math.min(p + 1, paginas - 1))} disabled={pagina === paginas - 1}
              className="px-2 py-1 text-[9px] bg-[#08101e] border border-[#00e5ff11] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] disabled:opacity-30 transition-colors">SIG →</button>
          </div>
        )}
      </div>

      {modalPortal && (
        <ModalPortal
          asociado={modalPortal}
          onClose={() => setModalPortal(null)}
          onDone={() => {
            cargar();
            setModalPortal(a => a ? { ...a, portal_activo: true, primer_login: true } : null);
          }}
        />
      )}

      {modalPerfil && (
        <ModalPerfil
          codigo={modalPerfil}
          onClose={() => setModalPerfil(null)}
        />
      )}
    </div>
  );
};

export default Asociados;
