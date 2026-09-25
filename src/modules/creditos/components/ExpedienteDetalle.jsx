import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Eye, FilePlus2, FileSignature, Download, Loader2, Mail, PenLine, ShieldCheck, Trash2, UserRoundCog, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal from './Modal.jsx';
import Timeline from './Timeline.jsx';
import FirmaPresencialModal from './FirmaPresencialModal.jsx';
import CierrePanel from '../../cartera/components/CierrePanel.jsx';
import ProgresoCredito from './ProgresoCredito.jsx';
import CabeceraDocumento from './CabeceraDocumento.jsx';
import { siguientePaso } from '../lib/progreso.js';
import { Etiqueta } from './TablaSolicitudes.jsx';
import {
  AUT_ESTADOS, CANALES_AUT, ESTADOS_EDITABLES, FORMAS, MODALIDADES, TIPOS_A_FIRMAR, campo, boton, botonLinea, botonPrimario,
  fecha, fechaHora, hoyISO, mensajeError, moneda, tipoDoc,
} from '../lib/formato.js';

const etiqueta = 'mb-1 block text-[10px] tracking-widest text-slate-500';
const Seccion = ({ titulo, estado, children, accion }) => (
  <section className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#84cc16]">{titulo}{estado}</h3>
      {accion}
    </div>
    {children}
  </section>
);
const Insignia = ({ ok, texto }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}{texto}</span>
);
// Color del borde de cada ronda de autorización según cómo terminó
const BORDE_AUT = { aprobada: 'border-emerald-800/50 bg-emerald-500/[0.03]', rechazada: 'border-rose-800/50 bg-rose-500/[0.03]', solicitada: 'border-amber-800/50 bg-amber-500/[0.03]', sin_destinatario: 'border-rose-800/50 bg-rose-500/[0.03]', invalidada: 'border-slate-800 opacity-70' };
const BORDE_PILDORA = { aprobada: 'border-emerald-700/60', rechazada: 'border-rose-700/60', solicitada: 'border-amber-700/60', sin_destinatario: 'border-rose-700/60', invalidada: 'border-slate-700' };
const Cifra = ({ k, v, destacado = false, chica = false }) => (
  <div className={`rounded-sm border p-3 ${destacado ? 'border-[#84cc1666] bg-[#84cc1608]' : 'border-slate-800 bg-[#08101e]'}`}>
    <dt className="text-[9px] tracking-widest text-slate-500">{k}</dt>
    <dd className={`mt-1 font-bold ${chica ? 'text-sm text-[#a0d4e0]' : 'text-xl'} ${destacado ? 'text-[#84cc16]' : chica ? '' : 'text-[#e2f3f8]'}`}>{v}</dd>
  </div>
);
// Qué sigue y quién lo hace, siempre a la vista
const SiguientePaso = ({ s, p, faltantes }) => {
  const x = siguientePaso(s, p, faltantes);
  return (
    <section aria-label="Siguiente paso" className={`rounded-sm border p-4 ${x.terminado ? 'border-slate-700 bg-[#08101e]' : 'border-[#84cc1666] bg-[#84cc1608]'}`}>
      <h3 className="mb-2 text-[11px] font-bold tracking-widest text-[#84cc16]">{x.terminado ? 'ESTADO FINAL' : 'SIGUIENTE PASO'}</h3>
      {x.quien && <p className="mb-1 text-[10px] tracking-widest text-slate-500">LO HACE: <span className="font-bold text-[#a0d4e0]">{x.quien.toUpperCase()}</span></p>}
      <p className="text-xs text-[#a0d4e0]">{x.texto}</p>
      {x.restantes > 0 && <p className="mt-1 text-[10px] text-slate-500">y {x.restantes} más por completar</p>}
    </section>
  );
};
const Dato = ({ k, v }) => <div><dt className="text-[9px] tracking-widest text-slate-500">{k}</dt><dd className="text-xs text-[#a0d4e0]">{v}</dd></div>;

/**
 * Expediente de una solicitud de crédito.
 *  modo 'asesor': el asesor gestiona documentos, firma, autorización y entrega.  api = '/creditos'
 *  modo 'cartera': Cartera revisa, verifica integridad, recibe o devuelve.       api = '/cartera'
 */
