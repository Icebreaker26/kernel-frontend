import { Link } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { ESTADOS, moneda, fecha } from '../lib/formato.js';

const Etiqueta = ({ estado }) => {
  const e = ESTADOS[estado] ?? { t: estado, c: 'border-slate-700 text-slate-400' };
  return <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[9px] tracking-wider ${e.c}`}>{e.t}</span>;
};

// Semáforo de las tres pistas del expediente: firma, autorización de la empresa y documentos del asociado
export const Pistas = ({ s }) => {
  const ok = 'text-emerald-400';
  const pend = 'text-amber-400';
  const mal = 'text-rose-400';
  const aut = !s.autorizacion_requerida ? { txt: 'N/A', c: 'text-slate-500' }
    : s.autorizacion_ok ? { txt: '✓', c: ok }
      : ['rechazada', 'sin_destinatario', 'invalidada'].includes(s.autorizacion_estado) ? { txt: '✗', c: mal }
        : { txt: s.autorizacion_estado ? '⏳' : '—', c: pend };
  return (
    <span className="flex items-center gap-3 whitespace-nowrap text-[10px]">
      <span title="Documentos firmados" className={s.firma_completa ? ok : pend}>Firma {s.firmados}/{s.a_firmar}</span>
      <span title="Autorización de la empresa" className={aut.c}>Autor. {aut.txt}</span>
      <span title="Desprendible y certificado bancario" className={s.documentos_ok ? ok : pend}>Docs {s.documentos_ok ? '✓' : '—'}</span>
      {s.expediente_completo && <Check size={12} className={ok} aria-label="Expediente completo" />}
      {!s.expediente_completo && <Minus size={12} className="text-slate-600" aria-hidden />}
    </span>
  );
};

const TablaSolicitudes = ({ filas, base, mostrarAsesor = false, vacio = 'No hay solicitudes' }) => (
  <div className="overflow-x-auto rounded-sm border border-slate-800">
    <table className="w-full min-w-[860px] text-left text-xs">
      <thead className="bg-[#08101e] text-[10px] tracking-widest text-slate-500">
        <tr>
          <th className="px-3 py-2">RADICADO</th><th className="px-3 py-2">ASOCIADO</th><th className="px-3 py-2">EMPRESA</th><th className="px-3 py-2">CATEGORÍA</th>
          <th className="px-3 py-2 text-right">DESEMBOLSO</th><th className="px-3 py-2">ESTADO</th><th className="px-3 py-2">EXPEDIENTE</th>
          <th className="px-3 py-2 text-right">DÍAS</th>{mostrarAsesor && <th className="px-3 py-2">ASESOR</th>}
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 && <tr><td colSpan={mostrarAsesor ? 9 : 8} className="px-3 py-8 text-center text-slate-500">{vacio}</td></tr>}
        {filas.map((s) => (
          <tr key={s.id} className="border-t border-slate-800 hover:bg-[#0d1829]">
            <td className="px-3 py-2 font-bold"><Link to={`${base}/${s.id}`} className="text-[#84cc16] hover:underline">{s.radicado}</Link></td>
            <td className="px-3 py-2"><span className="block">{s.asociado_nombre}</span><span className="text-[10px] text-slate-500">{s.asociado_codigo}</span></td>
            <td className="px-3 py-2">{s.empresa_nombre}</td>
            <td className="px-3 py-2">{s.categoria}</td>
            <td className="px-3 py-2 text-right">{moneda(s.monto_desembolso)}</td>
            <td className="px-3 py-2"><Etiqueta estado={s.estado} />{s.entregada_at && s.estado === 'entregada' && <span className="ml-1 text-[9px] text-slate-500">{fecha(s.entregada_at)}</span>}</td>
            <td className="px-3 py-2"><Pistas s={s} /></td>
            <td className="px-3 py-2 text-right text-slate-400">{s.dias}</td>
            {mostrarAsesor && <td className="px-3 py-2 text-slate-400">{s.asesor_nombre}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export { Etiqueta };
export default TablaSolicitudes;
