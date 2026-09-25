/** Días completos transcurridos desde una fecha ISO (0 si es de hoy o futura). `ahora` se inyecta para poder probarlo. */
export const diasEn = (iso, ahora = Date.now()) => (iso ? Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 86400000)) : null);

export const textoDias = (n) => (n == null ? '—' : n === 0 ? 'Hoy' : n === 1 ? '1 día' : `${n} días`);

/** Lo que se envía al servidor: solo los puntos con marca; CUMPLE es true y NO CUMPLE es false */
export const listaDeMarcas = (marcas) => Object.fromEntries(Object.entries(marcas).filter(([, v]) => v).map(([k, v]) => [k, v === 'ok']));

/** Motivo de devolución sugerido a partir de los puntos que no cumplen (Control Interno lo completa o lo cambia) */
export const motivoDesdeMarcas = (items, marcas) => {
  const malos = items.filter((i) => marcas[i.clave] === 'no').map((i) => i.texto.replace(/[.\s]+$/, ''));
  return malos.length ? `No cumple: ${malos.join('; ')}.` : '';
};

/** ¿Se puede aprobar? Solo si TODOS los puntos están marcados como CUMPLE */
export const todoCumple = (items, marcas) => items.length > 0 && items.every((i) => marcas[i.clave] === 'ok');

const ETIQUETA_DOC = { firmado: 'Firmado', adjunto: 'Del asociado', evidencia_externa: 'Evidencia' };
/** Origen de un documento del expediente para su ficha: qué es y quién lo aportó (Cartera o el asesor) */
export const origenDocumento = (d) => `${ETIQUETA_DOC[d.clase] ?? 'Documento'}${d.etapa === 'cartera' ? ' · Cartera' : ' · Asesor'}`;
