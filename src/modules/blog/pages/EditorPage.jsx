import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, Eye, ExternalLink, ImagePlus, Loader2, Pencil, Plus, Save, Send, Trash2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { subirAUrlFirmada } from '../../captacion/services/captacionPublicApi.js';
import EditorTexto from '../components/EditorTexto.jsx';
import { ESTILOS_ENTRADA } from '../components/estilosEntrada.js';

const SITIO = (import.meta.env.VITE_URL_SITIO || '').replace(/\/$/, '');
const MAX_PORTADA_MB = 5;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const campo = 'w-full rounded border border-slate-700 bg-[#08101e] px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none';
const etiqueta = 'mb-1 block text-[10px] tracking-[2px] text-slate-500';

const fechaLarga = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }) : '');

const validarImagen = (f) => {
  if (!f) return null;
  if (!TIPOS.includes(f.type)) return 'La portada debe ser una imagen JPG, PNG o WebP.';
  if (f.size > MAX_PORTADA_MB * 1024 * 1024) return `La portada no puede pasar de ${MAX_PORTADA_MB} MB.`;
  return null;
};

// Sube la portada: pide la URL firmada, la sube directo a S3 y confirma
const subirPortada = async (id, archivo, progreso) => {
  const meta = { nombre: archivo.name, mime: archivo.type, size: archivo.size };
  const { data } = await apiService.post(`/blog/${id}/portada/solicitar`, meta);
  await subirAUrlFirmada(data.uploadUrl, archivo, progreso);
  const { data: entrada } = await apiService.patch(`/blog/${id}/portada/confirmar`, { key: data.key, ...meta });
  return entrada;
};

