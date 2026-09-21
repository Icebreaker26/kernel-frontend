import apiService from '../../../services/apiService.js';

// Descarga un PDF que devuelve la API (con la sesión) sin abrir la URL directamente
export const descargarPdf = async (ruta, nombre) => {
  const { data } = await apiService.get(ruta, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
