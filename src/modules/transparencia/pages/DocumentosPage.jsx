import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, EyeOff, ExternalLink, FileText, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { subirAUrlFirmada } from '../../captacion/services/captacionPublicApi.js';
import { ACCENT } from '../components/TransparenciaLayout.jsx';

const MAX_MB = 25;
const tamano = (b) => (!b ? '' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ANIO_ACTUAL = new Date().getFullYear();

const Estado = ({ d }) => {
  if (!d.archivo_nombre) return <span className="rounded border border-amber-700/50 px-1.5 py-0.5 text-[9px] tracking-wider text-amber-400">SIN PDF</span>;
  return d.publicado
    ? <span className="rounded border border-emerald-700/50 px-1.5 py-0.5 text-[9px] tracking-wider text-emerald-400">PUBLICADO</span>
    : <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] tracking-wider text-slate-400">OCULTO</span>;
};

// Sube un PDF: pide la URL firmada, lo sube directo a S3 y confirma. `progreso` recibe 0..100.
const subirPdf = async (id, archivo, progreso) => {
  const { data } = await apiService.post(`/transparencia/${id}/archivo/solicitar`, { nombre: archivo.name, mime: archivo.type, size: archivo.size });
  await subirAUrlFirmada(data.uploadUrl, archivo, progreso);
  const { data: doc } = await apiService.patch(`/transparencia/${id}/archivo/confirmar`, { key: data.key, nombre: archivo.name, mime: archivo.type, size: archivo.size });
  return doc;
};

const validarArchivo = (f) => {
  if (!f) return null;
  if (f.type !== 'application/pdf' || !/\.pdf$/i.test(f.name)) return 'Solo se admiten archivos PDF.';
  if (f.size > MAX_MB * 1024 * 1024) return `El PDF no puede pasar de ${MAX_MB} MB.`;
  return null;
};

// ── Formulario (crear / editar) ──────────────────────────────────────────────