// Vista previa: cómo se verá en el sitio público (mismo estilo del contenido)
const VistaPrevia = ({ titulo, resumen, categoria, contenido, portadaUrl, publicadoAt }) => (
  <div className="hoja-entrada rounded border border-slate-700 bg-[#F6F8FA] p-4 sm:p-8">
    <style>{ESTILOS_ENTRADA}</style>
    <article className="mx-auto max-w-3xl rounded-2xl bg-[#F6F8FA]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {categoria && <span className="rounded-full bg-[#CDEEE8] px-3 py-1 text-xs font-extrabold text-[#0B5D57]">{categoria}</span>}
        <span className="flex items-center gap-1.5 text-slate-500"><CalendarDays size={14} /> {fechaLarga(publicadoAt || new Date().toISOString())}</span>
      </div>
      <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900">{titulo || 'Título de la entrada'}</h2>
      {resumen && <p className="mt-3 text-lg leading-relaxed text-slate-600">{resumen}</p>}
      {portadaUrl && <img src={portadaUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover shadow" />}
      <div className="mt-8"><div className="ProseMirror" dangerouslySetInnerHTML={{ __html: contenido || '<p style="color:#94a3b8">Aún no hay contenido.</p>' }} /></div>
    </article>
  </div>
);

const EditorPage = () => {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const nueva = idParam === 'nueva';

  const [cargando, setCargando] = useState(!nueva);
  const [error, setError] = useState('');
  const [entrada, setEntrada] = useState(null);           // lo guardado en el servidor
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contenido, setContenido] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [nuevaCat, setNuevaCat] = useState(null);         // null | texto
  const [archivo, setArchivo] = useState(null);           // portada elegida, pendiente de subir
  const [previa, setPrevia] = useState('');               // URL local de la portada elegida
  const [portadaUrl, setPortadaUrl] = useState('');       // portada ya guardada
  const [modo, setModo] = useState('editar');
  const [guardando, setGuardando] = useState('');         // '' | 'borrador' | 'publicar' | 'despublicar'
  const [progreso, setProgreso] = useState(null);
  const [base, setBase] = useState('');
  const inputImagen = useRef(null);

  const aplicar = useCallback((e) => {
    setEntrada(e);
    setTitulo(e.titulo || ''); setResumen(e.resumen || ''); setCategoriaId(e.categoria_id || ''); setContenido(e.contenido || '');
    setBase(JSON.stringify([e.titulo || '', e.resumen || '', e.categoria_id || '', e.contenido || '']));
  }, []);

  const cargarPortada = useCallback(async (entradaId) => {
    try { setPortadaUrl((await apiService.get(`/blog/${entradaId}/portada`)).data.url); } catch { setPortadaUrl(''); }
  }, []);

  useEffect(() => {
    apiService.get('/blog/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
    if (nueva) { setBase(JSON.stringify(['', '', '', ''])); return undefined; }
    let vivo = true;
    apiService.get(`/blog/${idParam}`)
      .then(({ data }) => { if (!vivo) return; aplicar(data); if (data.tiene_portada) cargarPortada(data.id); })
      .catch((err) => vivo && setError(err.response?.status === 404 ? 'La entrada no existe o fue eliminada.' : err.response?.status === 403 ? 'No tienes permiso para ver este módulo.' : 'No se pudo cargar la entrada.'))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [idParam, nueva, aplicar, cargarPortada]);

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

  const actual = useMemo(() => JSON.stringify([titulo, resumen, categoriaId, contenido]), [titulo, resumen, categoriaId, contenido]);
  const sinGuardar = (base !== '' && actual !== base) || !!archivo;

  // Avisa si se intenta cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!sinGuardar) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sinGuardar]);

  const elegirImagen = (f) => {
    if (!f) return;
    const err = validarImagen(f);
    if (err) { toast.error(err); return; }
    setArchivo(f);
    setPrevia(URL.createObjectURL(f));
  };

  const crearCategoria = async (e) => {
    e.preventDefault();
    const nombre = (nuevaCat || '').trim();
    if (nombre.length < 2) return;
    try {
      const { data } = await apiService.post('/blog/categorias', { nombre });
      setCategorias((c) => [...c, data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setCategoriaId(data.id); setNuevaCat(null);
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo crear la categoría'); }
  };

  const guardar = async (accion) => {           // 'borrador' | 'publicar' | 'despublicar'
    if (!titulo.trim()) { toast.error('Escribe el título de la entrada.'); return; }
    setGuardando(accion); setError('');
    let entradaId = entrada?.id;
    try {
      const cuerpo = { titulo: titulo.trim(), resumen: resumen.trim() || null, contenido, categoria_id: categoriaId || null };
      let e;
      if (entradaId) ({ data: e } = await apiService.put(`/blog/${entradaId}`, cuerpo));
      else { ({ data: e } = await apiService.post('/blog', cuerpo)); entradaId = e.id; }

      if (archivo) {
        setProgreso(0);
        e = await subirPortada(entradaId, archivo, setProgreso);
        setArchivo(null); setPrevia('');
      }
      if (accion === 'publicar') ({ data: e } = await apiService.put(`/blog/${entradaId}`, { estado: 'publicado' }));
      if (accion === 'despublicar') ({ data: e } = await apiService.put(`/blog/${entradaId}`, { estado: 'borrador' }));

      aplicar(e);
      if (e.tiene_portada) await cargarPortada(entradaId); else setPortadaUrl('');
      toast.success(accion === 'publicar' ? 'Entrada publicada en el sitio' : accion === 'despublicar' ? 'La entrada volvió a borrador' : 'Guardado');
      if (nueva) navigate(`/blog-sitio/${entradaId}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar. Inténtalo de nuevo.');
      // Si la entrada llegó a crearse pero falló un paso posterior, se abre para no duplicarla al reintentar
      if (nueva && entradaId) navigate(`/blog-sitio/${entradaId}`, { replace: true });
    } finally { setGuardando(''); setProgreso(null); }
  };

  const quitarPortada = async () => {
    if (archivo) { setArchivo(null); setPrevia(''); return; }
    try {
      const { data } = await apiService.delete(`/blog/${entrada.id}/portada`);
      setEntrada(data); setPortadaUrl(''); toast.success('Portada quitada');
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo quitar la portada'); }
  };

  const publicada = entrada?.estado === 'publicado';
  const enCurso = !!guardando;
  const portadaMostrada = previa || portadaUrl;
  const nombreCategoria = categorias.find((c) => c.id === categoriaId)?.nombre;

  if (cargando) return <p className="flex items-center gap-2 py-10 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Cargando…</p>;
  if (error && !entrada && !nueva) {
    return (
      <div>
        <p role="alert" className="rounded border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-300">{error}</p>
        <button onClick={() => navigate('/blog-sitio')} className="mt-4 flex items-center gap-2 text-xs text-sky-300 hover:text-sky-200"><ArrowLeft size={13} /> VOLVER A LAS ENTRADAS</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/blog-sitio')} className="flex items-center gap-2 text-[11px] tracking-wider text-slate-400 hover:text-sky-300"><ArrowLeft size={13} /> ENTRADAS</button>
        <div className="flex items-center gap-2">
          {entrada && (
            <span className={`rounded border px-1.5 py-0.5 text-[9px] tracking-wider ${publicada ? 'border-emerald-700/50 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>{publicada ? 'PUBLICADA' : 'BORRADOR'}</span>
          )}
          {sinGuardar && <span className="text-[10px] tracking-wider text-amber-400">● CAMBIOS SIN GUARDAR</span>}
          {publicada && SITIO && (
            <a href={`${SITIO}/blog/${entrada.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-[10px] tracking-wider text-slate-400 hover:border-sky-700 hover:text-sky-300"><ExternalLink size={12} /> VER EN EL SITIO</a>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className={etiqueta}>TÍTULO *</span>
            <input className={`${campo} !py-3 !text-lg font-bold`} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Título de la entrada" />
          </label>

          <div>
            <div className="mb-2 flex items-center gap-1" role="tablist" aria-label="Modo del editor">
              {[['editar', 'EDITAR', Pencil], ['previa', 'VISTA PREVIA', Eye]].map(([k, n, Ic]) => (
                <button key={k} type="button" role="tab" aria-selected={modo === k} onClick={() => setModo(k)}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] tracking-[2px] transition-colors ${modo === k ? 'bg-sky-500/15 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Ic size={12} /> {n}
                </button>
              ))}
            </div>
            {/* El editor se mantiene montado (solo se oculta) para no perder el cursor ni el historial de deshacer al ver la vista previa */}
            <div hidden={modo !== 'editar'}><EditorTexto valor={contenido} onChange={setContenido} /></div>
            {modo === 'previa' && (
              <VistaPrevia titulo={titulo} resumen={resumen.trim() || null} categoria={nombreCategoria} contenido={contenido} portadaUrl={portadaMostrada} publicadoAt={entrada?.publicado_at} />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="space-y-2 rounded border border-slate-800/60 bg-slate-900/20 p-3">
            {publicada ? (
              <>
                <button onClick={() => guardar('borrador')} disabled={enCurso} className="flex w-full items-center justify-center gap-2 rounded bg-sky-500 px-3 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-sky-400 disabled:opacity-60">
                  {guardando === 'borrador' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} GUARDAR CAMBIOS
                </button>
                <button onClick={() => guardar('despublicar')} disabled={enCurso} className="flex w-full items-center justify-center gap-2 rounded border border-slate-700 px-3 py-2 text-[11px] tracking-wider text-slate-300 hover:border-amber-700 hover:text-amber-300 disabled:opacity-60">
                  {guardando === 'despublicar' ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />} PASAR A BORRADOR
                </button>
              </>
            ) : (
              <>
                <button onClick={() => guardar('publicar')} disabled={enCurso} className="flex w-full items-center justify-center gap-2 rounded bg-emerald-500 px-3 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-emerald-400 disabled:opacity-60">
                  {guardando === 'publicar' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} PUBLICAR EN EL SITIO
                </button>
                <button onClick={() => guardar('borrador')} disabled={enCurso} className="flex w-full items-center justify-center gap-2 rounded border border-slate-700 px-3 py-2 text-[11px] tracking-wider text-slate-300 hover:border-sky-700 hover:text-sky-300 disabled:opacity-60">
                  {guardando === 'borrador' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} GUARDAR BORRADOR
                </button>
              </>
            )}
            <p className="text-[10px] leading-relaxed text-slate-600">{publicada ? `Publicada el ${fechaLarga(entrada.publicado_at)}. Los cambios se ven en el sitio al guardar.` : 'Un borrador no se ve en el sitio hasta que lo publiques.'}</p>
          </div>

          <div className="space-y-3 rounded border border-slate-800/60 bg-slate-900/20 p-3">
            <div>
              <span className={etiqueta}>CATEGORÍA</span>
              {nuevaCat === null ? (
                <div className="flex gap-2">
                  <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoría">
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => setNuevaCat('')} title="Crear una categoría" aria-label="Crear una categoría" className="rounded border border-slate-700 px-2.5 text-slate-400 hover:border-sky-700 hover:text-sky-300"><Plus size={14} /></button>
                </div>
              ) : (
                <form onSubmit={crearCategoria} className="flex gap-2">
                  <input autoFocus className={campo} value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} maxLength={60} placeholder="Nombre de la categoría" aria-label="Nueva categoría" />
                  <button type="submit" className="rounded bg-sky-500 px-3 text-[10px] font-bold tracking-wider text-white hover:bg-sky-400">CREAR</button>
                  <button type="button" onClick={() => setNuevaCat(null)} className="rounded border border-slate-700 px-2 text-[10px] text-slate-400">X</button>
                </form>
              )}
            </div>
            <label className="block">
              <span className={etiqueta}>RESUMEN (OPCIONAL)</span>
              <textarea className={`${campo} resize-y`} rows={4} maxLength={300} value={resumen} onChange={(e) => setResumen(e.target.value)} placeholder="Se muestra en la lista del blog. Si lo dejas vacío, se genera solo al publicar." />
              <span className="mt-1 block text-right text-[10px] text-slate-600">{resumen.length}/300</span>
            </label>
          </div>

          <div className="rounded border border-slate-800/60 bg-slate-900/20 p-3">
            <span className={etiqueta}>IMAGEN DE PORTADA</span>
            <input ref={inputImagen} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Elegir la imagen de portada"
                   onChange={(e) => { elegirImagen(e.target.files?.[0]); e.target.value = ''; }} />
            {portadaMostrada ? (
              <div>
                <img src={portadaMostrada} alt="Portada de la entrada" className="aspect-[16/9] w-full rounded border border-slate-700 object-cover" />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => inputImagen.current.click()} disabled={enCurso} className="flex flex-1 items-center justify-center gap-1.5 rounded border border-slate-700 px-2 py-1.5 text-[10px] tracking-wider text-slate-300 hover:border-sky-700 hover:text-sky-300"><ImagePlus size={12} /> CAMBIAR</button>
                  <button type="button" onClick={quitarPortada} disabled={enCurso} className="flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1.5 text-[10px] tracking-wider text-slate-400 hover:border-red-800 hover:text-red-400"><Trash2 size={12} /> QUITAR</button>
                </div>
                {archivo && <p className="mt-1.5 text-[10px] text-amber-400">Se subirá al guardar.</p>}
              </div>
            ) : (
              <button type="button" onClick={() => inputImagen.current.click()} disabled={enCurso}
                      className="flex w-full flex-col items-center gap-1.5 rounded border border-dashed border-slate-600 px-3 py-6 text-xs text-slate-400 transition-colors hover:border-sky-600 hover:text-sky-300">
                <ImagePlus size={20} /> Elegir una imagen
                <span className="text-[10px] text-slate-600">JPG, PNG o WebP · máx. {MAX_PORTADA_MB} MB · 16:9 se ve mejor</span>
              </button>
            )}
            {progreso !== null && (
              <div role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100} className="mt-2">
                <div className="h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full bg-sky-500 transition-all" style={{ width: `${progreso}%` }} /></div>
                <p className="mt-1 text-[10px] text-slate-400">Subiendo portada… {progreso}%</p>
              </div>
            )}
          </div>

          {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-red-400"><AlertTriangle size={13} className="mt-px shrink-0" /> {error}</p>}
        </aside>
      </div>
    </div>
  );
};

export default EditorPage;
