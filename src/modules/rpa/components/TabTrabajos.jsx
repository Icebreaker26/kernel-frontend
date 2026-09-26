import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Eye, Check, X as Equis, RotateCcw, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { fechaHora } from '../../captacion/utils/formato.js';
import { Chip } from '../../captacion/components/panel/indicadores.jsx';
import Modal, { mensajeError } from './Modal.jsx';
import { JobBadge } from './BadgeSolido.jsx';
import { infoJob, faltanteLegible } from '../estados.js';

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['aprobar', 'Por aprobar', (j) => j.estado === 'listo_para_aprobar'],
  ['curso', 'En curso', (j) => ['pendiente', 'llenando', 'aprobado', 'guardando'].includes(j.estado)],
  ['atencion', 'Requieren atención', (j) => ['requiere_datos', 'fallido', 'revision_humana'].includes(j.estado)],
  ['cargados', 'Cargados', (j) => ['cargado', 'ya_existe'].includes(j.estado)],
];

const ETIQUETAS_CAMPO = {
  pagina1: 'PÁGINA 1 · DATOS BÁSICOS E INGRESO', pagina2: 'PÁGINA 2 · INFORMACIÓN LABORAL', pagina3: 'PÁGINA 3 · INGRESOS Y EGRESOS',
  pagina4: 'PÁGINA 4 · SARLAFT', cabecera: 'CABECERA',
};

/** Miniatura de una captura: se pide como imagen con la sesión (la API la protege). */
const Captura = ({ captura, onAbrir }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true; let objeto = null;
    apiService.get(`/rpa/capturas/${captura.id}`, { responseType: 'blob' })
      .then(({ data }) => { if (vivo) { objeto = URL.createObjectURL(data); setUrl(objeto); } })
      .catch(() => vivo && setError(true));
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [captura.id]);
  return (
    <figure className="min-w-0">
      <button type="button" onClick={() => url && onAbrir({ url, etiqueta: captura.etiqueta })} disabled={!url}
              className="block w-full overflow-hidden rounded border border-slate-700 bg-slate-950 hover:border-emerald-600">
        {url ? <img src={url} alt={`Captura ${captura.etiqueta}`} className="w-full" />
          : <div className="flex h-24 items-center justify-center text-slate-600">{error ? <ImageOff size={18} /> : <Loader2 size={16} className="animate-spin" />}</div>}
      </button>
      <figcaption className="mt-1 text-center text-[9px] tracking-wider text-slate-500">{captura.etiqueta.toUpperCase()}</figcaption>
    </figure>
  );
};

const Valor = ({ v }) => (v === true ? 'Sí' : v === false ? 'No' : v === null || v === undefined || v === '' ? '—' : String(v));

