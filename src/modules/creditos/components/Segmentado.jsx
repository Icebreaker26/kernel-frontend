const ACENTOS = {
  lima:  'bg-[#84cc1622] text-[#84cc16]',
  ambar: 'bg-[#fbbf2422] text-[#fbbf24]',
};

/**
 * Selector de opciones excluyentes con aspecto de botones unidos (más claro que una casilla suelta).
 * Cada opción es [clave, texto, Icono?]; la activa se anuncia con aria-pressed.
 */
const Segmentado = ({ etiqueta, valor, onCambiar, opciones, titulo, acento = 'lima', deshabilitado = false }) => (
  <div role="group" aria-label={etiqueta} title={titulo} className={`inline-flex overflow-hidden rounded-sm border border-slate-700 ${deshabilitado ? 'opacity-60' : ''}`}>
    {opciones.map(([k, t, Icono]) => (
      <button key={k} type="button" aria-pressed={valor === k} disabled={deshabilitado} onClick={() => onCambiar(k)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${valor === k ? ACENTOS[acento] : 'text-[#6aacbc] hover:text-[#a0d4e0]'} disabled:cursor-not-allowed`}>
        {Icono && <Icono size={12} />} {t}
      </button>
    ))}
  </div>
);

export default Segmentado;
