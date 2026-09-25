import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Banknote, Check, CheckCircle2, Download, Eye, FileSignature, Landmark, Loader2, Stamp, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import FirmaPresencialModal from '../../creditos/components/FirmaPresencialModal.jsx';
import CabeceraDocumento, { FichaArchivo } from '../../creditos/components/CabeceraDocumento.jsx';
import Segmentado from '../../creditos/components/Segmentado.jsx';
import { Insignia, Seccion as SeccionBase } from '../../creditos/components/Piezas.jsx';
import LecturaCertificado, { camposDeLectura } from './LecturaCertificado.jsx';
import VisorSellos, { COLOR_SELLO, ROTULO_SELLO } from './VisorSellos.jsx';
import { calcular, conPosicionInicial, pasosCierre, textosSellos } from '../lib/cierre.js';
import { BANCOS, FORMAS, TIPOS_CARTERA, TIPOS_CUENTA, botonLinea, botonPrimario, campo, mensajeError, moneda } from '../../creditos/lib/formato.js';

// Misma familia visual que el resto del expediente (ver Piezas.jsx); aquí cada sección se anuncia por su título
const Seccion = (props) => <SeccionBase {...props} etiqueta={props.titulo} />;
const Etiq = ({ children }) => <span className="mb-1 block text-[10px] tracking-widest text-slate-500">{children}</span>;

