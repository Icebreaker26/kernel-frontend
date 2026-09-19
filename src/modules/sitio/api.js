import axios from 'axios';

// Cliente HTTP del sitio público: solo endpoints públicos de la API de Kernel, sin cookies ni sesión.
// X-Requested-With es obligatorio: el backend rechaza con 403 toda mutación sin él (protección CSRF).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

export default api;

// URL absoluta de un endpoint de la API (para enlaces de descarga que abren en el navegador)
export const urlApi = (ruta) => `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}${ruta}`;
