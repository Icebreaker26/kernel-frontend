/**
 * Configuración del sitio público. Cuando el sitio viva en su propio repositorio y dominio, solo cambian
 * estas variables de entorno (Vite); el resto del código no se toca.
 *
 *   VITE_API_BASE_URL     API de Kernel (ya existe).
 *   VITE_URL_ASOCIATE     Formulario de asociación, que vive en Kernel: https://kernel.cooperativaprogresemos.coop/asociate
 *   VITE_URL_PORTAL       Portal de asociados: https://kernel.cooperativaprogresemos.coop/portal
 *   VITE_URL_PASARELA_PAGOS  Enlace de la cooperativa en Mi Pago Amigo (la pasarela donde se paga).
 * Sin variables, apuntan a las rutas de este mismo dominio (así funciona mientras el sitio está dentro de Kernel).
 */
const env = import.meta.env;

export const URL_ASOCIATE = env.VITE_URL_ASOCIATE || '/asociate';
export const URL_PORTAL   = env.VITE_URL_PORTAL   || '/portal';
// Pagos: la página propia es /pagos; el pago en sí se hace en Mi Pago Amigo
export const URL_PASARELA_PAGOS = env.VITE_URL_PASARELA_PAGOS
  || 'https://www.mipagoamigo.com/MPA_WebSite/ServicePayments/StartPayment?id=9968&searchedCategoryId=&searchedAgreementName=COOPERATIVA%20PROGRESEMOS';

// Videos de ayuda de /pagos: los sirve la API de Kernel (están en su bucket), sin depender de WordPress
export const TUTORIALES_PAGO = [
  { titulo: '¿Qué es Mi Pago Amigo?', clave: 'que-es' },
  { titulo: 'Cómo pagar por la página web', clave: 'web' },
  { titulo: 'Cómo pagar por la aplicación', clave: 'app' },
];
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
  pagos: '/pagos',
  pqrs: '/pqrs',
};
