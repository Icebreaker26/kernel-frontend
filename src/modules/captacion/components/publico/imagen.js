export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_BYTES = 15 * 1024 * 1024;
const UMBRAL_COMPRESION = 1.5 * 1024 * 1024;
const LADO_MAX = 2000; // px: suficiente para leer una cédula

/** Reduce fotos pesadas del celular (varios MB) para que suban rápido con datos móviles. */
export const prepararArchivo = async (file) => {
  if (!file.type.startsWith('image/') || file.size <= UMBRAL_COMPRESION) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    // La extensión debe coincidir con el mime: el backend rechaza lo contrario.
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
};

export const validarDocumento = (file) => {
  if (!TIPOS_PERMITIDOS.includes(file.type)) return 'Usa una foto (JPG, PNG) o un PDF.';
  if (file.size > MAX_BYTES) return 'El archivo pesa más de 15 MB.';
  return null;
};
