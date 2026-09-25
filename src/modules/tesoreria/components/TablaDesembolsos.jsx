import { AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, Lock } from 'lucide-react';
import { CLASE_ESPERA, destino, nivelEspera } from '../lib/desembolsos.js';
import { BTN_DEVOLVER, BTN_PAGAR } from './TarjetaDesembolso.jsx';
import { FORMAS, fecha, fechaBogota, moneda } from '../../creditos/lib/formato.js';

const Encabezado = ({ clave, titulo, orden, dir, onOrden, derecha = false }) => {
  if (!clave) return <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`}>{titulo}</th>;
  const activo = orden === clave;
  const Icono = !activo ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`} aria-sort={activo ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onOrden(clave)} className={`inline-flex items-center gap-1 tracking-widest hover:text-[#34d399] ${activo ? 'text-[#34d399]' : ''}`}>
        {titulo}<Icono size={11} aria-hidden />
      </button>
    </th>
  );
};

/** Lo último que pasó con la orden, según su estado */
const Situacion = ({ o }) => {
  if (o.estado === 'pagada') return <span className="text-[11px] text-emerald-300">Pagado el {fecha(o.fecha_pago)} · <strong>{o.referencia_pago}</strong><span className="block text-[10px] text-slate-500">desde {o.cuenta_origen_nombre} · {o.pagada_por_nombre}</span></span>;
  if (o.estado === 'anulada') return <span className="line-clamp-2 text-[11px] text-rose-300" title={o.anulada_motivo}>Devuelto: {o.anulada_motivo}</span>;
  return <span className="text-[11px] text-slate-500">Aprobó {o.aprobada_por_nombre}<span className="block text-[10px]">{fechaBogota(o.aprobada_at)}</span></span>;
};

/**
 * Tabla de desembolsos: monto, a dónde va (con la cuenta enmascarada), quién aprobó y cuánto espera, con acciones por fila.
 * Las columnas de monto, asociado, espera y radicado se ordenan; el pie suma lo que se ve.
 */
const TablaDesembolsos = ({ filas, orden, dir, onOrden, onPagar, onDevolver, vacio = 'No hay desembolsos con esos filtros' }) => {
  const columnas = 9;
  const total = filas.reduce((t, o) => t + Number(o.monto ?? 0), 0);
  return (
    <div className="overflow-x-auto rounded-sm border border-slate-800">
      <table className="w-full min-w-[1040px] text-left text-xs">
        <thead className="bg-[#08101e] text-[10px] tracking-widest text-slate-500">
          <tr>
            <Encabezado clave="radicado" titulo="RADICADO" {...{ orden, dir, onOrden }} />
            <Encabezado clave="asociado" titulo="ASOCIADO" {...{ orden, dir, onOrden }} />
            <Encabezado titulo="EMPRESA" />
            <Encabezado titulo="A DÓNDE VA" />
            <Encabezado clave="monto" titulo="MONTO" derecha {...{ orden, dir, onOrden }} />
            <Encabezado clave="dias" titulo="ESPERA" derecha {...{ orden, dir, onOrden }} />
            <Encabezado titulo="SITUACIÓN" />
            <Encabezado titulo="" />
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={columnas} className="px-3 py-10 text-center text-slate-500">{vacio}</td></tr>}
          {filas.map((o) => (
            <tr key={o.id} className="border-t border-slate-800 hover:bg-[#0d1829]">
              <td className="px-3 py-2 font-bold text-[#34d399]">{o.radicado}</td>
              <td className="px-3 py-2"><span className="block">{o.asociado_nombre}</span><span className="text-[10px] text-slate-500">C.C. {o.asociado_codigo}</span></td>
              <td className="px-3 py-2">{o.empresa_nombre}</td>
              <td className="px-3 py-2">
                <span className="block">{o.forma_pago === 'transferencia' ? destino(o) : FORMAS[o.forma_pago] ?? o.forma_pago}</span>
                {o.forma_pago === 'transferencia' && <span className="text-[10px] text-slate-500">titular {o.titular_nombre}</span>}
                {o.forma_pago === 'transferencia' && !o.titular_es_asociado && <span className="mt-0.5 flex w-fit items-center gap-1 rounded-sm border border-rose-700/70 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-rose-300" title="El titular de la cuenta no es el asociado"><AlertTriangle size={10} aria-hidden />CUENTA DE TERCERO</span>}
              </td>
              <td className="px-3 py-2 text-right font-bold text-[#e2f3f8]">{moneda(o.monto)}</td>
              <td className={`px-3 py-2 text-right ${CLASE_ESPERA[nivelEspera(o.estado, o.dias_espera)]}`}>{o.dias_espera ?? '—'}</td>
              <td className="max-w-[240px] px-3 py-2"><Situacion o={o} /></td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {o.estado === 'pendiente' && (
                  <>
                    <button type="button" disabled={!o.puede_pagar} title={o.motivo_bloqueo ?? undefined} onClick={() => onPagar(o)} aria-label={`Pagar ${o.radicado}`} className={`${BTN_PAGAR} mr-2 px-2.5 py-1.5`}>{o.motivo_bloqueo && <Lock size={11} aria-hidden />}PAGAR</button>
                    <button type="button" disabled={!o.puede_devolver} onClick={() => onDevolver(o)} aria-label={`Devolver ${o.radicado}`} className={`${BTN_DEVOLVER} px-2.5 py-1.5`}>DEVOLVER</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {filas.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-600 bg-[#08101e] text-[11px] font-bold text-[#a0d4e0]">
              <td className="px-3 py-2" colSpan={4}>{filas.length} {filas.length === 1 ? 'desembolso' : 'desembolsos'}</td>
              <td className="px-3 py-2 text-right" data-testid="total-monto">{moneda(total)}</td>
              <td colSpan={columnas - 5} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TablaDesembolsos;
