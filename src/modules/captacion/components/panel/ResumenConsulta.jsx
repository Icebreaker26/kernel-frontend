import { fechaHora } from '../../utils/formato.js';

export const DECISION = { descartada: { texto: 'Descartada', tono: 'text-slate-300' }, confirmada: { texto: 'Confirmada', tono: 'text-red-400' } };
export const RESULTADO_MANUAL = {
  sin_hallazgos: { texto: 'Sin hallazgos', tono: 'text-emerald-400' },
  hallazgo:      { texto: 'CON HALLAZGO', tono: 'text-red-400' },
  no_aplica:     { texto: 'No aplica', tono: 'text-slate-500' },
};

export const Insignia = ({ children, tono = 'slate' }) => {
  const tonos = {
    slate: 'border-slate-700 text-slate-400', rojo: 'border-red-800/60 text-red-400', verde: 'border-emerald-800/60 text-emerald-400',
    ambar: 'border-amber-800/60 text-amber-400',
  };
  return <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${tonos[tono]}`}>{children}</span>;
};

// Resultados de la búsqueda automática en fuentes abiertas: enlace, sitio y el resumen breve que da el buscador.
// Son pistas para el asesor (pueden ser homónimos); los enlaces se abren en otra pestaña.
export const ResultadosBusqueda = ({ b }) => (
  <div className="space-y-3">
    <p className="text-[10px] text-slate-500">Encontrado con {b.proveedor} el {fechaHora(b.ejecutada_at)}. Son pistas: pueden referirse a personas con el mismo nombre.</p>
    {b.consultas.map(q => (
      <div key={q.clave} className="space-y-1.5">
        <p className="text-[10px] font-bold text-emerald-400">{q.etiqueta} <span className="font-normal text-slate-600">{q.q}</span></p>
        {q.error && <p className="text-[10px] text-red-400">No se pudo buscar: {q.error}</p>}
        {!q.error && q.resultados.length === 0 && <p className="text-[10px] text-slate-600">Sin resultados.</p>}
        <ul className="space-y-2">
          {q.resultados.map(r => (
            <li key={r.url} className="border-l-2 border-slate-800 pl-2.5">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-sky-400 hover:underline">{r.titulo || r.url}</a>
              <p className="text-[9px] text-emerald-500">{r.dominio}{r.edad ? ` · ${r.edad}` : ''}</p>
              {r.resumen && <p className="text-[10px] leading-relaxed text-slate-400">{r.resumen}</p>}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export const DetalleCoincidencia = ({ x }) => {
  const d = x.detalle || {};
  const partes = [
    d.programa && `Programa: ${d.programa}`, d.cargo && `Cargo: ${d.cargo}`, d.entidad && `Entidad: ${d.entidad}`,
    d.sanciones && `Sanción: ${d.sanciones}`, d.tipo_inhabilidad && d.tipo_inhabilidad,
    d.fecha_desvinculacion ? `Desvinculado el ${d.fecha_desvinculacion} (PEP hasta 2 años después)` : (x.fuente === 'PEP_SIGEP' ? 'PEP activo (sin fecha de desvinculación)' : null),
    x.nacimiento?.length ? `Nacimiento: ${x.nacimiento.join(', ')}` : null,
    x.documentos?.length ? `Cédula en la lista: ${x.documentos.join(', ')}` : null,
    x.nacionalidades?.length ? `Nacionalidad: ${x.nacionalidades.join(', ')}` : null,
  ].filter(Boolean);
  return partes.length ? <p className="text-[10px] leading-relaxed text-slate-500">{partes.join('  ·  ')}</p> : null;
};

// Vista de solo lectura de una consulta (la usa el Oficial de Cumplimiento y el asesor una vez cerrada)
const ResumenConsulta = ({ c }) => {
  const fuentes = Object.entries(c.versiones || {});
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Cédula', c.cedula], ['Nombres', c.nombres], ['Apellidos', c.apellidos], ['Asesor', c.asesor_nombre]].map(([k, v]) => (
          <div key={k}><dt className="text-[9px] uppercase tracking-[2px] text-slate-500">{k}</dt><dd className="break-words text-xs font-semibold text-slate-100">{v || '—'}</dd></div>
        ))}
      </dl>

      <div>
        <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Listas consultadas (versión usada)</p>
        <ul className="divide-y divide-slate-800/60 rounded border border-slate-800/60">
          {fuentes.map(([codigo, v]) => {
            const n = (c.coincidencias || []).filter(x => x.fuente === codigo).length;
            return (
              <li key={codigo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px]">
                <span className="text-slate-300">{v.nombre} {v.vinculante && <Insignia tono="ambar">VINCULANTE</Insignia>}</span>
                <span className="text-slate-500">
                  {v.disponible ? <>publicada {v.publicada || 's/f'} · {v.registros} registros · </> : null}
                  {!v.disponible ? <span className="text-red-400">no disponible</span> : n ? <span className="text-red-400">{n} coincidencia(s)</span> : <span className="text-emerald-400">sin coincidencias</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Coincidencias y decisión del asesor</p>
        {(c.coincidencias || []).length === 0
          ? <p className="text-xs text-emerald-400">Sin coincidencias por cédula ni por nombre.</p>
          : (
            <ul className="space-y-2">
              {c.coincidencias.map(x => (
                <li key={x.id} className="rounded border border-slate-800/60 p-3">
                  <p className="text-xs font-semibold text-slate-100">{x.fuente} · {x.nombre}
                    <span className="ml-2 font-normal text-slate-500">{x.tipo === 'documento' ? 'misma cédula' : `similitud ${Math.round(x.score * 100)}%`}</span></p>
                  <DetalleCoincidencia x={x} />
                  <p className={`mt-1 text-[11px] font-bold ${DECISION[x.decision]?.tono || 'text-amber-400'}`}>
                    {DECISION[x.decision]?.texto || 'Sin decidir'}{x.decision_motivo && <span className="font-normal text-slate-400"> — {x.decision_motivo}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div>
        <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">PEP y fuentes abiertas</p>
        {c.declaracion_pep && (
          <p className="mb-2 text-xs text-slate-300">
            Declaración PEP del asociado: <strong className={c.declaracion_pep.declara_pep ? 'text-amber-400' : 'text-emerald-400'}>
              {c.declaracion_pep.declara_pep ? 'declara vínculo PEP' : 'no declara ser PEP'}</strong>
            {c.declaracion_pep.detalle && <span className="text-slate-500"> ({c.declaracion_pep.detalle})</span>}
          </p>
        )}
        {c.busquedas && <div className="mb-3"><ResultadosBusqueda b={c.busquedas} /></div>}
        <ul className="space-y-1.5">
          {(c.checklist || []).map(item => {
            const m = c.manual?.[item.clave];
            return (
              <li key={item.clave} className="text-xs text-slate-300">
                {item.titulo}: {m ? <strong className={RESULTADO_MANUAL[m.resultado]?.tono}>{RESULTADO_MANUAL[m.resultado]?.texto}</strong> : <span className="text-slate-600">no consultada</span>}
                {m?.autorizacion_titular && <span className="block text-[10px] text-slate-500">Con autorización del titular para la consulta</span>}
                {m?.terminos && <span className="block text-[10px] text-slate-500">Buscó: {m.terminos} ({m.motor})</span>}
                {m?.observaciones && <span className="block text-[10px] text-slate-500">{m.observaciones}</span>}
                {m?.consultada_at && <span className="block text-[10px] text-slate-600">{fechaHora(m.consultada_at)}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {c.conclusion && (
        <p className={`rounded border px-3 py-2 text-xs font-bold ${c.conclusion === 'con_hallazgos' ? 'border-red-800/60 bg-red-900/10 text-red-300' : 'border-emerald-800/60 bg-emerald-900/10 text-emerald-300'}`}>
          {c.conclusion === 'con_hallazgos' ? 'CON HALLAZGOS — requiere análisis del Oficial de Cumplimiento' : 'SIN HALLAZGOS en las consultas realizadas'}
        </p>
      )}
    </div>
  );
};

export default ResumenConsulta;
