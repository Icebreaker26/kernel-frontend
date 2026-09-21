import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, CreditCard, Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { fechaHora } from '../../utils/formato.js';

const ROTULO = { cedula: 'Cédula', nombres: 'Nombres', apellidos: 'Apellidos' };
const MOTIVO_POR_DEFECTO = 'Corregido según lo que aparece en la cédula';

// El asesor compara el número y el nombre de la solicitud con la foto de la cédula. Si son idénticos, lo confirma; si no, los escribe
// tal cual aparecen en la cédula. Todo queda registrado (quién, cuándo, valor anterior y nuevo) y, si la solicitud ya estaba firmada,
// se conserva la firma original y se sella un nuevo PDF con los datos corregidos.
const PanelVerificacionCedula = ({ vinculacionId, datos, firmada, entregada, onCambio }) => {
  const [info, setInfo]         = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [form, setForm]         = useState({ cedula: '', nombres: '', apellidos: '', motivo: MOTIVO_POR_DEFECTO });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    apiService.get(`/captacion/vinculaciones/${vinculacionId}/correcciones`).then(({ data }) => setInfo(data)).catch(() => setInfo(null));
  }, [vinculacionId]);
  useEffect(() => { cargar(); }, [cargar, datos.cedula, datos.nombres, datos.apellidos]);

  if (!info) return null;
  const sinIdentificar = !datos.nombres || String(datos.cedula || '').startsWith('STAND_');
  if (entregada && !info.verificacion && !info.correcciones.length) return null;
  const verificada = !!info.verificacion?.vigente;

  const abrirCorreccion = () => {
    setForm({ cedula: datos.cedula || '', nombres: datos.nombres || '', apellidos: datos.apellidos || '', motivo: MOTIVO_POR_DEFECTO });
    setCorrigiendo(true);
  };

  const confirmar = async () => {
    setEnviando(true);
    try {
      await apiService.post(`/captacion/vinculaciones/${vinculacionId}/verificacion-identidad`);
      toast.success('Identidad confirmada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar');
    } finally {
      setEnviando(false);
    }
  };

  const cambios = Object.fromEntries(
    ['cedula', 'nombres', 'apellidos'].filter(k => form[k].trim() && form[k].trim() !== (datos[k] || '')).map(k => [k, form[k].trim()])
  );
  const puedeGuardar = Object.keys(cambios).length > 0 && form.motivo.trim().length >= 10;

  const guardar = async () => {
    setEnviando(true);
    try {
      await apiService.put(`/captacion/vinculaciones/${vinculacionId}/identidad`, { ...cambios, motivo: form.motivo.trim() });
      toast.success('Datos corregidos');
      setCorrigiendo(false);
      cargar();
      onCambio();
    } catch (err) {
      const d = err.response?.data;
      const campo = d?.detalles?.fieldErrors && Object.values(d.detalles.fieldErrors).flat()[0];
      toast.error(campo || d?.error || 'No se pudo corregir');
    } finally {
      setEnviando(false);
    }
  };

  const campo = (k, tipo = 'text') => (
    <div key={k}>
      <label htmlFor={`idn-${k}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">{ROTULO[k]}</label>
      <input id={`idn-${k}`} type={tipo} value={form[k]} inputMode={k === 'cedula' ? 'numeric' : undefined}
        onChange={e => setForm(f => ({ ...f, [k]: k === 'cedula' ? e.target.value.replace(/\D/g, '') : e.target.value }))}
        className="w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-700/50 focus:outline-none" />
    </div>
  );

  return (
    <section className={`overflow-hidden rounded border bg-slate-900/20 ${verificada ? 'border-emerald-900/40' : 'border-slate-800/60'}`}>
      <header className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${verificada ? 'border-emerald-900/20 bg-emerald-900/10' : 'border-slate-800/40 bg-slate-900/40'}`}>
        <h2 className={`flex items-center gap-2 text-xs font-bold tracking-wider ${verificada ? 'text-emerald-400' : 'text-slate-500'}`}>
          {verificada ? <BadgeCheck size={14} /> : <CreditCard size={14} />} VERIFICACIÓN CONTRA LA CÉDULA
        </h2>
        <span className="text-[10px] tracking-wider text-slate-500">{verificada ? 'VERIFICADA' : 'PENDIENTE'}</span>
      </header>

      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {['cedula', 'nombres', 'apellidos'].map(k => (
            <div key={k}>
              <dt className="mb-0.5 text-[9px] uppercase tracking-[2px] text-slate-500">{ROTULO[k]}</dt>
              <dd className="break-words text-sm font-semibold text-slate-100">{datos[k] || <span className="text-slate-700">—</span>}</dd>
            </div>
          ))}
        </dl>

        {!entregada && !corrigiendo && !sinIdentificar && (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Compara con la foto de la cédula. ¿El número, los nombres y los apellidos son <strong className="text-slate-200">exactamente iguales</strong> a los de la cédula?
            </p>
            <div className="flex flex-wrap gap-2">
              {!verificada && (
                <button onClick={confirmar} disabled={enviando}
                  className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40">
                  {enviando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} SÍ, SON IGUALES
                </button>
              )}
              <button onClick={abrirCorreccion}
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 hover:border-amber-700/50 hover:text-amber-400">
                <Pencil size={12} /> {verificada ? 'CORREGIR' : 'NO, ESCRIBIRLOS COMO EN LA CÉDULA'}
              </button>
            </div>
          </div>
        )}

        {corrigiendo && (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Escríbelos <strong className="text-slate-200">tal cual aparecen en la cédula</strong>, con sus tildes y en el mismo orden.
              {firmada && ' La solicitud ya está firmada: se conserva la firma original y se sella un nuevo PDF con los datos corregidos.'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {campo('cedula')}{campo('nombres')}{campo('apellidos')}
            </div>
            <div>
              <label htmlFor="idn-motivo" className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Motivo (queda registrado)</label>
              <textarea id="idn-motivo" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} rows={2} maxLength={500}
                className="w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-700/50 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={guardar} disabled={enviando || !puedeGuardar}
                className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40">
                {enviando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} GUARDAR CORRECCIÓN
              </button>
              <button onClick={() => setCorrigiendo(false)} className="rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-400 hover:text-slate-200">
                CANCELAR
              </button>
            </div>
          </div>
        )}

        {info.verificacion && (
          <p className="text-[10px] text-slate-500">
            {info.verificacion.origen === 'corregida' ? 'Corregida' : 'Confirmada'} {fechaHora(info.verificacion.created_at)}
            {info.verificacion.asesor_nombre && <> por {info.verificacion.asesor_nombre}</>}
            {!info.verificacion.vigente && ' · los datos cambiaron desde entonces'}
          </p>
        )}

        {info.correcciones.length > 0 && (
          <div>
            <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Correcciones</p>
            <ul className="divide-y divide-slate-800/60">
              {info.correcciones.map(c => (
                <li key={c.id} className="py-1.5 text-[11px] text-slate-400">
                  {Object.keys(c.despues).map(k => (
                    <p key={k}>{ROTULO[k]}: <span className="text-slate-500 line-through">{c.antes[k]}</span> → <span className="font-semibold text-slate-200">{c.despues[k]}</span></p>
                  ))}
                  <p className="mt-0.5 text-slate-500">{c.motivo} · {fechaHora(c.created_at)}{c.asesor_nombre && <> · {c.asesor_nombre}</>}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default PanelVerificacionCedula;
