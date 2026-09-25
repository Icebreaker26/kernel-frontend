import { FORMAS, moneda, numeroCuenta } from '../../creditos/lib/formato.js';
import { PARAMS_ORDEN, celda, fechaISO } from '../../creditos/lib/lista.js';

// Pestañas: cada una es un estado de la orden de pago
export const TABS = [
  { clave: 'pendiente', titulo: 'POR PAGAR', ayuda: 'Aprobados por Control Interno: esperan tu pago', vacio: 'No hay desembolsos por pagar.' },
  { clave: 'pagada', titulo: 'PAGADOS', ayuda: 'Ya se pagaron y quedaron registrados en Tesorería', vacio: 'Todavía no hay desembolsos pagados con estos filtros.' },
  { clave: 'anulada', titulo: 'DEVUELTOS', ayuda: 'Los devolviste a Control Interno porque no se podían pagar', vacio: 'No hay desembolsos devueltos.' },
];
export const CLAVES_TAB = TABS.map((t) => t.clave);

export const FORMAS_PAGO = ['transferencia', 'cheque', 'efectivo'];

// Filtros que entiende la lista (el estado lo da la pestaña)
export const PARAMS_FILTRO_TES = ['q', 'forma', 'empresa', 'aprobador', 'cuenta', 'desde', 'hasta', 'min', 'max', 'dias', 'tercero'];

export const tabDeUrl = (v) => (CLAVES_TAB.includes(v) ? v : 'pendiente');

/** Filtros y orden a partir de la URL: solo los conocidos y con valor */
export const filtrosDeUrlTes = (sp) => {
  const f = {};
  for (const k of [...PARAMS_FILTRO_TES, ...PARAMS_ORDEN]) { const v = sp.get(k); if (v) f[k] = v; }
  return f;
};

/** Lo que viaja al servidor. El tablero pide todos los estados a la vez y el resumen no lleva estado ni orden. */
export const aParamsTes = (f, { estado, sinOrden = false } = {}) => {
  const p = {};
  for (const k of PARAMS_FILTRO_TES) if (f[k]) p[k] = k === 'tercero' ? 1 : f[k];
  if (!sinOrden) for (const k of PARAMS_ORDEN) if (f[k]) p[k] = f[k];
  if (estado) p.estado = estado;
  return p;
};

/** Conteo y monto de cada pestaña a partir del resumen del servidor */
export const totalesPorEstado = (resumen) => {
  const por = Object.fromEntries((resumen?.estados ?? []).map((e) => [e.estado, e]));
  return Object.fromEntries(CLAVES_TAB.map((k) => [k, { n: por[k]?.n ?? 0, valor: por[k]?.valor ?? 0 }]));
};

/** Cuántos filtros hay activos (sin contar el texto de búsqueda ni el orden, que ya se ven aparte) */
export const contarFiltros = (f) => PARAMS_FILTRO_TES.filter((k) => k !== 'q' && f[k]).length;

/** Etiquetas legibles de los filtros activos (para las fichas que se quitan una a una) */
export const etiquetasFiltros = (f, { empresas = [], aprobadores = [], cuentas = [] } = {}) => {
  const out = [];
  if (f.forma) out.push(['forma', `Forma: ${FORMAS[f.forma] ?? f.forma}`]);
  if (f.empresa) out.push(['empresa', `Empresa: ${empresas.find((e) => e.codigo === f.empresa)?.nombre ?? f.empresa}`]);
  if (f.aprobador) out.push(['aprobador', `Aprobó: ${aprobadores.find((a) => a.id === f.aprobador)?.nombre ?? '—'}`]);
  if (f.cuenta) out.push(['cuenta', `Pagado desde: ${cuentas.find((c) => c.id === f.cuenta)?.nombre ?? '—'}`]);
  if (f.desde) out.push(['desde', `Aprobados desde ${f.desde}`]);
  if (f.hasta) out.push(['hasta', `Aprobados hasta ${f.hasta}`]);
  if (f.min) out.push(['min', `Monto ≥ $${Number(f.min).toLocaleString('es-CO')}`]);
  if (f.max) out.push(['max', `Monto ≤ $${Number(f.max).toLocaleString('es-CO')}`]);
  if (f.dias) out.push(['dias', `${f.dias}+ días de espera`]);
  if (f.tercero) out.push(['tercero', 'Solo cuentas de terceros']);
  return out;
};

/** Lo que espera una orden por pagar: >2 días atención, >5 alerta. Lo que ya no está por pagar no cuenta. */
export const nivelEspera = (estado, dias) => {
  if (estado !== 'pendiente' || dias == null) return 'ninguno';
  if (dias > 5) return 'alto';
  if (dias > 2) return 'medio';
  return 'normal';
};
export const CLASE_ESPERA = { ninguno: 'text-slate-600', normal: 'text-slate-400', medio: 'text-amber-300', alto: 'text-rose-300 font-bold' };

