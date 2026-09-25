// Estados del RPA de SOLIDO tal como los maneja el backend (rpa_jobs.estado y estado derivado del agente) y cómo se muestran.

/** Colores por tono (mismo lenguaje visual que el resto de captación). */
export const TONOS = {
  emerald: 'border-emerald-600/50 bg-emerald-500/15 text-emerald-300',
  sky:     'border-sky-600/50 bg-sky-500/15 text-sky-300',
  blue:    'border-blue-700/60 bg-blue-900/30 text-blue-300',
  amber:   'border-amber-600/50 bg-amber-500/15 text-amber-300',
  red:     'border-red-700/60 bg-red-900/30 text-red-300',
  slate:   'border-slate-700 bg-slate-800 text-slate-300',
};

/**
 * Estado del trabajo (job). `exito` = el asociado ya está en SOLIDO; `enCurso` = el agente está trabajando o lo hará solo;
 * `accion` = qué necesita una persona (para no dejar al asesor mirando una pantalla que no avanza).
 */
export const ESTADOS_JOB = {
  requiere_datos:     { label: 'Faltan datos',            tono: 'amber',   accion: 'Completa lo que falta y vuelve a intentar' },
  pendiente:          { label: 'En cola',                 tono: 'sky',     enCurso: true },
  llenando:           { label: 'Cargando en SOLIDO',      tono: 'sky',     enCurso: true },
  listo_para_aprobar: { label: 'Esperando aprobación',    tono: 'amber',   enCurso: true, accion: 'Una persona con permiso de aprobación debe revisarlo' },
  aprobado:           { label: 'Aprobado',                tono: 'sky',     enCurso: true },
  guardando:          { label: 'Guardando en SOLIDO',     tono: 'sky',     enCurso: true },
  cargado:            { label: 'Cargado en SOLIDO',       tono: 'emerald', exito: true },
  ya_existe:          { label: 'Ya estaba en SOLIDO',     tono: 'blue',    exito: true },
  revision_humana:    { label: 'Requiere revisión',       tono: 'red',     accion: 'Hay que verificar en SOLIDO qué pasó antes de continuar' },
  fallido:            { label: 'No se pudo cargar',       tono: 'red',     accion: 'Revisa el motivo y vuelve a intentar' },
  cancelado:          { label: 'Cancelado',               tono: 'slate' },
};

/** Etapas del recorrido feliz, para la barra de avance. */
export const ETAPAS_JOB = ['Solicitado', 'Cargado en seco', 'Aprobado', 'Guardado en SOLIDO'];

/** Cuántas etapas están completas (0-4) según el estado del trabajo. */
export const etapasCompletas = (estado) => ({
  requiere_datos: 0, pendiente: 1, llenando: 1, listo_para_aprobar: 2, aprobado: 3, guardando: 3, cargado: 4, ya_existe: 4,
  revision_humana: 3, fallido: 1, cancelado: 0,
}[estado] ?? 0);

export const infoJob = (estado) => ESTADOS_JOB[estado] || { label: estado || 'Sin estado', tono: 'slate' };
export const esExito = (estado) => !!ESTADOS_JOB[estado]?.exito;
export const enCurso = (estado) => !!ESTADOS_JOB[estado]?.enCurso;

/** Estado del asociado en SOLIDO guardado en la vinculación (captacion_vinculaciones.solido_estado), para las listas. */
export const ESTADOS_SOLIDO = {
  en_cola:   { label: 'En cola SOLIDO',   tono: 'sky' },
  cargado:   { label: 'En SOLIDO',        tono: 'emerald', exito: true },
  ya_existe: { label: 'Ya estaba en SOLIDO', tono: 'blue', exito: true },
  revision:  { label: 'Revisar SOLIDO',   tono: 'red' },
};
export const infoSolido = (estado) => ESTADOS_SOLIDO[estado] || null;

/** Estado del agente (lo deriva el servidor a partir del último latido, la sesión de Windows y los trabajos en curso). */
export const ESTADOS_AGENTE = {
  activo:     { label: 'Activo',              tono: 'emerald', ok: true,  detalle: 'Listo para recibir trabajos.' },
  trabajando: { label: 'Trabajando',          tono: 'sky',     ok: true,  detalle: 'Está cargando un asociado en SOLIDO.' },
  bloqueado:  { label: 'Pantalla bloqueada',  tono: 'amber',   ok: false, detalle: 'El PC de SOLIDO está bloqueado: hay que desbloquearlo para que siga cargando.' },
  pausado:    { label: 'Pausado',             tono: 'amber',   ok: false, detalle: 'Se detuvo desde Kernel o por un error. Hay que reactivarlo.' },
  apagado:    { label: 'Apagado o sin conexión', tono: 'red',  ok: false, detalle: 'No responde desde hace varios minutos: revisa que el PC de SOLIDO esté encendido, con internet y la sesión abierta.' },
  sin_agente: { label: 'Sin agente',          tono: 'slate',   ok: false, detalle: 'Todavía no hay un agente registrado.' },
};
export const infoAgente = (estado) => ESTADOS_AGENTE[estado] || ESTADOS_AGENTE.sin_agente;

/** "hace 12 s", "hace 4 min", "hace 3 h", "hace 2 d". */
export const hace = (segundos) => {
  if (segundos === null || segundos === undefined) return 'nunca';
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};

const NOMBRES_CAMPO = {
  asesor: 'La cédula del asesor titular', email: 'El correo', direccion: 'La dirección', telefono1: 'El celular', genero: 'El género',
  fecha_nacimiento: 'La fecha de nacimiento', tipo_id: 'El tipo de documento', fecha_expedicion: 'La fecha de expedición',
  expedida: 'La ciudad de expedición', salario: 'Los ingresos mensuales', periodo_dcto: 'La periodicidad del descuento',
  cedula: 'La cédula', ciudad: 'La ciudad de residencia', ciudad_nacimiento: 'La ciudad de nacimiento', ciudad_trabajo: 'La ciudad de trabajo',
};

/** Texto entendible de un dato faltante devuelto por el backend ({campo, motivo, texto?, mensaje?}). */
export const faltanteLegible = (f) => {
  if (f.campo === 'cumplimiento') return f.mensaje || 'Falta el visto bueno del Oficial de Cumplimiento.';
  if (f.campo === 'asesor') return 'El asesor titular no tiene su cédula cargada en Kernel (pídesela a administración).';
  const nombre = NOMBRES_CAMPO[f.campo] || `El dato "${f.campo}"`;
  if (f.motivo === 'sin_equivalencia') {
    return `${nombre} "${f.texto}"${f.departamento ? ` (${f.departamento})` : ''} no tiene código de SOLIDO: hay que registrar su equivalencia.`;
  }
  return `${nombre} no está en la solicitud.`;
};

const ORDEN_AGENTE = { activo: 0, trabajando: 1, bloqueado: 2, pausado: 3, apagado: 4 };

/** Resumen de varios agentes (mismo criterio del servidor): el mejor estado disponible. */
export const resumenAgentes = (agentes) => {
  if (!agentes?.length) return { estado: 'sin_agente', segundos_sin_latido: null };
  const mejor = [...agentes].sort((a, b) => (ORDEN_AGENTE[a.estado] ?? 9) - (ORDEN_AGENTE[b.estado] ?? 9))[0];
  return { estado: mejor.estado, segundos_sin_latido: mejor.segundos_sin_latido };
};
