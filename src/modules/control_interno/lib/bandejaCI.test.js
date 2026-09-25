// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { CLASE_ESPERA, TABS, aParamsCI, filasACsv, filtrosDeUrlCI, nivelEspera, notaRevision, tabDeFila, tabDeUrl, totalesPorTab } from './bandejaCI.js';

const fila = (extra = {}) => ({
  id: 'x', radicado: 'CR-1', estado: 'completada', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno', categoria: 'Libre inversión',
  valor_solicitado: '5000000.00', con_aval: true, aval_porcentaje: '10.00', aval_valor: '500000.00', firma_electronica_valor: '15000.00', desembolso_neto: '4485000.00',
  forma_desembolso: 'transferencia', modalidad_firma: 'externa', titular_tercero: false, completada_at: '2026-09-24T15:00:00Z', completada_por_nombre: 'Carolina', asesor_nombre: 'Luis',
  dias: 2, revision_decision: null, ...extra,
});

describe('Pestañas', () => {
  test('son cuatro, en el orden del flujo, y cada una explica qué contiene', () => {
    expect(TABS.map((t) => t.clave)).toEqual(['por_revisar', 'en_tesoreria', 'pagados', 'devueltos']);
    for (const t of TABS) { expect(t.ayuda.length).toBeGreaterThan(10); expect(t.vacio).toMatch(/\.$/); }
  });
  test('una pestaña inventada cae en "por revisar"', () => {
    expect(tabDeUrl('pagados')).toBe('pagados');
    expect(tabDeUrl('todas')).toBe('por_revisar');   // "todas" solo lo pide el tablero, no viaja por la URL
    expect(tabDeUrl(null)).toBe('por_revisar');
  });
  test('cada fila cae en su pestaña según el estado del crédito', () => {
    expect(tabDeFila(fila())).toBe('por_revisar');
    expect(tabDeFila(fila({ estado: 'en_tesoreria' }))).toBe('en_tesoreria');
    expect(tabDeFila(fila({ estado: 'pagada' }))).toBe('pagados');
    expect(tabDeFila(fila({ estado: 'recibida' }))).toBe('devueltos');
    expect(tabDeFila(fila({ estado: 'devuelta' }))).toBe('devueltos');
  });
});

describe('Parámetros', () => {
  test('lee de la URL solo los filtros conocidos y con valor; ignora estado, todas y acción', () => {
    const sp = new URLSearchParams('q=ana&forma=cheque&orden=valor&dir=desc&estado=pagada&todas=1&accion=1&raro=1&min=');
    expect(filtrosDeUrlCI(sp)).toEqual({ q: 'ana', forma: 'cheque', orden: 'valor', dir: 'desc' });
  });
  test('al servidor van los filtros, el orden y la pestaña; el resumen no lleva ni orden ni pestaña', () => {
    const f = { q: 'ana', dias: '5', orden: 'desembolso', dir: 'asc' };
    expect(aParamsCI(f, { tab: 'pagados' })).toEqual({ q: 'ana', dias: '5', orden: 'desembolso', dir: 'asc', tab: 'pagados' });
    expect(aParamsCI(f, { sinOrden: true })).toEqual({ q: 'ana', dias: '5' });
  });
  test('los totales de cada pestaña salen del resumen y son cero si no hay', () => {
    const t = totalesPorTab({ tabs: [{ tab: 'por_revisar', n: 3, valor: 900 }, { tab: 'pagados', n: 1, valor: 50 }] });
    expect(t).toEqual({ por_revisar: { n: 3, valor: 900 }, en_tesoreria: { n: 0, valor: 0 }, pagados: { n: 1, valor: 50 }, devueltos: { n: 0, valor: 0 } });
    expect(totalesPorTab(null).por_revisar).toEqual({ n: 0, valor: 0 });
  });
});

describe('Espera', () => {
  test('solo cuenta lo que aún hay que mover: >3 días atención, >7 alerta', () => {
    expect(nivelEspera('por_revisar', 1)).toBe('normal');
    expect(nivelEspera('por_revisar', 4)).toBe('medio');
    expect(nivelEspera('en_tesoreria', 8)).toBe('alto');
    expect(nivelEspera('pagados', 30)).toBe('ninguno');
    expect(nivelEspera('devueltos', 30)).toBe('ninguno');
    expect(Object.keys(CLASE_ESPERA)).toEqual(['ninguno', 'normal', 'medio', 'alto']);
  });
});

describe('Nota de la última revisión', () => {
  test('devuelto: a quién y por qué', () => {
    expect(notaRevision(fila({ revision_decision: 'devuelta', revision_destino: 'cartera', revision_motivo: 'La cuenta no coincide' }))).toBe('Devuelto a Cartera: La cuenta no coincide');
    expect(notaRevision(fila({ revision_decision: 'devuelta', revision_destino: 'asesor', revision_motivo: 'Falta el desprendible' }))).toBe('Devuelto al asesor: Falta el desprendible');
  });
  test('aprobado: quién; sin revisión: quién lo completó', () => {
    expect(notaRevision(fila({ revision_decision: 'aprobada', revision_por: 'Camilo' }))).toBe('Aprobó Camilo');
    expect(notaRevision(fila())).toBe('Completó Carolina');
  });
});

describe('CSV', () => {
  test('lleva BOM, separador ";" y una fila por crédito con los valores del cierre', () => {
    const csv = filasACsv([fila(), fila({ id: 'y', radicado: 'CR-2', con_aval: false, aval_porcentaje: null, aval_valor: '0.00', titular_tercero: true })]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const [cab, a, b] = csv.slice(1).split('\r\n');
    expect(cab).toBe('RADICADO;FECHA_COMPLETADO;DIAS_EN_CONTROL_INTERNO;ESTADO;CEDULA;ASOCIADO;EMPRESA;CATEGORIA;VALOR_SOLICITADO;PORCENTAJE_AVAL;VALOR_AVAL;VALOR_FIRMA_ELECTRONICA;DESEMBOLSO_NETO;FORMA_DESEMBOLSO;FIRMA;CUENTA_DE_TERCERO;COMPLETADO_POR;ASESOR;ULTIMA_REVISION');
    expect(a).toContain('CR-1;2026-09-24;2;por_revisar;1088000111;ANA GÓMEZ;Empresa Uno;Libre inversión;5000000;10;500000;15000;4485000;Transferencia bancaria');
    expect(a).toContain(';NO;Carolina;Luis;Completó Carolina');
    expect(b).toContain(';;0;15000;4485000;');   // sin aval no hay porcentaje
    expect(b).toContain(';SI;');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  test('un texto que parece fórmula no se inyecta en Excel', () => {
    const csv = filasACsv([fila({ asociado_nombre: '=SUMA(A1)' })]);
    expect(csv).toContain("'=SUMA(A1)");
  });
});
