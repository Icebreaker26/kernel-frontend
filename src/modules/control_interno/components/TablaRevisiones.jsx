import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, Download } from 'lucide-react';
import { CLASE_ESPERA, nivelEspera, notaRevision } from '../lib/bandejaCI.js';
import { FORMAS, fechaBogota, moneda } from '../../creditos/lib/formato.js';

const Encabezado = ({ clave, titulo, orden, dir, onOrden, derecha = false }) => {
  if (!clave) return <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`}>{titulo}</th>;
  const activo = orden === clave;
  const Icono = !activo ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 ${derecha ? 'text-right' : ''}`} aria-sort={activo ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onOrden(clave)} className={`inline-flex items-center gap-1 tracking-widest hover:text-[#c084fc] ${activo ? 'text-[#c084fc]' : ''}`}>
        {titulo}<Icono size={11} aria-hidden />
      </button>
    </th>
  );
};

const suma = (filas, campo) => filas.reduce((t, f) => t + Number(f[campo] ?? 0), 0);

/** Descuentos del cierre en dos líneas: aval y firma electrónica (lo que separa el valor solicitado del desembolso neto) */
const Descuentos = ({ f }) => {
  const externa = f.modalidad_firma === 'externa' && Number(f.firma_electronica_valor) > 0;
  if (!f.con_aval && !externa) return <span className="text-slate-600">—</span>;
  return (
    <span className="block text-[10px] leading-snug text-amber-200/90">
      {f.con_aval && <span className="block">Aval {Number(f.aval_porcentaje)}% · {moneda(f.aval_valor)}</span>}
      {externa && <span className="block">Firma {moneda(f.firma_electronica_valor)}</span>}
    </span>
  );
};

/**
 * Tabla de la bandeja de Control Interno: valor solicitado, descuentos y desembolso neto por separado, forma de pago con el aviso de cuenta
 * de tercero, días que lleva y lo último que pasó (quién completó, aprobó o devolvió). Las columnas de valor y tiempo se ordenan.
 */
const TablaRevisiones = ({ filas, tab, orden, dir, onOrden, onPdf, bajando, vacio = 'No hay créditos con esos filtros' }) => {
  const columnas = 10;
  const porRevisar = tab === 'por_revisar';
  return (
    <div className="overflow-x-auto rounded-sm border border-slate-800">
      <table className="w-full min-w-[1080px] text-left text-xs">
        <thead className="bg-[#08101e] text-[10px] tracking-widest text-slate-500">
          <tr>
            <Encabezado clave="radicado" titulo="RADICADO" {...{ orden, dir, onOrden }} />
            <Encabezado clave="asociado" titulo="ASOCIADO" {...{ orden, dir, onOrden }} />
            <Encabezado titulo="EMPRESA" />
            <Encabezado clave="valor" titulo="SOLICITADO" derecha {...{ orden, dir, onOrden }} />
            <Encabezado titulo="DESCUENTOS" />
            <Encabezado clave="desembolso" titulo="DESEMBOLSO NETO" derecha {...{ orden, dir, onOrden }} />
            <Encabezado titulo="FORMA" />
            <Encabezado clave="dias" titulo="DÍAS" derecha {...{ orden, dir, onOrden }} />
            <Encabezado titulo={porRevisar ? 'COMPLETÓ' : 'ÚLTIMA REVISIÓN'} />
            <Encabezado titulo="" />
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={columnas} className="px-3 py-10 text-center text-slate-500">{vacio}</td></tr>}
          {filas.map((f) => (
            <tr key={f.id} className="border-t border-slate-800 hover:bg-[#0d1829]">
              <td className="px-3 py-2 font-bold"><Link to={`/control-interno/creditos/${f.id}`} className="text-[#c084fc] hover:underline">{f.radicado}</Link></td>
              <td className="px-3 py-2"><span className="block">{f.asociado_nombre}</span><span className="text-[10px] text-slate-500">C.C. {f.asociado_codigo}</span></td>
              <td className="px-3 py-2">{f.empresa_nombre}</td>
              <td className="px-3 py-2 text-right">{moneda(f.valor_solicitado)}</td>
              <td className="px-3 py-2"><Descuentos f={f} /></td>
              <td className="px-3 py-2 text-right font-bold text-[#e2f3f8]">{moneda(f.desembolso_neto)}</td>
              <td className="px-3 py-2">
                <span className="block">{FORMAS[f.forma_desembolso] ?? f.forma_desembolso}</span>
                {f.titular_tercero && <span className="mt-0.5 inline-flex items-center gap-1 rounded-sm border border-rose-700/70 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-rose-300" title="El titular de la cuenta no es el asociado"><AlertTriangle size={10} aria-hidden />CUENTA DE TERCERO</span>}
              </td>
              <td className={`px-3 py-2 text-right ${CLASE_ESPERA[nivelEspera(tab, f.dias)]}`} title={`Completado el ${fechaBogota(f.completada_at)}`}>{f.dias}</td>
              <td className="max-w-[220px] px-3 py-2 text-[11px] text-slate-400"><span className="line-clamp-2" title={notaRevision(f)}>{notaRevision(f)}</span></td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <Link to={`/control-interno/creditos/${f.id}`} className={`mr-2 inline-flex items-center rounded-sm border px-2.5 py-1.5 text-[10px] font-bold tracking-widest ${porRevisar ? 'border-[#c084fc] bg-[#c084fc] text-[#020617] hover:bg-[#d8b4fe]' : 'border-slate-600 text-[#a0d4e0] hover:border-[#c084fc] hover:text-[#c084fc]'}`}>{porRevisar ? 'REVISAR' : 'VER'}</Link>
                <button type="button" disabled={bajando === f.id} onClick={() => onPdf(f)} aria-label={`Descargar PDF final ${f.radicado}`}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-slate-600 px-2.5 py-1.5 text-[10px] tracking-widest hover:border-[#c084fc] hover:text-[#c084fc] disabled:opacity-40">
                  <Download size={12} /> {bajando === f.id ? 'ARMANDO…' : 'PDF FINAL'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {filas.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-600 bg-[#08101e] text-[11px] font-bold text-[#a0d4e0]">
              <td className="px-3 py-2" colSpan={3}>{filas.length} {filas.length === 1 ? 'crédito' : 'créditos'}</td>
              <td className="px-3 py-2 text-right" data-testid="total-solicitado">{moneda(suma(filas, 'valor_solicitado'))}</td>
              <td />
              <td className="px-3 py-2 text-right" data-testid="total-neto">{moneda(suma(filas, 'desembolso_neto'))}</td>
              <td colSpan={columnas - 6} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TablaRevisiones;
