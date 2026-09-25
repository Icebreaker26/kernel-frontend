// @vitest-environment node
import { describe, test, expect } from 'vitest';
import {
  CLASE_ESPERA, TABS, aParamsTes, contarFiltros, cuentasElegibles, destino, etiquetasFiltros, filasACsv, filtrosDeUrlTes, frase, nivelEspera, tabDeUrl, textoEspera, totalesPorEstado, validarFechaPago,
} from './desembolsos.js';

const orden = (extra = {}) => ({
  id: 'o-1', estado: 'pendiente', radicado: 'CR-1', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno', forma_pago: 'transferencia', monto: '4485000.00',
  banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111', titular_es_asociado: true,
  aprobada_at: '2026-09-24T15:00:00Z', aprobada_por_nombre: 'Rita', dias_espera: 2, fecha_pago: null, cuenta_origen_nombre: null, referencia_pago: null, pagada_por_nombre: null, anulada_motivo: null, ...extra,
});

describe('Pestañas y parámetros', () => {
  test('son tres, en el orden del trabajo, y una inventada cae en "por pagar"', () => {
    expect(TABS.map((t) => t.clave)).toEqual(['pendiente', 'pagada', 'anulada']);
    expect(tabDeUrl('pagada')).toBe('pagada');
    expect(tabDeUrl('todas')).toBe('pendiente');
    expect(tabDeUrl(null)).toBe('pendiente');
  });
  test('lee de la URL solo los filtros conocidos y con valor; ignora estado', () => {
    const sp = new URLSearchParams('q=ana&forma=cheque&tercero=1&orden=monto&dir=desc&estado=pagada&raro=1&min=');
    expect(filtrosDeUrlTes(sp)).toEqual({ q: 'ana', forma: 'cheque', tercero: '1', orden: 'monto', dir: 'desc' });
  });
  test('al servidor van filtros, orden y estado; "tercero" como 1; el resumen no lleva estado ni orden', () => {
    const f = { q: 'ana', tercero: '1', dias: '5', orden: 'monto', dir: 'asc' };
    expect(aParamsTes(f, { estado: 'pagada' })).toEqual({ q: 'ana', tercero: 1, dias: '5', orden: 'monto', dir: 'asc', estado: 'pagada' });
    expect(aParamsTes(f, { sinOrden: true })).toEqual({ q: 'ana', tercero: 1, dias: '5' });
  });
  test('los totales de cada pestaña salen del resumen y son cero si no hay', () => {
    const t = totalesPorEstado({ estados: [{ estado: 'pendiente', n: 3, valor: 900 }, { estado: 'anulada', n: 1, valor: 50 }] });
    expect(t).toEqual({ pendiente: { n: 3, valor: 900 }, pagada: { n: 0, valor: 0 }, anulada: { n: 1, valor: 50 } });
    expect(totalesPorEstado(null).pendiente).toEqual({ n: 0, valor: 0 });
  });
  test('cuenta los filtros activos sin contar la búsqueda', () => {
    expect(contarFiltros({ q: 'ana', forma: 'cheque', min: '5', orden: 'monto' })).toBe(2);
    expect(contarFiltros({})).toBe(0);
  });
  test('las fichas de filtros usan los nombres, no los códigos', () => {
    const opciones = { empresas: [{ codigo: 'E1', nombre: 'Empresa Uno' }], aprobadores: [{ id: 'u1', nombre: 'Rita' }], cuentas: [{ id: 'c1', nombre: 'Bancolombia Operativa' }] };
    const f = etiquetasFiltros({ forma: 'efectivo', empresa: 'E1', aprobador: 'u1', cuenta: 'c1', min: '1000000', dias: '3', tercero: '1' }, opciones).map(([, t]) => t);
    expect(f).toEqual(['Forma: Efectivo / ventanilla', 'Empresa: Empresa Uno', 'Aprobó: Rita', 'Pagado desde: Bancolombia Operativa', 'Monto ≥ $1.000.000', '3+ días de espera', 'Solo cuentas de terceros']);
  });
});

describe('Espera', () => {
  test('solo cuenta lo que aún está por pagar: >2 días atención, >5 alerta', () => {
    expect(nivelEspera('pendiente', 1)).toBe('normal');
    expect(nivelEspera('pendiente', 3)).toBe('medio');
    expect(nivelEspera('pendiente', 6)).toBe('alto');
    expect(nivelEspera('pagada', 30)).toBe('ninguno');
    expect(nivelEspera('anulada', 30)).toBe('ninguno');
    expect(nivelEspera('pendiente', null)).toBe('ninguno');
    expect(Object.keys(CLASE_ESPERA)).toEqual(['ninguno', 'normal', 'medio', 'alto']);
  });
  test('se lee según el estado: lo que lleva esperando o lo que tardó en pagarse', () => {
    expect(textoEspera(orden({ dias_espera: 0 }))).toBe('aprobado hoy');
    expect(textoEspera(orden({ dias_espera: 1 }))).toBe('espera 1 día');
    expect(textoEspera(orden({ dias_espera: 4 }))).toBe('espera 4 días');
    expect(textoEspera(orden({ estado: 'pagada', dias_espera: 0 }))).toBe('pagado el mismo día');
    expect(textoEspera(orden({ estado: 'pagada', dias_espera: 3 }))).toBe('tardó 3 días en pagarse');
    expect(textoEspera(orden({ estado: 'anulada', dias_espera: null }))).toBe('');
  });
});

