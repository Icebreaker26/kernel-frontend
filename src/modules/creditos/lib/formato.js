export const moneda = (n) => (n == null || n === '' ? '—' : `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`);
export const fechaHora = (v) => (v ? new Date(v).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : '—');
export const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
export const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const ESTADOS = {
  en_tramite: { t: 'EN TRÁMITE', c: 'border-sky-700/60 text-sky-300' },
  entregada:  { t: 'ENTREGADA A CARTERA', c: 'border-amber-600/60 text-amber-300' },
  recibida:   { t: 'RECIBIDA POR CARTERA', c: 'border-emerald-700/60 text-emerald-300' },
  devuelta:   { t: 'DEVUELTA', c: 'border-rose-700/60 text-rose-300' },
  rechazada:  { t: 'RECHAZADA', c: 'border-slate-600 text-slate-400' },
  desistida:  { t: 'DESISTIDA', c: 'border-slate-600 text-slate-400' },
};
export const ESTADOS_EDITABLES = ['en_tramite', 'devuelta'];

export const TIPOS_A_FIRMAR = { carta_instrucciones: 'Carta de instrucciones', libranza: 'Libranza', pagare: 'Pagaré', solicitud_credito: 'Solicitud', proyeccion: 'Proyección' };
export const TIPOS_ADJUNTO = { desprendible_nomina: 'Desprendible de nómina', certificado_bancario: 'Certificado bancario', otro_adjunto: 'Otro adjunto' };
export const tipoDoc = (t) => TIPOS_A_FIRMAR[t] ?? TIPOS_ADJUNTO[t] ?? t;

export const FORMAS = { transferencia: 'Transferencia bancaria', cheque: 'Cheque', efectivo: 'Efectivo / ventanilla' };
export const CANALES = { whatsapp: 'WhatsApp', presencial: 'Presencial' };
// Medio por el que respondió la empresa a la solicitud de autorización
export const CANALES_AUT = { correo: 'Correo electrónico', telefono: 'Teléfono', fisico: 'Documento físico', otro: 'Otro' };
export const MODALIDADES = { presencial: 'Firma presencial (tableta / huella)', externa: 'Firma electrónica externa' };

export const AUT_ESTADOS = {
  solicitada:       { t: 'SOLICITADA', c: 'text-amber-300' },
  aprobada:         { t: 'APROBADA', c: 'text-emerald-300' },
  rechazada:        { t: 'RECHAZADA', c: 'text-rose-300' },
  sin_destinatario: { t: 'SIN DESTINATARIO', c: 'text-rose-300' },
  invalidada:       { t: 'PERDIÓ VIGENCIA', c: 'text-slate-400' },
};

export const EVENTOS = {
  radicada: 'Solicitud radicada', solicitud_editada: 'Condiciones editadas', cambio_posterior_a_firma: 'Cambió lo firmado/autorizado por modificar las condiciones',
  documento_a_firmar: 'Documento a firmar cargado', documento_firmado: 'Documento firmado registrado', documento_evidencia_externa: 'Evidencia de la firma externa cargada',
  documento_adjunto: 'Adjunto cargado', documento_retirado: 'Documento retirado', documento_visto: 'Documento consultado', firma_completa: 'Firma completa',
  autorizacion_solicitada: 'Autorización solicitada a la empresa', autorizacion_sin_destinatario: 'Sin destinatario para pedir la autorización',
  autorizacion_aprobada: 'La empresa autorizó', autorizacion_rechazada: 'La empresa rechazó',
  correo_enviado: 'Correo enviado (estaba en cola)', correo_suprimido: 'Correo NO enviado (la dirección rebotó antes)', correo_fallido: 'Correo NO enviado',
  expediente_descargado: 'Expediente completo descargado', reasignada: 'Solicitud reasignada a otro asesor',
  entregada_a_cartera: 'Entregada a Cartera', recibida_por_cartera: 'Recibida por Cartera', devuelta_por_cartera: 'Devuelta por Cartera',
  solicitud_desistida: 'Solicitud desistida', solicitud_rechazada: 'Solicitud rechazada',
};
export const EVENTO_ROJO = ['correo_suprimido', 'correo_fallido', 'autorizacion_sin_destinatario', 'autorizacion_rechazada', 'devuelta_por_cartera', 'cambio_posterior_a_firma'];
export const EVENTO_VERDE = ['firma_completa', 'autorizacion_aprobada', 'entregada_a_cartera', 'recibida_por_cartera'];

export const campo = 'w-full rounded-sm border border-slate-700 bg-[#08101e] px-2.5 py-2 text-xs text-[#a0d4e0] outline-none focus:border-[#84cc16] disabled:opacity-50';
export const boton = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40';
export const botonPrimario = `${boton} border-[#84cc16] bg-[#84cc16] text-[#020617] hover:bg-[#a3e635]`;
export const botonLinea = `${boton} border-slate-600 text-[#a0d4e0] hover:border-[#84cc16] hover:text-[#84cc16]`;

export const mensajeError = (err, defecto = 'Ocurrió un error') => err?.response?.data?.error || err?.message || defecto;
