import { useState } from 'react';
import { CheckCircle2, Copy, Loader2, MessageCircle, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { fechaHora } from '../../utils/formato.js';

const ITEMS = [
  { clave: 'cedula_frente',  etiqueta: 'Cédula (frente)' },
  { clave: 'cedula_reverso', etiqueta: 'Cédula (reverso)' },
  { clave: 'firma',          etiqueta: 'Firma (tendrá que firmar de nuevo)' },
  { clave: 'datos',          etiqueta: 'Datos del formulario' },
];
const ETIQUETA = Object.fromEntries(ITEMS.map(i => [i.clave, i.etiqueta]));

// Devolver a subsanar: el asesor marca qué está mal y por qué; la persona lo corrige desde su enlace y la solicitud no se entrega
// hasta que se resuelva. Si se devuelve la firma, la anterior queda archivada.
const PanelSubsanacion = ({ vinculacionId, sub, celular, onCambio, entregada }) => {
  const [abierto, setAbierto]   = useState(false);
  const [items, setItems]       = useState({});
  const [motivo, setMotivo]     = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ultimo, setUltimo]     = useState(null);   // respuesta de la última devolución (enlace y mensaje para WhatsApp)

  if (!sub || (entregada && !sub.historial.length)) return null;
  const elegidos = ITEMS.filter(i => items[i.clave]).map(i => i.clave);
  const abierta = sub.abierta;
  const tel = (celular || '').replace(/\D/g, '');

  const devolver = async () => {
    setEnviando(true);
    try {
      const { data } = await apiService.post(`/captacion/vinculaciones/${vinculacionId}/subsanacion`, { items: elegidos, motivo: motivo.trim() });
      setUltimo(data);
      toast.success(data.correo_enviado ? 'Devuelta. Le avisamos por correo.' : 'Devuelta. No pudimos enviar el correo: envíale el mensaje por WhatsApp.');
      setAbierto(false); setItems({}); setMotivo('');
      onCambio();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo devolver la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = async () => {
    try {
      await apiService.post(`/captacion/vinculaciones/${vinculacionId}/subsanacion/cerrar`);
      toast.success('Devolución cerrada');
      setUltimo(null);
      onCambio();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cerrar');
    }
  };

  const mensaje = ultimo?.mensaje;
  const copiar = () => navigator.clipboard?.writeText(mensaje).then(() => toast.success('Mensaje copiado'));

  return (
    <section className={`overflow-hidden rounded border bg-slate-900/20 ${abierta ? 'border-amber-800/50' : 'border-slate-800/60'}`}>
      <header className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${abierta ? 'border-amber-900/30 bg-amber-900/10' : 'border-slate-800/40 bg-slate-900/40'}`}>
        <h2 className={`flex items-center gap-2 text-xs font-bold tracking-wider ${abierta ? 'text-amber-400' : 'text-slate-500'}`}>
          <Undo2 size={14} /> {abierta ? 'DEVUELTA A SUBSANAR' : 'SUBSANACIÓN'}
        </h2>
        {!abierta && !entregada && !abierto && (
          <button onClick={() => setAbierto(true)}
            className="rounded border border-slate-700/60 px-2.5 py-1 text-[10px] tracking-wider text-slate-300 transition-colors hover:border-amber-700/50 hover:text-amber-400">
            DEVOLVER A SUBSANAR
          </button>
        )}
      </header>

      <div className="space-y-4 p-4">
        {abierta && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-slate-300">
              {abierta.motivo}
            </p>
            <ul className="space-y-1">
              {abierta.items.map(k => {
                const pendiente = abierta.pendientes.includes(k);
                return (
                  <li key={k} className={`flex items-center gap-2 text-[11px] ${pendiente ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pendiente ? <Loader2 size={11} /> : <CheckCircle2 size={11} />} {ETIQUETA[k]} · {pendiente ? 'pendiente' : 'corregido'}
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] text-slate-500">Devuelta {fechaHora(abierta.created_at)}. La solicitud no se puede entregar hasta que se corrija.</p>
            <div className="flex flex-wrap gap-2">
              {mensaje && tel && (
                <a href={`https://wa.me/57${tel.replace(/^57/, '')}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded border border-emerald-700/50 px-3 py-1.5 text-[11px] tracking-wider text-emerald-300 hover:bg-emerald-900/30">
                  <MessageCircle size={12} /> ENVIAR POR WHATSAPP
                </a>
              )}
              {mensaje && (
                <button onClick={copiar} className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 hover:text-slate-100">
                  <Copy size={12} /> COPIAR MENSAJE
                </button>
              )}
              <button onClick={cerrar} disabled={abierta.pendientes.includes('firma')}
                title={abierta.pendientes.includes('firma') ? 'La persona aún no firma de nuevo' : ''}
                className="rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 hover:border-emerald-700/50 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">
                CERRAR SIN ESPERAR
              </button>
            </div>
          </div>
        )}

        {abierto && !abierta && (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Elige qué debe corregir la persona y explícale por qué. Le llega por correo y lo ve en su enlace. La solicitud no se podrá entregar hasta que lo corrija.
            </p>
            <ul className="space-y-2">
              {ITEMS.map(i => (
                <li key={i.clave}>
                  <label htmlFor={`sub-${i.clave}`} className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
                    <input type="checkbox" id={`sub-${i.clave}`} checked={!!items[i.clave]}
                      onChange={e => setItems(s => ({ ...s, [i.clave]: e.target.checked }))} className="mt-0.5" />
                    <span>{i.etiqueta}</span>
                  </label>
                </li>
              ))}
            </ul>
            {items.firma && (
              <p className="text-[11px] text-amber-400/90">La firma actual se archiva (queda en el historial) y la persona debe firmar de nuevo.</p>
            )}
            <div>
              <label htmlFor="sub-motivo" className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Motivo (lo verá la persona)</label>
              <textarea id="sub-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} maxLength={1000}
                placeholder="Ej.: la foto del frente se ve borrosa; sube otra con buena luz"
                className="w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-amber-700/50 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={devolver} disabled={enviando || !elegidos.length || motivo.trim().length < 5}
                className="flex items-center gap-1.5 rounded border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-amber-300 hover:bg-amber-900/40 disabled:cursor-not-allowed disabled:opacity-40">
                {enviando ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} DEVOLVER
              </button>
              <button onClick={() => setAbierto(false)} className="rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-400 hover:text-slate-200">
                CANCELAR
              </button>
            </div>
          </div>
        )}

        {sub.historial.length > 0 && (
          <div>
            <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Devoluciones</p>
            <ul className="divide-y divide-slate-800/60">
              {sub.historial.map(h => (
                <li key={h.id} className="py-1.5 text-[11px] text-slate-400">
                  <span className={`font-bold ${h.resuelta_at ? 'text-emerald-400' : 'text-amber-400'}`}>{h.resuelta_at ? 'Resuelta' : 'Abierta'}</span>
                  {' · '}{h.items.map(k => ETIQUETA[k]).join(', ')}
                  {' · '}{fechaHora(h.created_at)}{h.asesor_nombre && <> · {h.asesor_nombre}</>}
                  <p className="mt-0.5 text-slate-500">{h.motivo}</p>
                </li>
              ))}
            </ul>
            {sub.firmas_archivadas > 0 && (
              <p className="mt-1.5 text-[10px] text-slate-600">{sub.firmas_archivadas} firma{sub.firmas_archivadas > 1 ? 's' : ''} anterior{sub.firmas_archivadas > 1 ? 'es' : ''} archivada{sub.firmas_archivadas > 1 ? 's' : ''}.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PanelSubsanacion;
