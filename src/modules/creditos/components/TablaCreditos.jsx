import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Etiqueta, Pistas } from './TablaSolicitudes.jsx';
import { CLASE_ANTIGUEDAD, nivelAntiguedad } from '../lib/lista.js';
import { FORMAS, moneda, fecha } from '../lib/formato.js';

const Encabezado = ({ clave, titulo, orden, dir, onOrden, derecha = false }) => {
  if (!clave) return <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`}>{titulo}</th>;
  const activo = orden === clave;
  const Icono = !activo ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`} aria-sort={activo ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onOrden(clave)} className={`inline-flex items-center gap-1 tracking-widest hover:text-[#84cc16] ${activo ? 'text-[#84cc16]' : ''}`}>
        {titulo}<Icono size={11} aria-hidden />
      </button>
    </th>
  );
};

/** Tabla de la lista de créditos: columnas ordenables, valor solicitado y desembolso por separado, y totales de lo que se ve */
const TablaCreditos = ({ filas, base = '/creditos', mostrarAsesor = false, orden, dir, onOrden, vacio = 'No hay solicitudes con esos filtros' }) => {
  const total = filas.reduce((t, s) => t + Number(s.valor_solicitado ?? 0), 0);
  const columnas = mostrarAsesor ? 11 : 10;
  return (
    <div className="overflow-x-auto rounded-sm border border-slate-800">
      <table className="w-full min-w-[1000px] text-left text-xs">
        <thead className="bg-[#08101e] text-[10px] tracking-widest text-slate-500">
          <tr>
            <Encabezado clave="radicado" titulo="RADICADO" {...{ orden, dir, onOrden }} />
            <Encabezado clave="asociado" titulo="ASOCIADO" {...{ orden, dir, onOrden }} />
            <Encabezado titulo="EMPRESA" />
            <Encabezado titulo="CATEGORÍA" />
            <Encabezado clave="valor" titulo="VALOR SOLICITADO" derecha {...{ orden, dir, onOrden }} />
            <Encabezado titulo="DESEMBOLSO" derecha />
            <Encabezado titulo="FORMA" />
            <Encabezado clave="estado" titulo="ESTADO" {...{ orden, dir, onOrden }} />
            <Encabezado titulo="EXPEDIENTE" />
            <Encabezado clave="dias" titulo="DÍAS" derecha {...{ orden, dir, onOrden }} />
            {mostrarAsesor && <Encabezado titulo="ASESOR" />}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={columnas} className="px-3 py-10 text-center text-slate-500">{vacio}</td></tr>}
          {filas.map((s) => (
            <tr key={s.id} className="border-t border-slate-800 hover:bg-[#0d1829]">
              <td className="px-3 py-2 font-bold"><Link to={`${base}/${s.id}`} className="text-[#84cc16] hover:underline">{s.radicado}</Link></td>
              <td className="px-3 py-2"><span className="block">{s.asociado_nombre}</span><span className="text-[10px] text-slate-500">{s.asociado_codigo}</span></td>
              <td className="px-3 py-2">{s.empresa_nombre}</td>
              <td className="px-3 py-2">{s.categoria}</td>
              <td className="px-3 py-2 text-right">{moneda(s.valor_solicitado)}</td>
              <td className="px-3 py-2 text-right" title={s.monto_desembolso == null ? 'Lo calcula Cartera al cerrar el crédito' : undefined}>
                {s.monto_desembolso == null ? <span className="text-slate-600">—</span> : <span className="font-bold text-[#a0d4e0]">{moneda(s.monto_desembolso)}</span>}
              </td>
              <td className="px-3 py-2 text-slate-400">{FORMAS[s.forma_desembolso]?.split(' ')[0] ?? s.forma_desembolso}</td>
              <td className="px-3 py-2"><Etiqueta estado={s.estado} />{s.entregada_at && s.estado === 'entregada' && <span className="ml-1 text-[9px] text-slate-500">{fecha(s.entregada_at)}</span>}</td>
              <td className="px-3 py-2"><Pistas s={s} /></td>
              <td className={`px-3 py-2 text-right ${CLASE_ANTIGUEDAD[nivelAntiguedad(s.estado, s.dias)]}`}>{s.dias}</td>
              {mostrarAsesor && <td className="px-3 py-2 text-slate-400">{s.asesor_nombre}</td>}
            </tr>
          ))}
        </tbody>
        {filas.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-600 bg-[#08101e] text-[11px] font-bold text-[#a0d4e0]">
              <td className="px-3 py-2" colSpan={4}>{filas.length} {filas.length === 1 ? 'solicitud' : 'solicitudes'}</td>
              <td className="px-3 py-2 text-right" data-testid="total-valor">{moneda(total)}</td>
              <td colSpan={columnas - 5} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TablaCreditos;
