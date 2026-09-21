import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Camera, CheckCircle2, ChevronLeft, Circle, Clock, ExternalLink, FileDown, FileText,
  ClipboardPaste, Copy, CreditCard, Loader2, Mail, MessageCircle, Pencil, PiggyBank, RefreshCcw, Send, ShieldAlert, X,
} from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';
import { TIPOS_PERMITIDOS } from '../components/publico/imagen.js';
import PanelAportes from '../components/panel/PanelAportes.jsx';
import PanelValidacionVoz from '../components/panel/PanelValidacionVoz.jsx';
import PanelSubsanacion from '../components/panel/PanelSubsanacion.jsx';
import PanelVerificacionCedula from '../components/panel/PanelVerificacionCedula.jsx';
import PanelConsultaListas from '../components/panel/PanelConsultaListas.jsx';
import { mensajeErrorSubida, subirDocumento } from '../utils/subidaDocumento.js';
import {
  dinero, ESTADOS_VINCULACION, estadoCivil, fecha, fechaHora, genero, iniciales, siNo, tipoContrato, tipoVivienda,
} from '../utils/formato.js';

// ── Piezas ───────────────────────────────────────────────────────────────────

const Dato = ({ label, value, ancho }) => (
  <div className={ancho ? 'col-span-2' : ''}>
    <p className="mb-0.5 text-[9px] uppercase tracking-[2px] text-slate-500">{label}</p>
    <p className="break-words text-xs text-slate-200">{value || <span className="text-slate-700">—</span>}</p>
  </div>
);

// `siempre`: muestra el contenido aunque la sección esté pendiente (p. ej. para poder cargar la cédula).
const Seccion = ({ titulo, icono: Icono, hecha, cuando, children, className = '', siempre = false, accion = null, vacio = 'El asociado no ha completado esta sección.' }) => (
  <section className={`overflow-hidden rounded border border-slate-800/60 bg-slate-900/20 ${className}`}>
    <header className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${hecha ? 'border-emerald-900/20 bg-emerald-900/10' : 'border-slate-800/40 bg-slate-900/40'}`}>
      <h2 className={`flex items-center gap-2 text-xs font-bold tracking-wider ${hecha ? 'text-emerald-400' : 'text-slate-500'}`}>
        {Icono && <Icono size={13} />} {titulo}
      </h2>
      {accion}
      {hecha
        ? <span className="flex items-center gap-1 text-[10px] text-emerald-400/70"><CheckCircle2 size={11} /> {fecha(cuando, { day: 'numeric', month: 'short' })}</span>
        : <span className="flex items-center gap-1 text-[10px] text-slate-600"><Clock size={11} /> Pendiente</span>}
    </header>
    <div className="p-4">
      {hecha || siempre ? children : <p className="text-[11px] text-slate-600">{vacio}</p>}
    </div>
  </section>
);

const Rejilla = ({ children }) => <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">{children}</div>;

const Requisito = ({ ok, texto }) => (
  <li className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-300' : 'text-slate-400'}`}>
    {ok ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} className="text-slate-600" />} {texto}
  </li>
);

const Modal = ({ children, onClose, ancho = 'max-w-md' }) => {
  useEffect(() => {
    const cerrar = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`relative max-h-[92vh] w-full ${ancho} overflow-auto rounded-lg border border-emerald-900/50 bg-[#020f08] p-5 font-mono`}>
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><X size={16} /></button>
        {children}
      </div>
    </div>,
    document.body
  );
};

// ── Cédula ───────────────────────────────────────────────────────────────────

const ETIQUETA_LADO = { frente: 'Frente', reverso: 'Reverso' };

// Nombre legible de la sección que se cambió después de la firma (viene de captacion_eventos.seccion)
const ETIQUETA_SECCION = {
  personal: 'Datos personales', laboral: 'Información laboral', pep: 'Cumplimiento (PEP)', financiera: 'Información financiera',
  aportes: 'Aportes y beneficios', beneficiarios: 'Beneficiarios', referencias: 'Referencias', valores: 'Valores asignados',
  'documentos/frente': 'Cédula (frente)', 'documentos/reverso': 'Cédula (reverso)', documentos: 'Cédula',
};

// A qué cara va una imagen pegada: la que el asesor eligió (para reemplazar) o, si no eligió,
// la primera que aún no tiene archivo.
const ladoParaPegar = (destino, docs) => destino || (!docs.frente ? 'frente' : !docs.reverso ? 'reverso' : null);

const EXTENSION = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const archivoPegado = (blob, lado) => new File([blob], `cedula-${lado}.${EXTENSION[blob.type] || 'png'}`, { type: blob.type });

