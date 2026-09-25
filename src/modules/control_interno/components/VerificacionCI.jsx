import { AlertTriangle, Check, X } from 'lucide-react';

/**
 * Lista de verificación de Control Interno. Cada punto se resuelve con dos botones excluyentes —CUMPLE / NO CUMPLE— en lugar de una casilla:
 * así "no revisé" (ninguno marcado) se distingue de "revisé y está mal", y un punto que no cumple lleva directo a devolver el crédito.
 * `marcas` = { clave: 'ok' | 'no' }; un punto sin marca está pendiente.
 */
const VerificacionCI = ({ items, marcas, onMarcar, deshabilitado = false }) => {
  const hechos = items.filter((i) => marcas[i.clave]).length;
  const noCumplen = items.filter((i) => marcas[i.clave] === 'no').length;
  const pct = items.length ? Math.round((hechos / items.length) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-slate-500">
        <span>{hechos} DE {items.length} VERIFICADOS</span>
        {noCumplen > 0 && <span className="text-rose-300">{noCumplen} NO {noCumplen === 1 ? 'CUMPLE' : 'CUMPLEN'}</span>}
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Puntos verificados" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={hechos}>
        <div className={`h-full rounded-full transition-all ${noCumplen ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-[#c084fc]'}`} style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2" aria-label="Lista de verificación">
        {items.map((i) => {
          const m = marcas[i.clave];
          const aviso = i.clave === 'titular_tercero';
          return (
            <li key={i.clave} data-estado={m ?? 'pendiente'}
              className={`rounded-sm border p-3 transition-colors ${m === 'ok' ? 'border-emerald-800/60 bg-emerald-500/[0.04]' : m === 'no' ? 'border-rose-800/70 bg-rose-500/[0.05]' : aviso ? 'border-rose-900/70' : 'border-slate-800'}`}>
              <p className={`text-xs leading-relaxed ${aviso ? 'text-rose-200' : 'text-[#c5e6ee]'}`}>{i.texto}</p>
              <div role="group" aria-label={`Verificación: ${i.texto}`} className="mt-2 inline-flex overflow-hidden rounded-sm border border-slate-700">
                <button type="button" aria-pressed={m === 'ok'} disabled={deshabilitado} onClick={() => onMarcar(i.clave, m === 'ok' ? undefined : 'ok')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest transition-colors disabled:cursor-not-allowed ${m === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : 'text-[#6aacbc] hover:text-[#a0d4e0]'}`}>
                  <Check size={12} aria-hidden />CUMPLE
                </button>
                <button type="button" aria-pressed={m === 'no'} disabled={deshabilitado} onClick={() => onMarcar(i.clave, m === 'no' ? undefined : 'no')}
                  className={`inline-flex items-center gap-1.5 border-l border-slate-700 px-3 py-1.5 text-[10px] font-bold tracking-widest transition-colors disabled:cursor-not-allowed ${m === 'no' ? 'bg-rose-500/20 text-rose-300' : 'text-[#6aacbc] hover:text-[#a0d4e0]'}`}>
                  <X size={12} aria-hidden />NO CUMPLE
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {noCumplen > 0 && !deshabilitado && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-sm border border-rose-800/60 bg-rose-500/[0.05] p-2 text-[11px] text-rose-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />Hay {noCumplen === 1 ? 'un punto que no cumple' : `${noCumplen} puntos que no cumplen`}: no se puede aprobar. Devuelve el crédito indicando qué está mal.
        </p>
      )}
    </div>
  );
};

export default VerificacionCI;
