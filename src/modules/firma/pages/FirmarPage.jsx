import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, FileArchive, FileUp, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import CapturaFirma from '../components/CapturaFirma.jsx';
import CapturaHuella from '../components/CapturaHuella.jsx';
import VisorColocacion from '../components/VisorColocacion.jsx';
import VistaPreviaModal from '../components/VistaPreviaModal.jsx';
import { estamparPdf, inspeccionarPdf, sha256Hex, dataUrlABytes } from '../lib/estamparPdf.js';
import { ACCENT } from '../components/FirmaLayout.jsx';

const MAX_DOCS = 10;                       // por tanda (el backend también lo exige)
const MAX_MB = 20;                         // por documento
const MAX_TOTAL_MB = 100;                  // por tanda: todo vive en la memoria del navegador
const ROLES = ['asociado', 'codeudor', 'representante legal', 'testigo', 'otro'];
const TIPOS_DOC = ['CC', 'CE', 'TI', 'NIT', 'PA', 'OTRO'];
const VERSION_TEXTO = 'firma-v1.2';

const resumenDocs = (docs) => docs.map((a, i) => `${i + 1}) "${a.nombre}" (${a.paginas} pág., SHA-256 ${a.hash.slice(0, 16)}...)`).join('; ');
const textoConsentimiento = (f, docs, extra = '') =>
  `Yo, ${f.nombre}, identificado(a) con ${f.tipo_doc} ${f.num_doc}, declaro que leí ${docs.length === 1 ? 'el documento' : `los ${docs.length} documentos siguientes`}: ${resumenDocs(docs)}, `
  + `y ${docs.length === 1 ? 'lo firmo' : 'los firmo'} de manera electrónica en presencia de un funcionario de la cooperativa. Reconozco que esta firma tiene los mismos efectos que mi firma manuscrita (Ley 527 de 1999 y Decreto 2364 de 2012) `
  + 'y autorizo el tratamiento de los datos de esta firma conforme a la Ley 1581 de 2012.'
  + (f.huella ? ' Además, autorizo de forma expresa, previa e informada la captura de la imagen de mi huella dactilar, dato biométrico sensible (Ley 1581 de 2012, art. 6), '
    + 'para estamparla en este documento. Esta autorización es opcional: puedo firmar sin huella.' : '')
  + (extra ? ` ${extra}` : '');

const vacio = () => ({ nombre: '', tipo_doc: 'CC', num_doc: '', rol: 'asociado', huella: false });
const campo = 'w-full rounded-sm border border-slate-700 bg-[#08101e] px-2 py-1.5 text-xs text-[#a0d4e0] outline-none focus:border-[#38bdf8]';
const boton = 'inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold tracking-widest transition-colors disabled:opacity-40';

const Paso = ({ n, actual, titulo }) => (
  <span className={`flex items-center gap-2 text-[10px] tracking-widest ${actual === n ? 'text-[#38bdf8]' : actual > n ? 'text-emerald-400' : 'text-slate-600'}`}>
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">{actual > n ? '✓' : n}</span>{titulo}
  </span>
);

/**
 * Motor de firma presencial (tableta + huellero) reutilizable.
 *  - Sin props: la utilidad independiente (/firma), que no guarda nada.
 *  - documentosIniciales [{ id, nombre, bytes }]: documentos ya cargados (no se pueden agregar ni quitar).
 *  - firmantesIniciales  [{ nombre, tipo_doc, num_doc, rol }]: firmantes ya identificados (datos bloqueados; solo se decide la huella).
 *  - onFirmados(resultados): se llama una vez cuando TODOS los documentos quedaron firmados, con [{ id, nombre, bytes, folio, registrado }].
 *  - textoExtra / versionTexto: párrafo adicional del consentimiento (p. ej. que la cooperativa conserva el documento) y su versión.
 *  - onCancelar: cierra el motor.
 */
