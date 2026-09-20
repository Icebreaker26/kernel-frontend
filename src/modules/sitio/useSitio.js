import { useEffect, useMemo, useState } from 'react';
import api from './api.js';
import { crearSlides } from './compartido.js';

// Cifras y tarifas del servidor + el contenido corporativo ya armado con ellas.
// Sin respuesta del servidor las páginas se ven igual, solo sin cifras.
export const useSitio = () => {
  const [sitio, setSitio] = useState(null);
  useEffect(() => {
    let vivo = true;
    api.get('/captacion/pub/sitio').then(({ data }) => vivo && setSitio(data)).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const slides = useMemo(() => crearSlides(sitio?.tarifas), [sitio?.tarifas]);
  return { sitio, slides };
};
