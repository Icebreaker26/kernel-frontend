import axios from 'axios';

// Instancia sin withCredentials ni interceptor 401 — endpoints públicos no requieren auth.
// X-Requested-With es obligatorio: el backend rechaza con 403 toda mutación sin él (protección CSRF).
const pub = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

export default pub;

// Subida directa a S3 con URL prefirmada. Va con axios "desnudo" a propósito: la URL está firmada
// para ciertos headers y un X-Requested-With añadido (o cookies) podría invalidar la firma o el CORS.
export const subirAUrlFirmada = (url, file, onProgreso) =>
  axios.put(url, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (e) => { if (e.total) onProgreso?.(Math.round((e.loaded * 100) / e.total)); },
  });
