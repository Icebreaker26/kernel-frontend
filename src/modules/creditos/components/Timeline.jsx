import { EVENTOS, EVENTO_ROJO, EVENTO_VERDE, fechaHora } from '../lib/formato.js';

const detalleTexto = (e) => {
  const d = e.detalle ?? {};
  if (d.de && d.a) return `De ${d.de} a ${d.a}${d.motivo ? ` — ${d.motivo}` : ''}`;
  return d.mensaje || d.motivo || (d.tipo ? `${d.tipo}${d.nombre ? ` — ${d.nombre}` : ''}` : '') || (d.a ? `A: ${d.a.join(', ')}` : '') || '';
};

// Línea de tiempo inmutable de la solicitud
const Timeline = ({ eventos }) => (
  <ol className="space-y-2 border-l border-slate-800 pl-4">
    {[...eventos].reverse().map((e) => (
      <li key={e.id} className="relative text-xs">
        <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${EVENTO_ROJO.includes(e.tipo) ? 'bg-rose-500' : EVENTO_VERDE.includes(e.tipo) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        <p className={EVENTO_ROJO.includes(e.tipo) ? 'text-rose-300' : 'text-[#a0d4e0]'}>{EVENTOS[e.tipo] ?? e.tipo}</p>
        {detalleTexto(e) && <p className="text-[11px] text-slate-500">{detalleTexto(e)}</p>}
        <p className="text-[10px] text-slate-600">{fechaHora(e.created_at)} · {e.autor_nombre ?? (e.autor_tipo === 'sistema' ? 'Sistema' : e.autor_tipo)}</p>
      </li>
    ))}
  </ol>
);

export default Timeline;
