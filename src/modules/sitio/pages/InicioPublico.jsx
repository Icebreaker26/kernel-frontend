import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandHeart, MessageCircle } from 'lucide-react';
import pub from '../../captacion/services/captacionPublicApi.js';
import { crearSlides } from '../../captacion/data/standSlides.js';
import { BRAND, CONTACTO } from '../../captacion/data/marca.js';
import Cabecera from '../components/Cabecera.jsx';
import Pie from '../components/Pie.jsx';
import { Beneficios, Cierre, Convenios, Hero, Historia, Pasos, Presencia, Servicios } from '../components/Secciones.jsx';

const WHATSAPP = `https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información para asociarme a la Cooperativa Progresemos')}`;

/**
 * Página pública de inicio de la cooperativa (versión de prueba dentro de Kernel, en /inicio).
 * Mismo estilo de la presentación y del formulario de asociación. El contenido (servicios, convenios, alianzas,
 * historia, pasos y valores) sale de los mismos datos que la presentación, y las cifras y tarifas del servidor.
 */
const InicioPublico = () => {
  const [sitio, setSitio] = useState(null);

  // Es una copia de prueba: que los buscadores no la indexen en el dominio de Kernel
  useEffect(() => {
    const anterior = document.title;
    document.title = 'Cooperativa Progresemos — Asóciate desde tu celular';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => { document.title = anterior; robots.remove(); };
  }, []);

  useEffect(() => {
    let vivo = true;
    pub.get('/captacion/pub/sitio').then(({ data }) => vivo && setSitio(data)).catch(() => {});   // sin datos: la página se ve igual, sin cifras
    return () => { vivo = false; };
  }, []);

  const slides = useMemo(() => crearSlides(sitio?.tarifas), [sitio?.tarifas]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20 font-sans text-slate-800 lg:pb-0">
      <a href="#servicios" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Ir al contenido</a>
      <Cabecera />
      <main>
        <Hero sitio={sitio} />
        <Servicios slides={slides} />
        <Beneficios slides={slides} />
        <Presencia sitio={sitio} />
        <Pasos slides={slides} />
        <Convenios slides={slides} />
        <Historia slides={slides} />
        <Cierre />
      </main>
      <Pie />

      {/* WhatsApp: en celular queda sobre la barra inferior para no tapar el contenido */}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Hablar por WhatsApp con la cooperativa"
         className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 lg:bottom-6 lg:right-6">
        <MessageCircle size={28} />
      </a>

      {/* Barra inferior fija solo en celular: el llamado principal siempre a la vista */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/asociate" className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-extrabold text-white shadow-md" style={{ background: BRAND.azul }}>
          <HandHeart size={22} /> Quiero asociarme
        </Link>
      </div>
    </div>
  );
};

export default InicioPublico;
