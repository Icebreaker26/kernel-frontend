import { useState } from 'react';
import { CheckCircle2, Loader2, PhoneCall, PhoneOff, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { fechaHora } from '../../utils/formato.js';

const RESULTADO = {
  validada:    { texto: 'Validada',    tono: 'text-emerald-400' },
  no_contesta: { texto: 'No contestó', tono: 'text-amber-400' },
  no_coincide: { texto: 'No coincide', tono: 'text-red-400' },
};

// Validación de identidad por llamada de voz: el asesor llama al celular registrado, hace las preguntas del protocolo
// (las responde solo quien llenó el formulario) y deja el resultado. Cada intento queda registrado.
const PanelValidacionVoz = ({ vinculacionId, voz, onRegistrado, entregada }) => {
  const [coinciden, setCoinciden] = useState({});
  const [voluntad, setVoluntad]   = useState(false);
  const [grabada, setGrabada]     = useState(false);
  const [obs, setObs]             = useState('');
  const [enviando, setEnviando]   = useState(false);

  if (!voz) return null;
  const celular = (voz.celular || '').replace(/\D/g, '');
  const cuantas = Object.values(coinciden).filter(Boolean).length;
  const puedeValidar = voluntad && cuantas >= voz.minimo_coincidencias;

  const registrar = async (resultado) => {
    setEnviando(true);
    try {
      await apiService.post(`/captacion/vinculaciones/${vinculacionId}/validacion-voz`, {
        resultado,
        preguntas: voz.protocolo.map(q => ({ clave: q.clave, coincide: !!coinciden[q.clave] })),
        confirma_voluntad: voluntad,
        grabada,
        observaciones: obs.trim() || undefined,
      });
      toast.success('Llamada registrada');
      setCoinciden({}); setVoluntad(false); setGrabada(false); setObs('');
      onRegistrado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la llamada');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className={`overflow-hidden rounded border bg-slate-900/20 ${voz.validada ? 'border-emerald-900/40' : 'border-slate-800/60'}`}>
      <header className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${voz.validada ? 'border-emerald-900/20 bg-emerald-900/10' : 'border-slate-800/40 bg-slate-900/40'}`}>
        <h2 className={`flex items-center gap-2 text-xs font-bold tracking-wider ${voz.validada ? 'text-emerald-400' : 'text-slate-500'}`}>
          {voz.validada ? <CheckCircle2 size={14} /> : <PhoneCall size={14} />} VALIDACIÓN POR LLAMADA
        </h2>
        <span className="text-[10px] tracking-wider text-slate-500">{voz.exigida ? 'OBLIGATORIA PARA ENTREGAR' : 'OPCIONAL POR AHORA'}</span>
      </header>

      <div className="space-y-4 p-4">
        {!voz.firmada && (
          <p className="text-xs text-slate-500">La llamada se hace después de que el asociado firme.</p>
        )}

        {voz.firmada && !entregada && (
          <>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Llama al celular registrado
              {celular && <> (<a href={`tel:+57${celular.replace(/^57/, '')}`} className="font-semibold text-emerald-400 underline">{voz.celular}</a>)</>}.
              {' '}Pregunta sin leer las respuestas, compáralas con la solicitud y marca las que coincidan (mínimo {voz.minimo_coincidencias}).
            </p>

            <ul className="space-y-2">
              {voz.protocolo.map(q => (
                <li key={q.clave}>
                  <label htmlFor={`voz-${q.clave}`} className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
                    <input type="checkbox" id={`voz-${q.clave}`} checked={!!coinciden[q.clave]}
                      onChange={e => setCoinciden(c => ({ ...c, [q.clave]: e.target.checked }))} className="mt-0.5" />
                    <span>{q.pregunta} <span className="text-slate-600">· coincide</span></span>
                  </label>
                </li>
              ))}
            </ul>

            <label htmlFor="voz-voluntad" className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" id="voz-voluntad" checked={voluntad} onChange={e => setVoluntad(e.target.checked)} className="mt-0.5" />
              <span>La persona confirma que quiere asociarse y que firmó ella</span>
            </label>
            <label htmlFor="voz-grabada" className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" id="voz-grabada" checked={grabada} onChange={e => setGrabada(e.target.checked)} className="mt-0.5" />
              <span>La llamada se grabó con su autorización</span>
            </label>

            <div>
              <label htmlFor="voz-obs" className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Observaciones</label>
              <textarea id="voz-obs" value={obs} onChange={e => setObs(e.target.value)} rows={2} maxLength={1000}
                className="w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-700/50 focus:outline-none" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => registrar('validada')} disabled={enviando || !puedeValidar}
                className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40">
                {enviando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} VALIDADA
              </button>
              <button onClick={() => registrar('no_contesta')} disabled={enviando}
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 transition-colors hover:border-amber-700/50 hover:text-amber-400 disabled:opacity-40">
                <PhoneOff size={12} /> NO CONTESTÓ
              </button>
              <button onClick={() => registrar('no_coincide')} disabled={enviando || !obs.trim()}
                title={obs.trim() ? '' : 'Explica qué pasó en las observaciones'}
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 transition-colors hover:border-red-700/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40">
                <XCircle size={12} /> NO COINCIDE
              </button>
            </div>
          </>
        )}

        {voz.historial.length > 0 && (
          <div>
            <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Intentos</p>
            <ul className="divide-y divide-slate-800/60">
              {voz.historial.map(h => (
                <li key={h.id} className="py-1.5 text-[11px] text-slate-400">
                  <span className={`font-bold ${RESULTADO[h.resultado]?.tono}`}>{RESULTADO[h.resultado]?.texto}</span>
                  {' · '}{fechaHora(h.created_at)}{h.asesor_nombre && <> · {h.asesor_nombre}</>}
                  {h.grabada && <> · grabada</>}
                  {h.observaciones && <p className="mt-0.5 text-slate-500">{h.observaciones}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default PanelValidacionVoz;
