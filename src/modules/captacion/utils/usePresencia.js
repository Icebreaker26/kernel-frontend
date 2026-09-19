import { useEffect, useState } from 'react';
import { geoContains } from 'd3-geo';
import pub from '../services/captacionPublicApi.js';
import { coordenadasDe } from '../../../data/coordenadasCiudades.js';

/**
 * Presencia de la cooperativa: en qué municipios hay asociados y en cuántos departamentos.
 * La usan el mapa y el texto de la diapositiva "Estamos en todo el país"; se carga una sola vez por visita.
 *  - `ciudades`: municipios con asociados (solo nombres; los da GET /captacion/pub/presencia).
 *  - `pines`: los que tienen coordenadas en el mapa.
 *  - `departamentos`: nombres (NOMBRE_DPT de colombia.json) de los departamentos donde cae al menos un pin.
 */
let promesa = null;

const calcular = ([ciudades, geo]) => {
  const pines = ciudades.map((ciudad) => ({ ciudad, coords: coordenadasDe(ciudad) })).filter((p) => p.coords);
  const departamentos = new Set();
  for (const f of geo?.features || []) {
    if (pines.some((p) => geoContains(f, p.coords))) departamentos.add(f.properties.NOMBRE_DPT);
  }
  return { ciudades, pines, departamentos };
};

const cargar = () => {
  if (!promesa) {
    promesa = Promise.all([
      pub.get('/captacion/pub/presencia').then(({ data }) => data.ciudades || []).catch(() => []),
      // Archivo estático del mapa (mismo que pide react-simple-maps; el navegador lo reutiliza)
      fetch('/colombia.json').then((r) => r.json()).catch(() => null),
    ]).then(calcular);
  }
  return promesa;
};

/** null mientras carga; después { ciudades, pines, departamentos } (vacíos si algo falló). */
export const usePresencia = () => {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargar().then((d) => vivo && setDatos(d));
    return () => { vivo = false; };
  }, []);
  return datos;
};
