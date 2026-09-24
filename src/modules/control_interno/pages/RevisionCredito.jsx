import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal from '../../creditos/components/Modal.jsx';
import Timeline from '../../creditos/components/Timeline.jsx';
import TarjetaPago from '../../creditos/components/TarjetaPago.jsx';
import { Etiqueta } from '../../creditos/components/TablaSolicitudes.jsx';
import { AUT_ESTADOS, campo, fecha, fechaHora, mensajeError, moneda, tipoDoc } from '../../creditos/lib/formato.js';

const ACCENT = '#c084fc';
const btn = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40';
const btnLinea = `${btn} border-slate-600 text-[#a0d4e0] hover:border-[#c084fc] hover:text-[#c084fc]`;

const Seccion = ({ titulo, children }) => (
  <section className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
    <h3 className="mb-3 text-[11px] font-bold tracking-widest" style={{ color: ACCENT }}>{titulo}</h3>
    {children}
  </section>
);

const blobMensaje = async (err, defecto) => { try { return JSON.parse(await err.response.data.text()).error ?? defecto; } catch { return defecto; } };

/**
 * Revisión de un crédito completado por Cartera: Control Interno mira lo que se va a pagar (a quién, cuánto, a qué cuenta),
 * abre los documentos, marca la lista de verificación y APRUEBA (pasa a Tesorería) o DEVUELVE (a Cartera o al asesor, con motivo).
 */