const DetalleJob = ({ id, onClose, onCambio, guardaHabilitado }) => {
  const [d, setD] = useState(null);
  const [grande, setGrande] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [resolviendo, setResolviendo] = useState(null);       // { resultado, nota }

  const cargar = useCallback(() => apiService.get(`/rpa/jobs/${id}`).then(({ data }) => setD(data)).catch(() => toast.error('No se pudo cargar el trabajo')), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (ruta, cuerpo, ok) => {
    setTrabajando(true);
    try { await apiService.post(`/rpa/jobs/${id}/${ruta}`, cuerpo); toast.success(ok); onCambio(); await cargar(); setResolviendo(null); }
    catch (err) { toast.error(mensajeError(err, 'No se pudo completar la acción')); }
    finally { setTrabajando(false); }
  };

  if (!d) return <Modal titulo="Trabajo" onClose={onClose}><Loader2 className="animate-spin text-slate-500" /></Modal>;
  const info = infoJob(d.estado);
  const p = d.payload;
  const btn = 'rounded border px-3 py-1.5 text-[10px] tracking-[1.5px] disabled:opacity-40';

  return (
    <Modal titulo={`${d.nombres} ${d.apellidos} · ${d.cedula}`} onClose={onClose} ancho="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <JobBadge estado={d.estado} />
        <span className="text-[10px] text-slate-500">Asesor: {d.asesor_nombre || '—'} · Actualizado {fechaHora(d.updated_at)}</span>
        {d.aprobado_por_nombre && <span className="text-[10px] text-slate-500">· Aprobó {d.aprobado_por_nombre} {fechaHora(d.aprobado_at)}</span>}
      </div>
      {info.accion && <p className="mb-3 text-[11px] text-slate-400">{info.accion}.</p>}
      {d.error && <p className="mb-3 rounded border border-red-900/50 bg-red-900/10 p-3 text-[11px] text-red-300">{d.error}</p>}
      {Array.isArray(d.faltantes) && d.faltantes.length > 0 && (
        <ul className="mb-3 space-y-1 rounded border border-amber-800/40 bg-amber-900/10 p-3 text-[11px] text-amber-200">
          {d.faltantes.map((f, i) => <li key={i}>• {faltanteLegible(f)}</li>)}
        </ul>
      )}

      {d.capturas?.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] tracking-[2px] text-slate-500">CAPTURAS DEL LLENADO (lo que quedó digitado en SOLIDO)</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{d.capturas.map((c) => <Captura key={c.id} captura={c} onAbrir={setGrande} />)}</div>
        </div>
      )}

      {p && (
        <details className="mb-4 rounded border border-slate-800 bg-slate-900/30 p-3" open={d.estado === 'listo_para_aprobar'}>
          <summary className="cursor-pointer text-[10px] tracking-[2px] text-slate-400">LO QUE SE DIGITARÁ EN SOLIDO</summary>
          {p.informativo?.empresa_origen === 'por_defecto' && (
            <p className="mt-2 rounded border border-amber-800/40 bg-amber-900/10 p-2 text-[11px] text-amber-200">
              La solicitud no tiene empresa: se cargará como 0010 Particulares (descuento por Caja). Confírmalo antes de aprobar.
            </p>
          )}
          {['cabecera', 'pagina1', 'pagina2', 'pagina3', 'pagina4'].map((k) => (
            <div key={k} className="mt-3">
              <p className="mb-1 text-[9px] tracking-[2px] text-emerald-500">{ETIQUETAS_CAMPO[k]}</p>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-[11px] md:grid-cols-2">
                {Object.entries(p[k] || {}).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([campo, v]) => (
                  <div key={campo} className="flex justify-between gap-3 border-b border-slate-800/40 py-0.5"><dt className="text-slate-500">{campo}</dt><dd className="text-right text-slate-200"><Valor v={v} /></dd></div>
                ))}
              </dl>
            </div>
          ))}
          {p.informativo && (
            <p className="mt-3 text-[10px] text-slate-500">Aporte {p.informativo.valor_aporte ?? '—'} · descuento {p.informativo.periodicidad_descuento ?? '—'} · seguro de vida {p.informativo.seguro_vida ? 'sí' : 'no'} · bono sorteo {p.informativo.bono_sorteo ? 'sí' : 'no'} (no se digitan en SOLIDO)</p>
          )}
        </details>
      )}

      {d.estado === 'listo_para_aprobar' && !guardaHabilitado && (
        <p className="mb-3 rounded border border-amber-800/40 bg-amber-900/10 p-2 text-[11px] text-amber-200">
          Ningún agente tiene el guardado habilitado: aprobar deja el trabajo listo, pero no se guardará en SOLIDO hasta que se active en la pestaña Agentes.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {d.estado === 'listo_para_aprobar' && <button type="button" disabled={trabajando} onClick={() => accion('aprobar', undefined, 'Aprobado: el agente lo guardará')} className={`${btn} border-emerald-600 bg-emerald-900/30 text-emerald-300`}><Check size={11} className="mr-1 inline" />APROBAR Y GUARDAR</button>}
        {['requiere_datos', 'fallido'].includes(d.estado) && <button type="button" disabled={trabajando} onClick={() => accion('reevaluar', undefined, 'Revisado de nuevo')} className={`${btn} border-sky-700 text-sky-300`}><RotateCcw size={11} className="mr-1 inline" />REEVALUAR</button>}
        {d.estado === 'revision_humana' && <button type="button" disabled={trabajando} onClick={() => setResolviendo({ resultado: 'cargado', nota: '' })} className={`${btn} border-red-700 text-red-300`}>YA VERIFIQUÉ EN SOLIDO…</button>}
        {['requiere_datos', 'pendiente', 'listo_para_aprobar', 'aprobado', 'fallido'].includes(d.estado) && <button type="button" disabled={trabajando} onClick={() => accion('cancelar', undefined, 'Cancelado')} className={`${btn} border-slate-600 text-slate-400`}><Equis size={11} className="mr-1 inline" />CANCELAR</button>}
      </div>

      {resolviendo && (
        <div className="mt-4 rounded border border-red-900/50 bg-red-900/10 p-3">
          <p className="mb-2 text-[11px] text-slate-300">Verifica en SOLIDO si el asociado quedó creado y deja constancia:</p>
          <div className="mb-2 flex gap-2">
            {[['cargado', 'Sí quedó cargado'], ['no_cargado', 'No quedó cargado']].map(([v, t]) => (
              <button key={v} type="button" onClick={() => setResolviendo({ ...resolviendo, resultado: v })} aria-pressed={resolviendo.resultado === v}
                      className={`rounded border px-3 py-1.5 text-[10px] ${resolviendo.resultado === v ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>{t}</button>
            ))}
          </div>
          <textarea value={resolviendo.nota} onChange={(e) => setResolviendo({ ...resolviendo, nota: e.target.value })} rows={2} placeholder="Nota (mínimo 5 caracteres)"
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200" />
          <button type="button" disabled={trabajando || resolviendo.nota.trim().length < 5} onClick={() => accion('resolver', resolviendo, 'Resuelto')}
                  className={`${btn} mt-2 border-emerald-600 text-emerald-300`}>CONFIRMAR</button>
        </div>
      )}

      {grande && (
        <Modal titulo={`Captura · ${grande.etiqueta}`} onClose={() => setGrande(null)} ancho="max-w-6xl"><img src={grande.url} alt={`Captura ${grande.etiqueta}`} className="w-full" /></Modal>
      )}
    </Modal>
  );
};

const TabTrabajos = ({ guardaHabilitado }) => {
  const [jobs, setJobs] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(() => apiService.get('/rpa/jobs').then(({ data }) => setJobs(data)).catch((err) => {
    setJobs([]); if (err.response?.status !== 403) toast.error('No se pudieron cargar los trabajos');
  }), []);
  useEffect(() => { cargar(); const t = setInterval(cargar, 15000); return () => clearInterval(t); }, [cargar]);

  const visibles = useMemo(() => (jobs || []).filter(FILTROS.find(([k]) => k === filtro)[2]), [jobs, filtro]);
  const cuenta = (fn) => (jobs || []).filter(fn).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTROS.map(([k, t, fn]) => <Chip key={k} activo={filtro === k} onClick={() => setFiltro(k)}>{t} ({cuenta(fn)})</Chip>)}
        <button type="button" onClick={cargar} aria-label="Actualizar" className="ml-auto text-slate-500 hover:text-slate-200"><RefreshCcw size={14} /></button>
      </div>
      {jobs === null ? <Loader2 className="animate-spin text-slate-500" /> : visibles.length === 0 ? (
        <p className="rounded border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">No hay trabajos en esta vista.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[9px] tracking-[2px] text-slate-500">
              <tr><th className="px-3 py-2">ASOCIADO</th><th className="px-3 py-2">ASESOR</th><th className="px-3 py-2">ESTADO</th><th className="px-3 py-2">ACTUALIZADO</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {visibles.map((j) => (
                <tr key={j.id} className="border-b border-slate-800/40 hover:bg-slate-900/40">
                  <td className="px-3 py-2"><p className="text-slate-200">{j.nombres} {j.apellidos}</p><p className="text-[10px] text-slate-500">{j.cedula}</p></td>
                  <td className="px-3 py-2 text-slate-400">{j.asesor_nombre || '—'}</td>
                  <td className="px-3 py-2"><JobBadge estado={j.estado} /></td>
                  <td className="px-3 py-2 text-[10px] text-slate-500">{fechaHora(j.updated_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setAbierto(j.id)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-600">
                      <Eye size={11} /> {j.estado === 'listo_para_aprobar' ? 'REVISAR' : 'VER'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {abierto && <DetalleJob id={abierto} onClose={() => setAbierto(null)} onCambio={cargar} guardaHabilitado={guardaHabilitado} />}
    </div>
  );
};

export default TabTrabajos;