const ExpedienteDetalle = ({ id, api, modo, volver }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);           // { tipo, ...datos }
  const [trabajando, setTrabajando] = useState('');
  const [integridad, setIntegridad] = useState(null); // { docId: bool }
  const [faltantesEntrega, setFaltantesEntrega] = useState(null);
  const inputBorrador = useRef(null);
  const [tipoBorrador, setTipoBorrador] = useState('pagare');

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get(`${api}/${id}`);
      setD(data);
      setError('');
    } catch (err) {
      setError(err.response?.status === 404 ? 'No se encontró la solicitud (o no tienes acceso a ella).' : mensajeError(err, 'No se pudo cargar la solicitud'));
    }
  }, [api, id]);
  useEffect(() => { cargar(); }, [cargar]);

  const s = d?.solicitud;
  const p = d?.pistas;
  // El servidor decide quién modifica: el asesor de la solicitud o un administrador (y solo mientras esté en trámite o devuelta)
  const editable = modo === 'asesor' && !!d?.puede_editar;

  // Los documentos que Cartera carga al cerrar (comprobante y estudio) se trabajan en el panel de cierre, no en las secciones del asesor
  const docs = (d?.documentos ?? []).filter((x) => x.etapa !== 'cartera');
  const aFirmar = useMemo(() => docs.filter((x) => x.clase === 'a_firmar' && x.vigente), [docs]);
  const firmadoDe = (b) => docs.find((x) => x.clase === 'firmado' && x.vigente && x.borrador_id === b.id);
  const evidenciaDe = (b) => docs.find((x) => x.clase === 'evidencia_externa' && x.vigente && x.borrador_id === b.id);
  const pendientes = useMemo(() => aFirmar.filter((b) => !docs.some((x) => x.clase === 'firmado' && x.vigente && x.borrador_id === b.id)), [aFirmar, docs]);
  const adjuntos = docs.filter((x) => x.clase === 'adjunto' && x.vigente);
  const retirados = docs.filter((x) => !x.vigente);
  const ronda = d?.autorizaciones?.[0];

  const accion = async (nombre, fn, ok) => {
    setTrabajando(nombre);
    try { const r = await fn(); if (ok) toast.success(typeof ok === 'function' ? ok(r) : ok); await cargar(); return r; }
    catch (err) { toast.error(mensajeError(err)); if (err.response?.data?.faltantes) setFaltantesEntrega(err.response.data.faltantes); return null; }
    finally { setTrabajando(''); }
  };

  const ver = async (archivoId) => {
    try {
      const { data } = await apiService.get(`${api}/${id}/archivos/${archivoId}/url`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
      cargar();   // la consulta queda en la línea de tiempo
    } catch (err) { toast.error(mensajeError(err, 'No se pudo abrir el documento')); }
  };

  // Descarga todo el expediente (documentos firmados, autorización, documentos del asociado y resumen con huellas) en un ZIP
  const descargarExpediente = async () => {
    setTrabajando('expediente');
    try {
      const { data } = await apiService.get(`${api}/${id}/expediente`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `expediente_${s.radicado}.zip`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('Expediente descargado');
      cargar();   // la descarga queda en el historial
    } catch (err) {
      // Con responseType blob, el mensaje de error del servidor llega dentro de un Blob
      let msg = 'No se pudo descargar el expediente';
      try { msg = JSON.parse(await err.response.data.text()).error ?? msg; } catch { /* sin detalle */ }
      toast.error(msg);
    } finally { setTrabajando(''); }
  };

  const subirArchivo = (url, campos, archivos) => {
    const fd = new FormData();
    Object.entries(campos).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    Object.entries(archivos).forEach(([k, f]) => { if (f) fd.append(k, f); });
    return apiService.post(url, fd);
  };

  if (error) return <div><p className="text-xs text-rose-300">{error}</p><Link to={volver} className={`${botonLinea} mt-3`}><ArrowLeft size={13} /> VOLVER</Link></div>;
  if (!d) return <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>;

  const a = d.asociado;
  const nombreAsociado = `${a.nombre} ${a.apellido}`.replace(/\s+/g, ' ').trim();
  const certificadoReq = p.certificado_requerido;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={volver} className="mb-2 inline-flex items-center gap-1 text-[10px] tracking-widest text-[#6aacbc] hover:text-[#00e5ff]"><ArrowLeft size={12} /> VOLVER</Link>
          <h2 className="flex flex-wrap items-center gap-3 text-lg font-bold text-[#84cc16]">{s.radicado} <Etiqueta estado={s.estado} /></h2>
          <p className="text-[11px] text-slate-500">Radicada el {fechaHora(s.created_at)} por {s.asesor_nombre}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modo === 'asesor' && d.puede_reasignar && <button type="button" onClick={() => setModal({ tipo: 'reasignar' })} className={botonLinea}><UserRoundCog size={13} /> REASIGNAR</button>}
          {editable && <button type="button" onClick={() => setModal({ tipo: 'editar' })} className={botonLinea}>EDITAR CONDICIONES</button>}
          {editable && <button type="button" onClick={() => setModal({ tipo: 'cerrar' })} className={botonLinea}>DESISTIR / CERRAR</button>}
          {modo === 'cartera' && ['entregada', 'recibida'].includes(s.estado) && (
            <button type="button" disabled={trabajando === 'expediente'} onClick={descargarExpediente} className={botonPrimario}>
              <Download size={13} /> {trabajando === 'expediente' ? 'PREPARANDO…' : 'DESCARGAR EXPEDIENTE (ZIP)'}
            </button>
          )}
          {modo === 'cartera' && (
            <button type="button" disabled={trabajando === 'integridad'} className={botonLinea}
              onClick={() => accion('integridad', async () => { const { data } = await apiService.get(`${api}/${id}/integridad`); setIntegridad(Object.fromEntries(data.map((x) => [x.id, x.integro]))); return data; },
                (r) => (r.every((x) => x.integro) ? 'Todos los documentos coinciden con su huella digital' : 'Hay documentos que NO coinciden con su huella digital'))}>
              <ShieldCheck size={13} /> VERIFICAR INTEGRIDAD
            </button>
          )}
        </div>
      </div>

      {modo === 'asesor' && !d.puede_editar && ESTADOS_EDITABLES.includes(s.estado) && (
        <p className="rounded-sm border border-slate-700 p-3 text-xs text-slate-400">Solo lectura: esta solicitud la gestiona <b className="text-[#a0d4e0]">{s.asesor_nombre}</b>. Solo el asesor de la solicitud o un administrador puede modificarla.</p>
      )}

      {s.estado === 'devuelta' && (
        <p className="flex gap-2 rounded-sm border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span><b>Cartera devolvió esta solicitud:</b> {s.devuelta_motivo}. Corrígela y vuelve a entregarla.</span></p>
      )}
      {['rechazada', 'desistida'].includes(s.estado) && <p className="rounded-sm border border-slate-700 p-3 text-xs text-slate-400">Cerrada: {s.cierre_motivo}</p>}

      {/* Progreso */}
      <ProgresoCredito s={s} p={p} />

      {/* Cifras clave */}
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumen del crédito">
        <Cifra k="VALOR SOLICITADO" v={moneda(s.valor_solicitado)} />
        <Cifra k="A DESEMBOLSAR" destacado v={s.monto_desembolso == null ? <span className="text-sm font-normal text-slate-500">Lo calcula Cartera</span> : moneda(s.monto_desembolso)} />
        <Cifra k="FORMA DE DESEMBOLSO" v={FORMAS[s.forma_desembolso]} chica />
        <Cifra k="CUOTAS" v={s.cuotas ? `${s.cuotas} × ${moneda(s.cuota_mensual)}` : (s.cuota_mensual ? moneda(s.cuota_mensual) : '—')} chica />
      </dl>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Columna principal: lo que se trabaja */}
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4">
          {/* Pista 1: firma */}
          <Seccion titulo="1 · DOCUMENTOS FIRMADOS" estado={<Insignia ok={p.firma_completa} texto={`${p.firmados}/${p.a_firmar}`} />}>
            <ul className="space-y-2 text-xs">
              {aFirmar.length === 0 && <li className="text-slate-500">Aún no hay documentos a firmar.</li>}
              {aFirmar.map((b) => {
                const f = firmadoDe(b);
                const ev = evidenciaDe(b);
                return (
                  <li key={b.id} className={`rounded-sm border p-3 ${f ? 'border-emerald-800/50 bg-emerald-500/[0.03]' : 'border-amber-800/50 bg-amber-500/[0.03]'}`}>
                    <CabeceraDocumento titulo={tipoDoc(b.tipo)} nombre={b.nombre} mime={b.mime_type} size={b.size_bytes} fechaSubida={b.created_at} autor={b.subido_por_nombre} tono={f ? 'ok' : 'alerta'}
                      acciones={[
                        { aria: `Ver ${b.nombre}`, titulo: 'Ver el documento a firmar', texto: 'VER', icono: Eye, onClick: () => ver(b.archivo_id) },
                        ...(editable && !f ? [{ aria: `Quitar ${b.nombre}`, titulo: 'Quitar', texto: 'QUITAR', icono: Trash2, peligro: true, onClick: () => accion('quitar', () => apiService.delete(`${api}/${id}/documentos/${b.id}`), 'Documento retirado') }] : []),
                      ]} />
                    {f ? (
                      <p className="mt-2 flex items-center justify-between rounded-sm bg-emerald-500/10 px-2 py-1.5 text-[10px] text-emerald-400">
                        <span><Check size={11} className="mr-1 inline" />Firmado {f.folio ? `· folio ${f.folio.slice(0, 8)}…` : `· ${f.proveedor ?? 'externo'}`}{integridad && (integridad[f.id] ? ' · íntegro ✓' : ' · ¡NO COINCIDE!')}</span>
                        <span className="flex gap-2"><button type="button" onClick={() => ver(f.archivo_id)} className="underline">firmado</button>{ev && <button type="button" onClick={() => ver(ev.archivo_id)} className="underline">evidencia</button>}</span>
                      </p>
                    ) : (
                      <p className="mt-2 flex items-center justify-between rounded-sm bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-400">
                        <span>Pendiente de firma</span>
                        {editable && s.modalidad_firma === 'externa' && <button type="button" onClick={() => setModal({ tipo: 'externa', doc: b })} className="underline">registrar firma externa</button>}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {editable && (
              <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                <div className="flex gap-2">
                  <select value={tipoBorrador} onChange={(e) => setTipoBorrador(e.target.value)} className={campo} aria-label="Tipo de documento a firmar">{Object.entries(TIPOS_A_FIRMAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input ref={inputBorrador} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    if (f) accion('borrador', () => subirArchivo(`/creditos/${id}/documentos/borrador`, { tipo: tipoBorrador }, { archivo: f }), 'Documento cargado');
                  }} />
                  <button type="button" disabled={trabajando === 'borrador'} onClick={() => inputBorrador.current?.click()} className={`${botonLinea} shrink-0`}><FilePlus2 size={13} /> SUBIR PDF</button>
                </div>
                {s.modalidad_firma === 'presencial' && pendientes.length > 0 && (
                  <button type="button" onClick={() => setModal({ tipo: 'presencial', pendientes })} className={`${botonPrimario} w-full`}><PenLine size={13} /> FIRMAR CON EL ASOCIADO ({pendientes.length})</button>
                )}
              </div>
            )}
          </Seccion>

          {/* Pista 2: autorización de la empresa */}
          <Seccion titulo="2 · AUTORIZACIÓN DE LA EMPRESA" estado={s.autorizacion_requerida ? <Insignia ok={p.autorizacion_ok} texto={p.autorizacion_ok ? 'AUTORIZADA' : (AUT_ESTADOS[p.autorizacion_estado]?.t ?? 'PENDIENTE')} /> : <span className="text-[10px] text-slate-500">N/A</span>}>
            {!s.autorizacion_requerida ? <p className="text-xs text-slate-500">Esta empresa no exige autorización para este crédito.</p> : (
              <>
                <ul className="space-y-2 text-xs">
                  {d.autorizaciones.length === 0 && <li className="text-slate-500">{s.autorizacion_momento === 'despues_firma' ? 'El correo a la empresa saldrá cuando la firma quede completa.' : 'Aún no se ha pedido.'}</li>}
                  {d.autorizaciones.map((r) => (
                    <li key={r.id} className={`rounded-sm border p-3 ${BORDE_AUT[r.estado] ?? 'border-slate-800'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-widest ${BORDE_PILDORA[r.estado] ?? 'border-slate-700'} ${AUT_ESTADOS[r.estado]?.c}`}>{AUT_ESTADOS[r.estado]?.t ?? r.estado}</span>
                        <span className="text-[10px] text-slate-600">Ronda del {fecha(r.created_at)}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {r.enviada_a?.length > 0 && <p className="flex items-start gap-1.5 text-[10px] text-slate-400"><Mail size={11} className="mt-0.5 shrink-0" aria-hidden /><span>Enviada a {r.enviada_a.join(', ')} · {fechaHora(r.enviada_at)}</span></p>}
                        {r.estado === 'sin_destinatario' && <p className="flex items-start gap-1.5 text-[10px] text-rose-300"><AlertTriangle size={11} className="mt-0.5 shrink-0" aria-hidden /><span>No hay a quién pedírsela o el correo no salió. Indica un correo y envíala.</span></p>}
                        {r.fecha_autorizacion && <p className="flex items-start gap-1.5 text-[10px] text-slate-300"><FileSignature size={11} className="mt-0.5 shrink-0" aria-hidden /><span>Fecha de la autorización: {fecha(r.fecha_autorizacion)} · {CANALES_AUT[r.canal] ?? r.canal}{r.cuota_autorizada ? ` · cuota ${moneda(r.cuota_autorizada)}` : ''}</span></p>}
                        {r.motivo_rechazo && <p className="flex items-start gap-1.5 text-[10px] text-rose-300"><XCircle size={11} className="mt-0.5 shrink-0" aria-hidden /><span>Motivo: {r.motivo_rechazo}</span></p>}
                      </div>
                      {r.archivo_id && (
                        <div className="mt-3 rounded-sm border border-slate-800 bg-[#0a1322] p-2">
                          <CabeceraDocumento titulo="Respuesta de la empresa" nombre={r.archivo_nombre ?? 'soporte'} fechaSubida={r.registrada_at} autor={r.registrado_por_nombre} tono={r.estado === 'aprobada' ? 'ok' : 'neutro'}
                            acciones={[{ aria: 'ver soporte', titulo: 'Ver el soporte de la respuesta', texto: 'VER SOPORTE', icono: Eye, onClick: () => ver(r.archivo_id) }]} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {editable && !p.autorizacion_ok && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                    <button type="button" onClick={() => setModal({ tipo: 'enviar' })} className={botonLinea}><Mail size={13} /> {d.autorizaciones.length ? 'ENVIAR DE NUEVO' : 'ENVIAR CORREO'}</button>
                    <button type="button" onClick={() => setModal({ tipo: 'registrar' })} className={botonPrimario}><FileSignature size={13} /> REGISTRAR RESPUESTA</button>
                  </div>
                )}
              </>
            )}
          </Seccion>

          {/* Pista 3: documentos del asociado */}
          <Seccion titulo="3 · DOCUMENTOS DEL ASOCIADO" estado={<Insignia ok={p.documentos_ok} texto={p.documentos_ok ? 'COMPLETOS' : 'FALTAN'} />}>
            <ul className="space-y-2 text-xs">
              {[['desprendible_nomina', 'Desprendible de nómina', true], ['certificado_bancario', 'Certificado bancario', certificadoReq]].map(([tipo, nombre, requerido]) => {
                const lista = adjuntos.filter((x) => x.tipo === tipo);
                if (!requerido && lista.length === 0) return <li key={tipo} className="text-[10px] text-slate-600">{nombre}: no se exige ({FORMAS[s.forma_desembolso].toLowerCase()})</li>;
                return (
                  <li key={tipo} className={`rounded-sm border p-3 ${lista.length ? 'border-slate-800 bg-[#0a1322]' : 'border-dashed border-amber-800/60 bg-amber-500/[0.03]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#e2f3f8]">{nombre}</span>
                      {lista.length ? <Insignia ok texto="CARGADO" /> : <Insignia ok={false} texto="FALTA" />}
                    </div>
                    {lista.length === 0 && <p className="mt-2 text-[10px] text-slate-500">Todavía no hay ningún archivo. Sube un PDF o una foto legible.</p>}
                    {lista.map((x) => (
                      <div key={x.id} className="mt-2 rounded-sm border border-slate-800 p-2">
                        <CabeceraDocumento titulo={nombre} nombre={x.nombre} mime={x.mime_type} size={x.size_bytes} fechaSubida={x.created_at} autor={x.subido_por_nombre} tono="neutro"
                          acciones={[
                            { aria: `Ver ${x.nombre}`, titulo: 'Ver el archivo', texto: 'VER', icono: Eye, onClick: () => ver(x.archivo_id) },
                            ...(editable ? [{ aria: `Quitar ${x.nombre}`, titulo: 'Quitar', texto: 'QUITAR', icono: Trash2, peligro: true, onClick: () => accion('quitar', () => apiService.delete(`${api}/${id}/documentos/${x.id}`), 'Documento retirado') }] : []),
                          ]} />
                      </div>
                    ))}
                    {editable && (
                      <label className="mt-2 inline-block cursor-pointer text-[10px] text-[#84cc16] underline">
                        {lista.length ? 'reemplazar / agregar otro' : 'subir archivo'}
                        <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) accion('adjunto', () => subirArchivo(`/creditos/${id}/documentos/adjunto`, { tipo }, { archivo: f }), `${nombre} cargado`); }} />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </Seccion>

          </div>
        {/* Entrega */}
        {editable && (
          <Seccion titulo="ENTREGA A CARTERA">
            {d.faltantes.length > 0 ? (
              <ul className="mb-3 list-disc space-y-0.5 pl-5 text-xs text-amber-300">{d.faltantes.map((x) => <li key={x}>{x}</li>)}</ul>
            ) : <p className="mb-3 text-xs text-emerald-300">El expediente está completo y listo para entregar.</p>}
            {faltantesEntrega && <p className="mb-2 text-[11px] text-rose-300">No se pudo entregar: {faltantesEntrega.join('; ')}</p>}
            <button type="button" disabled={!p.listo || trabajando === 'entregar'} className={botonPrimario}
              onClick={() => accion('entregar', () => apiService.post(`/creditos/${id}/entregar`), 'Solicitud entregada a Cartera')}>ENTREGAR A CARTERA</button>
          </Seccion>
        )}
        {modo === 'cartera' && s.estado === 'entregada' && (
          <Seccion titulo="DECISIÓN DE CARTERA">
            {!p.expediente_completo && <p className="mb-3 text-xs text-amber-300">Atención: el expediente ya no está completo (algo perdió vigencia después de entregarse).</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={trabajando === 'recibir'} className={botonPrimario} onClick={() => accion('recibir', () => apiService.post(`/cartera/${id}/recibir`), 'Expediente recibido')}><CheckCircle2 size={13} /> RECIBIR EXPEDIENTE</button>
              <button type="button" className={`${boton} border-rose-700 text-rose-300 hover:bg-rose-950/40`} onClick={() => setModal({ tipo: 'devolver' })}><XCircle size={13} /> DEVOLVER AL ASESOR</button>
            </div>
          </Seccion>
        )}

        {modo === 'cartera' && ['recibida', 'completada'].includes(s.estado) && <CierrePanel id={id} asociado={a} onCambio={cargar} />}


        </div>

        {/* Columna lateral: contexto y siguiente paso */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <SiguientePaso s={s} p={p} faltantes={d.faltantes} />
          <Seccion titulo="ASOCIADO">
            <dl className="space-y-3">
              <Dato k="NOMBRE" v={<>{nombreAsociado}<span className="block text-[10px] text-slate-500">C.C. {a.codigo} · {a.movil ?? 'sin celular'}</span></>} />
              <Dato k="EMPRESA" v={s.empresa_nombre} />
              <Dato k="CATEGORÍA" v={s.categoria} />
              <Dato k="SOLICITADO POR" v={s.canal_origen === 'whatsapp' ? 'WhatsApp' : 'Presencial'} />
            </dl>
          </Seccion>
          <Seccion titulo="CONDICIONES">
            <dl className="space-y-3">
              <Dato k="FIRMA" v={<>{MODALIDADES[s.modalidad_firma]}{s.proveedor_externo && <span className="block text-[10px] text-slate-500">{s.proveedor_externo}</span>}</>} />
              <Dato k="AUTORIZACIÓN DE LA EMPRESA" v={s.autorizacion_requerida ? 'Requerida' : 'No requerida'} />
              {s.override_motivo && <Dato k="EXCEPCIÓN A LA POLÍTICA" v={s.override_motivo} />}
              {s.observaciones && <Dato k="OBSERVACIONES" v={s.observaciones} />}
            </dl>
          </Seccion>
        </aside>
      </div>

      {retirados.length > 0 && <p className="text-[10px] text-slate-600">{retirados.length} documento(s) sin vigencia (retirados o invalidados por un cambio de condiciones) se conservan en el historial.</p>}

      <Seccion titulo="HISTORIAL"><Timeline eventos={d.eventos} /></Seccion>

      {/* Modales */}
      {modal?.tipo === 'presencial' && (
        <FirmaPresencialModal solicitudId={id} asociado={a} pendientes={modal.pendientes} onClose={() => { setModal(null); cargar(); }} onTerminado={cargar} />
      )}
      {modal?.tipo === 'externa' && (
        <ModalFirmaExterna doc={modal.doc} proveedor={s.proveedor_externo} onClose={() => setModal(null)}
          onEnviar={(campos, archivos) => accion('externa', () => subirArchivo(`/creditos/${id}/firma-externa`, { borrador_id: modal.doc.id, ...campos }, archivos), 'Firma registrada').then((r) => r && setModal(null))} enviando={trabajando === 'externa'} />
      )}
      {modal?.tipo === 'enviar' && (
        <ModalEnviarAutorizacion previos={ronda?.enviada_a ?? []} onClose={() => setModal(null)} enviando={trabajando === 'enviar'}
          onEnviar={(emails) => accion('enviar', async () => (await apiService.post(`/creditos/${id}/autorizacion/enviar`, emails.length ? { emails } : {})).data,
            (r) => (r.resultado === 'solicitada' ? 'Correo enviado a la empresa' : 'No se pudo enviar el correo: revisa la dirección')).then((r) => r && setModal(null))} />
      )}
      {modal?.tipo === 'registrar' && (
        <ModalRegistrarAutorizacion onClose={() => setModal(null)} enviando={trabajando === 'registrar'}
          onEnviar={(campos, archivo) => accion('registrar', () => subirArchivo(`/creditos/${id}/autorizacion/registrar`, campos, { archivo }), 'Respuesta de la empresa registrada').then((r) => r && setModal(null))} />
      )}
      {modal?.tipo === 'editar' && (
        <ModalEditar s={s} p={p} onClose={() => setModal(null)} enviando={trabajando === 'editar'}
          onEnviar={(cambios) => accion('editar', async () => (await apiService.put(`/creditos/${id}`, cambios)).data,
            (r) => (r.invalidados ? 'Condiciones actualizadas: hay que volver a firmar y a pedir la autorización' : 'Condiciones actualizadas')).then((r) => r && setModal(null))} />
      )}
      {modal?.tipo === 'reasignar' && (
        <ModalReasignar actual={s.asesor_uuid} onClose={() => setModal(null)} enviando={trabajando === 'reasignar'}
          onEnviar={(cuerpo) => accion('reasignar', () => apiService.post(`/creditos/${id}/reasignar`, cuerpo), 'Solicitud reasignada').then((r) => r && setModal(null))} />
      )}
      {modal?.tipo === 'cerrar' && (
        <ModalMotivo titulo="DESISTIR / CERRAR LA SOLICITUD" etiquetaBoton="CERRAR SOLICITUD" opciones={{ desistida: 'El asociado desistió', rechazada: 'La solicitud fue rechazada' }} onClose={() => setModal(null)} enviando={trabajando === 'cerrar'}
          onEnviar={({ opcion, motivo }) => accion('cerrar', () => apiService.post(`/creditos/${id}/cerrar`, { estado: opcion, motivo }), 'Solicitud cerrada').then((r) => r && setModal(null))} />
      )}
      {modal?.tipo === 'devolver' && (
        <ModalMotivo titulo="DEVOLVER AL ASESOR" etiquetaBoton="DEVOLVER" onClose={() => setModal(null)} enviando={trabajando === 'devolver'} placeholder="¿Qué debe corregir el asesor?"
          onEnviar={({ motivo }) => accion('devolver', () => apiService.post(`/cartera/${id}/devolver`, { motivo }), 'Solicitud devuelta al asesor').then((r) => r && setModal(null))} />
      )}
    </div>
  );
};

// ── Modales ──────────────────────────────────────────────────────────────────
const Pie = ({ onClose, enviando, texto, deshabilitado }) => (
  <div className="mt-4 flex justify-end gap-2">
    <button type="button" onClick={onClose} className={botonLinea}>CANCELAR</button>
    <button type="submit" disabled={enviando || deshabilitado} className={botonPrimario}>{enviando ? 'GUARDANDO…' : texto}</button>
  </div>
);
const soloDigitos = (v) => v.replace(/\D/g, '');

const ModalFirmaExterna = ({ doc, proveedor, onClose, onEnviar, enviando }) => {
  const [v, setV] = useState({ proveedor: proveedor ?? '', id_transaccion: '', fecha_firma: hoyISO() });
  const [archivo, setArchivo] = useState(null);
  const ok = v.proveedor.trim().length >= 2 && v.fecha_firma && archivo;
  return (
    <Modal titulo={`REGISTRAR FIRMA EXTERNA · ${tipoDoc(doc.tipo).toUpperCase()}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar({ proveedor: v.proveedor.trim(), id_transaccion: v.id_transaccion.trim(), fecha_firma: v.fecha_firma }, { archivo }); }} className="space-y-3">
        <label className="block"><span className={etiqueta}>PROVEEDOR</span><input value={v.proveedor} onChange={(e) => setV({ ...v, proveedor: e.target.value })} className={campo} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={etiqueta}>ID DE LA TRANSACCIÓN (OPCIONAL)</span><input value={v.id_transaccion} onChange={(e) => setV({ ...v, id_transaccion: e.target.value })} className={campo} /></label>
          <label className="block"><span className={etiqueta}>FECHA DE LA FIRMA</span><input type="date" max={hoyISO()} value={v.fecha_firma} onChange={(e) => setV({ ...v, fecha_firma: e.target.value })} className={campo} /></label>
        </div>
        <label className="block"><span className={etiqueta}>PDF FIRMADO</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-[11px]" /></label>
        <Pie onClose={onClose} enviando={enviando} texto="REGISTRAR FIRMA" deshabilitado={!ok} />
      </form>
    </Modal>
  );
};

const ModalEnviarAutorizacion = ({ previos, onClose, onEnviar, enviando }) => {
  const [txt, setTxt] = useState(previos.join(', '));
  const emails = txt.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const malos = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return (
    <Modal titulo="PEDIR AUTORIZACIÓN A LA EMPRESA" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar(emails); }} className="space-y-3">
        <label className="block"><span className={etiqueta}>CORREO(S) DE LA EMPRESA</span>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="nomina@empresa.com" className={campo} />
          <span className="mt-1 block text-[10px] text-slate-500">Déjalo vacío para usar el configurado de la empresa. La respuesta llegará a tu correo.</span></label>
        {malos.length > 0 && <p className="text-[11px] text-rose-300">Correo inválido: {malos.join(', ')}</p>}
        <Pie onClose={onClose} enviando={enviando} texto="ENVIAR CORREO" deshabilitado={malos.length > 0} />
      </form>
    </Modal>
  );
};

const ModalRegistrarAutorizacion = ({ onClose, onEnviar, enviando }) => {
  const [v, setV] = useState({ decision: 'aprobada', fecha_autorizacion: hoyISO(), canal: 'correo', cuota_autorizada: '', motivo_rechazo: '' });
  const [archivo, setArchivo] = useState(null);
  const aprueba = v.decision === 'aprobada';
  const ok = aprueba ? (v.fecha_autorizacion && archivo) : v.motivo_rechazo.trim().length >= 3;
  return (
    <Modal titulo="REGISTRAR RESPUESTA DE LA EMPRESA" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar({ decision: v.decision, canal: v.canal, ...(aprueba ? { fecha_autorizacion: v.fecha_autorizacion, cuota_autorizada: v.cuota_autorizada } : { motivo_rechazo: v.motivo_rechazo.trim() }) }, archivo); }} className="space-y-3">
        <div className="flex gap-4 text-xs">
          <label className="flex cursor-pointer items-center gap-2"><input type="radio" checked={aprueba} onChange={() => setV({ ...v, decision: 'aprobada' })} /> La empresa AUTORIZA</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="radio" checked={!aprueba} onChange={() => setV({ ...v, decision: 'rechazada' })} /> La empresa RECHAZA</label>
        </div>
        <label className="block"><span className={etiqueta}>MEDIO DE LA RESPUESTA</span><select value={v.canal} onChange={(e) => setV({ ...v, canal: e.target.value })} className={campo}>{Object.entries(CANALES_AUT).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        {aprueba ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className={etiqueta}>FECHA DE LA AUTORIZACIÓN</span><input type="date" max={hoyISO()} value={v.fecha_autorizacion} onChange={(e) => setV({ ...v, fecha_autorizacion: e.target.value })} className={campo} /></label>
              <label className="block"><span className={etiqueta}>CUOTA AUTORIZADA (OPCIONAL)</span><input inputMode="numeric" value={v.cuota_autorizada} onChange={(e) => setV({ ...v, cuota_autorizada: soloDigitos(e.target.value) })} className={campo} /></label>
            </div>
            <label className="block"><span className={etiqueta}>SOPORTE — PDF DEL CORREO DE LA EMPRESA (OBLIGATORIO)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-[11px]" /></label>
          </>
        ) : (
          <>
            <label className="block"><span className={etiqueta}>MOTIVO DEL RECHAZO</span><input value={v.motivo_rechazo} onChange={(e) => setV({ ...v, motivo_rechazo: e.target.value })} className={campo} maxLength={500} /></label>
            <label className="block"><span className={etiqueta}>SOPORTE (OPCIONAL)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-[11px]" /></label>
          </>
        )}
        <Pie onClose={onClose} enviando={enviando} texto="REGISTRAR" deshabilitado={!ok} />
      </form>
    </Modal>
  );
};

const ModalEditar = ({ s, p, onClose, onEnviar, enviando }) => {
  const [v, setV] = useState({
    valor_solicitado: String(Math.round(s.valor_solicitado)),
    cuotas: s.cuotas ? String(s.cuotas) : '', cuota_mensual: s.cuota_mensual ? String(Math.round(s.cuota_mensual)) : '', forma_desembolso: s.forma_desembolso, observaciones: s.observaciones ?? '',
  });
  const cambiaCondiciones = String(Math.round(s.valor_solicitado)) !== v.valor_solicitado
    || String(s.cuotas ?? '') !== v.cuotas || String(s.cuota_mensual ? Math.round(s.cuota_mensual) : '') !== v.cuota_mensual;
  const pierde = cambiaCondiciones && (p.firmados > 0 || p.autorizacion_estado === 'aprobada');
  const ok = Number(v.valor_solicitado) > 0;
  const enviar = (e) => {
    e.preventDefault();
    onEnviar({ valor_solicitado: Number(v.valor_solicitado), forma_desembolso: v.forma_desembolso,
      ...(v.cuotas ? { cuotas: Number(v.cuotas) } : {}), ...(v.cuota_mensual ? { cuota_mensual: Number(v.cuota_mensual) } : {}),
      ...(v.observaciones.trim() ? { observaciones: v.observaciones.trim() } : {}) });
  };
  return (
    <Modal titulo="EDITAR CONDICIONES" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={etiqueta}>VALOR SOLICITADO</span><input inputMode="numeric" value={v.valor_solicitado} onChange={(e) => setV({ ...v, valor_solicitado: soloDigitos(e.target.value) })} className={campo} /></label>
          <label className="block"><span className={etiqueta}>CUOTAS</span><input inputMode="numeric" value={v.cuotas} onChange={(e) => setV({ ...v, cuotas: soloDigitos(e.target.value) })} className={campo} /></label>
          <label className="block"><span className={etiqueta}>CUOTA MENSUAL</span><input inputMode="numeric" value={v.cuota_mensual} onChange={(e) => setV({ ...v, cuota_mensual: soloDigitos(e.target.value) })} className={campo} /></label>
        </div>
        <label className="block"><span className={etiqueta}>FORMA DE DESEMBOLSO</span><select value={v.forma_desembolso} onChange={(e) => setV({ ...v, forma_desembolso: e.target.value })} className={campo}>{Object.entries(FORMAS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <label className="block"><span className={etiqueta}>OBSERVACIONES</span><textarea rows={2} value={v.observaciones} onChange={(e) => setV({ ...v, observaciones: e.target.value })} className={campo} /></label>
        {pierde && <p className="flex gap-2 rounded-sm border border-amber-700 bg-amber-950/40 p-2 text-[11px] text-amber-300"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Cambiar el valor o las cuotas hace que los documentos ya firmados y la autorización de la empresa pierdan vigencia: habrá que volver a firmar y a pedir la autorización.</p>}
        <Pie onClose={onClose} enviando={enviando} texto="GUARDAR CAMBIOS" deshabilitado={!ok} />
      </form>
    </Modal>
  );
};

const ModalReasignar = ({ actual, onClose, onEnviar, enviando }) => {
  const [asesores, setAsesores] = useState(null);
  const [nuevo, setNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  useEffect(() => { apiService.get('/creditos/asesores').then(({ data }) => setAsesores(data.filter((u) => u.id !== actual))).catch((err) => { toast.error(mensajeError(err, 'No se pudo cargar la lista de asesores')); setAsesores([]); }); }, [actual]);
  return (
    <Modal titulo="REASIGNAR SOLICITUD" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar({ asesor_uuid: nuevo, motivo: motivo.trim() }); }} className="space-y-3">
        <p className="text-[11px] leading-relaxed text-slate-400">La solicitud pasará al asesor que elijas: quien la tenía dejará de verla y ya no podrá modificarla. Queda registrado en el historial.</p>
        <label className="block"><span className={etiqueta}>NUEVO ASESOR</span>
          <select value={nuevo} onChange={(e) => setNuevo(e.target.value)} className={campo} disabled={!asesores}>
            <option value="">{asesores ? 'Selecciona…' : 'Cargando…'}</option>
            {asesores?.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.email}</option>)}
          </select></label>
        <label className="block"><span className={etiqueta}>MOTIVO</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el asesor está de vacaciones" className={campo} maxLength={500} /></label>
        <Pie onClose={onClose} enviando={enviando} texto="REASIGNAR" deshabilitado={!nuevo || motivo.trim().length < 3} />
      </form>
    </Modal>
  );
};

const ModalMotivo = ({ titulo, etiquetaBoton, opciones, placeholder = 'Motivo', onClose, onEnviar, enviando }) => {
  const [opcion, setOpcion] = useState(opciones ? Object.keys(opciones)[0] : null);
  const [motivo, setMotivo] = useState('');
  return (
    <Modal titulo={titulo} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar({ opcion, motivo: motivo.trim() }); }} className="space-y-3">
        {opciones && <select value={opcion} onChange={(e) => setOpcion(e.target.value)} className={campo}>{Object.entries(opciones).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>}
        <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={placeholder} className={campo} maxLength={500} autoFocus />
        <Pie onClose={onClose} enviando={enviando} texto={etiquetaBoton} deshabilitado={motivo.trim().length < 3} />
      </form>
    </Modal>
  );
};

export default ExpedienteDetalle;
