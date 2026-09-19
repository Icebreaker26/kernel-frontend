import { ETAPAS, PASOS_FORMULARIO, progresoFormulario } from '../../utils/formato.js';

/** Insignia de etapa (por contactar, llenando, lista para entregar…). */
export const EtapaBadge = ({ etapa }) => {
  const { label, cls } = ETAPAS[etapa] || ETAPAS.por_contactar;
  return <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[9px] tracking-[1.5px] ${cls}`}>{label.toUpperCase()}</span>;
};

/** Barra segmentada con un tramo por paso del formulario; el tooltip dice qué falta. */
export const ProgresoSecciones = ({ fila, ancho = 'w-28' }) => {
  const { hechos, total, pendientes } = progresoFormulario(fila);
  const titulo = pendientes.length ? `Faltan: ${pendientes.join(', ')}` : 'Formulario completo';
  return (
    <div title={titulo} aria-label={`${hechos} de ${total} pasos completados`}>
      <div className={`flex gap-0.5 ${ancho}`}>
        {PASOS_FORMULARIO.map(([k]) => (
          <span key={k} className={`h-1.5 flex-1 rounded-sm ${fila[`seccion_${k}_at`] ? (k === 'firma' ? 'bg-emerald-300' : 'bg-emerald-500') : 'bg-slate-700'}`} />
        ))}
      </div>
      <p className="mt-1 text-[9px] text-slate-500">{hechos}/{total} pasos</p>
    </div>
  );
};

const TONOS = {
  emerald: { num: 'text-emerald-400', borde: 'border-emerald-700/50 bg-emerald-900/10' },
  amber:   { num: 'text-amber-400',   borde: 'border-amber-700/40 bg-amber-900/10' },
  sky:     { num: 'text-sky-400',     borde: 'border-sky-700/40 bg-sky-900/10' },
  blue:    { num: 'text-blue-400',    borde: 'border-blue-700/40 bg-blue-900/10' },
  slate:   { num: 'text-slate-200',   borde: 'border-slate-700/60 bg-slate-900/40' },
};

/** Contador del panel; si recibe `onClick` funciona como filtro. */
export const Kpi = ({ etiqueta, valor, tono = 'slate', activo = false, onClick }) => {
  const t = TONOS[tono];
  const clases = `rounded border p-3 text-left transition-colors ${activo ? t.borde : 'border-slate-800/60 bg-slate-900/40'} ${onClick ? 'hover:border-slate-600' : ''}`;
  const contenido = (
    <>
      <p className={`text-2xl font-bold tabular-nums ${t.num}`}>{valor}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-[2px] text-slate-500">{etiqueta}</p>
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={activo} className={clases}>{contenido}</button>
    : <div className={clases}>{contenido}</div>;
};

export const Chip = ({ activo, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={activo}
          className={`whitespace-nowrap rounded border px-3 py-1.5 text-[10px] tracking-wider transition-colors ${
            activo ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-slate-700/50 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
    {children}
  </button>
);

export const Paginacion = ({ pagina, total, porPagina, onCambiar }) => {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  const btn = 'rounded border border-slate-700/50 px-3 py-1.5 text-[10px] tracking-wider text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-[10px] text-slate-500">{desde}–{hasta} de {total}</p>
      <div className="flex gap-2">
        <button className={btn} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>← ANTERIOR</button>
        <button className={btn} disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>SIGUIENTE →</button>
      </div>
    </div>
  );
};
