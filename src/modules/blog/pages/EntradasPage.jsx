import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const SITIO = (import.meta.env.VITE_URL_SITIO || '').replace(/\/$/, '');
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }) : '');

const Estado = ({ e }) => (e.estado === 'publicado'
  ? <span className="rounded border border-emerald-700/50 px-1.5 py-0.5 text-[9px] tracking-wider text-emerald-400">PUBLICADA</span>
  : <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] tracking-wider text-slate-400">BORRADOR</span>);

const EntradasPage = () => {
  const navigate = useNavigate();
  const [entradas, setEntradas] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [borrar, setBorrar] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => apiService.get('/blog')
    .then(({ data }) => { setEntradas(data); setError(''); })
    .catch((err) => setError(err.response?.status === 403 ? 'No tienes permiso para ver este módulo.' : 'No se pudo cargar la lista.')), []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => (entradas || []).filter((e) => filtro === 'todas' || (filtro === 'publicadas' ? e.estado === 'publicado' : e.estado === 'borrador')), [entradas, filtro]);
  const cuenta = (f) => (entradas || []).filter((e) => (f === 'publicadas' ? e.estado === 'publicado' : f === 'borradores' ? e.estado === 'borrador' : true)).length;

  const eliminar = async () => {
    setOcupado(true);
    try {
      await apiService.delete(`/blog/${borrar.id}`);
      toast.success('Entrada eliminada');
      setBorrar(null);
      await cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar'); }
    finally { setOcupado(false); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-relaxed text-slate-500">
          Las entradas publicadas aparecen en <strong className="text-slate-300">/blog</strong> del sitio. Escribe, agrega una portada, mira la vista previa y publica cuando esté lista. Un borrador solo lo ves tú.
        </p>
        <button onClick={() => navigate('/blog-sitio/nueva')} className="flex items-center gap-2 rounded bg-sky-500 px-3 py-2 text-xs font-bold tracking-wider text-white hover:bg-sky-400">
          <Plus size={14} /> NUEVA ENTRADA
        </button>
      </div>

      {entradas && entradas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar entradas">
          {[['todas', 'TODAS'], ['publicadas', 'PUBLICADAS'], ['borradores', 'BORRADORES']].map(([k, n]) => (
            <button key={k} onClick={() => setFiltro(k === 'borradores' ? 'borradores' : k)} aria-pressed={filtro === k}
                    className={`rounded border px-3 py-1.5 text-[10px] tracking-[2px] transition-colors ${filtro === k ? 'border-sky-600 bg-sky-500/10 text-sky-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
              {n} <span className="text-slate-600">({cuenta(k)})</span>
            </button>
          ))}
        </div>
      )}

      {!entradas && !error && <p className="flex items-center gap-2 py-10 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
      {error && <p role="alert" className="rounded border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-300">{error}</p>}
      {entradas && entradas.length === 0 && (
        <p className="rounded border border-slate-800/60 p-10 text-center text-xs text-slate-500">Aún no hay entradas. Pulsa “Nueva entrada” para escribir la primera.</p>
      )}
      {entradas && entradas.length > 0 && visibles.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No hay entradas en este filtro.</p>}

      {visibles.length > 0 && (
        <ul className="overflow-hidden rounded border border-slate-800/60 bg-slate-900/20">
          {visibles.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800/40 px-4 py-3 last:border-0">
              {e.tiene_portada ? <ImageIcon size={16} className="shrink-0 text-sky-700" aria-label="Con portada" /> : <FileText size={16} className="shrink-0 text-slate-600" aria-label="Sin portada" />}
              <button onClick={() => navigate(`/blog-sitio/${e.id}`)} className="min-w-0 flex-1 basis-56 text-left">
                <p className="break-words text-sm text-slate-200 hover:text-sky-300">{e.titulo}</p>
                <p className="text-[10px] text-slate-500">
                  {e.categoria_nombre || 'Sin categoría'} · {e.estado === 'publicado' ? `Publicada ${fecha(e.publicado_at)}` : `Editada ${fecha(e.updated_at)}`}{e.autor_nombre ? ` · ${e.autor_nombre}` : ''}
                </p>
              </button>
              <Estado e={e} />
              <div className="flex items-center gap-1">
                {e.estado === 'publicado' && SITIO && (
                  <a href={`${SITIO}/blog/${e.slug}`} target="_blank" rel="noopener noreferrer" title="Ver en el sitio" aria-label="Ver en el sitio" className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-sky-300"><ExternalLink size={15} /></a>
                )}
                <button onClick={() => navigate(`/blog-sitio/${e.id}`)} title="Editar" aria-label="Editar" className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-sky-300"><Pencil size={15} /></button>
                <button onClick={() => setBorrar(e)} title="Eliminar" aria-label="Eliminar" className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {borrar && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg border border-red-900/50 bg-[#0f0808] p-5">
            <p className="text-sm text-slate-200">¿Eliminar “{borrar.titulo}”?</p>
            <p className="mt-2 text-xs text-slate-500">Deja de verse en el sitio y desaparece de esta lista.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setBorrar(null)} disabled={ocupado} className="rounded border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200">CANCELAR</button>
              <button onClick={eliminar} disabled={ocupado} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-xs font-bold tracking-wider text-white hover:bg-red-500 disabled:opacity-60">
                {ocupado && <Loader2 size={13} className="animate-spin" />} ELIMINAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EntradasPage;
