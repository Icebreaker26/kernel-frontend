import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal from '../../creditos/components/Modal.jsx';
import Historial from '../../creditos/components/Historial.jsx';
import TarjetaPago from '../../creditos/components/TarjetaPago.jsx';
import ProgresoCredito from '../../creditos/components/ProgresoCredito.jsx';
import { FichaArchivo, kb } from '../../creditos/components/CabeceraDocumento.jsx';
import { Cifra, Dato, Insignia, Seccion, TarjetaSiguiente } from '../../creditos/components/Piezas.jsx';
import { Etiqueta } from '../../creditos/components/TablaSolicitudes.jsx';
import VerificacionCI from '../components/VerificacionCI.jsx';
import { diasEn, listaDeMarcas, motivoDesdeMarcas, origenDocumento, textoDias, todoCumple } from '../lib/revision.js';
import { siguientePaso } from '../../creditos/lib/progreso.js';
import { AUT_ESTADOS, FORMAS, MODALIDADES, campo, fecha, fechaBogota, fechaHora, mensajeError, moneda, tipoDoc } from '../../creditos/lib/formato.js';

const ACENTO = 'violeta';
const btn = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40';
const btnLinea = `${btn} border-slate-600 text-[#a0d4e0] hover:border-[#c084fc] hover:text-[#c084fc]`;
const S = (props) => <Seccion acento={ACENTO} {...props} />;

const blobMensaje = async (err, defecto) => { try { return JSON.parse(await err.response.data.text()).error ?? defecto; } catch { return defecto; } };

