import { useEffect } from 'react';
import { Check } from 'lucide-react';
import MarcoPublico from '../../captacion/components/publico/MarcoPublico.jsx';
import { ACCENTS, BRAND } from './PortalUI.jsx';
import PieAsociado from './PieAsociado.jsx';

/** Bloque numerado de un documento legal. */
export const Seccion = ({ titulo, children }) => (
  <section className="border-t border-slate-200 py-7 first:border-t-0 first:pt-0 last:pb-0">
    <h2 className="text-xl font-extrabold text-slate-900">{titulo}</h2>
    <div className="mt-3 space-y-3 text-base leading-relaxed text-slate-700">{children}</div>
  </section>
);

export const Lista = ({ items }) => (
  <ul className="grid gap-2">
    {items.map((i) => (
      <li key={i} className="flex items-start gap-2.5">
        <Check size={18} className="mt-1 shrink-0" style={{ color: ACCENTS.verde.ink }} strokeWidth={3} />
        <span>{i}</span>
      </li>
    ))}
  </ul>
);

export const Nota = ({ children }) => <p className="text-sm leading-relaxed text-slate-500">{children}</p>;

/**
 * Página de un documento legal (términos, política de privacidad) para personas que NO son del equipo. Vive en Kernel
 * (son las páginas que el portal y los formularios enlazan), con el mismo marco y pie que el Portal del Asociado.
 */
const DocumentoLegal = ({ titulo, tituloPagina, version, pie, children }) => {
  useEffect(() => {
    const anterior = document.title;
    document.title = `${tituloPagina} · Cooperativa Progresemos`;
    return () => { document.title = anterior; };
  }, [tituloPagina]);

  return (
    <MarcoPublico ancho="max-w-3xl" fondoAnimado pie={<PieAsociado seguridad={false} />}>
      <div className="pb-2 pt-8 md:pt-12">
        <span className="inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>Documento legal</span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">{titulo}</h1>
        <p className="mt-3 text-base text-slate-500">{version}</p>
      </div>
      <article className="mt-6 break-words rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        {children}
        {pie && <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-500">{pie}</p>}
      </article>
    </MarcoPublico>
  );
};

export default DocumentoLegal;
