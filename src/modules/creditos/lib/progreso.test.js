// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { avance, pasosCredito, siguientePaso } from './progreso.js';

const s = (extra = {}) => ({ estado: 'en_tramite', autorizacion_requerida: true, entregada_at: null, recibida_at: null, completada_at: null, ...extra });
const p = (extra = {}) => ({ a_firmar: 5, firmados: 0, firma_completa: false, autorizacion_ok: false, documentos_ok: false, listo: false, ...extra });
const estados = (pasos) => Object.fromEntries(pasos.map((x) => [x.clave, x.estado]));

describe('Pasos del crédito', () => {
  test('recién radicada: el primer paso es el actual y el resto está pendiente', () => {
    expect(estados(pasosCredito(s(), p()))).toEqual({ firma: 'actual', autorizacion: 'pendiente', documentos: 'pendiente', entrega: 'pendiente', cartera: 'pendiente', control: 'pendiente', tesoreria: 'pendiente' });
  });

  test('el paso actual es el primero que falta, aunque los siguientes estén hechos', () => {
    const e = estados(pasosCredito(s(), p({ firma_completa: true, autorizacion_ok: false, documentos_ok: true })));
    expect(e).toMatchObject({ firma: 'hecho', autorizacion: 'actual', documentos: 'hecho', entrega: 'pendiente' });
  });

  test('con la firma a medias muestra cuántos documentos van', () => {
    expect(pasosCredito(s(), p({ firmados: 3 })).find((x) => x.clave === 'firma').detalle).toBe('3/5 documentos');
    expect(pasosCredito(s(), p({ a_firmar: 0 })).find((x) => x.clave === 'firma').detalle).toBe('sin documentos');
  });

  test('la empresa que no exige autorización aparece como "no aplica" y no cuenta', () => {
    const pasos = pasosCredito(s({ autorizacion_requerida: false }), p({ firma_completa: true }));
    expect(pasos.find((x) => x.clave === 'autorizacion')).toMatchObject({ estado: 'na', detalle: 'no la exige' });
    expect(avance(pasos)).toEqual({ hechos: 1, total: 6 });
  });

  test.each([
    ['entregada', { firma: 'hecho', autorizacion: 'hecho', documentos: 'hecho', entrega: 'hecho', cartera: 'actual', control: 'pendiente', tesoreria: 'pendiente' }],
    ['recibida', { entrega: 'hecho', cartera: 'actual', control: 'pendiente', tesoreria: 'pendiente' }],
    ['completada', { entrega: 'hecho', cartera: 'hecho', control: 'actual', tesoreria: 'pendiente' }],
    ['en_tesoreria', { cartera: 'hecho', control: 'hecho', tesoreria: 'actual' }],
    ['pagada', { cartera: 'hecho', control: 'hecho', tesoreria: 'hecho' }],
  ])('en %s los pasos de preparación ya están hechos y el actual es el que corresponde', (estado, esperado) => {
    expect(estados(pasosCredito(s({ estado }), p()))).toMatchObject(esperado);
  });

  test('devuelta: la entrega queda en alerta y lo anterior sigue como estaba', () => {
    const e = estados(pasosCredito(s({ estado: 'devuelta' }), p({ firma_completa: true, autorizacion_ok: true })));
    expect(e).toMatchObject({ firma: 'hecho', autorizacion: 'hecho', documentos: 'actual', entrega: 'alerta', cartera: 'pendiente' });
  });

  test.each(['rechazada', 'desistida'])('%s: lo que faltaba queda "cerrado", no pendiente', (estado) => {
    const e = estados(pasosCredito(s({ estado }), p({ firma_completa: true })));
    expect(e).toMatchObject({ firma: 'hecho', autorizacion: 'cerrado', entrega: 'cerrado', tesoreria: 'cerrado' });
    expect(Object.values(e)).not.toContain('actual');
  });

  test('las fechas de cada etapa se conservan para mostrarlas', () => {
    const pasos = pasosCredito(s({ estado: 'en_tesoreria', entregada_at: '2026-09-20', recibida_at: '2026-09-21', completada_at: '2026-09-22' }), p());
    expect(pasos.find((x) => x.clave === 'entrega').detalle).toBe('2026-09-20');
    expect(pasos.find((x) => x.clave === 'cartera').detalle).toBe('2026-09-21');
    expect(pasos.find((x) => x.clave === 'control').detalle).toBe('2026-09-22');
  });

  test('cuenta los pasos hechos sobre el total que aplica', () => {
    expect(avance(pasosCredito(s({ estado: 'pagada' }), p()))).toEqual({ hechos: 7, total: 7 });
    expect(avance(pasosCredito(s(), p()))).toEqual({ hechos: 0, total: 7 });
  });
});

describe('Siguiente paso', () => {
  test('en trámite: dice el primer pendiente y cuántos más hay', () => {
    expect(siguientePaso(s(), p(), ['Sube los documentos a firmar', 'Falta el desprendible'])).toEqual({ quien: 'Asesor', texto: 'Sube los documentos a firmar', restantes: 1 });
  });
  test('en trámite y listo: entregar', () => {
    expect(siguientePaso(s(), p({ listo: true }), []).texto).toMatch(/entrégalo a Cartera/);
  });
  test.each([
    ['devuelta', 'Asesor'], ['entregada', 'Cartera'], ['recibida', 'Cartera'], ['completada', 'Control Interno'], ['en_tesoreria', 'Tesorería'],
  ])('%s → lo hace %s', (estado, quien) => {
    expect(siguientePaso(s({ estado }), p()).quien).toBe(quien);
  });
  test('los estados finales no tienen responsable', () => {
    expect(siguientePaso(s({ estado: 'pagada' }), p())).toMatchObject({ quien: null, terminado: true });
    expect(siguientePaso(s({ estado: 'desistida' }), p())).toMatchObject({ quien: null, terminado: true });
  });
});
