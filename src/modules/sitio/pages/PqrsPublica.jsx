import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Copy, Loader2, MailWarning, Search, Send } from 'lucide-react';
import api from '../api.js';
import { ACCENTS, BRAND } from '../compartido.js';
import { URL_POLITICA_PRIVACIDAD } from '../config.js';
import LayoutSitio from '../components/LayoutSitio.jsx';

const TIPOS_DEFECTO = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia', felicitacion: 'Felicitación' };
const AYUDA_TIPO = {
  peticion: 'Pides información o un trámite',
  queja: 'Inconformidad con una persona o un servicio',
  reclamo: 'Algo que no se hizo bien y debe corregirse',
  sugerencia: 'Una idea para mejorar',
  felicitacion: 'Reconocer una buena atención',
};
const ESTADO = {
  recibida:    { t: 'Recibida',    d: 'Ya registramos tu solicitud y pronto la revisará una persona del equipo.' },
  en_revision: { t: 'En revisión', d: 'Estamos revisando tu solicitud.' },
  respondida:  { t: 'Respondida',  d: 'Ya tiene respuesta.' },
  cerrada:     { t: 'Cerrada',     d: 'Tu solicitud fue atendida y cerrada.' },
};
const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

const VACIO = { tipo: '', nombre: '', email: '', telefono: '', empresa: '', asunto: '', mensaje: '', acepta: false, sitio_web: '' };
const inputCls = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#065B8E] focus:ring-4 focus:ring-[#065B8E]/15';

const Campo = ({ id, etiqueta, opcional, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">{etiqueta}{opcional && <span className="font-normal text-slate-400"> (opcional)</span>}</label>
    {children}
  </div>
);

// Mensaje legible del error de la API (validación 400 con detalle, límite 429, etc.)
const mensajeError = (err) => {
  const d = err.response?.data;
  const campos = Object.values(d?.detalles?.fieldErrors || {}).flat();
  if (campos.length) return campos[0];
  if (d?.error) return d.error;
  return 'No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos.';
};

const Copiable = ({ etiqueta, valor }) => {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(valor); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* sin portapapeles */ }
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{etiqueta}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="select-all font-mono text-2xl font-extrabold tracking-wider text-slate-900">{valor}</span>
        <button type="button" onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-[#065B8E] hover:bg-[#E8F1F7]">
          {ok ? <><CheckCircle2 size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}
        </button>
      </div>
    </div>
  );
};

const Radicada = ({ r, plazo, onOtra }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl text-center">
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: ACCENTS.verde.soft, color: BRAND.verde }}><CheckCircle2 size={36} /></span>
    <h2 className="mt-5 text-3xl font-extrabold text-slate-900">Recibimos tu solicitud</h2>
    <p className="mt-3 text-lg text-slate-600">
      Te responderemos a más tardar el <strong>{fecha(r.vence)}</strong> ({plazo} días hábiles).
    </p>
    <div className="mt-6 grid gap-3">
      <Copiable etiqueta="Número de radicado" valor={r.radicado} />
      <Copiable etiqueta="Código de seguimiento" valor={r.codigo} />
    </div>
    <p className="mt-5 rounded-xl border-l-4 border-[#5B9C3C] bg-[#CDEEE8] p-4 text-left text-base text-slate-800">
      <strong>Guarda estos dos datos.</strong> Con ellos consultas el estado de tu solicitud. El código solo se muestra esta vez.
    </p>
    {r.correo_enviado
      ? <p className="mt-4 text-base text-slate-600">También te los enviamos a tu correo.</p>
      : <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-left text-base text-red-800"><MailWarning size={20} className="mt-0.5 shrink-0" /> No pudimos enviarte el correo de confirmación. Anota el radicado y el código de arriba.</p>}
    <button type="button" onClick={onOtra} className="mt-6 rounded-xl px-5 py-3 text-base font-bold text-[#065B8E] hover:bg-[#E8F1F7]">Enviar otra solicitud</button>
  </motion.div>
);