// Avance del cierre: los cuatro pasos de un vistazo
const ESTILO_PASO = {
  hecho:     { caja: 'border-emerald-800/60 bg-emerald-500/[0.04]', num: 'border-emerald-600 bg-emerald-500/20 text-emerald-300', txt: 'text-emerald-300' },
  actual:    { caja: 'border-[#84cc1666] bg-[#84cc1608]', num: 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16]', txt: 'text-[#84cc16]' },
  pendiente: { caja: 'border-slate-800', num: 'border-slate-700 text-slate-500', txt: 'text-slate-500' },
};
const AvanceCierre = ({ pasos }) => (
  <ol aria-label="Avance del cierre" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
    {pasos.map((p) => (
      <li key={p.n} data-estado={p.estado} aria-current={p.estado === 'actual' ? 'step' : undefined} className={`flex items-center gap-2.5 rounded-sm border p-2.5 ${ESTILO_PASO[p.estado].caja}`}>
        <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${ESTILO_PASO[p.estado].num}`}>{p.estado === 'hecho' ? <Check size={12} /> : p.n}</span>
        <span className="min-w-0">
          <span className={`block truncate text-[10px] font-bold tracking-widest ${ESTILO_PASO[p.estado].txt}`}>{p.titulo.toUpperCase()}</span>
          <span className="block truncate text-[10px] text-slate-500">{p.detalle}</span>
        </span>
      </li>
    ))}
  </ol>
);

const bajar = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// Con responseType blob, el mensaje de error del servidor llega dentro de un Blob
const mensajeBlob = async (err, defecto) => {
  try { return JSON.parse(await err.response.data.text()).error ?? defecto; } catch { return defecto; }
};

/** Pantalla completa para ubicar los sellos sobre el comprobante firmado */
const SellosModal = ({ solicitudId, textos, inicial, onGuardar, onClose, guardando }) => {
  const [bytes, setBytes] = useState(null);
  const [error, setError] = useState('');
  const claves = Object.keys(textos);
  const [sellos, setSellos] = useState(() => conPosicionInicial(inicial, claves));

  useEffect(() => {
    let vivo = true;
    apiService.get(`/cartera/${solicitudId}/cierre/comprobante`, { responseType: 'arraybuffer' })
      .then(({ data }) => vivo && setBytes(new Uint8Array(data)))
      .catch((err) => vivo && setError(mensajeError(err, 'No se pudo cargar el comprobante')));
    return () => { vivo = false; };
  }, [solicitudId]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#020617] font-mono text-[#a0d4e0]" role="dialog" aria-label="Ubicar sellos">
      <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#08101e] px-4 py-3">
        <div>
          <p className="text-[10px] tracking-widest text-[#fbbf24]">UBICAR SELLOS EN EL COMPROBANTE</p>
          <p className="text-[11px] text-slate-400">Arrastra cada sello a donde quieras (también entre páginas). Con el teclado: flechas, y Mayús para saltos grandes.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={botonLinea}><X size={13} /> CANCELAR</button>
          <button type="button" disabled={!bytes || guardando} onClick={() => onGuardar(sellos)} className={botonPrimario}>{guardando ? 'GUARDANDO…' : 'GUARDAR SELLOS'}</button>
        </div>
      </div>
      <div className="p-4">
        <ul className="mx-auto mb-4 flex max-w-[720px] flex-wrap gap-2 text-[10px]" aria-label="Sellos a ubicar">
          {claves.map((c) => <li key={c} className="rounded-sm border px-2 py-1 font-bold" style={{ borderColor: COLOR_SELLO[c], color: COLOR_SELLO[c], background: '#ffffffee' }}>{ROTULO_SELLO[c]} · {textos[c].valor}</li>)}
        </ul>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {!error && !bytes && <p className="text-xs text-slate-400"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando el comprobante…</p>}
        {bytes && <VisorSellos bytes={bytes} sellos={sellos} onChange={setSellos} textos={textos} />}
      </div>
    </div>
  );
};

/**
 * Cierre del crédito por Cartera: carga y firma del Comprobante de aprobación y del Formato estudio de crédito, aval del fondo regional,
 * desembolso neto, sellos, PDF final y paso a Control Interno.
 */
const CUENTA_VACIA = { banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '', titular_nombre: '', titular_documento: '' };
const soloDigitos = (v) => String(v).replace(/\D/g, '');

const CierrePanel = ({ id, asociado, onCambio }) => {
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [conAval, setConAval] = useState(false);
  const [pct, setPct] = useState('');
  const [cta, setCta] = useState(CUENTA_VACIA);   // cuenta bancaria a la que se paga (solo transferencia)
  const [trabajando, setTrabajando] = useState('');
  const [modal, setModal] = useState(null);   // 'firma' | 'sellos'
  const [confirmar, setConfirmar] = useState(false);
  const inputs = useRef({});
  const [lectura, setLectura] = useState(null);   // lo que se leyó del certificado bancario (solo sugerencia)
  const prellenado = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get(`/cartera/${id}/cierre`);
      setC(data);
      setConAval(!!data.cierre.con_aval);
      setPct(data.cierre.aval_porcentaje == null ? '' : String(Number(data.cierre.aval_porcentaje)));
      setCta({ ...CUENTA_VACIA, ...Object.fromEntries(Object.keys(CUENTA_VACIA).map((k) => [k, data.cierre[k] ?? CUENTA_VACIA[k]])) });
      setError('');
    } catch (err) { setError(mensajeError(err, 'No se pudo cargar el cierre')); }
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  // Con transferencia, el certificado bancario que subió el asesor se lee en el servidor y se ofrece como sugerencia
  const pideLectura = !!c && !!c.puede_editar && c.forma_desembolso === 'transferencia';
  useEffect(() => {
    if (!pideLectura) return undefined;
    let vivo = true;
    apiService.get(`/cartera/${id}/cierre/certificado`).then(({ data }) => { if (vivo) setLectura(data); }).catch(() => {});   // sin lectura, Cartera digita como siempre
    return () => { vivo = false; };
  }, [id, pideLectura]);
  // Si la cuenta está vacía y el certificado (con texto) trae una sola, se prellena; lo leído por OCR nunca se prellena; lo que Cartera ya haya digitado o guardado nunca se pisa
  useEffect(() => {
    if (prellenado.current || lectura?.estado !== 'leido' || lectura.origen === 'ocr' || lectura.cuentas.length !== 1) return;
    prellenado.current = true;
    setCta((prev) => (!prev.banco.trim() && !prev.numero_cuenta && !prev.titular_nombre.trim() && !prev.titular_documento ? { ...prev, ...camposDeLectura(lectura, lectura.cuentas[0]) } : prev));
  }, [lectura]);

  const docs = useMemo(() => c?.documentos ?? [], [c]);
  const borrador = (tipo) => docs.find((d) => d.clase === 'a_firmar' && d.tipo === tipo && d.vigente);
  const firmadoDe = (b) => b && docs.find((d) => d.clase === 'firmado' && d.vigente && d.borrador_id === b.id);
  const pendientes = useMemo(() => Object.keys(TIPOS_CARTERA).map(borrador).filter((b) => b && !firmadoDe(b)), [docs]); // eslint-disable-line react-hooks/exhaustive-deps

  const externa = !!c?.firma_externa;
  const editable = !!c?.puede_editar;
  const valores = useMemo(() => (c ? calcular({ monto: c.valor_solicitado, conAval, porcentaje: pct, externa, tarifa: c.tarifa_firma_electronica }) : null), [c, conAval, pct, externa]);
  const textos = useMemo(() => (c ? textosSellos({ conAval, porcentaje: pct, externa }, valores) : {}), [c, conAval, pct, externa, valores]);
  const transferencia = c?.forma_desembolso === 'transferencia';
  const ctaGuardada = c ? Object.fromEntries(Object.keys(CUENTA_VACIA).map((k) => [k, c.cierre[k] ?? (k === 'tipo_cuenta' ? 'ahorros' : '')])) : null;
  const ctaLlena = cta.banco.trim().length >= 3 && cta.numero_cuenta.length >= 6 && cta.titular_nombre.trim().length >= 3 && cta.titular_documento.length >= 5;
  const ctaVacia = !cta.banco.trim() && !cta.numero_cuenta && !cta.titular_nombre.trim() && !cta.titular_documento;
  const ctaParcial = transferencia && !ctaLlena && !ctaVacia;
  const ctaCambio = transferencia && ctaLlena && JSON.stringify(cta) !== JSON.stringify(ctaGuardada);
  const pctInvalido = conAval && !(Number(pct) > 0 && Number(pct) <= 100);
  const negativo = valores && valores.neto < 0;
  // ¿Lo que se ve en pantalla ya está guardado? (para no completar con cifras sin guardar)
  const sinGuardar = c && (conAval !== !!c.cierre.con_aval || (conAval && Number(pct) !== Number(c.cierre.aval_porcentaje ?? 0)) || ctaCambio);

  const accion = async (nombre, fn, ok) => {
    setTrabajando(nombre);
    try { const r = await fn(); if (ok) toast.success(ok); await cargar(); onCambio?.(); return r; }
    catch (err) { toast.error(mensajeError(err)); return null; }
    finally { setTrabajando(''); }
  };

  const cuerpoCierre = (sellos) => ({ con_aval: conAval, ...(conAval ? { aval_porcentaje: Number(pct) } : {}), ...(sellos ? { sellos } : {}), ...(ctaCambio ? { cuenta: { ...cta, banco: cta.banco.trim(), titular_nombre: cta.titular_nombre.trim() } } : {}) });
  const guardar = () => accion('guardar', () => apiService.put(`/cartera/${id}/cierre`, cuerpoCierre()), 'Desembolso guardado');
  const guardarSellos = async (sellos) => {
    const r = await accion('sellos', () => apiService.put(`/cartera/${id}/cierre`, cuerpoCierre(sellos)), 'Sellos guardados');
    if (r) setModal(null);
  };

  const subir = (tipo, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('archivo', file);
    accion(`subir-${tipo}`, () => apiService.post(`/cartera/${id}/cierre/documentos`, fd), `${TIPOS_CARTERA[tipo]} cargado`);
  };

  const ver = async (archivoId) => {
    try {
      const { data } = await apiService.get(`/cartera/${id}/archivos/${archivoId}/url`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) { toast.error(mensajeError(err, 'No se pudo abrir el documento')); }
  };

  const pdfFinal = async () => {
    setTrabajando('pdf');
    try {
      const { data, headers } = await apiService.get(`/cartera/${id}/pdf-final`, { responseType: 'blob' });
      bajar(data, `credito_${c.radicado}.pdf`);
      const omitidos = Number(headers?.['x-documentos-omitidos'] ?? 0);
      if (omitidos) toast(`${omitidos} documento(s) no se pudieron incorporar (dañados o con contraseña): quedaron marcados en el PDF`, { icon: '⚠️' });
      else toast.success('PDF final descargado');
      onCambio?.();
    } catch (err) { toast.error(await mensajeBlob(err, 'No se pudo generar el PDF final')); }
    finally { setTrabajando(''); }
  };

  const completar = async () => {
    setConfirmar(false);
    await accion('completar', () => apiService.post(`/cartera/${id}/completar`), 'Crédito completado: pasa a Control Interno');
  };

  if (error) return <p className="text-xs text-rose-300">{error}</p>;
  if (!c) return <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando el cierre…</p>;

  const completada = c.estado === 'completada';
  const sellosAplicables = c.sellos_aplicables ?? [];
  const puestos = c.cierre.sellos ?? {};
  const comprobanteFirmado = !!firmadoDe(borrador('comprobante_aprobacion'));
  const firmadosN = Object.keys(TIPOS_CARTERA).filter((tipo) => firmadoDe(borrador(tipo))).length;
  const sellosPuestos = sellosAplicables.filter((k) => puestos[k]).length;
  const pasos = pasosCierre({ firmados: firmadosN, total: Object.keys(TIPOS_CARTERA).length, guardado: c.cierre_guardado, sinGuardar, sellosPuestos, sellosTotal: sellosAplicables.length, completada });
  const bloqueos = [
    ...c.faltantes,
    ...(sinGuardar ? ['Guarda el desembolso: hay cambios sin guardar'] : []),
  ];

  return (
    <div className="space-y-4" aria-label="Cierre de Cartera">
      {completada && (
        <p className="flex items-center gap-2 rounded-sm border border-violet-700/60 bg-violet-950/30 p-3 text-xs text-violet-200">
          <CheckCircle2 size={14} /> Cartera completó este crédito. Está en Control Interno para su validación.
        </p>
      )}

      <AvanceCierre pasos={pasos} />

      <Seccion n={1} titulo="DOCUMENTOS DE CARTERA" estado={<Insignia ok={firmadosN === Object.keys(TIPOS_CARTERA).length} texto={`${firmadosN}/${Object.keys(TIPOS_CARTERA).length} FIRMADOS`} />}>
        <ul className="space-y-2">
          {Object.entries(TIPOS_CARTERA).map(([tipo, nombre]) => {
            const b = borrador(tipo);
            const f = firmadoDe(b);
            const abrir = { aria: `Abrir ${nombre}`, titulo: 'Ver el documento', texto: 'VER', icono: Eye, onClick: () => ver((f ?? b)?.archivo_id) };
            const cargar = { aria: b ? 'REEMPLAZAR' : 'CARGAR PDF', titulo: 'Cargar el PDF', texto: b ? 'REEMPLAZAR' : 'CARGAR PDF', icono: Upload, onClick: () => inputs.current[tipo]?.click() };
            return (
              <li key={tipo} className={`rounded-sm border p-3 ${f ? 'border-emerald-800/50 bg-emerald-500/[0.03]' : b ? 'border-amber-800/50 bg-amber-500/[0.03]' : 'border-dashed border-slate-700'}`}>
                {b ? (
                  <CabeceraDocumento titulo={nombre} nombre={b.nombre} mime={b.mime_type ?? 'application/pdf'} size={b.size_bytes} fechaSubida={b.created_at} autor={b.subido_por_nombre} tono={f ? 'ok' : 'alerta'}
                    acciones={[abrir, ...(editable && !f ? [cargar] : [])]} />
                ) : (
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-12 w-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-slate-700 text-slate-600"><AlertTriangle size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#e2f3f8]">{nombre}</p>
                      <p className="text-[10px] text-slate-500">Sin cargar</p>
                    </div>
                    {editable && (
                      <button type="button" disabled={trabajando === `subir-${tipo}`} onClick={cargar.onClick} className={botonLinea}><Upload size={12} aria-hidden />{cargar.texto}</button>
                    )}
                  </div>
                )}
                {b && (
                  <p className={`mt-2 flex items-center rounded-sm px-2 py-1.5 text-[10px] ${f ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {f ? <><Check size={11} className="mr-1 shrink-0" aria-hidden />Firmado{f.folio ? ` · folio ${f.folio.slice(0, 8)}…` : ''}</> : 'Falta firmar'}
                  </p>
                )}
                {editable && !f && (
                  <input ref={(el) => { inputs.current[tipo] = el; }} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-label={`Archivo de ${nombre}`}
                    onChange={(e) => { subir(tipo, e.target.files?.[0]); e.target.value = ''; }} />
                )}
              </li>
            );
          })}
        </ul>
        {editable && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <button type="button" disabled={!pendientes.length} onClick={() => setModal('firma')} className={`${botonPrimario} w-full`}>
              <FileSignature size={13} /> FIRMAR CON EL MOTOR ({pendientes.length})
            </button>
            <p className="mt-2 text-[10px] text-slate-500">Firma el asociado en la tableta (y con su huella si quiere): una sola vez sirve para los dos documentos.</p>
          </div>
        )}
      </Seccion>

      <Seccion n={2} titulo="AVAL Y DESEMBOLSO" estado={<Insignia ok={!!c.cierre_guardado && !sinGuardar} texto={sinGuardar ? 'CAMBIOS SIN GUARDAR' : c.cierre_guardado ? 'GUARDADO' : 'SIN GUARDAR'} />}>
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado etiqueta="Aval del Fondo Regional" valor={conAval ? 'con' : 'sin'} deshabilitado={!editable} onCambiar={(v) => setConAval(v === 'con')} opciones={[['sin', 'SIN AVAL'], ['con', 'CON AVAL']]} />
          {conAval && (
            <div>
              <label htmlFor="pct-aval" className="sr-only">PORCENTAJE DEL AVAL (SOBRE EL VALOR SOLICITADO)</label>
              <div className="flex items-center gap-2">
                <input id="pct-aval" type="number" inputMode="decimal" min="0.01" max="100" step="0.01" value={pct} disabled={!editable} placeholder="% del aval"
                  onChange={(e) => setPct(e.target.value)} className={`${campo} w-32`} />
                <span className="text-xs text-slate-400">% del valor solicitado</span>
              </div>
            </div>
          )}
        </div>
        {pctInvalido && <p className="mt-2 text-[11px] text-rose-300">Indica un porcentaje entre 0,01 y 100.</p>}

        <dl className="mt-4 overflow-hidden rounded-sm border border-slate-800" aria-label="Resumen del desembolso">
          <div className="flex justify-between px-3 py-2 text-xs"><dt className="text-slate-400">Valor solicitado</dt><dd className="text-[#e2f3f8]">{moneda(c.valor_solicitado)}</dd></div>
          {conAval && <div className="flex justify-between border-t border-slate-800 px-3 py-2 text-xs text-amber-200"><dt>− Aval Fondo Regional ({Number(pct) || 0}%)</dt><dd>{moneda(valores.aval)}</dd></div>}
          {externa && <div className="flex justify-between border-t border-slate-800 px-3 py-2 text-xs text-amber-200"><dt>− Firma electrónica externa</dt><dd>{moneda(valores.firma)}</dd></div>}
          <div className="flex items-center justify-between border-t border-[#84cc1666] bg-[#84cc1608] px-3 py-3"><dt className="text-[10px] font-bold tracking-widest text-[#84cc16]">DESEMBOLSO</dt><dd className="text-xl font-bold text-[#84cc16]">{moneda(valores.neto)}</dd></div>
        </dl>
        {negativo && <p className="mt-2 text-[11px] text-rose-300">Los descuentos superan el valor solicitado.</p>}
        {externa && c.tarifa_firma_electronica === 0 && <p className="mt-2 text-[11px] text-amber-300">La tarifa de la firma electrónica está en $0. Configúrala en Reportes para que se descuente.</p>}

        {transferencia ? (
          <fieldset className="mt-5 rounded-sm border border-slate-800 bg-[#0a1322] p-4" aria-label="Cuenta bancaria del asociado">
            <legend className="flex items-center gap-2 px-1 text-[10px] font-bold tracking-widest text-[#84cc16]"><Landmark size={13} aria-hidden />CUENTA A LA QUE SE PAGA</legend>
            <LecturaCertificado lectura={lectura} cta={cta} editable={editable} onUsar={(cuenta) => setCta((prev) => ({ ...prev, ...camposDeLectura(lectura, cuenta) }))} />
            <p className="mb-3 text-[10px] text-slate-500">Copia los datos tal como aparecen en el certificado bancario.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><Etiq>BANCO</Etiq>
                <input list="bancos-sugeridos" value={cta.banco} disabled={!editable} onChange={(e) => setCta({ ...cta, banco: e.target.value })} className={campo} autoComplete="off" />
                <datalist id="bancos-sugeridos">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist></label>
              <label className="block"><Etiq>TIPO DE CUENTA</Etiq>
                <select value={cta.tipo_cuenta} disabled={!editable} onChange={(e) => setCta({ ...cta, tipo_cuenta: e.target.value })} className={campo}>
                  {Object.entries(TIPOS_CUENTA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
              <label className="block"><Etiq>NÚMERO DE CUENTA</Etiq>
                <input inputMode="numeric" value={cta.numero_cuenta} disabled={!editable} onChange={(e) => setCta({ ...cta, numero_cuenta: soloDigitos(e.target.value).slice(0, 20) })} className={campo} autoComplete="off" /></label>
              <label className="block"><Etiq>DOCUMENTO DEL TITULAR</Etiq>
                <input value={cta.titular_documento} disabled={!editable} onChange={(e) => setCta({ ...cta, titular_documento: e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 20) })} className={campo} autoComplete="off" /></label>
              <label className="block sm:col-span-2"><Etiq>NOMBRE DEL TITULAR</Etiq>
                <input value={cta.titular_nombre} disabled={!editable} onChange={(e) => setCta({ ...cta, titular_nombre: e.target.value })} className={campo} autoComplete="off" /></label>
            </div>
            {editable && (
              <button type="button" onClick={() => setCta({ ...cta, titular_nombre: `${asociado.nombre} ${asociado.apellido}`.replace(/\s+/g, ' ').trim(), titular_documento: asociado.codigo })} className={`${botonLinea} mt-3`}>
                EL TITULAR ES EL ASOCIADO
              </button>
            )}
            {ctaParcial && <p className="mt-3 flex items-start gap-2 rounded-sm border border-amber-800/60 bg-amber-500/[0.05] p-2 text-[11px] text-amber-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />Completa todos los datos de la cuenta (o déjalos vacíos).</p>}
            {ctaLlena && cta.titular_documento.toUpperCase() !== String(asociado.codigo).toUpperCase() && (
              <p className="mt-3 flex items-start gap-2 rounded-sm border border-rose-800/60 bg-rose-500/[0.05] p-2 text-[11px] text-rose-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />El titular NO es el asociado (C.C. {asociado.codigo}). Control Interno lo revisará como pago a un tercero.</p>
            )}
          </fieldset>
        ) : (
          <p className="mt-5 flex items-start gap-3 rounded-sm border border-slate-800 bg-[#0a1322] p-3 text-[11px] text-slate-400">
            <Banknote size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
            <span>Desembolso por <strong className="text-[#a0d4e0]">{(FORMAS[c.forma_desembolso] ?? c.forma_desembolso).toUpperCase()}</strong> a nombre de {asociado.nombre} {asociado.apellido} (C.C. {asociado.codigo}). No requiere cuenta bancaria.</span>
          </p>
        )}
        {editable && (
          <button type="button" disabled={pctInvalido || negativo || ctaParcial || trabajando === 'guardar'} onClick={guardar} className={`${botonPrimario} mt-4`}>
            {trabajando === 'guardar' ? 'GUARDANDO…' : 'GUARDAR DESEMBOLSO'}
          </button>
        )}
      </Seccion>

      <Seccion n={3} titulo="SELLOS SOBRE EL COMPROBANTE" estado={<Insignia ok={sellosAplicables.length > 0 && sellosPuestos === sellosAplicables.length} texto={`${sellosPuestos}/${sellosAplicables.length} UBICADOS`} />}>
        <ul className="grid gap-2 sm:grid-cols-3" aria-label="Sellos a ubicar">
          {sellosAplicables.map((k) => (
            <li key={k} className="rounded-sm border bg-[#0a1322] p-3" style={{ borderColor: `${COLOR_SELLO[k]}88` }}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ background: COLOR_SELLO[k] }} />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold tracking-widest text-[#e2f3f8]">{ROTULO_SELLO[k]}</p>
                  {textos[k] && <p className="truncate text-xs text-[#a0d4e0]">{textos[k].valor}</p>}
                </div>
              </div>
              <p className={`mt-2 flex items-center gap-1 text-[10px] ${puestos[k] ? 'text-emerald-400' : 'text-amber-400'}`}>
                {puestos[k] ? <CheckCircle2 size={11} aria-hidden /> : <AlertTriangle size={11} aria-hidden />}
                {puestos[k] ? `Página ${puestos[k].pagina + 1}` : 'Sin ubicar'}
              </p>
            </li>
          ))}
        </ul>
        {editable && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <button type="button" disabled={!comprobanteFirmado || sinGuardar || pctInvalido || negativo} onClick={() => setModal('sellos')} className={botonLinea}>
              <Stamp size={13} /> UBICAR SELLOS
            </button>
            {!comprobanteFirmado && <p className="mt-2 text-[10px] text-slate-500">Primero firma el comprobante de aprobación.</p>}
            {comprobanteFirmado && sinGuardar && <p className="mt-2 text-[10px] text-amber-300">Guarda el desembolso antes de ubicar los sellos.</p>}
          </div>
        )}
      </Seccion>

      <Seccion n={4} titulo="DOCUMENTO FINAL Y CIERRE" estado={completada ? <Insignia ok texto="COMPLETADO" /> : <Insignia ok={c.puede_completar && !sinGuardar} texto={c.puede_completar && !sinGuardar ? 'LISTO PARA COMPLETAR' : 'FALTAN PASOS'} />}>
        {editable && bloqueos.length > 0 && (
          <div className="mb-3 rounded-sm border border-amber-800/50 bg-amber-500/[0.03] p-3">
            <p className="mb-2 text-[10px] font-bold tracking-widest text-amber-300">LO QUE FALTA</p>
            <ul className="space-y-1 text-[11px] text-amber-200" aria-label="Lo que falta">
              {bloqueos.map((x) => <li key={x} className="flex items-start gap-2"><AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />{x}</li>)}
            </ul>
          </div>
        )}
        {editable && bloqueos.length === 0 && <p className="mb-3 flex items-center gap-2 rounded-sm border border-emerald-800/50 bg-emerald-500/[0.05] p-3 text-[11px] text-emerald-300"><CheckCircle2 size={14} aria-hidden />El cierre está completo: puedes descargar el PDF final y marcarlo como completado.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!comprobanteFirmado || trabajando === 'pdf'} onClick={pdfFinal} className={botonLinea}>
            <Download size={13} /> {trabajando === 'pdf' ? 'ARMANDO PDF…' : 'DESCARGAR PDF FINAL'}
          </button>
          {editable && (
            <button type="button" disabled={!c.puede_completar || sinGuardar || trabajando === 'completar'} onClick={() => setConfirmar(true)} className={botonPrimario}>
              MARCAR COMPLETADO
            </button>
          )}
        </div>
        <p className="mt-3 text-[10px] text-slate-500">El PDF final reúne todos los anexos en orden: comprobante (con sellos), estudio, documentos firmados, autorización de la empresa y soportes.</p>
      </Seccion>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-label="Confirmar cierre">
          <div className="w-full max-w-md rounded-sm border border-slate-700 bg-[#08101e] p-5 text-xs">
            <p className="mb-2 text-[11px] font-bold tracking-widest text-[#84cc16]">MARCAR COMPLETADO</p>
            <p>El crédito pasa a Control Interno con un desembolso de <strong>{moneda(valores.neto)}</strong>. Los valores quedan congelados y ya no podrás modificarlo.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmar(false)} className={botonLinea}>CANCELAR</button>
              <button type="button" onClick={completar} className={botonPrimario}>SÍ, COMPLETAR</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'firma' && (
        <FirmaPresencialModal solicitudId={id} asociado={asociado} pendientes={pendientes}
          urlContenido={(p) => `/cartera/${id}/cierre/documentos/${p.id}/contenido`} urlFirmado={`/cartera/${id}/cierre/firmado`}
          onClose={() => { setModal(null); cargar(); }} onTerminado={() => { cargar(); onCambio?.(); }} />
      )}
      {modal === 'sellos' && (
        <SellosModal solicitudId={id} textos={textos} inicial={puestos} guardando={trabajando === 'sellos'} onGuardar={guardarSellos} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default CierrePanel;