const RevisionCredito = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [lista, setLista] = useState({});
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

  const todoMarcado = d.lista.every((i) => lista[i.clave] === true);
  const puede = d.puede_revisar;
  const v = d.valores;
  const aut = d.autorizacion;

  return (
    <div className="space-y-4 p-6 font-mono text-[#a0d4e0]">
      <div>
        <Link to="/control-interno/creditos" className="mb-2 inline-flex items-center gap-1 text-[10px] tracking-widest text-[#7ec8d8] hover:text-[#c084fc]"><ArrowLeft size={12} /> VOLVER A LA BANDEJA</Link>
        <h2 className="flex flex-wrap items-center gap-3 text-lg font-bold" style={{ color: ACCENT }}>{d.radicado} <Etiqueta estado={d.estado} /></h2>
        <p className="text-[11px] text-slate-500">{d.categoria} · {d.empresa} · completado por {d.completada_por_nombre} el {fechaHora(d.completada_at)}</p>
      </div>

      {!puede && <p className="rounded-sm border border-amber-700 bg-amber-950/30 p-3 text-xs text-amber-200" role="status">{d.motivo_bloqueo}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="1. LO QUE SE VA A PAGAR">
          <TarjetaPago asociado={d.asociado} monto={v.desembolso_neto} forma={d.forma_desembolso} cuenta={d.cuenta} acento={ACCENT} />
          <dl className="mt-4 space-y-1 text-xs" aria-label="Cómo se calculó el desembolso">
            <div className="flex justify-between"><dt>Valor solicitado</dt><dd>{moneda(v.valor_solicitado)}</dd></div>
            {v.aval_porcentaje != null && <div className="flex justify-between text-amber-200"><dt>− Aval Fondo Regional ({v.aval_porcentaje}%)</dt><dd>{moneda(v.aval_valor)}</dd></div>}
            {v.firma_electronica_valor > 0 && <div className="flex justify-between text-amber-200"><dt>− Firma electrónica externa</dt><dd>{moneda(v.firma_electronica_valor)}</dd></div>}
            <div className="flex justify-between border-t border-slate-700 pt-1 font-bold" style={{ color: ACCENT }}><dt>DESEMBOLSO NETO</dt><dd>{moneda(v.desembolso_neto)}</dd></div>
          </dl>
        </Seccion>

        <div className="space-y-4">
          <Seccion titulo="2. DOCUMENTOS PARA REVISAR">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={trabajando === 'pdf'} onClick={abrirPdf} className={btnLinea}><FileText size={13} /> {trabajando === 'pdf' ? 'ARMANDO…' : 'ABRIR PDF FINAL (TODO EL EXPEDIENTE)'}</button>
              {d.forma_desembolso === 'transferencia' && <button type="button" onClick={abrirCertificado} className={btnLinea}><ExternalLink size={13} /> ABRIR CERTIFICADO BANCARIO</button>}
            </div>
            <ul className="mt-3 space-y-1 text-[11px] text-slate-400" aria-label="Documentos del expediente">
              {d.documentos.map((x) => <li key={x.id}>· {tipoDoc(x.tipo)} <span className="text-slate-600">({x.clase === 'firmado' ? 'firmado' : x.clase === 'adjunto' ? 'del asociado' : 'evidencia'}{x.etapa === 'cartera' ? ' · Cartera' : ''})</span></li>)}
            </ul>
            <p className="mt-3 text-[11px]">
              Autorización de la empresa:{' '}
              {!aut.requerida ? <span className="text-slate-500">no la exige</span>
                : <span className={AUT_ESTADOS[aut.estado]?.c ?? 'text-amber-300'}>{AUT_ESTADOS[aut.estado]?.t ?? 'SIN REGISTRAR'}{aut.fecha ? ` · ${fecha(aut.fecha)}` : ''}</span>}
            </p>
          </Seccion>

          <Seccion titulo="3. VERIFICACIÓN">
            <ul className="space-y-2" aria-label="Lista de verificación">
              {d.lista.map((i) => (
                <li key={i.clave}>
                  <label className="flex cursor-pointer items-start gap-2 text-xs">
                    <input type="checkbox" checked={!!lista[i.clave]} disabled={!puede} onChange={(e) => setLista({ ...lista, [i.clave]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#c084fc]" />
                    <span className={i.clave === 'titular_tercero' ? 'text-rose-200' : ''}>{i.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
            {puede && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={!todoMarcado || trabajando === 'revision'} onClick={() => enviar({ decision: 'aprobada', lista }, 'Aprobado: el desembolso pasó a Tesorería')}
                  className={`${btn} border-[#c084fc] bg-[#c084fc] text-[#020617] hover:bg-[#d8b4fe]`}><CheckCircle2 size={13} /> APROBAR Y ENVIAR A TESORERÍA</button>
                <button type="button" disabled={trabajando === 'revision'} onClick={() => setModal(true)} className={`${btn} border-rose-700 text-rose-300 hover:bg-rose-950/40`}><XCircle size={13} /> DEVOLVER</button>
              </div>
            )}
            {puede && !todoMarcado && <p className="mt-2 text-[10px] text-slate-500">Marca todos los puntos para poder aprobar. Si algo está mal, devuélvelo con el motivo.</p>}
          </Seccion>
        </div>
      </div>

      {d.revisiones.length > 0 && (
        <Seccion titulo="REVISIONES ANTERIORES">
          <ul className="space-y-1 text-xs">
            {d.revisiones.map((r) => (
              <li key={r.id}>{fechaHora(r.created_at)} · {r.revisor} · <strong>{r.decision === 'aprobada' ? 'APROBÓ' : `DEVOLVIÓ A ${String(r.destino).toUpperCase()}`}</strong>{r.motivo ? ` — ${r.motivo}` : ''}</li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="HISTORIAL"><Timeline eventos={d.eventos} /></Seccion>

      {modal && (
        <Modal titulo="DEVOLVER EL CRÉDITO" onClose={() => setModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); enviar({ decision: 'devuelta', destino, motivo: motivo.trim(), lista }, 'Crédito devuelto'); }} className="space-y-3">
            <fieldset>
              <legend className="mb-1 text-[10px] tracking-widest text-slate-500">¿A QUIÉN SE DEVUELVE?</legend>
              <label className="mb-1 flex items-start gap-2 text-xs"><input type="radio" name="destino" checked={destino === 'cartera'} onChange={() => setDestino('cartera')} className="mt-0.5 accent-[#c084fc]" />
                <span><strong>A Cartera</strong> — el problema está en el cierre: aval, valores, cuenta bancaria, sellos o sus documentos.</span></label>
              <label className="flex items-start gap-2 text-xs"><input type="radio" name="destino" checked={destino === 'asesor'} onChange={() => setDestino('asesor')} className="mt-0.5 accent-[#c084fc]" />
                <span><strong>Al asesor</strong> — el problema está en los documentos o la autorización que él debe corregir.</span></label>
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
