import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Loader2, Search, ShieldCheck } from 'lucide-react';
import api, { urlApi } from '../api.js';
import { ACCENTS, BRAND } from '../compartido.js';
import LayoutSitio from '../components/LayoutSitio.jsx';

const tamano = (b) => {
  if (!b) return '';
  return b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
};
const sinTildes = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Ficha = ({ d }) => (
  <li>
    <a href={urlApi(`/transparencia/pub/${d.id}/descargar`)} target="_blank" rel="noopener noreferrer"
       className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#065B8E]/40 hover:shadow-md">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}><FileText size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-base font-bold text-slate-900">{d.titulo}</span>
        <span className="text-sm text-slate-500">PDF{d.tamano ? ` · ${tamano(d.tamano)}` : ''}{d.anio ? ` · ${d.anio}` : ''}</span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition group-hover:bg-[#E8F1F7] group-hover:text-[#065B8E]" aria-hidden><Download size={20} /></span>
      <span className="sr-only">Descargar {d.titulo} (se abre en una pestaña nueva)</span>
    </a>
  </li>
);

const TransparenciaPublica = () => {
  const [datos, setDatos] = useState(null);      // null = cargando
  const [error, setError] = useState(false);
  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let vivo = true;
    api.get('/transparencia/pub')
      .then(({ data }) => vivo && setDatos(data))
      .catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, []);

  const documentos = datos?.documentos || [];
  const categoriasConDocs = useMemo(
    () => Object.entries(datos?.categorias || {}).filter(([k]) => documentos.some((d) => d.categoria === k)),
    [datos, documentos]
  );

  const visibles = useMemo(() => {
    // Cada palabra escrita debe aparecer en el título o el año (en cualquier orden): "acta 2025" encuentra "Acta de asamblea 2025"
    const palabras = sinTildes(busqueda.trim()).split(/\s+/).filter(Boolean);
    return documentos.filter((d) => {
      if (categoria !== 'todas' && d.categoria !== categoria) return false;
      const texto = sinTildes(`${d.titulo} ${d.anio || ''}`);
      return palabras.every((w) => texto.includes(w));
    });
  }, [documentos, categoria, busqueda]);

  // Se agrupa por categoría, con el año más reciente primero (el servidor ya los entrega en ese orden)
  const grupos = useMemo(() => categoriasConDocs
    .map(([k, nombre]) => ({ k, nombre, docs: visibles.filter((d) => d.categoria === k) }))
    .filter((g) => g.docs.length), [categoriasConDocs, visibles]);

  return (
    <LayoutSitio titulo="Transparencia" descripcion="Documentos públicos de la Cooperativa Progresemos: RUT, actas de asamblea, informes de gestión, estados financieros y certificados del régimen tributario especial.">
      <section className="px-4 pb-8 pt-12 md:px-8 md:pb-12 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.verde.soft, color: ACCENTS.verde.ink }}><ShieldCheck size={16} /> Transparencia</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">Confianza, cumplimiento y responsabilidad social</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
            Aquí publicamos los documentos de la cooperativa como entidad del régimen tributario especial: informes, estados financieros, actas y certificados.
          </p>
        </motion.div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-4xl">
          {!datos && !error && <p className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="animate-spin" size={20} /> Cargando documentos…</p>}
          {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700">No pudimos cargar los documentos. Inténtalo de nuevo en unos minutos.</p>}

          {datos && documentos.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg text-slate-600">Estamos actualizando esta sección. Vuelve pronto.</p>
          )}

          {documentos.length > 0 && (
            <>
              <div className="mb-6">
                <label className="relative block">
                  <span className="sr-only">Buscar un documento</span>
                  <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o año…"
                         className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-base text-slate-800 focus:border-[#065B8E] focus:outline-none focus:ring-4 focus:ring-[#065B8E]/15" />
                </label>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
                  {[['todas', 'Todos'], ...categoriasConDocs].map(([k, nombre]) => (
                    <button key={k} type="button" onClick={() => setCategoria(k)} aria-pressed={categoria === k}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${categoria === k ? 'text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                            style={categoria === k ? { background: BRAND.azul } : undefined}>
                      {nombre}
                    </button>
                  ))}
                </div>
              </div>

              {grupos.length === 0 && <p className="py-10 text-center text-slate-500">No encontramos documentos con esa búsqueda.</p>}
              <div className="grid gap-8">
                {grupos.map((g) => (
                  <section key={g.k} aria-labelledby={`cat-${g.k}`}>
                    <h2 id={`cat-${g.k}`} className="mb-3 text-xl font-extrabold text-slate-900">{g.nombre} <span className="text-base font-semibold text-slate-400">({g.docs.length})</span></h2>
                    <ul className="grid gap-3">{g.docs.map((d) => <Ficha key={d.id} d={d} />)}</ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </LayoutSitio>
  );
};

export default TransparenciaPublica;