describe('Destino y frase de confirmación', () => {
  test('una transferencia muestra el banco y solo los últimos 4 dígitos', () => {
    expect(destino(orden())).toBe('Bancolombia ahorros ****8901');
  });
  test('un cheque o efectivo van a nombre del asociado', () => {
    expect(destino(orden({ forma_pago: 'cheque', banco: null, numero_cuenta: null }))).toBe('Cheque a nombre de ANA GÓMEZ');
  });
  test('la frase para confirmar lleva monto, titular y cuenta completa', () => {
    expect(frase(orden())).toBe('$4.485.000 a ANA GÓMEZ · Bancolombia ahorros 1234 5678 901');
    expect(frase(orden({ forma_pago: 'efectivo' }))).toBe('$4.485.000 a ANA GÓMEZ (efectivo)');
  });
});

describe('Cuentas de origen', () => {
  const cuentas = [{ id: 'b', tipo: 'banco' }, { id: 'c', tipo: 'caja' }, { id: 't', tipo: 'tarjeta' }];
  test('transferencia y cheque solo salen de un banco; efectivo, de un banco o una caja; nunca una tarjeta', () => {
    expect(cuentasElegibles(cuentas, 'transferencia').map((c) => c.id)).toEqual(['b']);
    expect(cuentasElegibles(cuentas, 'cheque').map((c) => c.id)).toEqual(['b']);
    expect(cuentasElegibles(cuentas, 'efectivo').map((c) => c.id)).toEqual(['b', 'c']);
  });
});

describe('Fecha del pago', () => {
  const aprobada = '2026-09-22T15:00:00Z';
  test('entre el día de aprobación y hoy es válida', () => {
    expect(validarFechaPago('2026-09-22', aprobada, '2026-09-24')).toBe('');
    expect(validarFechaPago('2026-09-24', aprobada, '2026-09-24')).toBe('');
  });
  test('no puede ser futura ni anterior a la aprobación', () => {
    expect(validarFechaPago('2026-09-25', aprobada, '2026-09-24')).toMatch(/futura/);
    expect(validarFechaPago('2026-09-21', aprobada, '2026-09-24')).toMatch(/anterior a la aprobación de Control Interno \(2026-09-22\)/);
    expect(validarFechaPago('', aprobada, '2026-09-24')).toMatch(/Indica la fecha/);
  });
  test('la aprobación de la noche cuenta en el día de Colombia', () => {
    expect(validarFechaPago('2026-09-23', '2026-09-24T03:00:00Z', '2026-09-24')).toBe('');   // 23 de septiembre, 10 p. m. en Bogotá
    expect(validarFechaPago('2026-09-22', '2026-09-24T03:00:00Z', '2026-09-24')).toMatch(/anterior/);
  });
});

describe('CSV', () => {
  test('lleva BOM y separador ";"; la cuenta de destino sale enmascarada', () => {
    const csv = filasACsv([orden(), orden({ id: 'o-2', radicado: 'CR-2', forma_pago: 'cheque', banco: null, tipo_cuenta: null, numero_cuenta: null, titular_nombre: null, titular_es_asociado: true })]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const [cab, a, b] = csv.slice(1).split('\r\n');
    expect(cab.split(';')).toContain('CUENTA_DESTINO');
    expect(a).toContain('CR-1;POR PAGAR;ANA GÓMEZ;1088000111;Empresa Uno;Transferencia bancaria;4485000;Bancolombia;ahorros;****8901;ANA GÓMEZ;NO');
    expect(csv).not.toContain('12345678901');   // el número completo no se exporta
    expect(b).toContain('CR-2;POR PAGAR');
    expect(b).toContain(';Cheque;');
  });
  test('un pagado trae cómo se pagó y un devuelto, por qué', () => {
    const csv = filasACsv([orden({ estado: 'pagada', fecha_pago: '2026-09-24T00:00:00.000Z', cuenta_origen_nombre: 'Bancolombia Operativa', referencia_pago: 'TRF-77', pagada_por_nombre: 'Tania' }), orden({ estado: 'anulada', anulada_motivo: 'El banco rechazó la cuenta' })]);
    const [, pagado, devuelto] = csv.slice(1).split('\r\n');
    expect(pagado).toContain(';2026-09-24;Bancolombia Operativa;TRF-77;Tania;');
    expect(devuelto).toContain('DEVUELTO');
    expect(devuelto.endsWith('El banco rechazó la cuenta')).toBe(true);
  });
  test('un texto que parece fórmula no se inyecta en Excel', () => {
    expect(filasACsv([orden({ asociado_nombre: '=SUMA(A1)' })])).toContain("'=SUMA(A1)");
  });
});
