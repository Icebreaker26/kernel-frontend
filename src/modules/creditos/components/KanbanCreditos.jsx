import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { CLASE_ANTIGUEDAD, COLUMNAS_CERRADAS, COLUMNAS_KANBAN, nivelAntiguedad } from '../lib/lista.js';
import { ESTADOS, FORMAS, moneda } from '../lib/formato.js';

const MAX_TARJETAS = 40;   // por columna; el resto se ve en la tabla (la cabecera siempre trae el total real)

// Color de acento de cada columna (mismo criterio que las etiquetas de estado)
const ACENTO = {
  en_tramite: '#38bdf8', devuelta: '#fb7185', entregada: '#fbbf24', recibida: '#34d399', completada: '#c084fc', en_tesoreria: '#2dd4bf', pagada: '#4ade80',
  rechazada: '#64748b', desistida: '#64748b',
};

const Tarjeta = ({ s, base, mostrarAsesor, deCartera }) => {
  const abierta = nivelAntiguedad(s.estado, s.dias) !== 'ninguno';
  const pendiente = ['en_tramite', 'devuelta'].includes(s.estado);
  return (
    <li className="rounded-sm border border-slate-800 bg-[#0a1322] p-3 text-xs transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <Link to={`${base}/${s.id}`} className="font-bold text-[#84cc16] hover:underline">{s.radicado}</Link>
        {abierta && <span className={`flex items-center gap-1 text-[10px] ${CLASE_ANTIGUEDAD[nivelAntiguedad(s.estado, s.dias)]}`} title="Días desde la radicación"><Clock size={10} aria-hidden />{s.dias} d</span>}
      </div>
      <p className="mt-1.5 truncate text-[#a0d4e0]" title={s.asociado_nombre}>{s.asociado_nombre}</p>
      <p className="text-[10px] text-slate-500">C.C. {s.asociado_codigo}</p>
      <p className="mt-1 truncate text-[10px] text-slate-500" title={`${s.empresa_nombre} · ${s.categoria}`}>{s.empresa_nombre} · {s.categoria}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[#e2f3f8]">{moneda(s.valor_solicitado)}</p>
          {s.monto_desembolso != null && <p className="text-[10px] text-slate-400">Desembolso {moneda(s.monto_desembolso)}</p>}
        </div>
        <span className="rounded-sm border border-slate-700 px-1.5 py-0.5 text-[9px] tracking-wider text-slate-400">{(FORMAS[s.forma_desembolso] ?? s.forma_desembolso).split(' ')[0].toUpperCase()}</span>
      </div>
      {pendiente && (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-slate-800 pt-2 text-[10px]">
          <span className={s.firma_completa ? 'text-emerald-400' : 'text-amber-400'}>Firma {s.firmados}/{s.a_firmar}</span>
          <span className={!s.autorizacion_requerida || s.autorizacion_ok ? 'text-emerald-400' : 'text-amber-400'}>Autor. {!s.autorizacion_requerida ? 'N/A' : s.autorizacion_ok ? '✓' : '—'}</span>
          <span className={s.documentos_ok ? 'text-emerald-400' : 'text-amber-400'}>Docs {s.documentos_ok ? '✓' : '—'}</span>
        </p>
      )}
      {s.estado === 'devuelta' && <p className="mt-2 flex items-center gap-1 text-[10px] text-rose-300"><AlertTriangle size={11} aria-hidden /> {deCartera ? 'Devuelta: espera la corrección del asesor' : 'Devuelta: requiere tu acción'}</p>}
      {mostrarAsesor && <p className="mt-2 text-[10px] text-slate-500">{s.asesor_nombre}</p>}
    </li>
  );
};

/**
 * Tablero por estado. Es de solo lectura A PROPÓSITO: un crédito cambia de estado únicamente por su flujo (firma, entrega, revisión, pago);
 * arrastrar una tarjeta permitiría saltarse controles. Cada columna muestra el total real (no solo lo cargado) y su valor solicitado.
 * `columnas` fija qué estados se muestran (la bandeja de Cartera solo ve los suyos) y `deCartera` ajusta los textos a su punto de vista.
 */
const KanbanCreditos = ({ filas, resumen, base = '/creditos', mostrarAsesor = false, conCerradas = false, columnas: fijas, deCartera = false }) => {
  const columnas = fijas ?? (conCerradas ? [...COLUMNAS_KANBAN, ...COLUMNAS_CERRADAS] : COLUMNAS_KANBAN);
  const totales = Object.fromEntries((resumen?.estados ?? []).map((e) => [e.estado, e]));
  return (
    <div className="flex gap-3 overflow-x-auto pb-3" role="group" aria-label="Tablero de créditos por estado">
      {columnas.map((estado) => {
        const tarjetas = filas.filter((s) => s.estado === estado);
        const t = totales[estado] ?? { n: tarjetas.length, valor: tarjetas.reduce((a, s) => a + Number(s.valor_solicitado), 0) };
        return (
          <section key={estado} aria-label={`Columna ${ESTADOS[estado].t}`} className="w-[272px] shrink-0 rounded-sm border border-slate-800 bg-[#08101e]">
            <header className="sticky top-0 rounded-t-sm border-b border-slate-800 bg-[#08101e] p-3" style={{ borderTop: `2px solid ${ACENTO[estado]}` }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold tracking-widest" style={{ color: ACENTO[estado] }}>{ESTADOS[estado].t}</h3>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-[#a0d4e0]" aria-label={`${t.n} solicitudes`}>{t.n}</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{moneda(t.valor)} solicitado</p>
            </header>
            <ul className="max-h-[68vh] space-y-2 overflow-y-auto p-2">
              {tarjetas.length === 0 && <li className="px-2 py-6 text-center text-[11px] text-slate-600">Sin solicitudes</li>}
              {tarjetas.slice(0, MAX_TARJETAS).map((s) => <Tarjeta key={s.id} s={s} base={base} mostrarAsesor={mostrarAsesor} deCartera={deCartera} />)}
              {tarjetas.length > MAX_TARJETAS && <li className="px-2 py-2 text-center text-[10px] text-slate-500">y {tarjetas.length - MAX_TARJETAS} más: usa la vista de tabla</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default KanbanCreditos;