export const MotorFirma = ({ documentosIniciales = null, firmantesIniciales = null, onFirmados = null, onCancelar = null, textoExtra = '', versionTexto = VERSION_TEXTO }) => {
  const embebido = !!documentosIniciales;
  const avisado = useRef(false);
  const [paso, setPaso] = useState(1);                 // 1 documentos y firmantes · 2 ubicar · 3 firmar · 4 resultado
  const [archivos, setArchivos] = useState([]);       // [{ id, nombre, bytes, hash, paginas, yaFirmado }]
  const [firmantes, setFirmantes] = useState(firmantesIniciales ? firmantesIniciales.map((f) => ({ ...vacio(), ...f, fijo: true })) : [vacio()]);
  const [cajas, setCajas] = useState([]);              // [{ id, doc, firmante, tipo, pagina, x, y, w }]
  const [vistaPrevia, setVistaPrevia] = useState(null);  // id del documento que se está previsualizando
  const [docActivo, setDocActivo] = useState(null);    // id del documento que se está ubicando
  const [activo, setActivo] = useState(null);          // { firmante, tipo } armado para colocar
  const [firmas, setFirmas] = useState([]);            // [{ png, metodo, huella? }] por firmante
  const [turno, setTurno] = useState(0);
  const [captura, setCaptura] = useState(null);
  const [captHuella, setCaptHuella] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState(null);      // { hecho, total }
  const [resultados, setResultados] = useState([]);    // [{ id, nombre, estado: 'ok'|'error', url, bytes, folio, registrado, error }]
  const inputRef = useRef(null);
  const firmasRef = useRef(null);                      // firmas capturadas, solo mientras haya documentos por reintentar
  const loteRef = useRef(null);
  const urlsRef = useRef([]);

  useEffect(() => {
    if (!documentosIniciales) return undefined;
    let vivo = true;
    (async () => {
      const out = [];
      for (const d of documentosIniciales) {
        const info = await inspeccionarPdf(d.bytes);
        out.push({ id: d.id, nombre: d.nombre, bytes: d.bytes, hash: await sha256Hex(d.bytes), ...info });
      }
      if (vivo) setArchivos(out);
    })().catch((e) => toast.error(e.message || 'No se pudieron leer los documentos'));
    return () => { vivo = false; };
  }, [documentosIniciales]);

  const liberarUrls = () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); urlsRef.current = []; };
  useEffect(() => liberarUrls, []);

  const cargar = async (e) => {
    const lista = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!lista.length) return;
    let total = archivos.reduce((s, a) => s + a.bytes.length, 0);
    const nuevos = [];
    for (const f of lista) {
      if (archivos.length + nuevos.length >= MAX_DOCS) { toast.error(`Máximo ${MAX_DOCS} documentos por tanda.`); break; }
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast.error(`"${f.name}" no es un PDF.`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { toast.error(`"${f.name}" pesa más de ${MAX_MB} MB.`); continue; }
      if (total + f.size > MAX_TOTAL_MB * 1024 * 1024) { toast.error(`La tanda supera los ${MAX_TOTAL_MB} MB en total.`); break; }
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const info = await inspeccionarPdf(bytes);
        const hash = await sha256Hex(bytes);
        if ([...archivos, ...nuevos].some((a) => a.hash === hash)) { toast.error(`"${f.name}" ya está en la tanda.`); continue; }
        nuevos.push({ id: crypto.randomUUID(), nombre: f.name, bytes, hash, ...info });
        total += f.size;
      } catch (err) {
        toast.error(`${f.name}: ${err.message}`);
      }
    }
    if (nuevos.length) setArchivos((as) => [...as, ...nuevos]);
  };

  const quitarArchivo = (id) => { if (vistaPrevia === id) setVistaPrevia(null); setArchivos((as) => as.filter((a) => a.id !== id)); setCajas((cs) => cs.filter((c) => c.doc !== id)); };

  const firmantesOk = firmantes.every((f) => f.nombre.trim().length > 1 && f.num_doc.trim().length >= 3);
  const puedeColocar = archivos.length > 0 && firmantesOk;
  const nombreF = (f, i) => f.nombre || `firmante ${i + 1}`;
  // Qué falta ubicar en cada documento: la firma de cada firmante y, si toma huella, su huella
  const faltanPorDoc = useMemo(() => Object.fromEntries(archivos.map((a) => [a.id, firmantes.flatMap((f, i) => [
    ...(cajas.some((c) => c.doc === a.id && c.firmante === i && c.tipo === 'firma') ? [] : [`firma de ${nombreF(f, i)}`]),
    ...(f.huella && !cajas.some((c) => c.doc === a.id && c.firmante === i && c.tipo === 'huella') ? [`huella de ${nombreF(f, i)}`] : []),
  ])])), [archivos, firmantes, cajas]);
  const docsIncompletos = archivos.filter((a) => faltanPorDoc[a.id]?.length);

  const doc = archivos.find((a) => a.id === docActivo) ?? archivos[0];
  const cajasDoc = useMemo(() => cajas.filter((c) => c.doc === doc?.id), [cajas, doc]);
  // El visor trabaja con las cajas del documento activo; aquí se le asigna el documento a las nuevas
  const setCajasDoc = (fn) => setCajas((cs) => {
    const mias = cs.filter((c) => c.doc === doc.id);
    const nuevas = typeof fn === 'function' ? fn(mias) : fn;
    return [...cs.filter((c) => c.doc !== doc.id), ...nuevas.map((c) => ({ ...c, doc: doc.id }))];
  });

  const aplicarATodos = () => {
    setCajas((cs) => {
      const modelo = cs.filter((c) => c.doc === doc.id);
      const otras = archivos.filter((a) => a.id !== doc.id);
      return [...cs.filter((c) => c.doc === doc.id),
        ...otras.flatMap((a) => modelo.filter((c) => c.pagina < a.paginas).map((c) => ({ ...c, id: crypto.randomUUID(), doc: a.id })))];
    });
    toast.success('Ubicación aplicada a los demás documentos (las cajas que caen fuera de sus páginas se omiten).');
  };

  const reiniciar = () => {
    liberarUrls();
    firmasRef.current = null; loteRef.current = null;
    setPaso(1); setArchivos([]); setFirmantes([vacio()]); setCajas([]); setDocActivo(null); setActivo(null);
    setFirmas([]); setTurno(0); setCaptura(null); setCaptHuella(null); setAcepta(false); setResultados([]); setProgreso(null);
  };

  const confirmarFirma = () => {
    const nuevas = [...firmas, { ...captura, huella: captHuella }];
    setFirmas(nuevas);
    setCaptura(null);
    setCaptHuella(null);
    setAcepta(false);
    if (turno + 1 < firmantes.length) { setTurno(turno + 1); return; }
    firmasRef.current = nuevas;
    if (archivos.length > 1) loteRef.current = crypto.randomUUID();
    setFirmas([]);
    setPaso(4);
    generar(archivos.map((a) => a.id));
  };

  // Genera los documentos indicados (todos, o solo los que fallaron en un intento previo). Cada uno tiene su folio y su sello.
  const generar = async (ids) => {
    const lista = firmasRef.current;
    setTrabajando(true);
    setProgreso({ hecho: 0, total: ids.length });
    try {
      const firmantesSello = [];
      for (let i = 0; i < firmantes.length; i++) {
        firmantesSello.push({
          nombre: firmantes[i].nombre.trim(), tipo_doc: firmantes[i].tipo_doc, num_doc: firmantes[i].num_doc.trim(), rol: firmantes[i].rol,
          metodo_firma: lista[i].metodo, con_huella: !!lista[i].huella, h_firma_png: await sha256Hex(dataUrlABytes(lista[i].png)),
          ...(lista[i].huella ? { h_huella_png: await sha256Hex(dataUrlABytes(lista[i].huella.png)), huella_dispositivo: lista[i].huella.dispositivo } : {}),
        });
      }
      const consentimiento = `${textoConsentimiento({ nombre: '(cada firmante)', tipo_doc: '', num_doc: '', huella: firmantes.some((x) => x.huella) }, archivos, textoExtra)} [${versionTexto}]`;

      for (const id of ids) {
        const a = archivos.find((x) => x.id === id);
        const pos = archivos.indexOf(a) + 1;
        const lote = loteRef.current ? { id: loteRef.current, pos, total: archivos.length } : undefined;
        let res;
        try {
          const { data: sello } = await apiService.post('/firma/sello', {
            h_original: a.hash, nombre_archivo: a.nombre, paginas: a.paginas, firmantes: firmantesSello, ...(lote ? { lote } : {}),
          });
          const salida = await estamparPdf({
            bytes: a.bytes,
            cajas: cajas.filter((c) => c.doc === a.id),
            firmantes: firmantesSello.map((f, i) => ({ ...f, firmaPng: lista[i].png, huellaPng: lista[i].huella?.png, huellaDispositivo: f.huella_dispositivo })),
            constancia: {
              folio: sello.folio, ts: sello.ts, token: sello.token, empleado: sello.empleado, hOriginal: a.hash,
              nombreArchivo: a.nombre, textoConsentimiento: consentimiento, lote,
            },
          });
          let registrado = true;
          try { await apiService.post('/firma/registro', { folio: sello.folio, h_final: await sha256Hex(salida) }); } catch { registrado = false; }
          const url = URL.createObjectURL(new Blob([salida], { type: 'application/pdf' }));
          urlsRef.current.push(url);
          res = { id, nombre: a.nombre.replace(/\.pdf$/i, '') + '_firmado.pdf', estado: 'ok', url, bytes: salida, folio: sello.folio, registrado };
        } catch (err) {
          res = { id, nombre: a.nombre, estado: 'error', error: err.response?.data?.error || err.message || 'No se pudo generar este documento.' };
        }
        setResultados((rs) => [...rs.filter((r) => r.id !== id), res]);
        setProgreso((p) => ({ ...p, hecho: p.hecho + 1 }));
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo generar el lote.');
    } finally {
      setTrabajando(false);
    }
  };

  // Ya no quedan documentos por reintentar: las imágenes de la firma y la huella se sueltan de la memoria
  useEffect(() => {
    if (paso === 4 && !trabajando && resultados.length === archivos.length && resultados.every((r) => r.estado === 'ok')) firmasRef.current = null;
  }, [paso, trabajando, resultados, archivos.length]);

  useEffect(() => {
    if (!onFirmados || avisado.current) return;
    if (paso === 4 && !trabajando && archivos.length > 0 && resultados.length === archivos.length && resultados.every((r) => r.estado === 'ok')) {
      avisado.current = true;
      onFirmados(resultados.map((r) => ({ id: r.id, nombre: r.nombre, bytes: r.bytes, folio: r.folio, registrado: r.registrado })));
    }
  }, [paso, trabajando, resultados, archivos.length, onFirmados]);

  const reintentar = () => generar(resultados.filter((r) => r.estado === 'error').map((r) => r.id));

  const descargarZip = async () => {
    const { zipSync } = await import('fflate');
    const usados = new Set();
    const entradas = {};
    for (const r of resultados.filter((x) => x.estado === 'ok')) {
      let n = r.nombre; let k = 2;
      while (usados.has(n)) n = r.nombre.replace(/\.pdf$/i, `_${k++}.pdf`);
      usados.add(n);
      entradas[n] = r.bytes;
    }
    const url = URL.createObjectURL(new Blob([zipSync(entradas, { level: 0 })], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'documentos_firmados.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const f = firmantes[turno];
  const fallidos = resultados.filter((r) => r.estado === 'error');
  const listos = resultados.filter((r) => r.estado === 'ok');
  const orden = (r) => archivos.findIndex((a) => a.id === r.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-6 border-b border-slate-800 pb-3">
        <Paso n={1} actual={paso} titulo="DOCUMENTOS Y FIRMANTES" />
        <Paso n={2} actual={paso} titulo="UBICAR FIRMAS" />
        <Paso n={3} actual={paso} titulo="FIRMAR" />
        <Paso n={4} actual={paso} titulo="DESCARGAR" />
      </div>

      {paso === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-sm border border-slate-800 bg-[#08101e] p-5">
            <h2 className="mb-3 text-xs font-bold tracking-widest text-[#38bdf8]">1. DOCUMENTOS PDF <span className="text-slate-500">({archivos.length}/{MAX_DOCS})</span></h2>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={cargar} />
            <button type="button" disabled={archivos.length >= MAX_DOCS} onClick={() => inputRef.current?.click()} style={embebido ? { display: 'none' } : undefined}
              className={`${boton} border border-slate-600 text-[#a0d4e0] hover:border-[#38bdf8]`}>
              <FileUp size={14} /> {archivos.length ? 'Agregar más PDF' : 'Cargar PDF (hasta 10)'}
            </button>
            {archivos.length > 0 && (
              <ul className="mt-3 space-y-2 text-xs">
                {archivos.map((a, i) => (
                  <li key={a.id} className="rounded-sm border border-slate-800 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-[#a0d4e0]"><span className="text-slate-500">{i + 1}.</span> {a.nombre} · {a.paginas} pág.</p>
                      <span className="flex shrink-0 items-center gap-3">
                        <button type="button" aria-label={`Ver vista previa de ${a.nombre}`} title="Ver vista previa" onClick={() => setVistaPrevia(a.id)} className="text-[#38bdf8] hover:text-[#00e5ff]"><Eye size={15} /></button>
                        <button type="button" aria-label={`Quitar ${a.nombre}`} title="Quitar" onClick={() => quitarArchivo(a.id)} className="text-red-400" style={embebido ? { display: 'none' } : undefined}><Trash2 size={13} /></button>
                      </span>
                    </div>
                    <p className="mt-1 break-all text-[10px] text-slate-500">SHA-256 {a.hash}</p>
                    {a.yaFirmado && (
                      <p className="mt-2 flex gap-2 rounded-sm border border-amber-700 bg-amber-950/40 p-2 text-amber-300">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        Este PDF ya tiene una firma digital. Al estamparle otra firma, la anterior dejará de ser válida.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              Los firmantes firman una sola vez y esa firma se aplica a todos los documentos de la tanda; cada documento sale con su propio folio y constancia.
              {embebido
                ? 'Los documentos firmados se guardan en el expediente del crédito. La firma y la huella se procesan en este equipo y se estampan en cada PDF; Kernel registra además el hash de cada documento, los datos del firmante y el funcionario que asistió.'
                : 'Los PDF, la firma y la huella se procesan solo en este equipo: no se suben ni se guardan en el servidor. Kernel registra únicamente el hash de cada documento, los datos de identificación de los firmantes y el funcionario que asistió.'}
            </p>
          </section>

          <section className="rounded-sm border border-slate-800 bg-[#08101e] p-5">
            <h2 className="mb-3 text-xs font-bold tracking-widest text-[#38bdf8]">2. FIRMANTES</h2>
            <div className="space-y-3">
              {firmantes.map((x, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 rounded-sm border border-slate-800 p-2">
                  <input aria-label="Nombre completo" placeholder="Nombre completo" value={x.nombre} disabled={x.fijo} className={`${campo} col-span-6`}
                    onChange={(e) => setFirmantes((fs) => fs.map((y, j) => (j === i ? { ...y, nombre: e.target.value } : y)))} />
                  <select aria-label="Tipo de documento" value={x.tipo_doc} disabled={x.fijo} className={`${campo} col-span-2`}
                    onChange={(e) => setFirmantes((fs) => fs.map((y, j) => (j === i ? { ...y, tipo_doc: e.target.value } : y)))}>
                    {TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input aria-label="Número de documento" placeholder="Número" value={x.num_doc} disabled={x.fijo} className={`${campo} col-span-4`}
                    onChange={(e) => setFirmantes((fs) => fs.map((y, j) => (j === i ? { ...y, num_doc: e.target.value.replace(/[^\w-]/g, '') } : y)))} />
                  <select aria-label="Rol" value={x.rol} disabled={x.fijo} className={`${campo} col-span-3`}
                    onChange={(e) => setFirmantes((fs) => fs.map((y, j) => (j === i ? { ...y, rol: e.target.value } : y)))}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <label className="col-span-2 flex cursor-pointer items-center gap-1.5 text-[11px] text-[#a0d4e0]">
                    <input type="checkbox" checked={x.huella}
                      onChange={(e) => { setFirmantes((fs) => fs.map((y, j) => (j === i ? { ...y, huella: e.target.checked } : y))); setCajas((cs) => cs.filter((c) => !(c.firmante === i && c.tipo === 'huella'))); }} />
                    Con huella
                  </label>
                  <button type="button" aria-label="Quitar firmante" disabled={firmantes.length === 1 || x.fijo} style={x.fijo ? { display: 'none' } : undefined}
                    onClick={() => { setFirmantes((fs) => fs.filter((_, j) => j !== i)); setCajas([]); }}
                    className="col-span-1 flex items-center justify-center text-red-400 disabled:opacity-30"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button type="button" disabled={firmantes.length >= 10} onClick={() => setFirmantes((fs) => [...fs, vacio()])} style={firmantesIniciales ? { display: 'none' } : undefined}
              className={`${boton} mt-3 border border-slate-700 text-[#6aacbc] hover:text-[#38bdf8]`}><Plus size={14} /> Agregar firmante</button>
          </section>

          <div className="lg:col-span-2">
            <button type="button" disabled={!puedeColocar} onClick={() => { setDocActivo(archivos[0].id); setPaso(2); }}
              className={`${boton} text-[#020617]`} style={{ background: ACCENT }}>CONTINUAR: UBICAR FIRMAS</button>
          </div>
        </div>
      )}

      {vistaPrevia && archivos.find((a) => a.id === vistaPrevia) && (
        <VistaPreviaModal archivo={archivos.find((a) => a.id === vistaPrevia)} onClose={() => setVistaPrevia(null)} />
      )}

      {paso === 2 && doc && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-sm border border-slate-800 bg-[#08101e] p-4 lg:sticky lg:top-4">
            {archivos.length > 1 && (
              <>
                <h2 className="mb-2 text-xs font-bold tracking-widest text-[#38bdf8]">DOCUMENTOS</h2>
                <div className="mb-4 space-y-1">
                  {archivos.map((a, i) => {
                    const completo = !faltanPorDoc[a.id]?.length;
                    return (
                      <button key={a.id} type="button" onClick={() => { setDocActivo(a.id); setActivo(null); }}
                        className={`flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-left text-[11px] ${a.id === doc.id ? 'border-[#38bdf8] text-[#38bdf8]' : 'border-slate-800 text-[#a0d4e0] hover:border-slate-600'}`}>
                        <span className={completo ? 'text-emerald-400' : 'text-amber-400'}>{completo ? '✓' : '○'}</span>
                        <span className="truncate">{i + 1}. {a.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" disabled={!cajasDoc.length} onClick={aplicarATodos}
                  className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-slate-700 px-2 py-1.5 text-[11px] text-[#6aacbc] hover:text-[#38bdf8] disabled:opacity-40">
                  <Copy size={12} /> Usar esta ubicación en todos
                </button>
              </>
            )}
            <h2 className="mb-2 text-xs font-bold tracking-widest text-[#38bdf8]">UBICAR FIRMAS</h2>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">Elija un firmante y haga clic en la página donde va su firma. Arrastre la caja para moverla y use la esquina para cambiar el tamaño.</p>
            <div className="space-y-2">
              {firmantes.flatMap((x, i) => [{ i, tipo: 'firma' }, ...(x.huella ? [{ i, tipo: 'huella' }] : [])]).map(({ i, tipo }) => {
                const x = firmantes[i];
                const armado = activo?.firmante === i && activo?.tipo === tipo;
                return (
                  <button key={`${i}-${tipo}`} type="button" onClick={() => setActivo(armado ? null : { firmante: i, tipo })}
                    className={`w-full rounded-sm border px-3 py-2 text-left text-xs ${armado ? 'border-[#38bdf8] bg-[#38bdf822] text-[#38bdf8]' : 'border-slate-700 text-[#a0d4e0] hover:border-slate-500'}`}>
                    <span className="block font-bold">{armado ? '● ' : ''}{tipo === 'firma' ? 'Firma' : 'Huella'} de {nombreF(x, i)}</span>
                    <span className="text-[10px] text-slate-500">{cajasDoc.filter((c) => c.firmante === i && c.tipo === tipo).length} caja(s)</span>
                  </button>
                );
              })}
            </div>
            {docsIncompletos.length > 0 && (
              <p className="mt-3 text-[11px] text-amber-300">
                Falta ubicar: {docsIncompletos.map((a) => `${archivos.length > 1 ? `"${a.nombre}": ` : ''}${faltanPorDoc[a.id].join(', ')}`).join('; ')}.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPaso(1)} className={`${boton} border border-slate-700 text-[#6aacbc]`}>ATRÁS</button>
              <button type="button" disabled={docsIncompletos.length > 0} onClick={() => { setActivo(null); setTurno(0); setFirmas([]); setPaso(3); }}
                className={`${boton} text-[#020617]`} style={{ background: ACCENT }}>PASAR A LA FIRMA</button>
            </div>
          </aside>
          <div className="overflow-x-auto rounded-sm border border-slate-800 bg-[#0b1220] p-4">
            <VisorColocacion key={doc.id} bytes={doc.bytes} firmantes={firmantes} cajas={cajasDoc} setCajas={setCajasDoc} activo={activo} />
          </div>
        </div>
      )}

      {paso === 3 && archivos.length > 0 && f && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#020617] p-4">
          <div className="mx-auto max-w-2xl py-6">
            <p className="text-[10px] tracking-[4px] text-[#6aacbc]">FIRMANTE {turno + 1} DE {firmantes.length}</p>
            <h2 className="mt-1 text-xl font-bold text-[#38bdf8]">{f.nombre}</h2>
            <p className="text-xs text-slate-400">{f.tipo_doc} {f.num_doc} · {f.rol}</p>
            {archivos.length > 1 && (
              <div className="mt-4 rounded-sm border border-slate-800 bg-[#08101e] p-3 text-xs text-[#a0d4e0]">
                <p className="mb-1 text-[10px] tracking-widest text-[#6aacbc]">ESTA FIRMA SE APLICARÁ A {archivos.length} DOCUMENTOS</p>
                <ol className="list-decimal space-y-0.5 pl-5">{archivos.map((a) => <li key={a.id} className="truncate">{a.nombre} <span className="text-slate-500">({a.paginas} pág.)</span></li>)}</ol>
              </div>
            )}
            <p className="mt-4 rounded-sm border border-slate-800 bg-[#08101e] p-4 text-xs leading-relaxed text-[#a0d4e0]">{textoConsentimiento(f, archivos, textoExtra)}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[#a0d4e0]">
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5" />
              Leí y acepto la declaración anterior
            </label>
            <div className="mt-4">
              <p className="mb-2 text-[10px] tracking-widest text-[#6aacbc]">FIRMA</p>
              <CapturaFirma key={turno} onChange={setCaptura} />
              {captura?.metodo === 'mouse' && <p className="mt-2 text-[11px] text-amber-300">Firmada con mouse: quedará indicado en la constancia (menor valor probatorio que el lápiz de la tableta).</p>}
            </div>
            {f.huella && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] tracking-widest text-[#6aacbc]">HUELLA (LECTOR U.ARE.U 4500)</p>
                <CapturaHuella key={turno} onChange={setCaptHuella} />
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setPaso(2); setFirmas([]); setTurno(0); setCaptura(null); setCaptHuella(null); setAcepta(false); }} className={`${boton} border border-slate-700 text-[#6aacbc]`}>CANCELAR</button>
              <button type="button" disabled={!captura || !acepta || (f.huella && !captHuella)} onClick={confirmarFirma} className={`${boton} text-[#020617]`} style={{ background: ACCENT }}>
                {turno + 1 < firmantes.length ? 'CONFIRMAR Y SIGUIENTE FIRMANTE' : `CONFIRMAR Y GENERAR ${archivos.length > 1 ? `${archivos.length} DOCUMENTOS` : 'DOCUMENTO'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div className="mx-auto max-w-2xl rounded-sm border border-slate-800 bg-[#08101e] p-6">
          {trabajando && progreso && (
            <div className="mb-4">
              <p className="text-sm text-[#a0d4e0]">Generando documentos firmados… {progreso.hecho} de {progreso.total}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-[#38bdf8] transition-all" style={{ width: `${(progreso.hecho / progreso.total) * 100}%` }} /></div>
            </div>
          )}
          {!trabajando && resultados.length > 0 && (
            <div className="mb-4 text-center">
              {fallidos.length === 0
                ? <><CheckCircle2 size={36} className="mx-auto text-emerald-400" /><h2 className="mt-3 text-lg font-bold text-emerald-300">{listos.length === 1 ? 'Documento firmado' : `${listos.length} documentos firmados`}</h2></>
                : <><AlertTriangle size={36} className="mx-auto text-amber-400" /><h2 className="mt-3 text-lg font-bold text-amber-300">{listos.length} de {archivos.length} listos, {fallidos.length} con error</h2></>}
            </div>
          )}
          <ul className="space-y-2">
            {[...resultados].sort((a, b) => orden(a) - orden(b)).map((r) => (
              <li key={r.id} className="rounded-sm border border-slate-800 p-3 text-xs">
                <div className="flex items-center gap-3">
                  {r.estado === 'ok' ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> : <XCircle size={16} className="shrink-0 text-red-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[#a0d4e0]">{r.nombre}</p>
                    {r.estado === 'ok' && <p className="break-all text-[10px] text-slate-500">Folio {r.folio}</p>}
                    {r.estado === 'error' && <p className="text-[11px] text-red-300">{r.error}</p>}
                  </div>
                  {r.estado === 'ok' && (
                    <a href={r.url} download={r.nombre} className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-[#38bdf8] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#38bdf8]">
                      <Download size={12} /> PDF
                    </a>
                  )}
                </div>
                {r.estado === 'ok' && !r.registrado && (
                  <p className="mt-2 rounded-sm border border-amber-700 bg-amber-950/40 p-2 text-[11px] text-amber-300">
                    No se pudo registrar el hash de este documento: no podrá verificarse después en Kernel.
                  </p>
                )}
              </li>
            ))}
          </ul>
          {!trabajando && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {listos.length > 1 && (
                <button type="button" onClick={descargarZip} className={`${boton} text-[#020617]`} style={{ background: ACCENT }}>
                  <FileArchive size={14} /> DESCARGAR TODOS (ZIP)
                </button>
              )}
              {fallidos.length > 0 && (
                <button type="button" onClick={reintentar} className={`${boton} border border-amber-600 text-amber-300`}><RotateCcw size={14} /> REINTENTAR LOS QUE FALLARON</button>
              )}
              <button type="button" onClick={embebido ? onCancelar : reiniciar} className={`${boton} border border-slate-700 text-[#6aacbc]`}><RotateCcw size={14} /> {embebido ? 'CERRAR' : 'FIRMAR OTRA TANDA'}</button>
            </div>
          )}
          {!trabajando && (
            <p className="mt-4 text-center text-[10px] text-slate-500">
              {embebido ? 'Los documentos firmados se guardan en el expediente del crédito. No los vuelva a guardar con otro programa: eso impediría verificarlos.' : 'Kernel no guarda estos archivos. Descárguelos ahora y no los vuelva a guardar con otro programa: eso impediría verificarlos.'}
              {fallidos.length > 0 && ' Si cierra o reinicia antes de reintentar, tendrá que volver a firmar los que fallaron.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const FirmarPage = () => <MotorFirma />;

export default FirmarPage;