/** "Días de espera" en palabras según el estado: lo que lleva esperando, lo que tardó en pagarse, o nada */
export const textoEspera = (o) => {
  if (o.dias_espera == null) return '';
  if (o.estado === 'pendiente') return o.dias_espera === 0 ? 'aprobado hoy' : `espera ${o.dias_espera} día${o.dias_espera === 1 ? '' : 's'}`;
  return o.dias_espera === 0 ? 'pagado el mismo día' : `tardó ${o.dias_espera} día${o.dias_espera === 1 ? '' : 's'} en pagarse`;
};

/** A dónde va el dinero, en una frase: la cuenta (con los últimos 4 dígitos) o a nombre de quién */
export const destino = (o) => (o.forma_pago === 'transferencia'
  ? `${o.banco} ${o.tipo_cuenta} ****${String(o.numero_cuenta ?? '').slice(-4)}`
  : `${FORMAS[o.forma_pago] ?? o.forma_pago} a nombre de ${o.asociado_nombre}`);

/** Lo que se ve en la orden, en una frase, para confirmar antes de pagar */
export const frase = (o) => (o.forma_pago === 'transferencia'
  ? `${moneda(o.monto)} a ${o.titular_nombre} · ${o.banco} ${o.tipo_cuenta} ${numeroCuenta(o.numero_cuenta)}`
  : `${moneda(o.monto)} a ${o.asociado_nombre} (${o.forma_pago})`);

/** Cuentas de la cooperativa de las que puede salir este pago: una transferencia o un cheque, de un banco; el efectivo, de un banco o una caja. Nunca tarjetas. */
export const cuentasElegibles = (cuentas, formaPago) => cuentas.filter((c) => (formaPago === 'efectivo' ? ['banco', 'caja'].includes(c.tipo) : c.tipo === 'banco'));

/** ¿La fecha de pago es válida? Entre el día de aprobación en Control Interno y hoy (ambos en hora de Colombia). */
export const validarFechaPago = (fecha, aprobadaAt, hoy) => {
  if (!fecha) return 'Indica la fecha del pago.';
  if (fecha > hoy) return 'La fecha de pago no puede ser futura.';
  const desde = fechaISO(aprobadaAt);
  if (desde && fecha < desde) return `La fecha de pago no puede ser anterior a la aprobación de Control Interno (${desde}).`;
  return '';
};

// ── Exportar lo que se ve ─────────────────────────────────────────────────────
const num = (v) => (v == null ? '' : Number(v));
const ESTADO_TXT = { pendiente: 'POR PAGAR', pagada: 'PAGADO', anulada: 'DEVUELTO' };
// La cuenta de destino sale enmascarada (solo los últimos 4 dígitos): el archivo para el banco es otra función y no se mezcla aquí
export const COLUMNAS_CSV = [
  ['RADICADO', (o) => o.radicado], ['ESTADO', (o) => ESTADO_TXT[o.estado] ?? o.estado], ['ASOCIADO', (o) => o.asociado_nombre], ['CEDULA', (o) => o.asociado_codigo], ['EMPRESA', (o) => o.empresa_nombre],
  ['FORMA_PAGO', (o) => FORMAS[o.forma_pago] ?? o.forma_pago], ['MONTO', (o) => num(o.monto)], ['BANCO_DESTINO', (o) => o.banco], ['TIPO_CUENTA_DESTINO', (o) => o.tipo_cuenta],
  ['CUENTA_DESTINO', (o) => (o.numero_cuenta ? `****${String(o.numero_cuenta).slice(-4)}` : '')], ['TITULAR', (o) => o.titular_nombre], ['CUENTA_DE_TERCERO', (o) => (o.forma_pago === 'transferencia' ? (o.titular_es_asociado ? 'NO' : 'SI') : '')],
  ['APROBADO_POR', (o) => o.aprobada_por_nombre], ['FECHA_APROBACION', (o) => fechaISO(o.aprobada_at)], ['DIAS_ESPERA', (o) => o.dias_espera],
  ['FECHA_PAGO', (o) => (o.fecha_pago ? String(o.fecha_pago).slice(0, 10) : '')], ['CUENTA_ORIGEN', (o) => o.cuenta_origen_nombre], ['REFERENCIA', (o) => o.referencia_pago], ['PAGADO_POR', (o) => o.pagada_por_nombre],
  ['MOTIVO_DEVOLUCION', (o) => o.anulada_motivo],
];

/** CSV para Excel en español: ';' como separador, CRLF y BOM UTF-8 */
export const filasACsv = (filas) =>
  `﻿${[COLUMNAS_CSV.map(([t]) => t).join(';'), ...filas.map((o) => COLUMNAS_CSV.map(([, fn]) => celda(fn(o))).join(';'))].join('\r\n')}\r\n`;
