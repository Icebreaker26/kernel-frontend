/**
 * Configuración del sitio público. Cuando el sitio viva en su propio repositorio y dominio, solo cambian
 * estas variables de entorno (Vite); el resto del código no se toca.
 *
 *   VITE_API_BASE_URL     API de Kernel (ya existe).
 *   VITE_URL_ASOCIATE     Formulario de asociación, que vive en Kernel: https://kernel.cooperativaprogresemos.coop/asociate
 *   VITE_URL_PORTAL       Portal de asociados: https://kernel.cooperativaprogresemos.coop/portal
 *   VITE_URL_PAGOS        Pagos en línea.
 * Sin variables, apuntan a las rutas de este mismo dominio (así funciona mientras el sitio está dentro de Kernel).
 */
const env = import.meta.env;

export const URL_ASOCIATE = env.VITE_URL_ASOCIATE || '/asociate';
export const URL_PORTAL   = env.VITE_URL_PORTAL   || '/portal';
export const URL_PAGOS    = env.VITE_URL_PAGOS    || 'https://www.cooperativaprogresemos.coop/pagos/';
export const URL_POLITICA_PRIVACIDAD = env.VITE_URL_POLITICA_PRIVACIDAD || '/portal/politica-privacidad';
export const URL_TERMINOS            = env.VITE_URL_TERMINOS            || '/portal/terminos-condiciones';

// Rutas propias del sitio
export const RUTAS = {
  inicio: '/inicio',
  servicios: '/servicios',
  beneficios: '/beneficios',
  aliados: '/aliados',
  nosotros: '/nosotros',
  transparencia: '/transparencia',
  pqrs: '/pqrs',
};
