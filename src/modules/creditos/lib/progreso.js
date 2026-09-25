// Progreso de una solicitud: pasos, en qué paso está y qué sigue. Funciones puras (sin React) para poder probarlas.

// Orden del flujo. "devuelta" vuelve al asesor: cuenta como antes de entregar.
const ORDEN = ['en_tramite', 'devuelta', 'entregada', 'recibida', 'completada', 'en_tesoreria', 'pagada'];
const idx = (estado) => ORDEN.indexOf(estado);
const CERRADAS = ['rechazada', 'desistida'];

/**
 * Los pasos que recorre un crédito, con su estado: 'hecho' | 'actual' | 'pendiente' | 'alerta' | 'na' | 'cerrado'.
 * `grupo`: 'preparacion' (lo arma el asesor) o 'tramite' (lo que pasa después de entregarlo).
 */
export const pasosCredito = (s, p) => {
  const cerrada = CERRADAS.includes(s.estado);
  const i = idx(s.estado);
  const entregado = i >= idx('entregada');
  const pasos = [
    { clave: 'firma', titulo: 'Firma', grupo: 'preparacion', hecho: entregado || !!p.firma_completa, detalle: p.a_firmar ? `${p.firmados}/${p.a_firmar} documentos` : 'sin documentos' },
    s.autorizacion_requerida
      ? { clave: 'autorizacion', titulo: 'Autorización de la empresa', grupo: 'preparacion', hecho: entregado || !!p.autorizacion_ok, detalle: p.autorizacion_ok ? 'recibida' : 'pendiente' }
      : { clave: 'autorizacion', titulo: 'Autorización de la empresa', grupo: 'preparacion', na: true, detalle: 'no la exige' },
    { clave: 'documentos', titulo: 'Documentos del asociado', grupo: 'preparacion', hecho: entregado || !!p.documentos_ok, detalle: p.documentos_ok ? 'completos' : 'incompletos' },
    { clave: 'entrega', titulo: 'Entrega a Cartera', grupo: 'tramite', hecho: entregado, alerta: s.estado === 'devuelta', detalle: s.estado === 'devuelta' ? 'devuelta' : s.entregada_at, esFecha: s.estado !== 'devuelta' },
    { clave: 'cartera', titulo: 'Cartera', grupo: 'tramite', hecho: i >= idx('completada'), detalle: i >= idx('recibida') ? s.recibida_at : null, esFecha: true },
    { clave: 'control', titulo: 'Control Interno', grupo: 'tramite', hecho: i >= idx('en_tesoreria'), detalle: i >= idx('completada') ? s.completada_at : null, esFecha: true },
    { clave: 'tesoreria', titulo: 'Tesorería', grupo: 'tramite', hecho: i >= idx('pagada'), detalle: null },
  ];
  // El paso actual es el primero que no está hecho (ni es "no aplica")
  let actual = false;
  return pasos.map((x) => {
    let estado;
    if (x.na) estado = 'na';
    else if (x.hecho) estado = 'hecho';
    else if (cerrada) estado = 'cerrado';
    else if (x.alerta) { estado = 'alerta'; actual = true; }
    else if (!actual) { estado = 'actual'; actual = true; }
    else estado = 'pendiente';
    return { ...x, estado };
  });
};

/** Cuántos pasos hay hechos sobre el total que aplica (los "no aplica" no cuentan) */
export const avance = (pasos) => {
  const aplican = pasos.filter((x) => x.estado !== 'na');
  return { hechos: aplican.filter((x) => x.estado === 'hecho').length, total: aplican.length };
};

/** Quién debe hacer qué ahora: una frase para el tarjetón de "próximo paso" */
export const siguientePaso = (s, p, faltantes = []) => {
  switch (s.estado) {
    case 'en_tramite':
      return p.listo
        ? { quien: 'Asesor', texto: 'El expediente está completo: entrégalo a Cartera.' }
        : { quien: 'Asesor', texto: faltantes[0] ?? 'Completa el expediente para poder entregarlo.', restantes: Math.max(0, faltantes.length - 1) };
    case 'devuelta':
      return { quien: 'Asesor', texto: 'Corrige lo que se señaló al devolverla y vuelve a entregarla.' };
    case 'entregada': return { quien: 'Cartera', texto: 'Recibir el expediente o devolverlo al asesor.' };
    case 'recibida': return { quien: 'Cartera', texto: 'Cargar y firmar el comprobante y el estudio, definir aval y desembolso, y marcar completado.' };
    case 'completada': return { quien: 'Control Interno', texto: 'Verificar el expediente y aprobarlo o devolverlo.' };
    case 'en_tesoreria': return { quien: 'Tesorería', texto: 'Pagar el desembolso.' };
    case 'pagada': return { quien: null, texto: 'Proceso terminado: el desembolso fue pagado.', terminado: true };
    default: return { quien: null, texto: 'Solicitud cerrada: no continúa.', terminado: true };
  }
};
