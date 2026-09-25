import { AlertTriangle, Check, Minus } from 'lucide-react';
import { avance, pasosCredito } from '../lib/progreso.js';
import { fechaBogota } from '../lib/formato.js';

const ESTILO = {
  hecho:     { aro: 'border-emerald-500 bg-emerald-500/15 text-emerald-300', texto: 'text-[#a0d4e0]' },
  actual:    { aro: 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16] shadow-[0_0_0_3px_rgba(132,204,22,0.15)]', texto: 'font-bold text-[#84cc16]' },
  alerta:    { aro: 'border-rose-500 bg-rose-500/15 text-rose-300', texto: 'font-bold text-rose-300' },
  pendiente: { aro: 'border-slate-700 bg-transparent text-slate-500', texto: 'text-slate-500' },
  na:        { aro: 'border-dashed border-slate-700 bg-transparent text-slate-600', texto: 'text-slate-600' },
  cerrado:   { aro: 'border-slate-700 bg-slate-800/40 text-slate-600', texto: 'text-slate-600' },
};
// Solo el paso actual y el título cambian de color según el módulo que lo muestra
const ACTUAL = {
  lima:    { aro: 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16] shadow-[0_0_0_3px_rgba(132,204,22,0.15)]', texto: 'font-bold text-[#84cc16]', titulo: 'text-[#84cc16]', barra: 'to-[#84cc16]' },
  violeta: { aro: 'border-[#c084fc] bg-[#c084fc22] text-[#c084fc] shadow-[0_0_0_3px_rgba(192,132,252,0.15)]', texto: 'font-bold text-[#c084fc]', titulo: 'text-[#c084fc]', barra: 'to-[#c084fc]' },
};
const GRUPOS = { preparacion: 'PREPARACIÓN DEL EXPEDIENTE', tramite: 'TRÁMITE Y PAGO' };

const Icono = ({ estado, n }) => {
  if (estado === 'hecho') return <Check size={14} aria-hidden />;
  if (estado === 'alerta') return <AlertTriangle size={13} aria-hidden />;
  if (estado === 'na') return <Minus size={13} aria-hidden />;
  return <span className="text-[11px] font-bold">{n}</span>;
};

/**
 * Línea de progreso de la solicitud: cada paso con su estado (hecho, actual, pendiente, con problema o no aplica),
 * agrupados en lo que arma el asesor y lo que ocurre después de entregarla. `aria-current="step"` marca dónde está.
 */
const ProgresoCredito = ({ s, p, acento = 'lima' }) => {
  const pasos = pasosCredito(s, p);
  const { hechos, total } = avance(pasos);
  const pct = total ? Math.round((hechos / total) * 100) : 0;
  const numerados = pasos.map((x, i) => ({ ...x, n: i + 1 }));

  return (
    <section aria-label="Progreso de la solicitud" className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className={`text-[11px] font-bold tracking-widest ${ACTUAL[acento].titulo}`}>PROGRESO</h3>
        <p className="text-[11px] text-slate-400"><b className="text-[#a0d4e0]">{hechos} de {total}</b> pasos completados · {pct} %</p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechos} aria-label="Avance">
        <div className={`h-full rounded-full bg-gradient-to-r from-emerald-500 ${ACTUAL[acento].barra} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-[3fr_4fr]">
        {Object.entries(GRUPOS).map(([grupo, titulo]) => (
          <div key={grupo}>
            <p className="mb-2 text-[9px] tracking-widest text-slate-600">{titulo}</p>
            <ol className="flex gap-1">
              {numerados.filter((x) => x.grupo === grupo).map((x, i, lista) => (
                <li key={x.clave} aria-current={x.estado === 'actual' || x.estado === 'alerta' ? 'step' : undefined} className="relative flex min-w-0 flex-1 flex-col items-center text-center" data-estado={x.estado}>
                  {i < lista.length - 1 && <span aria-hidden className={`absolute left-[calc(50%+16px)] right-[calc(-50%+16px)] top-4 h-px ${x.estado === 'hecho' ? 'bg-emerald-600/60' : 'bg-slate-800'}`} />}
                  <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${x.estado === 'actual' ? ACTUAL[acento].aro : ESTILO[x.estado].aro}`}><Icono estado={x.estado} n={x.n} /></span>
                  <span className={`mt-1.5 text-[10px] leading-tight ${x.estado === 'actual' ? ACTUAL[acento].texto : ESTILO[x.estado].texto}`}>{x.titulo}</span>
                  <span className="mt-0.5 text-[9px] leading-tight text-slate-600">
                    {x.estado === 'na' ? x.detalle : x.esFecha ? (x.detalle ? fechaBogota(x.detalle) : '') : x.detalle}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProgresoCredito;
