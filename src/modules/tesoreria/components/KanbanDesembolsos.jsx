import { AlertTriangle, Clock, Lock } from 'lucide-react';
import { BTN_PAGAR } from './TarjetaDesembolso.jsx';
import { CLASE_ESPERA, TABS, destino, nivelEspera, textoEspera } from '../lib/desembolsos.js';
import { fecha, moneda } from '../../creditos/lib/formato.js';

const MAX_TARJETAS = 40;   // por columna; el resto se ve en la tabla (la cabecera siempre trae el total real)
const ACENTO = { pendiente: '#34d399', pagada: '#4ade80', anulada: '#fb7185' };

const Tarjeta = ({ o, onPagar }) => {
  const nivel = nivelEspera(o.estado, o.dias_espera);
  return (
    <li className="rounded-sm border border-slate-800 bg-[#0a1322] p-3 text-xs transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold text-[#34d399]">{o.radicado}</span>
        {nivel !== 'ninguno' && <span className={`flex items-center gap-1 text-[10px] ${CLASE_ESPERA[nivel]}`} title={textoEspera(o)}><Clock size={10} aria-hidden />{o.dias_espera} d</span>}
      </div>
      <p className="mt-1.5 truncate text-[#a0d4e0]" title={o.asociado_nombre}>{o.asociado_nombre}</p>
      <p className="truncate text-[10px] text-slate-500" title={o.empresa_nombre}>C.C. {o.asociado_codigo} · {o.empresa_nombre}</p>
      <p className="mt-2 text-sm font-bold text-[#e2f3f8]">{moneda(o.monto)}</p>
      <p className="truncate text-[10px] text-slate-400" title={destino(o)}>{destino(o)}</p>
      {o.forma_pago === 'transferencia' && !o.titular_es_asociado && <p className="mt-2 flex items-center gap-1 rounded-sm border border-rose-800/60 bg-rose-500/10 px-1.5 py-1 text-[10px] font-bold text-rose-300"><AlertTriangle size={11} aria-hidden />Cuenta de un tercero</p>}
      {o.estado === 'pagada' && <p className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-emerald-300">Pagado el {fecha(o.fecha_pago)} · <strong>{o.referencia_pago}</strong></p>}
      {o.estado === 'anulada' && <p className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-rose-300" title={o.anulada_motivo}><span className="line-clamp-2">{o.anulada_motivo}</span></p>}
      {o.estado === 'pendiente' && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <button type="button" disabled={!o.puede_pagar} title={o.motivo_bloqueo ?? undefined} onClick={() => onPagar(o)} aria-label={`Pagar ${o.radicado}`} className={`${BTN_PAGAR} w-full py-1.5`}>{o.motivo_bloqueo && <Lock size={11} aria-hidden />}PAGAR</button>
        </div>
      )}
    </li>
  );
};

/**
 * Tablero por estado de la orden. Es de solo lectura A PROPÓSITO: una orden cambia de estado únicamente al pagarla o devolverla,
 * nunca arrastrando. Cada columna muestra el total real y el monto que suma.
 */
const KanbanDesembolsos = ({ filas, totales, onPagar }) => (
  <div className="flex gap-3 overflow-x-auto pb-3" role="group" aria-label="Tablero de desembolsos por estado">
    {TABS.map((t) => {
      const tarjetas = filas.filter((o) => o.estado === t.clave);
      const total = totales?.[t.clave] ?? { n: tarjetas.length, valor: tarjetas.reduce((a, o) => a + Number(o.monto ?? 0), 0) };
      return (
        <section key={t.clave} aria-label={`Columna ${t.titulo}`} className="w-[290px] shrink-0 rounded-sm border border-slate-800 bg-[#08101e]">
          <header className="sticky top-0 rounded-t-sm border-b border-slate-800 bg-[#08101e] p-3" style={{ borderTop: `2px solid ${ACENTO[t.clave]}` }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold tracking-widest" style={{ color: ACENTO[t.clave] }}>{t.titulo}</h3>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-[#a0d4e0]" aria-label={`${total.n} desembolsos`}>{total.n}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{moneda(total.valor)}</p>
          </header>
          <ul className="max-h-[68vh] space-y-2 overflow-y-auto p-2">
            {tarjetas.length === 0 && <li className="px-2 py-6 text-center text-[11px] text-slate-600">Sin desembolsos</li>}
            {tarjetas.slice(0, MAX_TARJETAS).map((o) => <Tarjeta key={o.id} o={o} onPagar={onPagar} />)}
            {tarjetas.length > MAX_TARJETAS && <li className="px-2 py-2 text-center text-[10px] text-slate-500">y {tarjetas.length - MAX_TARJETAS} más: usa la vista de tabla</li>}
          </ul>
        </section>
      );
    })}
  </div>
);

export default KanbanDesembolsos;
