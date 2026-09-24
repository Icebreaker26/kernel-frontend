import { ESTADOS, FORMAS, MODALIDADES } from './formato.js';

// Columnas del tablero, en el orden en que un crédito recorre el flujo. "devuelta" va aparte del camino feliz pero visible: es lo que pide acción.
export const COLUMNAS_KANBAN = ['en_tramite', 'devuelta', 'entregada', 'recibida', 'completada', 'en_tesoreria', 'pagada'];
export const COLUMNAS_CERRADAS = ['rechazada', 'desistida'];
export const ESTADOS_ABIERTOS = ['en_tramite', 'devuelta', 'entregada', 'recibida', 'completada', 'en_tesoreria'];   // los que todavía se mueven

// Parámetros que viajan al servidor (y a la URL). El orden fija la URL resultante.
export const PARAMS_FILTRO = ['q', 'estado', 'categoria', 'empresa', 'forma', 'modalidad', 'asesor', 'desde', 'hasta', 'min', 'max', 'dias', 'accion', 'todas'];
export const PARAMS_ORDEN = ['orden', 'dir'];

/** Filtros a partir de los parámetros de la URL: solo los conocidos y con valor */
export const filtrosDeUrl = (sp) => {
  const f = {};
  for (const k of [...PARAMS_FILTRO, ...PARAMS_ORDEN]) { const v = sp.get(k); if (v) f[k] = v; }
  return f;
};

/** Cuántos filtros hay activos (sin contar el alcance "todas", el orden ni el texto de búsqueda, que ya se ven en su propio campo) */
export const contarFiltros = (f) => ['estado', 'categoria', 'empresa', 'forma', 'modalidad', 'asesor', 'desde', 'hasta', 'min', 'max', 'dias', 'accion'].filter((k) => f[k]).length;

/** Nivel de antigüedad de un crédito abierto: sirve para colorear los días (>7 atención, >15 alerta) */
export const nivelAntiguedad = (estado, dias) => {
  if (!ESTADOS_ABIERTOS.includes(estado)) return 'ninguno';
  if (dias > 15) return 'alto';
  if (dias > 7) return 'medio';
  return 'normal';
};
export const CLASE_ANTIGUEDAD = { ninguno: 'text-slate-600', normal: 'text-slate-400', medio: 'text-amber-300', alto: 'text-rose-300 font-bold' };

/** Etiquetas legibles de los filtros activos (para las "fichas" que se pueden quitar una a una) */
export const etiquetasFiltros = (f, { categorias = [], empresas = [], asesores = [] } = {}) => {
  const out = [];
  if (f.estado) out.push(['estado', `Estado: ${ESTADOS[f.estado]?.t ?? f.estado}`]);
  if (f.categoria) out.push(['categoria', `Categoría: ${categorias.find((c) => c.id === f.categoria)?.nombre ?? '—'}`]);
  if (f.empresa) out.push(['empresa', `Empresa: ${empresas.find((e) => e.codigo === f.empresa)?.nombre ?? f.empresa}`]);
  if (f.forma) out.push(['forma', `Desembolso: ${FORMAS[f.forma] ?? f.forma}`]);
  if (f.modalidad) out.push(['modalidad', `Firma: ${MODALIDADES[f.modalidad] ?? f.modalidad}`]);
  if (f.asesor) out.push(['asesor', `Asesor: ${asesores.find((a) => a.id === f.asesor)?.nombre ?? '—'}`]);
  if (f.desde) out.push(['desde', `Desde ${f.desde}`]);
  if (f.hasta) out.push(['hasta', `Hasta ${f.hasta}`]);
  if (f.min) out.push(['min', `Valor ≥ $${Number(f.min).toLocaleString('es-CO')}`]);
  if (f.max) out.push(['max', `Valor ≤ $${Number(f.max).toLocaleString('es-CO')}`]);
  if (f.dias) out.push(['dias', `${f.dias}+ días`]);
  if (f.accion) out.push(['accion', 'Requiere acción']);
  return out;
};

// ── Exportar lo que se ve ─────────────────────────────────────────────────────
const celda = (v) => {
  if (v === null || v === undefined) return '';
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t) && Number.isNaN(Number(t))) t = `'${t}`;   // sin fórmulas inyectadas al abrir en Excel
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const fechaISO = (v) => (v ? new Date(v).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) : '');

export const COLUMNAS_CSV = [
  ['RADICADO', (s) => s.radicado], ['FECHA', (s) => fechaISO(s.created_at)], ['DIAS', (s) => s.dias], ['ESTADO', (s) => ESTADOS[s.estado]?.t ?? s.estado],
  ['CEDULA', (s) => s.asociado_codigo], ['ASOCIADO', (s) => s.asociado_nombre], ['EMPRESA', (s) => s.empresa_nombre], ['CATEGORIA', (s) => s.categoria],
  ['VALOR_SOLICITADO', (s) => Number(s.valor_solicitado)], ['DESEMBOLSO', (s) => (s.monto_desembolso == null ? '' : Number(s.monto_desembolso))],
  ['FORMA_DESEMBOLSO', (s) => FORMAS[s.forma_desembolso] ?? s.forma_desembolso], ['FIRMA', (s) => MODALIDADES[s.modalidad_firma] ?? s.modalidad_firma], ['ASESOR', (s) => s.asesor_nombre],
];

/** CSV para Excel en español: ';' como separador, CRLF y BOM UTF-8 */
export const filasACsv = (filas) =>
  `﻿${[COLUMNAS_CSV.map(([t]) => t).join(';'), ...filas.map((s) => COLUMNAS_CSV.map(([, f]) => celda(f(s))).join(';'))].join('\r\n')}\r\n`;
