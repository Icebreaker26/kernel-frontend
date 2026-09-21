// Fechas DATE de Postgres llegan como 'YYYY-MM-DD': new Date('1990-05-20') las interpreta en UTC
// y en Colombia (UTC-5) mostraría el día anterior. Se construyen en hora local.
export const parseFecha = (v) => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).slice(0, 10));
  return m && String(v).length <= 10 ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
};

export const fecha = (v, opciones = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  const d = parseFecha(v);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-CO', opciones) : '';
};

export const fechaHora = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
};

export const dinero = (v) => (v !== null && v !== undefined && v !== '' ? `$${Number(v).toLocaleString('es-CO')}` : '');
export const siNo = (v) => (v === null || v === undefined ? '' : v ? 'Sí' : 'No');

const etiqueta = (mapa) => (v) => mapa[v] || v || '';
export const estadoCivil   = etiqueta({ soltero: 'Soltero/a', casado: 'Casado/a', union_libre: 'Unión libre', separado: 'Separado/a', divorciado: 'Divorciado/a', viudo: 'Viudo/a' });
export const tipoContrato  = etiqueta({ indefinido: 'Término indefinido', fijo: 'Término fijo', prestacion_servicios: 'Prestación de servicios', otro: 'Otro' });
export const tipoVivienda  = etiqueta({ propia: 'Propia', arrendada: 'Arrendada', familiar: 'Familiar' });
export const genero        = etiqueta({ M: 'Masculino', F: 'Femenino' });

// Estados de la vinculación tal como los maneja el backend.
export const ESTADOS_VINCULACION = {
  borrador:           { label: 'En proceso',          cls: 'bg-slate-800 text-slate-300 border-slate-700' },
  solicitud_completa: { label: 'Lista para entregar', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-600/50' },
  por_subsanar:       { label: 'Por subsanar',        cls: 'bg-amber-500/15 text-amber-300 border-amber-600/50' },
  entregada:          { label: 'Entregada',           cls: 'bg-blue-900/30 text-blue-300 border-blue-800' },
};

export const iniciales = (nombres = '', apellidos = '') =>
  `${nombres.trim()[0] || ''}${apellidos.trim()[0] || ''}`.toUpperCase() || '?';

// ── Panel del asesor: etapas, progreso y tiempos ─────────────────────────────

// Pasos del formulario del asociado, en orden. La clave coincide con seccion_<clave>_at.
export const PASOS_FORMULARIO = [
  ['personal', 'Datos personales'], ['laboral', 'Trabajo'], ['financiera', 'Finanzas'], ['pep', 'Cumplimiento'],
  ['aportes', 'Aportes'], ['beneficiarios', 'Beneficiarios'], ['referencias', 'Referencias'],
  ['documentos', 'Cédula'], ['firma', 'Firma'],
];

export const progresoFormulario = (fila) => {
  const hechos = PASOS_FORMULARIO.filter(([k]) => fila[`seccion_${k}_at`]);
  return {
    hechos: hechos.length,
    total: PASOS_FORMULARIO.length,
    pendientes: PASOS_FORMULARIO.filter(([k]) => !fila[`seccion_${k}_at`]).map(([, etiqueta]) => etiqueta),
  };
};

// Etapa que ve el asesor: combina el estado del prospecto con el de su vinculación (si ya tiene una).
export const ETAPAS = {
  por_contactar:  { label: 'Por contactar',       cls: 'bg-slate-800 text-slate-300 border-slate-700' },
  contactado:     { label: 'Contactado',          cls: 'bg-slate-800 text-slate-200 border-slate-600' },
  enlace_enviado: { label: 'Enlace enviado',      cls: 'bg-sky-900/30 text-sky-300 border-sky-800' },
  abrio:          { label: 'Abrió el enlace',     cls: 'bg-indigo-900/30 text-indigo-300 border-indigo-800' },
  llenando:       { label: 'Llenando formulario', cls: 'bg-amber-900/25 text-amber-300 border-amber-800/60' },
  lista:          { label: 'Lista para entregar', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-600/50' },
  entregada:      { label: 'Entregada',           cls: 'bg-blue-900/30 text-blue-300 border-blue-800' },
  asociado:       { label: 'Ya es asociado',      cls: 'bg-purple-900/30 text-purple-300 border-purple-800' },
  fria:           { label: 'Sin interés',         cls: 'bg-slate-900 text-slate-500 border-slate-800' },
};

export const etapaDe = (p) => {
  if (p.vinculacion_estado === 'entregada') return 'entregada';
  if (p.vinculacion_estado === 'solicitud_completa') return 'lista';
  if (p.estado === 'convertido_por_sync') return 'asociado';
  if (p.estado === 'frio') return 'fria';
  if (p.vinculacion_id || p.estado === 'interesado') return 'llenando';
  if (p.estado === 'vio_landing') return 'abrio';
  if (p.estado === 'link_enviado') return 'enlace_enviado';
  if (p.estado === 'contactado') return 'contactado';
  return 'por_contactar';
};

// Agrupaciones para los filtros y los contadores de la lista de prospectos
export const GRUPOS_ETAPA = {
  por_contactar: ['por_contactar', 'contactado'],
  en_proceso:    ['enlace_enviado', 'abrio', 'llenando'],
  listas:        ['lista'],
  entregadas:    ['entregada'],
};

export const TOQUES = {
  enviado_link: 'Enlace enviado', contesto: 'Contestó', no_contesto: 'No contestó',
  interesado: 'Interesado', no_interesado: 'No interesado', reagendado: 'Reagendado',
};

export const tiempoRelativo = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  if (min < 60 * 24 * 30) return `hace ${Math.round(min / 60 / 24)} d`;
  return fecha(v, { day: 'numeric', month: 'short', year: 'numeric' });
};
