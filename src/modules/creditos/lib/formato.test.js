// @vitest-environment node
import { describe, test, expect } from 'vitest';
import {
  moneda, fecha, fechaHora, hoyISO, ESTADOS, ESTADOS_EDITABLES, TIPOS_A_FIRMAR, TIPOS_ADJUNTO, tipoDoc, FORMAS, CANALES, MODALIDADES, AUT_ESTADOS,
  EVENTOS, EVENTO_ROJO, EVENTO_VERDE, mensajeError,
} from './formato.js';

describe('moneda', () => {
  test('formatea pesos colombianos sin decimales', () => {
    expect(moneda(1500000)).toBe('$1.500.000');
    expect(moneda('260000')).toBe('$260.000');
    expect(moneda(0)).toBe('$0');
    expect(moneda(1234.6)).toBe('$1.235');
  });
  test.each([null, undefined, ''])('un valor vacío (%p) se muestra como guion', (v) => expect(moneda(v)).toBe('—'));
});

describe('fechas', () => {
  test('fecha usa la fecha calendario UTC (los DATE de la base no se corren de día)', () => {
    expect(fecha('2026-09-22')).toMatch(/22/);
    expect(fecha('2026-09-22T00:00:00.000Z')).toMatch(/22/);
    expect(fecha(null)).toBe('—');
  });
  test('fechaHora muestra la hora de Colombia', () => {
    const t = fechaHora('2026-09-24T15:30:00.000Z');   // 10:30 a. m. en Bogotá
    expect(t).toMatch(/24/);
    expect(t).toMatch(/10:30/);
    expect(fechaHora(undefined)).toBe('—');
  });
  test('hoyISO devuelve AAAA-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('catálogos', () => {
  test('los estados de la solicitud coinciden con los que permite la base de datos', () => {
    expect(Object.keys(ESTADOS).sort()).toEqual(['completada', 'desistida', 'devuelta', 'en_tesoreria', 'en_tramite', 'entregada', 'pagada', 'rechazada', 'recibida']);
    for (const e of Object.values(ESTADOS)) { expect(e.t).toBeTruthy(); expect(e.c).toBeTruthy(); }
    expect(ESTADOS_EDITABLES).toEqual(['en_tramite', 'devuelta']);
  });

  test('los documentos a firmar son los cinco de la cooperativa, con su nombre legible', () => {
    expect(TIPOS_A_FIRMAR).toEqual({ carta_instrucciones: 'Carta de instrucciones', libranza: 'Libranza', pagare: 'Pagaré', solicitud_credito: 'Solicitud', proyeccion: 'Proyección' });
    expect(Object.keys(TIPOS_ADJUNTO)).toEqual(['desprendible_nomina', 'certificado_bancario', 'otro_adjunto']);
  });

  test('tipoDoc traduce cualquier tipo y, si no lo conoce, devuelve el código', () => {
    expect(tipoDoc('pagare')).toBe('Pagaré');
    expect(tipoDoc('desprendible_nomina')).toBe('Desprendible de nómina');
    expect(tipoDoc('algo_nuevo')).toBe('algo_nuevo');
  });

  test('formas de desembolso, canales y modalidades', () => {
    expect(Object.keys(FORMAS)).toEqual(['transferencia', 'cheque', 'efectivo']);
    expect(Object.keys(CANALES)).toEqual(['whatsapp', 'presencial']);
    expect(Object.keys(MODALIDADES)).toEqual(['presencial', 'externa']);
  });

  test('estados de la autorización de la empresa', () => {
    expect(Object.keys(AUT_ESTADOS).sort()).toEqual(['aprobada', 'invalidada', 'rechazada', 'sin_destinatario', 'solicitada']);
  });

  test('todos los eventos que el sistema registra tienen un texto legible, y los de alerta/éxito están definidos', () => {
    const emitidos = [
      'radicada', 'solicitud_editada', 'cambio_posterior_a_firma', 'documento_a_firmar', 'documento_firmado', 'documento_evidencia_externa', 'documento_adjunto',
      'documento_retirado', 'documento_visto', 'firma_completa', 'autorizacion_solicitada', 'autorizacion_sin_destinatario', 'autorizacion_aprobada',
      'autorizacion_rechazada', 'correo_enviado', 'correo_suprimido', 'correo_fallido', 'entregada_a_cartera', 'recibida_por_cartera', 'devuelta_por_cartera',
      'solicitud_desistida', 'solicitud_rechazada', 'expediente_descargado', 'reasignada',
    ];
    const sinTexto = emitidos.filter((e) => !EVENTOS[e]);
    // Un evento sin texto se mostraría con su código técnico: si falla, hay que agregarlo a EVENTOS
    expect(sinTexto).toEqual([]);
    for (const e of [...EVENTO_ROJO, ...EVENTO_VERDE]) expect(EVENTOS[e]).toBeTruthy();
  });
});

describe('mensajeError', () => {
  test('prefiere el mensaje del servidor, luego el del error y luego el de respaldo', () => {
    expect(mensajeError({ response: { data: { error: 'Falta algo' } }, message: 'x' })).toBe('Falta algo');
    expect(mensajeError({ message: 'Network Error' })).toBe('Network Error');
    expect(mensajeError({})).toBe('Ocurrió un error');
    expect(mensajeError(undefined, 'Respaldo')).toBe('Respaldo');
  });
});
