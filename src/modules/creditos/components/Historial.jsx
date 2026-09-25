import { useId, useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import Timeline, { autorTexto, diaTexto, horaTexto } from './Timeline.jsx';
import { EVENTOS, EVENTO_ROJO } from '../lib/formato.js';

const VISIBLES = 12;   // al abrir se ven los más recientes; el resto, con un clic más

const ACENTOS = {
  lima:    { titulo: 'text-[#84cc16]', borde: 'hover:border-[#84cc1666]', foco: 'focus-visible:outline-[#84cc16]' },
  violeta: { titulo: 'text-[#c084fc]', borde: 'hover:border-[#c084fc66]', foco: 'focus-visible:outline-[#c084fc]' },
};

/**
 * Historial del crédito, plegado de origen: una tarjeta con cuántos eventos hay y cuál fue el último. La línea de tiempo completa solo se
 * monta al abrirla, así el detalle no arranca con decenas de eventos que casi nadie necesita.
 */
const Historial = ({ eventos = [], acento = 'lima' }) => {
  const [abierto, setAbierto] = useState(false);
  const [todos, setTodos] = useState(false);
  const id = useId();
  const estilo = ACENTOS[acento] ?? ACENTOS.lima;
  const ultimo = eventos[eventos.length - 1];

  return (
    <section aria-label="Historial" className={`rounded-sm border bg-[#08101e] transition-colors ${abierto ? 'border-slate-700' : `border-slate-800 ${estilo.borde}`}`}>
      <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${estilo.foco}`}>
        <History size={16} aria-hidden className={estilo.titulo} />
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-2 text-[11px] font-bold tracking-widest ${estilo.titulo}`}>
            HISTORIAL
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-normal tracking-normal text-[#a0d4e0]">{eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}</span>
          </span>
          {ultimo && !abierto && (
            <span className="mt-1 block truncate text-[11px] text-slate-500">
              Último: <span className={EVENTO_ROJO.includes(ultimo.tipo) ? 'text-rose-300' : 'text-[#a0d4e0]'}>{EVENTOS[ultimo.tipo] ?? ultimo.tipo}</span> · {diaTexto(ultimo.created_at)}, {horaTexto(ultimo.created_at)} · {autorTexto(ultimo)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] tracking-widest text-slate-500">
          {abierto ? 'OCULTAR' : 'VER HISTORIAL'}
          <ChevronDown size={14} aria-hidden className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div id={id} hidden={!abierto}>
        {abierto && (
          <div className="border-t border-slate-800 p-4">
            {eventos.length ? <Timeline eventos={todos ? eventos : eventos.slice(-VISIBLES)} /> : <p className="text-xs text-slate-500">Aún no hay eventos.</p>}
            {!todos && eventos.length > VISIBLES && (
              <button type="button" onClick={() => setTodos(true)} className="mt-4 w-full rounded-sm border border-slate-700 py-2 text-[10px] font-bold tracking-widest text-[#a0d4e0] hover:border-slate-500">
                VER LOS {eventos.length - VISIBLES} ANTERIORES
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Historial;
