import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { infoSolido, infoJob, TONOS } from '../estados.js';

/** Insignia para las listas de vinculaciones: estado del asociado en SOLIDO (no muestra nada si nunca se subió). */
export const SolidoBadge = ({ estado }) => {
  const info = infoSolido(estado);
  if (!info) return null;
  const Icono = info.exito ? CheckCircle2 : info.tono === 'red' ? AlertTriangle : Clock;
  return (
    <span data-testid="solido-badge" data-estado={estado}
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-[9px] tracking-[1.5px] ${TONOS[info.tono]}`}>
      <Icono size={10} /> {info.label.toUpperCase()}
    </span>
  );
};

/** Insignia del estado de un trabajo (bandeja de administración). */
export const JobBadge = ({ estado }) => {
  const info = infoJob(estado);
  return (
    <span data-testid="job-badge" data-estado={estado}
          className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[9px] tracking-[1.5px] ${TONOS[info.tono]}`}>
      {info.label.toUpperCase()}
    </span>
  );
};
