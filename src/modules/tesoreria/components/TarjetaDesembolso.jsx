import { AlertTriangle, CheckCircle2, Lock, Undo2, Wallet } from 'lucide-react';
import TarjetaPago from '../../creditos/components/TarjetaPago.jsx';
import { fecha, fechaHora } from '../../creditos/lib/formato.js';
import { CLASE_ESPERA, nivelEspera, textoEspera } from '../lib/desembolsos.js';

const ACENTO = '#34d399';
const btn = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40';
export const BTN_PAGAR = `${btn} border-[#34d399] bg-[#34d399] text-[#020617] hover:bg-[#6ee7b7]`;
export const BTN_DEVOLVER = `${btn} border-rose-700 text-rose-300 hover:bg-rose-950/40`;

/** Por qué no se puede pagar una orden (sin permiso o porque la aprobó quien la ve), visible y no solo un botón apagado */
export const AvisoBloqueo = ({ o }) => (o.estado === 'pendiente' && o.motivo_bloqueo
  ? <p role="note" className="flex items-start gap-2 rounded-sm border border-amber-800/60 bg-amber-500/[0.05] p-2 text-[11px] text-amber-300"><Lock size={13} className="mt-0.5 shrink-0" aria-hidden />{o.motivo_bloqueo}</p>
  : null);

/** Cómo terminó una orden que ya no está por pagar */
export const ResultadoOrden = ({ o }) => {
  if (o.estado === 'pagada') {
    return (
      <p className="flex items-start gap-2 rounded-sm border border-emerald-800/60 bg-emerald-500/[0.05] p-3 text-xs text-emerald-300">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>Pagado el {fecha(o.fecha_pago)} desde {o.cuenta_origen_nombre} · referencia <strong>{o.referencia_pago}</strong> · por {o.pagada_por_nombre}</span>
      </p>
    );
  }
  if (o.estado === 'anulada') {
    return <p className="flex items-start gap-2 rounded-sm border border-rose-800/60 bg-rose-500/[0.05] p-3 text-xs text-rose-300"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />Devuelto a Control Interno: {o.anulada_motivo}</p>;
  }
  return null;
};

/** Una orden de pago como tarjeta: a quién, cuánto y a qué cuenta, con lo que hay que hacer y por qué no se puede si no se puede */
const TarjetaDesembolso = ({ o, onPagar, onDevolver }) => {
  const nivel = nivelEspera(o.estado, o.dias_espera);
  const sinPermiso = o.estado === 'pendiente' && !o.puede_pagar;
  return (
    <article className="space-y-3" aria-label={`Desembolso ${o.radicado}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: ACENTO }}>{o.radicado} <span className="ml-1 text-[10px] font-normal text-slate-500">{o.empresa_nombre}</span></h3>
        <p className="text-[10px] text-slate-500">Aprobado por {o.aprobada_por_nombre} · {fechaHora(o.aprobada_at)}{textoEspera(o) ? <> · <span className={CLASE_ESPERA[nivel]}>{textoEspera(o)}</span></> : ''}</p>
      </div>
      <TarjetaPago asociado={{ codigo: o.asociado_codigo, nombre: o.asociado_nombre }} monto={o.monto} forma={o.forma_pago} cuenta={o.forma_pago === 'transferencia' ? o : null} acento={ACENTO} />
      {o.estado === 'pendiente' && (
        <>
          <AvisoBloqueo o={o} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={sinPermiso} title={o.motivo_bloqueo ?? undefined} onClick={() => onPagar(o)} className={BTN_PAGAR}><Wallet size={13} aria-hidden />PAGAR</button>
            <button type="button" disabled={!o.puede_devolver} onClick={() => onDevolver(o)} className={BTN_DEVOLVER}><Undo2 size={13} aria-hidden /> NO SE PUEDE PAGAR</button>
          </div>
        </>
      )}
      <ResultadoOrden o={o} />
    </article>
  );
};

export default TarjetaDesembolso;
