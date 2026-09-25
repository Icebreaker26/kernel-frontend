import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { CLASE_ESPERA, TABS, nivelEspera, notaRevision, tabDeFila } from '../lib/bandejaCI.js';
import { FORMAS, moneda } from '../../creditos/lib/formato.js';

const MAX_TARJETAS = 40;   // por columna; el resto se ve en la tabla (la cabecera siempre trae el total real)

// Color de acento de cada columna
const ACENTO = { por_revisar: '#c084fc', en_tesoreria: '#2dd4bf', pagados: '#4ade80', devueltos: '#fb7185' };

const Tarjeta = ({ f, tab }) => {
  const nivel = nivelEspera(tab, f.dias);
  const nota = notaRevision(f);
  return (
    <li className="rounded-sm border border-slate-800 bg-[#0a1322] p-3 text-xs transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/control-interno/creditos/${f.id}`} className="font-bold text-[#c084fc] hover:underline">{f.radicado}</Link>
        {nivel !== 'ninguno' && <span className={`flex items-center gap-1 text-[10px] ${CLASE_ESPERA[nivel]}`} title="Días en Control Interno"><Clock size={10} aria-hidden />{f.dias} d</span>}
      </div>
      <p className="mt-1.5 truncate text-[#a0d4e0]" title={f.asociado_nombre}>{f.asociado_nombre}</p>
      <p className="truncate text-[10px] text-slate-500" title={f.empresa_nombre}>C.C. {f.asociado_codigo} · {f.empresa_nombre}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] tracking-widest text-slate-500">DESEMBOLSO NETO</p>
          <p className="text-sm font-bold text-[#e2f3f8]">{moneda(f.desembolso_neto)}</p>
          <p className="text-[10px] text-slate-500">de {moneda(f.valor_solicitado)}</p>
        </div>
        <span className="rounded-sm border border-slate-700 px-1.5 py-0.5 text-[9px] tracking-wider text-slate-400">{(FORMAS[f.forma_desembolso] ?? f.forma_desembolso).split(' ')[0].toUpperCase()}</span>
      </div>
      {f.titular_tercero && <p className="mt-2 flex items-center gap-1 rounded-sm border border-rose-800/60 bg-rose-500/10 px-1.5 py-1 text-[10px] font-bold text-rose-300"><AlertTriangle size={11} aria-hidden />Cuenta de un tercero</p>}
      {nota && <p className={`mt-2 border-t border-slate-800 pt-2 text-[10px] ${tab === 'devueltos' ? 'text-rose-300' : 'text-slate-500'}`} title={nota}><span className="line-clamp-2">{nota}</span></p>}
    </li>
  );
};

/**
 * Tablero por momento del crédito. Es de solo lectura A PROPÓSITO: un crédito cambia de estado únicamente por su flujo (revisión, pago);
 * arrastrar una tarjeta permitiría saltarse controles. Cada columna muestra el total real y su desembolso neto.
 */
const KanbanRevisiones = ({ filas, totales }) => (
  <div className="flex gap-3 overflow-x-auto pb-3" role="group" aria-label="Tablero de créditos en Control Interno">
    {TABS.map((t) => {
      const tarjetas = filas.filter((f) => tabDeFila(f) === t.clave);
      const total = totales?.[t.clave] ?? { n: tarjetas.length, valor: tarjetas.reduce((a, f) => a + Number(f.desembolso_neto ?? 0), 0) };
      return (
        <section key={t.clave} aria-label={`Columna ${t.titulo}`} className="w-[290px] shrink-0 rounded-sm border border-slate-800 bg-[#08101e]">
          <header className="sticky top-0 rounded-t-sm border-b border-slate-800 bg-[#08101e] p-3" style={{ borderTop: `2px solid ${ACENTO[t.clave]}` }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold tracking-widest" style={{ color: ACENTO[t.clave] }}>{t.titulo}</h3>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-[#a0d4e0]" aria-label={`${total.n} créditos`}>{total.n}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{moneda(total.valor)} a desembolsar</p>
          </header>
          <ul className="max-h-[68vh] space-y-2 overflow-y-auto p-2">
            {tarjetas.length === 0 && <li className="px-2 py-6 text-center text-[11px] text-slate-600">Sin créditos</li>}
            {tarjetas.slice(0, MAX_TARJETAS).map((f) => <Tarjeta key={f.id} f={f} tab={t.clave} />)}
            {tarjetas.length > MAX_TARJETAS && <li className="px-2 py-2 text-center text-[10px] text-slate-500">y {tarjetas.length - MAX_TARJETAS} más: usa la vista de tabla</li>}
          </ul>
        </section>
      );
    })}
  </div>
);

export default KanbanRevisiones;
