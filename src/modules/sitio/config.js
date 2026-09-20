/**
 * Configuración del sitio público. Cuando el sitio viva en su propio repositorio y dominio solo hacen falta dos variables de
 * entorno (Vite); las rutas de Kernel no cambian, así que basta con la dirección base:
 *
 *   VITE_API_BASE_URL  API de Kernel (ya existe).
 *   VITE_URL_KERNEL    Dirección de Kernel, p. ej. https://kernel.cooperativaprogresemos.coop. De ahí salen el formulario de
 *                      asociación (/asociate), el portal (/portal) y los textos legales (/portal/politica-privacidad y
 *                      /portal/terminos-condiciones).
 * Sin ellas, las rutas apuntan a este mismo dominio (así funciona mientras el sitio está dentro de Kernel).
 */
const KERNEL = (import.meta.env.VITE_URL_KERNEL || '').replace(/\/$/, '');

export const URL_ASOCIATE = `${KERNEL}/asociate`;
export const URL_PORTAL   = `${KERNEL}/portal`;
export const URL_POLITICA_PRIVACIDAD = `${KERNEL}/portal/politica-privacidad`;
export const URL_TERMINOS            = `${KERNEL}/portal/terminos-condiciones`;

// Pagos: la página propia es /pagos; el pago en sí se hace en Mi Pago Amigo (enlace fijo de la cooperativa)
export const URL_PASARELA_PAGOS =
  'https://www.mipagoamigo.com/MPA_WebSite/ServicePayments/StartPayment?id=9968&searchedCategoryId=&searchedAgreementName=COOPERATIVA%20PROGRESEMOS';

// Videos de ayuda de /pagos: los sirve la API de Kernel (están en su bucket), sin depender de WordPress
export const TUTORIALES_PAGO = [
  { titulo: '¿Qué es Mi Pago Amigo?', clave: 'que-es' },
  { titulo: 'Cómo pagar por la página web', clave: 'web' },
  { titulo: 'Cómo pagar por la aplicación', clave: 'app' },
];


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
