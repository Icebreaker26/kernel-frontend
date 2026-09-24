import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, FileSignature, Loader2, Stamp, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import FirmaPresencialModal from '../../creditos/components/FirmaPresencialModal.jsx';
import VisorSellos, { COLOR_SELLO, ROTULO_SELLO } from './VisorSellos.jsx';
import { calcular, conPosicionInicial, textosSellos } from '../lib/cierre.js';
import { BANCOS, FORMAS, TIPOS_CARTERA, TIPOS_CUENTA, botonLinea, botonPrimario, campo, mensajeError, moneda } from '../../creditos/lib/formato.js';

const Seccion = ({ titulo, children }) => (
  <section className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
    <h3 className="mb-3 text-[11px] font-bold tracking-widest text-[#fbbf24]">{titulo}</h3>
    {children}
  </section>
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

      <Seccion titulo="1. DOCUMENTOS DE CARTERA (SE CARGAN Y SE FIRMAN)">
        <ul className="space-y-2">
          {Object.entries(TIPOS_CARTERA).map(([tipo, nombre]) => {
            const b = borrador(tipo);
            const f = firmadoDe(b);
            return (
              <li key={tipo} className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 pb-2 text-xs last:border-0">
                {f ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className={b ? 'text-amber-400' : 'text-slate-500'} />}
                <span className="min-w-[220px] flex-1">
                  {nombre}
                  <span className="block text-[10px] text-slate-500">{f ? 'Firmado' : b ? `Cargado (${b.nombre}) · falta firmar` : 'Sin cargar'}</span>
                </span>
                {(f || b) && (
                  <button type="button" aria-label={`Abrir ${nombre}`} onClick={() => ver((f ?? b).archivo_id)} className={botonLinea}><Eye size={13} /></button>
                )}
                {editable && !f && (
                  <>
                    <input ref={(el) => { inputs.current[tipo] = el; }} type="file" accept="application/pdf" className="hidden" aria-label={`Archivo de ${nombre}`}
                      onChange={(e) => { subir(tipo, e.target.files?.[0]); e.target.value = ''; }} />
                    <button type="button" disabled={trabajando === `subir-${tipo}`} onClick={() => inputs.current[tipo]?.click()} className={botonLinea}>
                      <Upload size={13} /> {b ? 'REEMPLAZAR' : 'CARGAR PDF'}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {editable && (
          <div className="mt-3">
            <button type="button" disabled={!pendientes.length} onClick={() => setModal('firma')} className={botonPrimario}>
              <FileSignature size={13} /> FIRMAR CON EL MOTOR ({pendientes.length})
            </button>
            <p className="mt-2 text-[10px] text-slate-500">Firma el asociado en la tableta (y con su huella si quiere): una sola vez sirve para los dos documentos.</p>
          </div>
        )}
      </Seccion>

      <Seccion titulo="2. AVAL DEL FONDO REGIONAL Y DESEMBOLSO">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={conAval} disabled={!editable} onChange={(e) => setConAval(e.target.checked)} className="h-4 w-4 accent-[#fbbf24]" />
          El crédito lleva aval del Fondo Regional
        </label>
        {conAval && (
          <div className="mt-3 max-w-xs">
            <label htmlFor="pct-aval" className="mb-1 block text-[10px] tracking-widest text-slate-500">PORCENTAJE DEL AVAL (SOBRE EL VALOR SOLICITADO)</label>
            <div className="flex items-center gap-2">
              <input id="pct-aval" type="number" inputMode="decimal" min="0.01" max="100" step="0.01" value={pct} disabled={!editable}
                onChange={(e) => setPct(e.target.value)} className={campo} />
              <span className="text-xs">%</span>
            </div>
            {pctInvalido && <p className="mt-1 text-[11px] text-rose-300">Indica un porcentaje entre 0,01 y 100.</p>}
          </div>
        )}
        <dl className="mt-4 max-w-md space-y-1 text-xs" aria-label="Resumen del desembolso">
          <div className="flex justify-between"><dt>Valor solicitado</dt><dd>{moneda(c.valor_solicitado)}</dd></div>
          {conAval && <div className="flex justify-between text-amber-200"><dt>− Aval Fondo Regional ({Number(pct) || 0}%)</dt><dd>{moneda(valores.aval)}</dd></div>}
          {externa && <div className="flex justify-between text-amber-200"><dt>− Firma electrónica externa</dt><dd>{moneda(valores.firma)}</dd></div>}
          <div className="flex justify-between border-t border-slate-700 pt-1 font-bold text-[#fbbf24]"><dt>DESEMBOLSO</dt><dd>{moneda(valores.neto)}</dd></div>
        </dl>
        {transferencia ? (
          <fieldset className="mt-5 rounded-sm border border-slate-700 p-3" aria-label="Cuenta bancaria del asociado">
            <legend className="px-1 text-[10px] font-bold tracking-widest text-[#fbbf24]">CUENTA A LA QUE SE PAGA (COPIA LOS DATOS DEL CERTIFICADO BANCARIO)</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">BANCO</span>
                <input list="bancos-sugeridos" value={cta.banco} disabled={!editable} onChange={(e) => setCta({ ...cta, banco: e.target.value })} className={campo} autoComplete="off" />
                <datalist id="bancos-sugeridos">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist></label>
              <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">TIPO DE CUENTA</span>
                <select value={cta.tipo_cuenta} disabled={!editable} onChange={(e) => setCta({ ...cta, tipo_cuenta: e.target.value })} className={campo}>
                  {Object.entries(TIPOS_CUENTA).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">NÚMERO DE CUENTA</span>
                <input inputMode="numeric" value={cta.numero_cuenta} disabled={!editable} onChange={(e) => setCta({ ...cta, numero_cuenta: soloDigitos(e.target.value).slice(0, 20) })} className={campo} autoComplete="off" /></label>
              <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">DOCUMENTO DEL TITULAR</span>
                <input value={cta.titular_documento} disabled={!editable} onChange={(e) => setCta({ ...cta, titular_documento: e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 20) })} className={campo} autoComplete="off" /></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">NOMBRE DEL TITULAR</span>
                <input value={cta.titular_nombre} disabled={!editable} onChange={(e) => setCta({ ...cta, titular_nombre: e.target.value })} className={campo} autoComplete="off" /></label>
            </div>
            {editable && (
              <button type="button" onClick={() => setCta({ ...cta, titular_nombre: `${asociado.nombre} ${asociado.apellido}`.replace(/\s+/g, ' ').trim(), titular_documento: asociado.codigo })} className={`${botonLinea} mt-3`}>
                EL TITULAR ES EL ASOCIADO
              </button>
            )}
            {ctaParcial && <p className="mt-2 text-[11px] text-amber-300">Completa todos los datos de la cuenta (o déjalos vacíos).</p>}
            {ctaLlena && cta.titular_documento.toUpperCase() !== String(asociado.codigo).toUpperCase() && (
              <p className="mt-2 text-[11px] text-rose-300">El titular NO es el asociado (C.C. {asociado.codigo}). Control Interno lo revisará como pago a un tercero.</p>
            )}
          </fieldset>
        ) : (
          <p className="mt-4 rounded-sm border border-slate-700 p-3 text-[11px] text-slate-400">
            Desembolso por <strong className="text-[#a0d4e0]">{(FORMAS[c.forma_desembolso] ?? c.forma_desembolso).toUpperCase()}</strong> a nombre de {asociado.nombre} {asociado.apellido} (C.C. {asociado.codigo}). No requiere cuenta bancaria.
          </p>
        )}
        {negativo && <p className="mt-2 text-[11px] text-rose-300">Los descuentos superan el valor solicitado.</p>}
        {externa && c.tarifa_firma_electronica === 0 && <p className="mt-2 text-[11px] text-amber-300">La tarifa de la firma electrónica está en $0. Configúrala en Reportes para que se descuente.</p>}
        {editable && (
          <button type="button" disabled={pctInvalido || negativo || ctaParcial || trabajando === 'guardar'} onClick={guardar} className={`${botonPrimario} mt-3`}>
            {trabajando === 'guardar' ? 'GUARDANDO…' : 'GUARDAR DESEMBOLSO'}
          </button>
        )}
      </Seccion>

      <Seccion titulo="3. SELLOS SOBRE EL COMPROBANTE DE APROBACIÓN">
        <ul className="mb-3 space-y-1 text-xs">
          {sellosAplicables.map((k) => (
            <li key={k} className="flex items-center gap-2">
              {puestos[k] ? <CheckCircle2 size={13} className="text-emerald-400" /> : <AlertTriangle size={13} className="text-amber-400" />}
              {ROTULO_SELLO[k]} <span className="text-slate-500">{puestos[k] ? `· página ${puestos[k].pagina + 1}` : '· sin ubicar'}</span>
            </li>
          ))}
        </ul>
        {editable && (
          <button type="button" disabled={!comprobanteFirmado || sinGuardar || pctInvalido || negativo} onClick={() => setModal('sellos')} className={botonLinea}>
            <Stamp size={13} /> UBICAR SELLOS
          </button>
        )}
        {editable && !comprobanteFirmado && <p className="mt-2 text-[10px] text-slate-500">Primero firma el comprobante de aprobación.</p>}
        {editable && sinGuardar && <p className="mt-2 text-[10px] text-amber-300">Guarda el desembolso antes de ubicar los sellos.</p>}
      </Seccion>

      <Seccion titulo="4. DOCUMENTO FINAL Y CIERRE">
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
        <p className="mt-2 text-[10px] text-slate-500">El PDF final reúne todos los anexos en orden: comprobante (con sellos), estudio, documentos firmados, autorización de la empresa y soportes.</p>
        {editable && bloqueos.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-0.5 text-[11px] text-amber-300" aria-label="Lo que falta">
            {bloqueos.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}
      </Seccion>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-label="Confirmar cierre">
          <div className="w-full max-w-md rounded-sm border border-slate-700 bg-[#08101e] p-5 text-xs">
            <p className="mb-2 text-[11px] font-bold tracking-widest text-[#fbbf24]">MARCAR COMPLETADO</p>
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
