import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HandHeart, MessageCircle } from 'lucide-react';
import { BRAND, CONTACTO } from '../compartido.js';
import { URL_ASOCIATE } from '../config.js';
import Cabecera from './Cabecera.jsx';
import Pie from './Pie.jsx';

const WHATSAPP = `https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información para asociarme a la Cooperativa Progresemos')}`;

/**
 * Carcasa común de las páginas públicas: cabecera, pie, WhatsApp y la barra fija de "Quiero asociarme" en celular.
 * `titulo` y `descripcion` se ponen en la pestaña. Mientras el sitio esté dentro de Kernel (copia de prueba) va con
 * noindex; al pasar a su propio dominio se quita `noindex` (ver LEEME.md).
 */
const LayoutSitio = ({ titulo, descripcion, noindex = true, children }) => {
  const { hash, pathname } = useLocation();

  // Al cambiar de página, React Router conserva el scroll: sin esto la página nueva se abre a media altura.
  // Sin ancla se vuelve arriba; con ancla (/inicio#contacto) se baja a la sección cuando ya existe.
  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 80);
    return () => clearTimeout(t);
  }, [hash, pathname]);

  useEffect(() => {
    const anterior = document.title;
    document.title = titulo ? `${titulo} · Cooperativa Progresemos` : 'Cooperativa Progresemos';
    const puestas = [];
    const meta = (nombre, contenido) => {
      const m = document.createElement('meta');
      m.name = nombre; m.content = contenido;
      document.head.appendChild(m);
      puestas.push(m);
    };
    if (noindex) meta('robots', 'noindex, nofollow');
    if (descripcion) meta('description', descripcion);
    return () => { document.title = anterior; puestas.forEach((m) => m.remove()); };
  }, [titulo, descripcion, noindex]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20 font-sans text-slate-800 lg:pb-0">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Ir al contenido</a>
      <Cabecera />
      <main id="contenido">{children}</main>
      <Pie />

      {/* WhatsApp: en celular queda sobre la barra inferior para no tapar el contenido */}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Hablar por WhatsApp con la cooperativa"
         className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 lg:bottom-6 lg:right-6">
        <MessageCircle size={28} />
      </a>

      {/* Barra inferior fija solo en celular: el llamado principal siempre a la vista */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <a href={URL_ASOCIATE} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-extrabold text-white shadow-md" style={{ background: BRAND.azul }}>
          <HandHeart size={22} /> Quiero asociarme
        </a>
      </div>
    </div>
  );
};

export default LayoutSitio;