const Formulario = ({ config, onListo }) => {
  const [f, setF] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const tipos = config?.tipos || TIPOS_DEFECTO;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.tipo) return setError('Elige el tipo de solicitud');
    setEnviando(true);
    try {
      const { data } = await api.post('/pqrs/pub', {
        tipo: f.tipo, nombre: f.nombre, email: f.email, telefono: f.telefono, empresa: f.empresa, asunto: f.asunto, mensaje: f.mensaje,
        acepta_habeas_data: f.acepta, version_habeas_data: config?.version_habeas_data || 'pqrs-hd-v1.0', sitio_web: f.sitio_web,
      });
      onListo(data);
      setF(VACIO);
    } catch (err) { setError(mensajeError(err)); }
    finally { setEnviando(false); }
  };

  return (
    <form onSubmit={enviar} className="mx-auto grid max-w-2xl gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" noValidate>
      <fieldset>
        <legend className="text-sm font-bold text-slate-700">¿Qué quieres hacer?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {Object.entries(tipos).map(([k, nombre]) => (
            <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition ${f.tipo === k ? 'border-[#065B8E] bg-[#E8F1F7]' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="tipo" value={k} checked={f.tipo === k} onChange={set('tipo')} className="mt-1 h-4 w-4 accent-[#065B8E]" />
              <span><span className="block text-base font-bold text-slate-900">{nombre}</span><span className="text-sm text-slate-500">{AYUDA_TIPO[k]}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre completo"><input id="nombre" className={inputCls} value={f.nombre} onChange={set('nombre')} autoComplete="name" required /></Campo>
        <Campo id="email" etiqueta="Correo electrónico"><input id="email" type="email" className={inputCls} value={f.email} onChange={set('email')} autoComplete="email" required /></Campo>
        <Campo id="telefono" etiqueta="Teléfono" opcional><input id="telefono" type="tel" className={inputCls} value={f.telefono} onChange={set('telefono')} autoComplete="tel" /></Campo>
        <Campo id="empresa" etiqueta="Empresa donde trabajas" opcional><input id="empresa" className={inputCls} value={f.empresa} onChange={set('empresa')} /></Campo>
      </div>
      <Campo id="asunto" etiqueta="Asunto"><input id="asunto" className={inputCls} value={f.asunto} onChange={set('asunto')} maxLength={150} required /></Campo>
      <Campo id="mensaje" etiqueta="Cuéntanos qué pasó o qué necesitas">
        <textarea id="mensaje" rows={6} className={inputCls} value={f.mensaje} onChange={set('mensaje')} maxLength={4000} required />
      </Campo>

      {/* Campo trampa: una persona no lo ve; los robots suelen llenarlo */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>No llenar este campo<input tabIndex={-1} autoComplete="off" value={f.sitio_web} onChange={set('sitio_web')} /></label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-600">
        <input type="checkbox" checked={f.acepta} onChange={set('acepta')} className="mt-1 h-5 w-5 shrink-0 accent-[#065B8E]" />
        <span>
          Autorizo a la Cooperativa Progresemos a tratar mis datos personales para gestionar y responder esta solicitud, según su{' '}
          <a href={URL_POLITICA_PRIVACIDAD} target="_blank" rel="noopener noreferrer" className="font-bold text-[#065B8E] underline">política de privacidad</a> (Ley 1581 de 2012).
        </span>
      </label>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3.5 text-base text-red-700">{error}</p>}
      <button type="submit" disabled={enviando} className="inline-flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-extrabold text-white shadow-md transition hover:brightness-110 disabled:opacity-60" style={{ background: BRAND.azul }}>
        {enviando ? <><Loader2 className="animate-spin" size={20} /> Enviando…</> : <><Send size={20} /> Enviar solicitud</>}
      </button>
    </form>
  );
};

const Consulta = () => {
  const [radicado, setRadicado] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState(null);

  const consultar = async (e) => {
    e.preventDefault();
    setError(''); setRes(null); setCargando(true);
    try {
      const { data } = await api.post('/pqrs/pub/consulta', { radicado: radicado.trim(), codigo: codigo.trim() });
      setRes(data);
    } catch (err) {
      setError(err.response?.status === 404
        ? 'No encontramos una solicitud con esos datos. Revisa el radicado y el código.'
        : mensajeError(err));
    } finally { setCargando(false); }
  };

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={consultar} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" noValidate>
        <Campo id="c-radicado" etiqueta="Número de radicado">
          <input id="c-radicado" className={`${inputCls} font-mono uppercase`} placeholder="PQRS-2026-000123" value={radicado} onChange={(e) => setRadicado(e.target.value)} autoComplete="off" required />
        </Campo>
        <Campo id="c-codigo" etiqueta="Código de seguimiento">
          <input id="c-codigo" className={`${inputCls} font-mono uppercase`} placeholder="8 caracteres" maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" required />
        </Campo>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3.5 text-base text-red-700">{error}</p>}
        <button type="submit" disabled={cargando} className="inline-flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-extrabold text-white shadow-md transition hover:brightness-110 disabled:opacity-60" style={{ background: BRAND.azul }}>
          {cargando ? <><Loader2 className="animate-spin" size={20} /> Consultando…</> : <><Search size={20} /> Consultar estado</>}
        </button>
      </form>

      {res && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-live="polite">
          <p className="font-mono text-sm font-bold text-slate-500">{res.radicado} · {res.tipo_nombre}</p>
          <h2 className="mt-1 break-words text-xl font-extrabold text-slate-900">{res.asunto}</h2>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-extrabold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>
            <Clock size={16} /> {ESTADO[res.estado]?.t || res.estado}
          </p>
          <p className="mt-3 text-base text-slate-600">{ESTADO[res.estado]?.d}</p>
          <p className="mt-2 text-sm text-slate-500">Radicada el {fecha(res.radicada_at)}{res.vence_at && !res.respuesta ? ` · Respuesta a más tardar el ${fecha(res.vence_at)}` : ''}</p>
          {res.respuesta && (
            <div className="mt-5 rounded-2xl bg-[#F1F7EC] p-4">
              <p className="text-sm font-extrabold text-[#3F7A25]">Respuesta de la cooperativa{res.respondida_at ? ` · ${fecha(res.respondida_at)}` : ''}</p>
              <p className="mt-2 whitespace-pre-line break-words text-base leading-relaxed text-slate-800">{res.respuesta}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const PqrsPublica = () => {
  const [vista, setVista] = useState(() => (window.location.hash === '#consulta' ? 'consulta' : 'nueva'));
  const [config, setConfig] = useState(null);
  const [radicada, setRadicada] = useState(null);

  useEffect(() => {
    let vivo = true;
    api.get('/pqrs/pub/config').then(({ data }) => vivo && setConfig(data)).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const pestana = (k, t) => (
    <button type="button" role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
            className={`flex-1 rounded-xl px-4 py-3 text-base font-bold transition ${vista === k ? 'bg-white text-[#065B8E] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{t}</button>
  );

  return (
    <LayoutSitio titulo="PQRS" descripcion="Envía una petición, queja, reclamo, sugerencia o felicitación a la Cooperativa Progresemos y consulta el estado con tu radicado.">
      <section className="px-4 pb-6 pt-12 md:px-8 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">Peticiones, quejas, reclamos y sugerencias</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
            Cuéntanos y te respondemos por correo{config ? ` en máximo ${config.plazo_dias_habiles} días hábiles` : ''}. Al enviar recibes un radicado y un código para consultar el estado.
          </p>
        </motion.div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div role="tablist" aria-label="PQRS" className="mx-auto mb-6 flex max-w-md gap-1 rounded-2xl bg-slate-200/70 p-1">
          {pestana('nueva', 'Enviar solicitud')}
          {pestana('consulta', 'Consultar estado')}
        </div>
        {vista === 'nueva'
          ? (radicada
            ? <Radicada r={radicada} plazo={config?.plazo_dias_habiles ?? 15} onOtra={() => setRadicada(null)} />
            : <Formulario config={config} onListo={(d) => { setRadicada(d); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)
          : <Consulta />}
      </section>
    </LayoutSitio>
  );
};

export default PqrsPublica;
