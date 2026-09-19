import { subirAUrlFirmada } from '../services/captacionPublicApi.js';
import { prepararArchivo, validarDocumento } from '../components/publico/imagen.js';

/**
 * Sube un documento a S3 con URL prefirmada. Es la misma secuencia para el asociado (enlace público)
 * y para el asesor (panel); solo cambian las dos llamadas a la API, que se inyectan:
 *   solicitar({ nombre, mime, size }) -> { uploadUrl, key }
 *   confirmar({ key, nombre, mime, size })
 * Devuelve el archivo que realmente se subió (puede ser la versión comprimida).
 */
export const subirDocumento = async ({ original, solicitar, confirmar, onProgreso }) => {
  const file = await prepararArchivo(original);
  const invalido = validarDocumento(file);
  if (invalido) throw { mensaje: invalido };

  const meta = { nombre: file.name, mime: file.type, size: file.size };
  const { uploadUrl, key } = await solicitar(meta);
  await subirAUrlFirmada(uploadUrl, file, onProgreso);
  await confirmar({ key, ...meta });
  return file;
};

export const mensajeErrorSubida = (err) => {
  if (err?.mensaje) return err.mensaje;
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 410) return 'El enlace venció. Pídele uno nuevo a tu asesor.';
  if (data?.error && status < 500) return data.error;
  return 'No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.';
};
