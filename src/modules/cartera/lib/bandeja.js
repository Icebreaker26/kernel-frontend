import { PARAMS_ORDEN } from '../../creditos/lib/lista.js';

// Pestañas de la bandeja: cada una es un estado del crédito visto desde Cartera
export const TABS = [
  { clave: 'entregadas',  estado: 'entregada',  titulo: 'POR RECIBIR', ayuda: 'Entregadas por los asesores: esperan a Cartera' },
  { clave: 'recibidas',   estado: 'recibida',   titulo: 'RECIBIDAS',   ayuda: 'Cartera ya las recibió: falta cargar y firmar el comprobante y el estudio, y completar' },
  { clave: 'completadas', estado: 'completada', titulo: 'COMPLETADAS', ayuda: 'Cartera ya las completó: están en Control Interno' },
  { clave: 'devueltas',   estado: 'devuelta',   titulo: 'DEVUELTAS',   ayuda: 'Devueltas al asesor para corregir' },
  { clave: 'por_llegar',  estado: 'en_tramite', titulo: 'EN TRÁMITE',  ayuda: 'Aún en manos del asesor (solo para anticipar carga)' },
];

// Columnas del tablero en el orden en que un expediente llega a Cartera y sale de ella
export const COLUMNAS_BANDEJA = ['en_tramite', 'devuelta', 'entregada', 'recibida', 'completada'];

// Filtros que entiende la bandeja (los de la lista de créditos, sin estado —lo da la pestaña—, alcance ni "requiere acción")
export const PARAMS_FILTRO_CARTERA = ['q', 'categoria', 'empresa', 'forma', 'modalidad', 'asesor', 'desde', 'hasta', 'min', 'max', 'dias'];

export const tabDeUrl = (v) => (TABS.some((t) => t.clave === v) ? v : 'entregadas');

/** Filtros y orden a partir de la URL: solo los conocidos y con valor */
export const filtrosDeUrlCartera = (sp) => {
  const f = {};
  for (const k of [...PARAMS_FILTRO_CARTERA, ...PARAMS_ORDEN]) { const v = sp.get(k); if (v) f[k] = v; }
  return f;
};

/** Lo que viaja al servidor. El tablero pide todas las pestañas a la vez y la franja de resumen no lleva pestaña ni orden. */
export const aParamsCartera = (f, { tab, sinOrden = false } = {}) => {
  const p = {};
  for (const k of PARAMS_FILTRO_CARTERA) if (f[k]) p[k] = f[k];
  if (!sinOrden) for (const k of PARAMS_ORDEN) if (f[k]) p[k] = f[k];
  if (tab) p.tab = tab;
  return p;
};

/** Conteo y valor de cada pestaña a partir del resumen del servidor */
export const totalesPorTab = (resumen) => {
  const por = Object.fromEntries((resumen?.estados ?? []).map((e) => [e.estado, e]));
  return Object.fromEntries(TABS.map((t) => [t.clave, { n: por[t.estado]?.n ?? 0, valor: por[t.estado]?.valor ?? 0 }]));
};
