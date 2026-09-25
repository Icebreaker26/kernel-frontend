import { FORMAS, MODALIDADES } from '../../creditos/lib/formato.js';
import { PARAMS_ORDEN, celda, fechaISO } from '../../creditos/lib/lista.js';

// Pestañas de la bandeja: cada una es un momento del crédito visto desde Control Interno
export const TABS = [
  { clave: 'por_revisar',  titulo: 'POR REVISAR',  ayuda: 'Cartera ya los completó: esperan tu validación', vacio: 'No hay créditos pendientes de validación.' },
  { clave: 'en_tesoreria', titulo: 'EN TESORERÍA', ayuda: 'Los aprobaste: esperan el pago de Tesorería', vacio: 'No hay créditos esperando el pago de Tesorería.' },
  { clave: 'pagados',      titulo: 'PAGADOS',      ayuda: 'Tesorería ya pagó el desembolso', vacio: 'Todavía no hay créditos pagados con estos filtros.' },
  { clave: 'devueltos',    titulo: 'DEVUELTOS',    ayuda: 'Los devolviste a Cartera o al asesor y aún no vuelven a llegar completados', vacio: 'No hay créditos devueltos.' },
];
export const CLAVES_TAB = TABS.map((t) => t.clave);

// Filtros que entiende la bandeja (los de la lista de créditos, sin estado —lo da la pestaña—, alcance ni "requiere acción")
export const PARAMS_FILTRO_CI = ['q', 'categoria', 'empresa', 'forma', 'modalidad', 'asesor', 'desde', 'hasta', 'min', 'max', 'dias'];

export const tabDeUrl = (v) => (CLAVES_TAB.includes(v) ? v : 'por_revisar');

/** Filtros y orden a partir de la URL: solo los conocidos y con valor */
export const filtrosDeUrlCI = (sp) => {
  const f = {};
  for (const k of [...PARAMS_FILTRO_CI, ...PARAMS_ORDEN]) { const v = sp.get(k); if (v) f[k] = v; }
  return f;
};

/** Lo que viaja al servidor. El tablero pide todas las pestañas a la vez y la franja de resumen no lleva pestaña ni orden. */
export const aParamsCI = (f, { tab, sinOrden = false } = {}) => {
  const p = {};
  for (const k of PARAMS_FILTRO_CI) if (f[k]) p[k] = f[k];
  if (!sinOrden) for (const k of PARAMS_ORDEN) if (f[k]) p[k] = f[k];
  if (tab) p.tab = tab;
  return p;
};

/** Conteo y desembolso neto de cada pestaña a partir del resumen del servidor */
export const totalesPorTab = (resumen) => {
  const por = Object.fromEntries((resumen?.tabs ?? []).map((t) => [t.tab, t]));
  return Object.fromEntries(CLAVES_TAB.map((k) => [k, { n: por[k]?.n ?? 0, valor: por[k]?.valor ?? 0 }]));
};

/** A qué pestaña pertenece una fila (para repartir el tablero) */
export const tabDeFila = (f) => {
  if (f.estado === 'completada') return 'por_revisar';
  if (f.estado === 'en_tesoreria') return 'en_tesoreria';
  if (f.estado === 'pagada') return 'pagados';
  return 'devueltos';
};

/** Qué tanto lleva esperando algo que Control Interno o Tesorería deben mover: >3 días atención, >7 alerta. Lo ya resuelto no cuenta. */
export const nivelEspera = (tab, dias) => {
  if (!['por_revisar', 'en_tesoreria'].includes(tab)) return 'ninguno';
  if (dias > 7) return 'alto';
  if (dias > 3) return 'medio';
  return 'normal';
};
export const CLASE_ESPERA = { ninguno: 'text-slate-600', normal: 'text-slate-400', medio: 'text-amber-300', alto: 'text-rose-300 font-bold' };

/** Frase corta de lo último que pasó con el crédito en Control Interno (para la tabla y el tablero) */
export const notaRevision = (f) => {
  if (f.revision_decision === 'devuelta') return `Devuelto ${f.revision_destino === 'asesor' ? 'al asesor' : 'a Cartera'}: ${f.revision_motivo ?? ''}`.trim();
  if (f.revision_decision === 'aprobada') return `Aprobó ${f.revision_por ?? 'Control Interno'}`;
  return f.completada_por_nombre ? `Completó ${f.completada_por_nombre}` : '';
};

// ── Exportar lo que se ve ─────────────────────────────────────────────────────
const num = (v) => (v == null ? '' : Number(v));
export const COLUMNAS_CSV = [
  ['RADICADO', (f) => f.radicado], ['FECHA_COMPLETADO', (f) => fechaISO(f.completada_at)], ['DIAS_EN_CONTROL_INTERNO', (f) => f.dias], ['ESTADO', (f) => tabDeFila(f)],
  ['CEDULA', (f) => f.asociado_codigo], ['ASOCIADO', (f) => f.asociado_nombre], ['EMPRESA', (f) => f.empresa_nombre], ['CATEGORIA', (f) => f.categoria],
  ['VALOR_SOLICITADO', (f) => num(f.valor_solicitado)], ['PORCENTAJE_AVAL', (f) => (f.con_aval ? num(f.aval_porcentaje) : '')], ['VALOR_AVAL', (f) => num(f.aval_valor)],
  ['VALOR_FIRMA_ELECTRONICA', (f) => num(f.firma_electronica_valor)], ['DESEMBOLSO_NETO', (f) => num(f.desembolso_neto)],
  ['FORMA_DESEMBOLSO', (f) => FORMAS[f.forma_desembolso] ?? f.forma_desembolso], ['FIRMA', (f) => MODALIDADES[f.modalidad_firma] ?? f.modalidad_firma],
  ['CUENTA_DE_TERCERO', (f) => (f.titular_tercero ? 'SI' : 'NO')], ['COMPLETADO_POR', (f) => f.completada_por_nombre], ['ASESOR', (f) => f.asesor_nombre], ['ULTIMA_REVISION', (f) => notaRevision(f)],
];

/** CSV para Excel en español: ';' como separador, CRLF y BOM UTF-8 */
export const filasACsv = (filas) =>
  `﻿${[COLUMNAS_CSV.map(([t]) => t).join(';'), ...filas.map((f) => COLUMNAS_CSV.map(([, fn]) => celda(fn(f))).join(';'))].join('\r\n')}\r\n`;
