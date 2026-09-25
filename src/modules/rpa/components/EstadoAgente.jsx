import { infoAgente, hace, TONOS } from '../estados.js';

const PUNTO = { emerald: 'bg-emerald-400', sky: 'bg-sky-400', amber: 'bg-amber-400', red: 'bg-red-400', slate: 'bg-slate-500' };

/**
 * Indicador del agente de SOLIDO: activo · trabajando · pantalla bloqueada · pausado · apagado.
 * `agente` = { estado, segundos_sin_latido }. Si no está sano, explica qué hacer (salvo `compacto`).
 */
const EstadoAgente = ({ agente, compacto = false, className = '' }) => {
  const info = infoAgente(agente?.estado);
  const vivo = agente?.estado === 'activo' || agente?.estado === 'trabajando';
  return (
    <div role="status" aria-label={`Agente de SOLIDO: ${info.label}`} data-testid="estado-agente" data-estado={agente?.estado || 'sin_agente'} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          {vivo && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${PUNTO[info.tono]}`} />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${PUNTO[info.tono]}`} />
        </span>
        <span className="text-[10px] tracking-[2px] text-slate-500">AGENTE DE SOLIDO</span>
        <span className={`rounded border px-2 py-0.5 text-[9px] tracking-[1.5px] ${TONOS[info.tono]}`}>{info.label.toUpperCase()}</span>
        {agente?.segundos_sin_latido !== undefined && agente?.estado !== 'sin_agente' && (
          <span className="text-[10px] text-slate-600">última señal {hace(agente.segundos_sin_latido)}</span>
        )}
      </div>
      {!compacto && !info.ok && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{info.detalle}</p>}
    </div>
  );
};

export default EstadoAgente;