const Documento = ({ lado, doc, onVer, puedeSubir, subida, onElegir, esDestino, onSeleccionar }) => {
  const input = useRef(null);
  const titulo = ETIQUETA_LADO[lado];
  const subiendo = subida.estado === 'subiendo';
  const esImagen = doc?.mime?.startsWith('image/');

  return (
    <div>
      {puedeSubir ? (
        <button type="button" onClick={() => onSeleccionar(lado)} aria-pressed={esDestino}
          title="Elegir esta cara para pegar una imagen (Ctrl+V)"
          className={`mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[2px] transition-colors ${esDestino ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${esDestino ? 'bg-emerald-400' : 'bg-slate-700'}`} /> {titulo}
        </button>
      ) : (
        <p className="mb-1 text-[9px] uppercase tracking-[2px] text-slate-500">{titulo}</p>
      )}
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={`Cargar ${titulo.toLowerCase()} de la cédula`}
             accept={TIPOS_PERMITIDOS.join(',')}
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onElegir(lado, f); }} />

      {!doc ? (
        <div className="flex h-32 flex-col items-center justify-center gap-1 rounded border border-dashed border-slate-700 text-[11px] text-slate-600">
          <Camera size={20} /> Sin archivo
        </div>
      ) : esImagen ? (
        <button onClick={() => onVer(doc)} className="group block w-full overflow-hidden rounded border border-slate-700/60 bg-black/30 hover:border-emerald-600/60">
          <img src={doc.url} alt={titulo} className="h-32 w-full object-cover transition group-hover:opacity-90" />
        </button>
      ) : (
        <a href={doc.url} target="_blank" rel="noopener noreferrer"
           className="flex h-32 flex-col items-center justify-center gap-1.5 rounded border border-slate-700/60 bg-black/30 text-slate-300 hover:border-emerald-600/60">
          <FileText size={26} /> <span className="flex items-center gap-1 text-[11px]">Abrir PDF <ExternalLink size={11} /></span>
        </a>
      )}

      {doc && <p className="mt-1 truncate text-[10px] text-slate-600">{doc.nombre}</p>}

      {subiendo && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={subida.progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${subida.progreso}%` }} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><Loader2 size={11} className="animate-spin" /> Subiendo… {subida.progreso}%</p>
        </div>
      )}
      {subida.estado === 'error' && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[10px] text-red-400"><AlertTriangle size={12} className="mt-px shrink-0" /> {subida.error}</p>
      )}

      {puedeSubir && !subiendo && (
        <button onClick={() => input.current.click()}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded border py-1.5 text-[10px] tracking-wider transition-colors ${
            doc ? 'border-slate-700/60 text-slate-400 hover:border-emerald-700/50 hover:text-emerald-400'
                : 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40'}`}>
          {subida.estado === 'error' ? <RefreshCcw size={11} /> : <Camera size={11} />}
          {subida.estado === 'error' ? 'REINTENTAR' : doc ? 'REEMPLAZAR' : `CARGAR ${titulo.toUpperCase()}`}
        </button>
      )}
    </div>
  );
};

// ── Página ───────────────────────────────────────────────────────────────────

