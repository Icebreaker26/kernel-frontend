import { EVENTOS, EVENTO_ROJO, EVENTO_VERDE } from '../lib/formato.js';

const detalleTexto = (e) => {
  const d = e.detalle ?? {};
  if (d.de && d.a) return `De ${d.de} a ${d.a}${d.motivo ? ` — ${d.motivo}` : ''}`;
  return d.mensaje || d.motivo || (d.tipo ? `${d.tipo}${d.nombre ? ` — ${d.nombre}` : ''}` : '') || (d.a ? `A: ${d.a.join(', ')}` : '') || '';
};

const ZONA = 'America/Bogota';
export const diaClave = (v) => new Date(v).toLocaleDateString('en-CA', { timeZone: ZONA });
export const diaTexto = (v) => new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: ZONA });
export const horaTexto = (v) => new Date(v).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: ZONA });
export const autorTexto = (e) => e.autor_nombre ?? (e.autor_tipo === 'sistema' ? 'Sistema' : e.autor_tipo);

/** Los eventos (del más viejo al más nuevo) agrupados por día, con el día más reciente primero y lo más reciente arriba dentro de cada día */
export const agruparPorDia = (eventos) => {
  const grupos = [];
  for (const e of [...eventos].reverse()) {
    const clave = diaClave(e.created_at);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) ultimo.eventos.push(e); else grupos.push({ clave, texto: diaTexto(e.created_at), eventos: [e] });
  }
  return grupos;
};

const Punto = ({ tipo }) => (
  <span aria-hidden className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-2 ring-[#08101e] ${EVENTO_ROJO.includes(tipo) ? 'bg-rose-500' : EVENTO_VERDE.includes(tipo) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
);

// Línea de tiempo inmutable de la solicitud: por día, con la hora a la izquierda de cada evento
const Timeline = ({ eventos }) => (
  <div className="space-y-5">
    {agruparPorDia(eventos).map((g) => (
      <section key={g.clave} aria-label={`Eventos del ${g.texto}`}>
        <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500">
          {g.texto.toUpperCase()}<span className="h-px flex-1 bg-slate-800" aria-hidden /><span className="font-normal">{g.eventos.length}</span>
        </h4>
        <ol className="ml-[5.5rem] space-y-3 border-l border-slate-800">
          {g.eventos.map((e) => (
            <li key={e.id} className="relative pl-4 text-xs">
              <Punto tipo={e.tipo} />
              <span className="absolute -left-[5.5rem] top-0.5 w-[5.5rem] whitespace-nowrap pr-4 text-right text-[10px] text-slate-500">{horaTexto(e.created_at)}</span>
              <p className={EVENTO_ROJO.includes(e.tipo) ? 'text-rose-300' : 'text-[#c5e6ee]'}>{EVENTOS[e.tipo] ?? e.tipo}</p>
              {detalleTexto(e) && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{detalleTexto(e)}</p>}
              <p className="mt-0.5 text-[10px] text-slate-600">{autorTexto(e)}</p>
            </li>
          ))}
        </ol>
      </section>
    ))}
  </div>
);

export default Timeline;
