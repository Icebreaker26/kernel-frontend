/**
 * ÚNICO punto por donde el sitio público toma cosas del resto de Kernel.
 *
 * Todos los archivos de `modules/sitio` importan de aquí (nunca directamente de `captacion`). Cuando el sitio pase a
 * su propio repositorio, se copian estos archivos junto a él y se reescribe solo este módulo:
 *   - captacion/data/marca.js                        paleta y datos de contacto
 *   - captacion/data/standSlides.js                  contenido corporativo (servicios, convenios, historia, pasos...)
 *   - captacion/components/publico/MarcoPublico.jsx  solo el componente Logo
 *   - captacion/components/MapaPresencia.jsx         mapa de Colombia
 *   - captacion/utils/usePresencia.js                municipios y departamentos con asociados
 *   - data/coordenadasCiudades.js y public/colombia.json (los usa el mapa)
 *   - public/logo-progresemos.png
 * (ver LEEME.md en esta carpeta)
 */
export { BRAND, ACCENTS, CONTACTO } from '../captacion/data/marca.js';
export { crearSlides } from '../captacion/data/standSlides.js';
export { Logo } from '../captacion/components/publico/MarcoPublico.jsx';
export { default as MapaPresencia } from '../captacion/components/MapaPresencia.jsx';
export { usePresencia } from '../captacion/utils/usePresencia.js';
