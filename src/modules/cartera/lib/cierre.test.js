// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { calcular, conPosicionInicial, pasosCierre, textosSellos } from './cierre.js';

describe('Cierre — cálculo del desembolso (igual que el servidor)', () => {
  test('sin aval ni firma externa el neto es el monto', () => {
    expect(calcular({ monto: 5000000, conAval: false, porcentaje: '', externa: false, tarifa: 15000 })).toEqual({ aval: 0, firma: 0, neto: 5000000 });
  });
  test('aval = % del monto a desembolsar', () => {
    expect(calcular({ monto: 5000000, conAval: true, porcentaje: '10', externa: false, tarifa: 0 })).toEqual({ aval: 500000, firma: 0, neto: 4500000 });
    expect(calcular({ monto: 3333333, conAval: true, porcentaje: '3.5', externa: false, tarifa: 0 }).aval).toBe(116666.66);
  });
  test('la firma electrónica solo se resta si fue externa; y se restan las dos', () => {
    expect(calcular({ monto: 1000000, conAval: false, externa: true, tarifa: 12000 }).neto).toBe(988000);
    expect(calcular({ monto: 5000000, conAval: true, porcentaje: 10, externa: true, tarifa: 15000 })).toEqual({ aval: 500000, firma: 15000, neto: 4485000 });
  });
  test('un porcentaje vacío o inválido no descuenta nada', () => {
    expect(calcular({ monto: 1000, conAval: true, porcentaje: '', externa: false, tarifa: 0 }).aval).toBe(0);
    expect(calcular({ monto: 1000, conAval: true, porcentaje: '-5', externa: false, tarifa: 0 }).aval).toBe(0);
  });
  test('los descuentos que superan el monto dan un neto negativo (la pantalla lo avisa)', () => {
    expect(calcular({ monto: 10000, conAval: false, externa: true, tarifa: 15000 }).neto).toBe(-5000);
  });
});

describe('Cierre — textos de los sellos', () => {
  test('desembolso siempre; aval solo con aval; firma solo si fue externa', () => {
    const v = { aval: 500000, firma: 15000, neto: 4485000 };
    expect(Object.keys(textosSellos({ conAval: false, externa: false }, v))).toEqual(['desembolso']);
    expect(Object.keys(textosSellos({ conAval: true, porcentaje: 10, externa: true }, v))).toEqual(['aval', 'firma', 'desembolso']);
  });
  test('cada sello lleva su rótulo y su valor', () => {
    const t = textosSellos({ conAval: true, porcentaje: '10.00', externa: true }, { aval: 500000, firma: 15000, neto: 4485000 });
    expect(t.aval).toEqual({ titulo: 'AVAL FONDO REGIONAL', valor: '$500.000', pie: '10% del valor solicitado' });
    expect(t.firma).toEqual({ titulo: 'FIRMA ELECTRONICA', valor: '$15.000', pie: 'costo del proveedor' });
    expect(t.desembolso).toEqual({ titulo: 'DESEMBOLSO', valor: '$4.485.000', pie: 'valor neto a pagar' });
  });
});

describe('Cierre — posición inicial de los sellos', () => {
  test('respeta los ya colocados y apila los nuevos sin encimarlos', () => {
    const puesto = { pagina: 1, x: 0.2, y: 0.5 };
    const r = conPosicionInicial({ aval: puesto }, ['aval', 'firma', 'desembolso']);
    expect(r.aval).toEqual(puesto);
    expect(r.firma.pagina).toBe(0);
    expect(r.desembolso.y).toBeGreaterThan(r.firma.y);
  });
  test('sin nada previo coloca todos en la primera página', () => {
    expect(conPosicionInicial(undefined, ['desembolso']).desembolso).toMatchObject({ pagina: 0 });
  });
  test('descarta sellos que ya no aplican', () => {
    expect(Object.keys(conPosicionInicial({ aval: { pagina: 0, x: 0, y: 0 } }, ['desembolso']))).toEqual(['desembolso']);
  });
});

describe('Pasos del cierre', () => {
  const base = { firmados: 0, total: 2, guardado: false, sinGuardar: false, sellosPuestos: 0, sellosTotal: 2, completada: false };
  const estados = (x) => pasosCierre({ ...base, ...x }).map((p) => p.estado);

  test('al empezar, el primer paso es el actual y el resto está pendiente', () => {
    expect(estados({})).toEqual(['actual', 'pendiente', 'pendiente', 'pendiente']);
  });
  test('cada paso hecho deja al siguiente como actual', () => {
    expect(estados({ firmados: 2 })).toEqual(['hecho', 'actual', 'pendiente', 'pendiente']);
    expect(estados({ firmados: 2, guardado: true })).toEqual(['hecho', 'hecho', 'actual', 'pendiente']);
    expect(estados({ firmados: 2, guardado: true, sellosPuestos: 2 })).toEqual(['hecho', 'hecho', 'hecho', 'actual']);
  });
  test('un paso posterior hecho no oculta uno anterior que falta', () => {
    expect(estados({ firmados: 1, guardado: true, sellosPuestos: 2 })).toEqual(['actual', 'hecho', 'hecho', 'pendiente']);
  });
  test('cambios sin guardar devuelven el desembolso a "actual" y lo dicen', () => {
    const p = pasosCierre({ ...base, firmados: 2, guardado: true, sinGuardar: true });
    expect(p[1]).toMatchObject({ estado: 'actual', detalle: 'Cambios sin guardar' });
  });
  test('completado: todo hecho', () => {
    expect(estados({ completada: true })).toEqual(['hecho', 'hecho', 'hecho', 'hecho']);
  });
  test('cuenta los documentos y los sellos', () => {
    const p = pasosCierre({ ...base, firmados: 1, sellosPuestos: 1 });
    expect(p[0].detalle).toBe('1/2 firmados');
    expect(p[2].detalle).toBe('1/2 ubicados');
  });
});