/** Opción de destino al devolver: tarjeta seleccionable (un radio de verdad, accesible por teclado) */
const OpcionDestino = ({ valor, actual, onCambiar, titulo, texto }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-slate-700 p-3 text-xs transition-colors hover:border-slate-500 has-[:checked]:border-[#c084fc] has-[:checked]:bg-[#c084fc0d]">
    <input type="radio" name="destino" checked={actual === valor} onChange={() => onCambiar(valor)} className="mt-0.5 accent-[#c084fc]" />
    <span><strong className="text-[#e2f3f8]">{titulo}</strong> — {texto}</span>
  </label>
);

/**
 * Revisión de un crédito completado por Cartera. Misma estructura que el detalle de Créditos y el cierre de Cartera: avance, cifras clave,
 * columna principal (qué se paga, documentos, verificación) y columna lateral (siguiente paso y contexto). Control Interno verifica punto por
 * punto y APRUEBA (pasa a Tesorería) o DEVUELVE (a Cartera o al asesor, con motivo).
 */
const RevisionCredito = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [marcas, setMarcas] = useState({});
  const [trabajando, setTrabajando] = useState('');
  const [modal, setModal] = useState(false);
  const [destino, setDestino] = useState('cartera');
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get(`/control_interno/creditos/${id}`);
      setD(data);
      setError('');
    } catch (err) {
      setError(err.response?.status === 404 ? 'Este crédito ya no está pendiente en Control Interno (lo revisó alguien más o cambió de estado).' : mensajeError(err, 'No se pudo cargar el crédito'));
    }
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirPdf = async () => {
    setTrabajando('pdf');
    try {
      const { data } = await apiService.get(`/control_interno/creditos/${id}/pdf-final`, { responseType: 'blob' });
      window.open(URL.createObjectURL(new Blob([data], { type: 'application/pdf' })), '_blank', 'noopener');
    } catch (err) { toast.error(await blobMensaje(err, 'No se pudo generar el PDF final')); }
    finally { setTrabajando(''); }
  };
  const abrirCertificado = async () => {
    try {
      const { data } = await apiService.get(`/control_interno/creditos/${id}/certificado`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) { toast.error(mensajeError(err, 'No se pudo abrir el certificado')); }
  };

  const enviar = async (cuerpo, ok) => {
    setTrabajando('revision');
    try {
      await apiService.post(`/control_interno/creditos/${id}/revision`, cuerpo);
      toast.success(ok);
      navigate('/control-interno/creditos');
    } catch (err) { toast.error(mensajeError(err)); }
    finally { setTrabajando(''); }
  };

  if (error) return <div className="p-6 font-mono"><p className="text-xs text-rose-300">{error}</p><Link to="/control-interno/creditos" className={`${btnLinea} mt-3`}><ArrowLeft size={13} /> VOLVER A LA BANDEJA</Link></div>;
  if (!d) return <p className="p-6 font-mono text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>;

  const puede = d.puede_revisar;
  const v = d.valores;
  const aut = d.autorizacion;
  const cumple = todoCumple(d.lista, marcas);
  const hayNoCumple = d.lista.some((i) => marcas[i.clave] === 'no');
  const hechos = d.lista.filter((i) => marcas[i.clave]).length;
  const dias = diasEn(d.completada_at);
  // Para la línea de avance: llegó hasta aquí, así que lo anterior está hecho
  const sProg = { estado: d.estado, autorizacion_requerida: aut.requerida, entregada_at: d.entregada_at, recibida_at: d.recibida_at, completada_at: d.completada_at };
  const pProg = { a_firmar: 0, firmados: 0, firma_completa: true, autorizacion_ok: true, documentos_ok: true };

  const abrirDevolver = () => { setMotivo((m) => m || motivoDesdeMarcas(d.lista, marcas)); setModal(true); };

  return (
    <div className="space-y-4 p-6 font-mono text-[#a0d4e0]">
      {/* Encabezado */}
      <div>
        <Link to="/control-interno/creditos" className="mb-2 inline-flex items-center gap-1 text-[10px] tracking-widest text-[#7ec8d8] hover:text-[#c084fc]"><ArrowLeft size={12} /> VOLVER A LA BANDEJA</Link>
        <h2 className="flex flex-wrap items-center gap-3 text-lg font-bold text-[#c084fc]">{d.radicado} <Etiqueta estado={d.estado} /></h2>
        <p className="text-[11px] text-slate-500">{d.categoria} · {d.empresa} · completado por {d.completada_por_nombre} el {fechaHora(d.completada_at)}</p>
      </div>

      {!puede && <p className="rounded-sm border border-amber-700 bg-amber-950/30 p-3 text-xs text-amber-200" role="status">{d.motivo_bloqueo}</p>}

      <ProgresoCredito s={sProg} p={pProg} acento={ACENTO} />

      {/* Cifras clave */}
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumen del crédito">
        <Cifra acento={ACENTO} k="VALOR SOLICITADO" v={moneda(v.valor_solicitado)} />
        <Cifra acento={ACENTO} k="DESEMBOLSO NETO" destacado v={moneda(v.desembolso_neto)} />
        <Cifra acento={ACENTO} k="FORMA DE PAGO" v={FORMAS[d.forma_desembolso] ?? d.forma_desembolso} chica />
        <Cifra acento={ACENTO} k="EN CONTROL INTERNO" v={textoDias(dias)} chica />
      </dl>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <S n={1} titulo="LO QUE SE VA A PAGAR">
            <TarjetaPago asociado={d.asociado} monto={v.desembolso_neto} forma={d.forma_desembolso} cuenta={d.cuenta} acento="#c084fc" />
            <dl className="mt-4 overflow-hidden rounded-sm border border-slate-800 text-xs" aria-label="Cómo se calculó el desembolso">
              <div className="flex justify-between px-3 py-2"><dt className="text-slate-400">Valor solicitado</dt><dd>{moneda(v.valor_solicitado)}</dd></div>
              {v.aval_porcentaje != null && <div className="flex justify-between border-t border-slate-800 px-3 py-2 text-amber-200"><dt>− Aval Fondo Regional ({v.aval_porcentaje}%)</dt><dd>{moneda(v.aval_valor)}</dd></div>}
              {v.firma_electronica_valor > 0 && <div className="flex justify-between border-t border-slate-800 px-3 py-2 text-amber-200"><dt>− Firma electrónica externa</dt><dd>{moneda(v.firma_electronica_valor)}</dd></div>}
              <div className="flex justify-between border-t border-[#c084fc66] bg-[#c084fc08] px-3 py-2.5 font-bold text-[#c084fc]"><dt>DESEMBOLSO NETO</dt><dd>{moneda(v.desembolso_neto)}</dd></div>
            </dl>
          </S>

          <S n={2} titulo="DOCUMENTOS PARA REVISAR" estado={<Insignia ok texto={`${d.documentos.length} EN EL EXPEDIENTE`} />}>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={trabajando === 'pdf'} onClick={abrirPdf} className={`${btn} border-[#c084fc] bg-[#c084fc] text-[#020617] hover:bg-[#d8b4fe]`}><FileText size={13} /> {trabajando === 'pdf' ? 'ARMANDO…' : 'ABRIR PDF FINAL (TODO EL EXPEDIENTE)'}</button>
              {d.forma_desembolso === 'transferencia' && <button type="button" onClick={abrirCertificado} className={btnLinea}><ExternalLink size={13} /> ABRIR CERTIFICADO BANCARIO</button>}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Documentos del expediente">
              {d.documentos.map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-sm border border-slate-800 bg-[#0a1322] p-2.5">
                  <FichaArchivo mime={x.mime_type ?? 'application/pdf'} nombre={x.nombre} tono={x.clase === 'firmado' ? 'ok' : 'neutro'} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold leading-snug text-[#e2f3f8]">{tipoDoc(x.tipo)}</span>
                    <span className="block truncate text-[10px] text-slate-400">{origenDocumento(x)}</span>
                    <span className="block truncate text-[10px] text-slate-600">{[kb(x.size_bytes), x.created_at ? fechaBogota(x.created_at) : '', x.subido_por_nombre].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-slate-800 px-3 py-2 text-[11px]">
              <span className="text-slate-500">Autorización de la empresa:</span>
              {!aut.requerida ? <span className="text-slate-500">no la exige</span>
                : <span className={`font-bold ${AUT_ESTADOS[aut.estado]?.c ?? 'text-amber-300'}`}>{AUT_ESTADOS[aut.estado]?.t ?? 'SIN REGISTRAR'}{aut.fecha ? ` · ${fecha(aut.fecha)}` : ''}</span>}
            </p>
          </S>

          <S n={3} titulo="VERIFICACIÓN" estado={<Insignia ok={cumple} texto={`${hechos}/${d.lista.length} VERIFICADOS`} />}>
            <VerificacionCI items={d.lista} marcas={marcas} onMarcar={(k, val) => setMarcas((m) => ({ ...m, [k]: val }))} deshabilitado={!puede} />
            {puede && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button type="button" disabled={!cumple || trabajando === 'revision'} onClick={() => enviar({ decision: 'aprobada', lista: listaDeMarcas(marcas) }, 'Aprobado: el desembolso pasó a Tesorería')}
                  className={`${btn} border-[#c084fc] bg-[#c084fc] text-[#020617] hover:bg-[#d8b4fe]`}><CheckCircle2 size={13} /> APROBAR Y ENVIAR A TESORERÍA</button>
                <button type="button" disabled={trabajando === 'revision'} onClick={abrirDevolver}
                  className={`${btn} ${hayNoCumple ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-500' : 'border-rose-700 text-rose-300 hover:bg-rose-950/40'}`}><XCircle size={13} /> DEVOLVER</button>
              </div>
            )}
            {puede && !cumple && !hayNoCumple && <p className="mt-2 text-[10px] text-slate-500">Marca CUMPLE en todos los puntos para poder aprobar. Si algo está mal, márcalo como NO CUMPLE o devuélvelo con el motivo.</p>}
          </S>

          {d.revisiones.length > 0 && (
            <S titulo="REVISIONES ANTERIORES">
              <ul className="space-y-2 text-xs">
                {d.revisiones.map((r) => (
                  <li key={r.id} className={`rounded-sm border-l-2 bg-[#0a1322] p-3 ${r.decision === 'aprobada' ? 'border-emerald-500' : 'border-rose-500'}`}>
                    <p className="text-[10px] text-slate-500">{fechaHora(r.created_at)} · <span className="text-[#a0d4e0]">{r.revisor}</span></p>
                    <p className="mt-1"><strong className={r.decision === 'aprobada' ? 'text-emerald-300' : 'text-rose-300'}>{r.decision === 'aprobada' ? 'APROBÓ' : `DEVOLVIÓ A ${String(r.destino).toUpperCase()}`}</strong>{r.motivo ? ` — ${r.motivo}` : ''}</p>
                  </li>
                ))}
              </ul>
            </S>
          )}
        </div>

        {/* Columna lateral: contexto y siguiente paso */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <TarjetaSiguiente acento={ACENTO} x={siguientePaso({ estado: d.estado }, {})} />
          <S titulo="ASOCIADO">
            <dl className="space-y-3">
              <Dato k="NOMBRE" v={<>{d.asociado.nombre}<span className="block text-[10px] text-slate-500">C.C. {d.asociado.codigo}</span></>} />
              <Dato k="EMPRESA" v={d.empresa} />
              <Dato k="CATEGORÍA" v={d.categoria} />
              <Dato k="ASESOR" v={d.asesor_nombre ?? '—'} />
            </dl>
          </S>
          <S titulo="CONDICIONES">
            <dl className="space-y-3">
              <Dato k="FIRMA" v={<>{MODALIDADES[d.modalidad_firma] ?? d.modalidad_firma}{d.proveedor_externo && <span className="block text-[10px] text-slate-500">{d.proveedor_externo}</span>}</>} />
              <Dato k="AUTORIZACIÓN" v={aut.requerida ? 'Requerida' : 'No requerida'} />
              {d.observaciones && <Dato k="OBSERVACIONES" v={d.observaciones} />}
            </dl>
          </S>
        </aside>
      </div>

      <Historial eventos={d.eventos} acento={ACENTO} />

      {modal && (
        <Modal titulo="DEVOLVER EL CRÉDITO" onClose={() => setModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); enviar({ decision: 'devuelta', destino, motivo: motivo.trim(), lista: listaDeMarcas(marcas) }, 'Crédito devuelto'); }} className="space-y-3">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[10px] tracking-widest text-slate-500">¿A QUIÉN SE DEVUELVE?</legend>
              <OpcionDestino valor="cartera" actual={destino} onCambiar={setDestino} titulo="A Cartera" texto="el problema está en el cierre: aval, valores, cuenta bancaria, sellos o sus documentos." />
              <OpcionDestino valor="asesor" actual={destino} onCambiar={setDestino} titulo="Al asesor" texto="el problema está en los documentos o la autorización que él debe corregir." />
            </fieldset>
            <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">¿QUÉ ESTÁ MAL? (OBLIGATORIO)</span>
              <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} maxLength={1000} /></label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(false)} className={btnLinea}>CANCELAR</button>
              <button type="submit" disabled={motivo.trim().length < 3 || trabajando === 'revision'} className={`${btn} border-rose-600 bg-rose-600 text-white hover:bg-rose-500`}>DEVOLVER</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default RevisionCredito;
