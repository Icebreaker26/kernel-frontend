import { useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { crearSlides } from '../compartido.js';
import LayoutSitio from '../components/LayoutSitio.jsx';
import { Cierre, Convenios, Hero, Pasos, Presencia, Resumen } from '../components/Secciones.jsx';

/**
 * Página pública de inicio de la cooperativa (versión de prueba dentro de Kernel, en /inicio).
 * Mismo estilo de la presentación y del formulario de asociación. El contenido (servicios, convenios, alianzas,
 * historia, pasos y valores) sale de los mismos datos que la presentación, y las cifras y tarifas del servidor.
 */
const InicioPublico = () => {
  const [sitio, setSitio] = useState(null);

  useEffect(() => {
    let vivo = true;
    api.get('/captacion/pub/sitio').then(({ data }) => vivo && setSitio(data)).catch(() => {});   // sin datos: la página se ve igual, sin cifras
    return () => { vivo = false; };
  }, []);

  const slides = useMemo(() => crearSlides(sitio?.tarifas), [sitio?.tarifas]);

  return (
    <LayoutSitio titulo="Asóciate desde tu celular" descripcion="Conoce la Cooperativa Progresemos: créditos por libranza, ahorro y bienestar. Asóciate desde tu celular en unos 10 minutos.">
      <Hero sitio={sitio} />
      <Resumen slides={slides} />
      <Presencia sitio={sitio} />
      <Pasos slides={slides} />
      <Convenios slides={slides} />
      <Cierre />
    </LayoutSitio>
  );
};

export default InicioPublico;