const Formulario = ({ categorias, documento, onCerrar, onGuardado }) => {
  const editando = !!documento;
  const [titulo, setTitulo]       = useState(documento?.titulo || '');
  const [categoria, setCategoria] = useState(documento?.categoria || 'informe_gestion');
  const [anio, setAnio]           = useState(documento?.anio ?? ANIO_ACTUAL);
  const [archivo, setArchivo]     = useState(null);
  const [publicar, setPublicar]   = useState(!editando);
  const [error, setError]         = useState('');
  const [progreso, setProgreso]   = useState(null);   // null = sin subir
  const [guardando, setGuardando] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    const cerrar = (e) => e.key === 'Escape' && !guardando && onCerrar();
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onCerrar, guardando]);

  const elegir = (f) => {
    const err = validarArchivo(f);
    setError(err || '');
    setArchivo(err ? null : f);
    // Si el título está vacío, se sugiere el nombre del archivo
    if (f && !err && !titulo) setTitulo(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim());
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return setError('El título es obligatorio.');
    if (!editando && !archivo && publicar) return setError('Elige el PDF para poder publicarlo, o desmarca "Publicar".');
    setGuardando(true);
    setError('');
    try {
      const cuerpo = { titulo: titulo.trim(), categoria, anio: anio === '' ? null : Number(anio) };
      let doc;
      if (editando) ({ data: doc } = await apiService.put(`/transparencia/${documento.id}`, cuerpo));
      else ({ data: doc } = await apiService.post('/transparencia', cuerpo));

      if (archivo) {
        setProgreso(0);
        doc = await subirPdf(doc.id, archivo, setProgreso);
      }
      if (!editando && publicar && doc.archivo_nombre) ({ data: doc } = await apiService.put(`/transparencia/${doc.id}`, { publicado: true }));
      toast.success(editando ? 'Documento actualizado' : 'Documento guardado');
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar. Inténtalo de nuevo.');
      // Si el documento se creó pero falló la subida, se refresca para que aparezca y se pueda reintentar
      if (!editando) onGuardado({ mantenerAbierto: true });
    } finally { setGuardando(false); setProgreso(null); }
  };

  const campo = 'w-full rounded border border-slate-700 bg-[#08101e] px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none';
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="doc-titulo">
      <form onSubmit={guardar} className="relative max-h-[92vh] w-full max-w-lg space-y-4 overflow-auto rounded-lg border border-teal-900/50 bg-[#020f0d] p-5">
        <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar" className="absolute right-3 top-3 rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><X size={16} /></button>
        <h2 id="doc-titulo" className="text-sm font-bold tracking-[3px]" style={{ color: ACCENT }}>{editando ? 'EDITAR DOCUMENTO' : 'NUEVO DOCUMENTO'}</h2>

        <label className="block">
          <span className="mb-1 block text-[10px] tracking-[2px] text-slate-500">TÍTULO *</span>
          <input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Informe de gestión 2025" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-[2px] text-slate-500">CATEGORÍA *</span>
            <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {Object.entries(categorias).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-[2px] text-slate-500">AÑO</span>
            <input className={campo} type="number" min="1970" max="2100" value={anio ?? ''} onChange={(e) => setAnio(e.target.value)} placeholder="2025" />
          </label>
        </div>

        <div>
          <span className="mb-1 block text-[10px] tracking-[2px] text-slate-500">{editando ? 'REEMPLAZAR PDF (OPCIONAL)' : 'ARCHIVO PDF'}</span>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-label="Elegir el PDF"
                 onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => input.current.click()} disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-slate-600 px-3 py-4 text-xs text-slate-400 transition-colors hover:border-teal-600 hover:text-teal-300">
            <Upload size={15} /> {archivo ? <span className="break-all text-slate-200">{archivo.name} · {tamano(archivo.size)}</span> : `Elegir un PDF (máx. ${MAX_MB} MB)`}
          </button>
          {editando && documento.archivo_nombre && !archivo && <p className="mt-1 text-[10px] text-slate-500">Archivo actual: {documento.archivo_nombre} ({tamano(documento.archivo_size)})</p>}
        </div>

        {!editando && (
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} className="accent-teal-500" />
            Publicar en el sitio al guardar
          </label>
        )}

        {progreso !== null && (
          <div role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full bg-teal-500 transition-all" style={{ width: `${progreso}%` }} /></div>
            <p className="mt-1 text-[10px] text-slate-400">Subiendo… {progreso}%</p>
          </div>
        )}
        {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-red-400"><AlertTriangle size={13} className="mt-px shrink-0" /> {error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} disabled={guardando} className="rounded border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50">CANCELAR</button>
          <button type="submit" disabled={guardando} className="flex items-center gap-2 rounded bg-teal-500 px-4 py-2 text-xs font-bold tracking-wider text-white hover:bg-teal-400 disabled:opacity-60">
            {guardando && <Loader2 size={13} className="animate-spin" />} GUARDAR
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

// ── Página ───────────────────────────────────────────────────────────────────

const DocumentosPage = () => {
  const [datos, setDatos]       = useState(null);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState(null);      // null | 'nuevo' | documento
  const [borrar, setBorrar]     = useState(null);
  const [ocupado, setOcupado]   = useState(null);      // id del documento en curso

  const cargar = useCallback(() => apiService.get('/transparencia')
    .then(({ data }) => { setDatos(data); setError(''); })
    .catch((err) => setError(err.response?.status === 403 ? 'No tienes permiso para ver este módulo.' : 'No se pudo cargar la lista.')), []);
  useEffect(() => { cargar(); }, [cargar]);

  const publicar = async (d, valor) => {
    setOcupado(d.id);
    try {
      await apiService.put(`/transparencia/${d.id}`, { publicado: valor });
      toast.success(valor ? 'Publicado en el sitio' : 'Oculto del sitio');
      await cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo cambiar el estado'); }
    finally { setOcupado(null); }
  };

  const eliminar = async () => {
    setOcupado(borrar.id);
    try {
      await apiService.delete(`/transparencia/${borrar.id}`);
      toast.success('Documento eliminado');
      setBorrar(null);
      await cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar'); }
    finally { setOcupado(null); }
  };

  const grupos = datos ? Object.entries(datos.categorias)
    .map(([k, nombre]) => ({ k, nombre, docs: datos.documentos.filter((d) => d.categoria === k) }))
    .filter((g) => g.docs.length) : [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-relaxed text-slate-500">
          Los documentos publicados aparecen en la página pública <strong className="text-slate-300">/transparencia</strong> del sitio.
          Sube el PDF, elige la categoría y el año, y publícalo. Puedes ocultarlo o reemplazar el archivo cuando quieras.
        </p>
        <div className="flex items-center gap-2">
          <a href="/transparencia" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-[10px] tracking-wider text-slate-400 transition-colors hover:border-teal-700 hover:text-teal-300">
            <ExternalLink size={12} /> VER PÁGINA PÚBLICA
          </a>
          <button onClick={() => setForm('nuevo')} className="flex items-center gap-2 rounded bg-teal-500 px-3 py-2 text-xs font-bold tracking-wider text-white hover:bg-teal-400">
            <Plus size={14} /> NUEVO DOCUMENTO
          </button>
        </div>
      </div>

      {!datos && !error && <p className="flex items-center gap-2 py-10 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
      {error && <p role="alert" className="rounded border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-300">{error}</p>}
      {datos && grupos.length === 0 && <p className="rounded border border-slate-800/60 p-8 text-center text-xs text-slate-500">Aún no hay documentos. Pulsa “Nuevo documento” para subir el primero.</p>}

      <div className="space-y-6">
        {grupos.map((g) => (
          <section key={g.k} aria-label={g.nombre}>
            <h2 className="mb-2 text-[10px] tracking-[3px] text-slate-500">{g.nombre.toUpperCase()} <span className="text-slate-700">({g.docs.length})</span></h2>
            <ul className="overflow-hidden rounded border border-slate-800/60 bg-slate-900/20">
              {g.docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800/40 px-4 py-3 last:border-0">
                  <FileText size={16} className="shrink-0 text-slate-600" />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="break-words text-sm text-slate-200">{d.titulo}</p>
                    <p className="text-[10px] text-slate-500">{d.anio || 'Sin año'}{d.archivo_nombre ? ` · ${d.archivo_nombre} · ${tamano(d.archivo_size)}` : ''}</p>
                  </div>
                  <Estado d={d} />
                  <div className="flex items-center gap-1">
                    {d.archivo_nombre && (
                      <button onClick={() => publicar(d, !d.publicado)} disabled={ocupado === d.id}
                              title={d.publicado ? 'Ocultar del sitio' : 'Publicar en el sitio'} aria-label={d.publicado ? 'Ocultar del sitio' : 'Publicar en el sitio'}
                              className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-teal-300 disabled:opacity-40">
                        {ocupado === d.id ? <Loader2 size={15} className="animate-spin" /> : d.publicado ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                    <button onClick={() => setForm(d)} title="Editar o reemplazar el PDF" aria-label="Editar" className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-teal-300"><Pencil size={15} /></button>
                    <button onClick={() => setBorrar(d)} title="Eliminar" aria-label="Eliminar" className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {form && (
        <Formulario
          categorias={datos?.categorias || {}}
          documento={form === 'nuevo' ? null : form}
          onCerrar={() => setForm(null)}
          onGuardado={async (opts) => { await cargar(); if (!opts?.mantenerAbierto) setForm(null); }}
        />
      )}

      {borrar && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg border border-red-900/50 bg-[#0f0808] p-5">
            <p className="text-sm text-slate-200">¿Eliminar “{borrar.titulo}”?</p>
            <p className="mt-2 text-xs text-slate-500">Deja de verse en el sitio. El PDF queda guardado en el sistema.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setBorrar(null)} disabled={!!ocupado} className="rounded border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200">CANCELAR</button>
              <button onClick={eliminar} disabled={!!ocupado} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-xs font-bold tracking-wider text-white hover:bg-red-500 disabled:opacity-60">
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

export default DocumentosPage;