const VinculacionDetalle = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [v, setV]               = useState(null);
  const [cargando, setCargando] = useState(true);
  const [docs, setDocs]         = useState({ estado: 'idle', frente: null, reverso: null });
  const [visor, setVisor]       = useState(null);
  const [subida, setSubida]     = useState({ frente: { estado: 'idle', progreso: 0 }, reverso: { estado: 'idle', progreso: 0 } });
  const [destino, setDestino]   = useState(null);   // cara elegida para pegar (null = la primera que falte)
  const [confirmar, setConfirmar] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const [editandoAportes, setEditandoAportes] = useState(false);
  const [enviandoEnlace, setEnviandoEnlace] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [voz, setVoz]         = useState(null);   // validación por llamada de voz (protocolo, estado e historial)

  const cargarVoz = useCallback(() => {
    apiService.get(`/captacion/vinculaciones/${id}/validacion-voz`).then(({ data }) => setVoz(data)).catch(() => setVoz(null));
  }, [id]);
  useEffect(() => { cargarVoz(); }, [cargarVoz]);

  const [consulta, setConsulta] = useState(null);   // estado de la consulta en listas (para saber si falta al entregar)
  const [sub, setSub] = useState(null);   // devolución a subsanar (abierta e historial)
  const cargarSub = useCallback(() => {
    apiService.get(`/captacion/vinculaciones/${id}/subsanacion`).then(({ data }) => setSub(data)).catch(() => setSub(null));
  }, [id]);
  useEffect(() => { cargarSub(); }, [cargarSub]);
  // Al devolver o resolver cambia el estado y la firma de la solicitud: se recarga también el detalle
  const [tick, setTick] = useState(0);   // sube cada vez que algo del expediente cambia y los paneles deben volver a leer
  const cambioSubsanacion = () => {
    setTick(t => t + 1);
    cargarSub(); cargarVoz();
    apiService.get(`/captacion/vinculaciones/${id}`).then(({ data }) => setV(data)).catch(() => {});
  };

  const cargarDocs = useCallback(() => {
    setDocs(d => ({ ...d, estado: 'cargando' }));
    return apiService.get(`/captacion/vinculaciones/${id}/documentos`)
      .then(({ data }) => setDocs({ estado: 'ok', ...data }))
      .catch(() => setDocs({ estado: 'error', frente: null, reverso: null }));
  }, [id]);

  useEffect(() => {
    apiService.get(`/captacion/vinculaciones/${id}`)
      .then(({ data }) => {
        setV(data);
        // Las URLs de descarga se piden una sola vez: cada consulta queda en la auditoría.
        if (data.cedula_frente_id || data.cedula_reverso_id) cargarDocs();
      })
      .catch(() => { toast.error('No se encontró la solicitud'); navigate('/captacion/vinculaciones'); })
      .finally(() => setCargando(false));
  }, [id, navigate, cargarDocs]);

  const cambiarSubida = (lado, cambios) => setSubida(p => ({ ...p, [lado]: { ...p[lado], ...cambios } }));

  // El asesor sube la cédula en nombre del asociado (p. ej. cuando se la manda por WhatsApp).
  const subirCedula = useCallback(async (lado, original) => {
    cambiarSubida(lado, { estado: 'subiendo', progreso: 0, error: '' });
    try {
      const url = `/captacion/vinculaciones/${id}/documentos/${lado}`;
      await subirDocumento({
        original,
        solicitar: (meta) => apiService.post(`${url}/solicitar`, meta).then(r => r.data),
        confirmar: (body) => apiService.patch(`${url}/confirmar`, body),
        onProgreso: (progreso) => cambiarSubida(lado, { progreso }),
      });
      cambiarSubida(lado, { estado: 'idle', progreso: 0 });
      toast.success(`${ETIQUETA_LADO[lado]} de la cédula cargado`);
      // Refrescar requisitos (¿ya están las dos caras?) y las URLs de visualización
      const { data } = await apiService.get(`/captacion/vinculaciones/${id}`);
      setV(data);
      await cargarDocs();
    } catch (err) {
      cambiarSubida(lado, { estado: 'error', error: mensajeErrorSubida(err) });
    }
  }, [id, cargarDocs]);

  // Pegar con Ctrl+V una imagen del portapapeles (p. ej. copiada desde WhatsApp Web).
  const pegarImagen = useCallback((blob) => {
    const lado = ladoParaPegar(destino, docs);
    if (!lado) return toast('Elige qué cara reemplazar (clic en Frente o Reverso) y vuelve a pegar', { icon: 'ℹ️' });
    setDestino(null);
    toast(`Imagen pegada como ${ETIQUETA_LADO[lado].toLowerCase()}`, { icon: '📋' });
    return subirCedula(lado, archivoPegado(blob, lado));
  }, [destino, docs, subirCedula]);

  const entregadaAhora = v?.estado === 'entregada';
  useEffect(() => {
    if (!v || entregadaAhora) return undefined;
    const alPegar = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const imagen = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
      if (!imagen) return;
      e.preventDefault();
      pegarImagen(imagen);
    };
    document.addEventListener('paste', alPegar);
    return () => document.removeEventListener('paste', alPegar);
  }, [v, entregadaAhora, pegarImagen]);

  // Botón "Pegar": lee el portapapeles con la API asíncrona (el navegador puede pedir permiso).
  const pegarDesdeBoton = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const tipo = item.types.find(t => t.startsWith('image/'));
        if (tipo) return pegarImagen(await item.getType(tipo));
      }
      toast.error('No hay ninguna imagen en el portapapeles');
    } catch {
      toast.error('El navegador no permitió leer el portapapeles. Usa Ctrl+V.');
    }
  };

  const refrescarSolicitud = async () => {
    const { data } = await apiService.get(`/captacion/vinculaciones/${id}`);
    setV(data);
  };

  // Enlace personal del asociado para que complete lo que falta desde su celular
  const enlaceAsociado = async (accion) => {
    setEnviandoEnlace(true);
    try {
      const { data } = await apiService.get(`/captacion/prospectos/${v.prospecto_id}/whatsapp`);
      if (accion === 'whatsapp') window.open(data.url, '_blank', 'noopener');
      else { await navigator.clipboard.writeText(data.link); toast.success('Enlace copiado'); }
    } catch { toast.error('No se pudo obtener el enlace del asociado'); }
    finally { setEnviandoEnlace(false); }
  };

  // PDF oficial (Formato No. 5) lleno con los datos de la solicitud
  const descargarFormato = async (actual = false) => {
    setDescargando(true);
    try {
      const { data } = await apiService.get(`/captacion/vinculaciones/${id}/formato${actual ? '?actual=1' : ''}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formato-vinculacion-${v.cedula}${actual && v.firma_pdf_hash ? '-actual' : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { toast.error('No se pudo generar el formato'); }
    finally { setDescargando(false); }
  };

  const entregar = async () => {
    setEntregando(true);
    try {
      const { data } = await apiService.post(`/captacion/vinculaciones/${id}/entregar`);
      setV(prev => ({ ...prev, estado: data.estado, entregada_at: data.entregada_at }));
      setConfirmar(false);
      toast.success('Solicitud entregada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo entregar la solicitud');
    } finally { setEntregando(false); }
  };

  if (cargando) return <div className="flex justify-center p-6 pt-16"><Loader2 className="animate-spin text-emerald-400" size={24} /></div>;
  if (!v) return null;

  const tieneDocs  = !!(v.cedula_frente_id || v.cedula_reverso_id);
  const totalMensual = ['valor_aporte', 'valor_fondo_bienestar', 'valor_seguro_vida', 'valor_bono_sorteo'].reduce((t, k) => t + Number(v[k] || 0), 0);
  const ladoPegar  = ladoParaPegar(destino, docs);
  const estado     = ESTADOS_VINCULACION[v.estado] || ESTADOS_VINCULACION.borrador;
  const entregada  = v.estado === 'entregada';
  const req        = { firma: !!v.seccion_firma_at, pep: !!v.seccion_pep_at, cedula: !!v.seccion_documentos_at, aporte: v.valor_aporte !== null && v.valor_aporte !== undefined };
  const faltantes  = [!req.firma && 'la firma', !req.pep && 'el cumplimiento (PEP)', !req.cedula && 'la cédula', !req.aporte && 'el aporte',
                      sub?.abierta && 'la corrección pendiente',
                      consulta?.exigida && !consulta.vigente && 'la consulta en listas validada por el Oficial',
                      voz?.exigida && !voz.validada && 'la validación por llamada'].filter(Boolean);
  const puedeEntregar = !entregada && faltantes.length === 0;
  const celular    = (v.celular || '').replace(/\D/g, '');
  const wa         = celular ? `https://wa.me/57${celular.replace(/^57/, '')}` : null;
  const bens       = v.beneficiarios || [];
  const refs       = v.referencias || [];
  const monedaExt  = Array.isArray(v.moneda_extranjera_detalle) ? v.moneda_extranjera_detalle[0] : null;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <button onClick={() => navigate('/captacion/vinculaciones')} className="mb-3 flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300">
        <ChevronLeft size={13} /> Vinculaciones
      </button>

      {/* Encabezado */}
      <div className="mb-4 flex flex-col gap-4 rounded border border-slate-800/60 bg-slate-900/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-900/30 text-sm font-bold text-emerald-300">
            {iniciales(v.nombres, v.apellidos)}
          </span>
          <div className="min-w-0">
            <p className="text-[9px] tracking-[3px] text-emerald-400/60">// SOLICITUD DE VINCULACIÓN</p>
            <h1 className="break-words text-lg font-bold leading-tight tracking-wider text-slate-100">{v.nombres} {v.apellidos}</h1>
            <p className="truncate text-xs text-slate-500">CC {v.cedula} · {v.empresa_nombre || v.empresa_codigo}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded border px-2.5 py-1 text-[10px] tracking-wider ${estado.cls}`}>{estado.label.toUpperCase()}</span>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="Escribir por WhatsApp"
            className="rounded border border-slate-700/60 p-2 text-slate-400 transition-colors hover:border-green-700/50 hover:text-green-400"><MessageCircle size={15} /></a>}
          {v.correo && <a href={`mailto:${v.correo}`} title={v.correo} aria-label="Enviar correo"
            className="rounded border border-slate-700/60 p-2 text-slate-400 transition-colors hover:border-emerald-700/50 hover:text-emerald-400"><Mail size={15} /></a>}
          {v.firma_pdf_hash ? (
            <>
              <button onClick={() => descargarFormato(false)} disabled={descargando}
                title="Copia sellada al firmar: es exactamente lo que firmó el asociado"
                className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-[10px] font-bold tracking-wider text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-50">
                {descargando ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} COPIA FIRMADA
              </button>
              <button onClick={() => descargarFormato(true)} disabled={descargando}
                title="Formato con los datos de hoy, incluidos los cambios hechos después de la firma"
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-2 text-[10px] font-bold tracking-wider text-slate-300 transition-colors hover:border-emerald-700/50 hover:text-emerald-300 disabled:opacity-50">
                <FileDown size={13} /> FORMATO ACTUAL
              </button>
            </>
          ) : (
            <button onClick={() => descargarFormato(true)} disabled={descargando} title="Descargar el formato oficial lleno (PDF)"
              className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-[10px] font-bold tracking-wider text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-50">
              {descargando ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} DESCARGAR FORMATO
            </button>
          )}
          {!entregada && (
            <button onClick={() => setConfirmar(true)} disabled={!puedeEntregar}
              title={puedeEntregar ? '' : `Falta ${faltantes.join(', ')}`}
              className="flex items-center gap-2 rounded bg-emerald-500 px-4 py-2 text-xs font-bold tracking-wider text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">
              <Send size={13} /> ENTREGAR
            </button>
          )}
        </div>
      </div>

      {/* Alerta de cumplimiento + requisitos */}
      {v.debida_diligencia_ampliada && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded border border-amber-700/40 bg-amber-900/15 p-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-200/90">
            <strong>Requiere debida diligencia ampliada.</strong> El asociado respondió “Sí” en alguna pregunta de cumplimiento (PEP). Revísala antes de entregar.
          </p>
        </div>
      )}

      {!entregada ? (
        <div className="mb-5 rounded border border-slate-800/60 p-3">
          <p className="mb-2 text-[9px] tracking-[2px] text-slate-500">REQUISITOS PARA ENTREGAR</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
            <Requisito ok={req.firma} texto="Firma del asociado" />
            <Requisito ok={req.pep} texto="Cumplimiento (PEP)" />
            <Requisito ok={req.cedula} texto="Cédula por ambas caras" />
            <Requisito ok={req.aporte} texto="Aporte definido" />
          </ul>
          {faltantes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Falta <span className="text-slate-300">{faltantes.join(', ')}</span>. El asociado puede completarlo desde su enlace,
                o lo cargas tú desde aquí.
              </p>
              <div className="flex gap-2">
                <button onClick={() => enlaceAsociado('whatsapp')} disabled={enviandoEnlace}
                        className="flex items-center gap-1.5 rounded border border-green-700/50 bg-green-900/20 px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-green-300 transition-colors hover:bg-green-900/40 disabled:opacity-50">
                  <MessageCircle size={11} /> ENVIAR ENLACE
                </button>
                <button onClick={() => enlaceAsociado('copiar')} disabled={enviandoEnlace} aria-label="Copiar enlace del asociado" title="Copiar enlace del asociado"
                        className="rounded border border-slate-700/60 p-1.5 text-slate-400 transition-colors hover:border-emerald-700/50 hover:text-emerald-400 disabled:opacity-50">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mb-5 flex items-center gap-2 rounded border border-blue-900/50 bg-blue-900/10 p-3 text-xs text-blue-300">
          <CheckCircle2 size={14} /> Entregada a procesamiento el {fechaHora(v.entregada_at)}.
        </p>
      )}

      <div className="mb-4">
        <PanelVerificacionCedula vinculacionId={id} datos={{ cedula: v.cedula, nombres: v.nombres, apellidos: v.apellidos }}
          firmada={!!v.seccion_firma_at} entregada={entregada} onCambio={cambioSubsanacion} />
      </div>
      <div className="mb-4">
        <PanelConsultaListas vinculacionId={id} entregada={entregada} onInfo={setConsulta} refrescar={`${v.cedula}|${v.nombres}|${v.apellidos}|${tick}`} />
      </div>
      {sub && <div className="mb-4"><PanelSubsanacion vinculacionId={id} sub={sub} celular={v.celular} onCambio={cambioSubsanacion} entregada={entregada} /></div>}
      {voz && <div className="mb-4"><PanelValidacionVoz vinculacionId={id} voz={voz} onRegistrado={cargarVoz} entregada={entregada} /></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cédula */}
        <Seccion titulo="CÉDULA" icono={CreditCard} hecha={req.cedula} cuando={v.seccion_documentos_at}
                 siempre={!entregada} vacio="No se cargó la cédula.">
          {!req.cedula && !entregada && (
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              Si el asociado te envió la foto por WhatsApp u otro medio, puedes cargarla aquí. Queda registrado que la cargaste tú.
            </p>
          )}
          {docs.estado === 'error' && (
            <p className="mb-3 flex items-center gap-2 text-xs text-red-400"><AlertTriangle size={13} /> No se pudieron cargar los archivos.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {docs.estado === 'cargando' && !docs.frente && !docs.reverso
              ? <div className="col-span-2 flex h-32 items-center justify-center"><Loader2 className="animate-spin text-emerald-400" size={20} /></div>
              : ['frente', 'reverso'].map(lado => (
                  <Documento key={lado} lado={lado} doc={docs[lado]} onVer={setVisor}
                             puedeSubir={!entregada} subida={subida[lado]} onElegir={subirCedula}
                             esDestino={destino === lado} onSeleccionar={(l) => setDestino(d => (d === l ? null : l))} />
                ))}
          </div>
          {!entregada && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800/60 bg-slate-900/30 px-3 py-2">
              <p className="text-[10px] leading-relaxed text-slate-500">
                Pega una imagen con <kbd className="rounded border border-slate-700 px-1 text-slate-300">Ctrl</kbd>+<kbd className="rounded border border-slate-700 px-1 text-slate-300">V</kbd>
                {ladoPegar
                  ? <> · se cargará como <strong className="text-emerald-400">{ETIQUETA_LADO[ladoPegar].toLowerCase()}</strong></>
                  : ' · haz clic en Frente o Reverso para elegir cuál reemplazar'}
              </p>
              <button onClick={pegarDesdeBoton}
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-2.5 py-1.5 text-[10px] tracking-wider text-slate-300 transition-colors hover:border-emerald-700/50 hover:text-emerald-400">
                <ClipboardPaste size={11} /> PEGAR
              </button>
            </div>
          )}
          {tieneDocs && (
            <button onClick={cargarDocs} className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300">
              <RefreshCcw size={10} /> Actualizar enlaces (caducan a los 15 min)
            </button>
          )}
        </Seccion>

        {/* Firma electrónica y su evidencia */}
        <Seccion titulo="FIRMA ELECTRÓNICA" hecha={req.firma} cuando={v.seccion_firma_at} vacio="El asociado aún no firma.">
          {v.firma_png && (
            <div className="mb-3 inline-block rounded bg-white p-2"><img src={v.firma_png} alt="Firma del asociado" className="max-h-24" /></div>
          )}
          <Rejilla>
            <Dato label="Firmada" value={fechaHora(v.firma_at)} />
            <Dato label="Verificó su identidad"
                  value={v.firma_verificacion ? `Código enviado a ${v.firma_verificacion.destino}` : 'Sin registro (firma anterior al código por correo)'} />
            <Dato label="Consentimiento de firma electrónica"
                  value={v.firma_electronica_at ? `${fechaHora(v.firma_electronica_at)} · ${v.firma_electronica_version}` : 'Sin registro'} />
            <Dato label="Autorización de datos (Ley 1581)"
                  value={v.habeas_data_at ? `${v.habeas_data_origen === 'titular' ? 'Aceptada por el asociado' : 'Declarada por el asesor'} · ${fechaHora(v.habeas_data_at)}${v.habeas_data_version ? ` · ${v.habeas_data_version}` : ''}` : 'Sin registro'} ancho />
            <Dato label="Huella del documento firmado" value={v.firma_doc_hash ? `${v.firma_doc_hash.slice(0, 16)}…` : ''} />
            <Dato label="PDF sellado al firmar" value={v.firma_pdf_hash ? `${v.firma_pdf_hash.slice(0, 16)}… · ${fechaHora(v.firma_pdf_at)}` : 'No se generó (se arma al descargar)'} />
            <Dato label="Versión de consentimiento" value={v.version_consentimiento} />
          </Rejilla>

          {v.cambios_posteriores?.length > 0 && (
            <div className="mt-4 border-t border-slate-800/60 pt-3">
              <p className="mb-2 text-[9px] uppercase tracking-[2px] text-amber-400/80">
                Cambios después de la firma ({v.cambios_posteriores.length})
              </p>
              <ul className="space-y-1">
                {v.cambios_posteriores.slice(0, 8).map((c, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[11px] text-slate-400">
                    <span><span className="text-slate-200">{ETIQUETA_SECCION[c.seccion] || c.seccion}</span> · {c.autor_tipo === 'asesor' ? 'Asesor' : 'Asociado'}</span>
                    <span className="shrink-0 text-slate-600">{fechaHora(c.created_at)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                Lo que firmó el asociado está en la copia firmada; el formato actual incluye estos cambios.
              </p>
            </div>
          )}
        </Seccion>

        <Seccion titulo="APORTES Y BENEFICIOS" icono={PiggyBank} hecha={req.aporte} cuando={v.seccion_aportes_at || v.updated_at}
                 siempre={!entregada} vacio="El asociado aún no elige su aporte."
                 accion={!entregada && (
                   <button onClick={() => setEditandoAportes(true)}
                           className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-300 transition-colors hover:bg-emerald-900/40">
                     <Pencil size={10} /> {req.aporte ? 'EDITAR' : 'DEFINIR'}
                   </button>
                 )}>
          {!req.aporte && !entregada && (
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              El asociado aún no elige su aporte. Puedes definirlo tú con lo que acordaron; queda registrado que lo hiciste tú.
            </p>
          )}
          {v.seccion_aportes_autor === 'asesor' && <p className="mb-3 text-[10px] tracking-wider text-amber-400/80">DEFINIDO POR EL ASESOR</p>}
          <Rejilla>
            <Dato label="Aporte mensual" value={dinero(v.valor_aporte)} />
            <Dato label="Descuento" value={v.periodicidad_descuento ? (v.periodicidad_descuento === 'quincenal' ? 'Quincenal' : 'Mensual') : ''} />
            <Dato label="Fondo de bienestar" value={dinero(v.valor_fondo_bienestar)} />
            <Dato label="Seguro de vida" value={v.seguro_vida_activo ? dinero(v.valor_seguro_vida) : v.seguro_vida_activo === false ? 'No' : ''} />
            <Dato label="Bono de sorteo" value={v.bono_sorteo_activo ? dinero(v.valor_bono_sorteo) : v.bono_sorteo_activo === false ? 'No' : ''} />
            <Dato label="Cuota de admisión (1er mes)" value={dinero(v.cuota_admision)} />
            {v.seccion_aportes_at && <>
              <Dato label="Total al mes" value={dinero(totalMensual)} />
              {v.periodicidad_descuento === 'quincenal' && <Dato label="Por quincena" value={dinero(totalMensual / 2)} />}
            </>}
          </Rejilla>
        </Seccion>

        <Seccion titulo="DATOS PERSONALES" hecha={!!v.seccion_personal_at} cuando={v.seccion_personal_at}>
          <Rejilla>
            <Dato label="Documento" value={[v.tipo_documento, v.cedula].filter(Boolean).join(' ')} />
            <Dato label="Expedición" value={[v.ciudad_expedicion, fecha(v.fecha_expedicion)].filter(Boolean).join(' · ')} />
            <Dato label="Nacimiento" value={fecha(v.fecha_nacimiento)} />
            <Dato label="Lugar de nacimiento" value={[v.ciudad_nacimiento, v.departamento_nacimiento].filter(Boolean).join(', ')} />
            <Dato label="Dirección" value={v.direccion_residencia} ancho />
            <Dato label="Ciudad" value={[v.ciudad_residencia, v.departamento_residencia].filter(Boolean).join(', ')} />
            <Dato label="Teléfono fijo" value={v.telefono_fijo} />
            <Dato label="Celular" value={v.celular} />
            <Dato label="Correo" value={v.correo} />
            <Dato label="Género" value={genero(v.genero)} />
            <Dato label="Estado civil" value={estadoCivil(v.estado_civil)} />
            <Dato label="Vivienda / estrato" value={[tipoVivienda(v.tipo_vivienda), v.estrato && `estrato ${v.estrato}`].filter(Boolean).join(' · ')} />
            <Dato label="Nivel académico" value={v.nivel_academico} />
            <Dato label="Profesión" value={v.profesion} />
            <Dato label="Personas a cargo" value={v.personas_a_cargo} />
            <Dato label="Cabeza de hogar / renta" value={`${siNo(v.cabeza_de_hogar) || 'No'} / ${siNo(v.declarante_de_renta) || 'No'}`} />
            {v.conyuge_nombre && <>
              <Dato label="Pareja" value={v.conyuge_nombre} />
              <Dato label="Documento pareja" value={v.conyuge_cedula} />
            </>}
          </Rejilla>
        </Seccion>

        <Seccion titulo="DATOS LABORALES" hecha={!!v.seccion_laboral_at} cuando={v.seccion_laboral_at}>
          <Rejilla>
            <Dato label="Cargo" value={v.cargo} />
            <Dato label="Contrato" value={tipoContrato(v.tipo_contrato)} />
            <Dato label="Ingreso" value={fecha(v.fecha_ingreso)} />
            <Dato label="Teléfono trabajo" value={v.telefono_trabajo} />
            <Dato label="Dirección" value={v.direccion_trabajo} ancho />
            <Dato label="Ciudad" value={[v.ciudad_trabajo, v.departamento_trabajo].filter(Boolean).join(', ')} />
            <Dato label="Maneja recursos públicos" value={siNo(v.maneja_recursos_publicos)} />
            {v.maneja_recursos_desc && <Dato label="Detalle" value={v.maneja_recursos_desc} ancho />}
          </Rejilla>
        </Seccion>

        <Seccion titulo="INFORMACIÓN FINANCIERA" hecha={!!v.seccion_financiera_at} cuando={v.seccion_financiera_at}>
          <Rejilla>
            <Dato label="Actividad" value={v.actividad_financiera} ancho />
            <Dato label="Ingresos / mes" value={dinero(v.ingresos_mensuales)} />
            <Dato label="Egresos / mes" value={dinero(v.egresos_mensuales)} />
            <Dato label="Otros ingresos" value={[dinero(v.otros_ingresos), v.otros_ingresos_desc].filter(Boolean).join(' · ')} />
            <Dato label="Activos" value={dinero(v.total_activos)} />
            <Dato label="Pasivos" value={dinero(v.total_pasivos)} />
            <Dato label="Origen de fondos" value={v.origen_fondos} ancho />
            <Dato label="Moneda extranjera" value={siNo(v.moneda_extranjera)} />
            {monedaExt && <Dato label="Detalle" value={[monedaExt.banco, monedaExt.ciudad, monedaExt.pais, monedaExt.moneda].filter(Boolean).join(' · ')} />}
          </Rejilla>
        </Seccion>

        <Seccion titulo="CUMPLIMIENTO SARLAFT" hecha={!!v.seccion_pep_at} cuando={v.seccion_pep_at}>
          <ul className="grid gap-2">
            {[
              ['Maneja recursos o bienes del Estado', v.pep_maneja_recursos_publicos],
              ['Reconocimiento público o influencia', v.pep_reconocimiento_publico],
              ['Función pública destacada (últimos 3 años)', v.pep_poder_publico],
              ['Vínculo con persona expuesta', v.pep_vinculo_expuesto],
            ].map(([t, val]) => (
              <li key={t} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">{t}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${val ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>{val ? 'SÍ' : 'NO'}</span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="BENEFICIARIOS" hecha={!!v.seccion_beneficiarios_at} cuando={v.seccion_beneficiarios_at}>
          <ul className="grid gap-2">
            {[...bens].sort((a, b) => a.orden - b.orden).map(b => (
              <li key={b.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded bg-slate-900/40 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{b.nombres}</p>
                  <p className="truncate text-[10px] text-slate-500">{[b.parentesco, b.identificacion && `CC ${b.identificacion}`, b.fecha_nacimiento && fecha(b.fecha_nacimiento)].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{Number(b.porcentaje)}%</span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="REFERENCIAS" hecha={!!v.seccion_referencias_at} cuando={v.seccion_referencias_at}>
          <ul className="grid gap-2">
            {refs.map(r => (
              <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded bg-slate-900/40 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{r.nombres}</p>
                  <p className="text-[10px] capitalize text-slate-500">{r.tipo}</p>
                </div>
                {r.celular && <a href={`tel:${r.celular}`} className="text-xs text-emerald-400 hover:text-emerald-300">{r.celular}</a>}
              </li>
            ))}
          </ul>
        </Seccion>

      </div>

      {editandoAportes && v.tarifas && (
        <PanelAportes vinculacion={v} tarifas={v.tarifas} onClose={() => setEditandoAportes(false)}
                      onGuardado={async () => { setEditandoAportes(false); await refrescarSolicitud(); }} />
      )}

      {/* Visor de imagen */}
      {visor && (
        <Modal onClose={() => setVisor(null)} ancho="max-w-3xl">
          <img src={visor.url} alt={visor.nombre} className="mx-auto max-h-[80vh] rounded" />
          <p className="mt-2 text-center text-[11px] text-slate-500">{visor.nombre}</p>
        </Modal>
      )}

      {/* Confirmar entrega */}
      {confirmar && (
        <Modal onClose={() => !entregando && setConfirmar(false)}>
          <p className="text-[9px] tracking-[3px] text-emerald-400/60">// ENTREGAR SOLICITUD</p>
          <h3 className="mt-1 text-sm font-bold tracking-wider text-slate-100">¿Entregar a procesamiento?</h3>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Vas a entregar la solicitud de <strong className="text-slate-200">{v.nombres} {v.apellidos}</strong>. Esta acción queda registrada y no se puede deshacer.
          </p>
          {v.debida_diligencia_ampliada && (
            <p className="mt-3 flex items-start gap-2 rounded border border-amber-700/40 bg-amber-900/15 p-2.5 text-[11px] text-amber-200/90">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" /> Tiene marca de debida diligencia ampliada.
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button onClick={() => setConfirmar(false)} disabled={entregando}
              className="flex-1 rounded border border-slate-700/60 py-2.5 text-xs tracking-wider text-slate-400 transition-colors hover:text-slate-200">Cancelar</button>
            <button onClick={entregar} disabled={entregando}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-emerald-500 py-2.5 text-xs font-bold tracking-wider text-white transition-all hover:bg-emerald-400 disabled:opacity-50">
              {entregando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Entregar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VinculacionDetalle;
