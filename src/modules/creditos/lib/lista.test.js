// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { CLASE_ANTIGUEDAD, COLUMNAS_CERRADAS, COLUMNAS_KANBAN, contarFiltros, etiquetasFiltros, filasACsv, filtrosDeUrl, nivelAntiguedad } from './lista.js';
import { ESTADOS } from './formato.js';

describe('Lista — columnas del tablero', () => {
  test('recorren el flujo en orden y todas son estados que existen', () => {
    expect(COLUMNAS_KANBAN).toEqual(['en_tramite', 'devuelta', 'entregada', 'recibida', 'completada', 'en_tesoreria', 'pagada']);
    for (const e of [...COLUMNAS_KANBAN, ...COLUMNAS_CERRADAS]) expect(ESTADOS[e]).toBeDefined();
  });
  test('entre las visibles y las cerradas cubren todos los estados', () => {
    expect([...COLUMNAS_KANBAN, ...COLUMNAS_CERRADAS].sort()).toEqual(Object.keys(ESTADOS).sort());
  });
});

describe('Lista — filtros y URL', () => {
  test('toma de la URL solo los parámetros conocidos y con valor', () => {
    const f = filtrosDeUrl(new URLSearchParams('q=ana&estado=pagada&forma=&x=1&min=100&orden=valor&dir=desc&todas=1'));
    expect(f).toEqual({ q: 'ana', estado: 'pagada', min: '100', orden: 'valor', dir: 'desc', todas: '1' });
  });
  test('cuenta los filtros activos sin contar texto, alcance ni orden', () => {
    expect(contarFiltros({ q: 'ana', todas: '1', orden: 'valor', dir: 'asc' })).toBe(0);
    expect(contarFiltros({ estado: 'pagada', empresa: 'E1', dias: '15', accion: '1' })).toBe(4);
  });
  test('las fichas dicen en palabras qué filtro está activo', () => {
    const f = { estado: 'devuelta', categoria: 'c1', empresa: 'E1', forma: 'cheque', modalidad: 'externa', asesor: 'u1', desde: '2026-01-01', hasta: '2026-02-01', min: '1000000', max: '5000000', dias: '15', accion: '1' };
    const t = Object.fromEntries(etiquetasFiltros(f, { categorias: [{ id: 'c1', nombre: 'Vivienda' }], empresas: [{ codigo: 'E1', nombre: 'Empresa Uno' }], asesores: [{ id: 'u1', nombre: 'Luis' }] }));
    expect(t.estado).toBe('Estado: DEVUELTA');
    expect(t.categoria).toBe('Categoría: Vivienda');
    expect(t.empresa).toBe('Empresa: Empresa Uno');
    expect(t.forma).toBe('Desembolso: Cheque');
    expect(t.modalidad).toMatch(/^Firma: Firma electrónica externa/);
    expect(t.asesor).toBe('Asesor: Luis');
    expect(t.min).toBe('Valor ≥ $1.000.000');
    expect(t.max).toBe('Valor ≤ $5.000.000');
    expect(t.dias).toBe('15+ días');
    expect(t.accion).toBe('Requiere acción');
  });
  test('si el catálogo aún no carga no rompe', () => {
    expect(etiquetasFiltros({ categoria: 'c9', asesor: 'u9' }).map(([, t]) => t)).toEqual(['Categoría: —', 'Asesor: —']);
  });
});

describe('Lista — antigüedad', () => {
  test.each([
    ['en_tramite', 3, 'normal'], ['en_tramite', 8, 'medio'], ['devuelta', 16, 'alto'], ['entregada', 7, 'normal'], ['recibida', 15, 'medio'],
    ['pagada', 90, 'ninguno'], ['rechazada', 90, 'ninguno'], ['desistida', 40, 'ninguno'],
  ])('%s con %i días → %s', (estado, dias, nivel) => {
    expect(nivelAntiguedad(estado, dias)).toBe(nivel);
    expect(CLASE_ANTIGUEDAD[nivel]).toBeTruthy();
  });
});

describe('Lista — exportar a CSV', () => {
  const fila = (extra = {}) => ({
    radicado: 'CR-2026-000001', created_at: '2026-09-20T15:00:00Z', dias: 4, estado: 'pagada', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA',
    categoria: 'Libre inversión', valor_solicitado: '5000000.00', monto_desembolso: '4485000.00', forma_desembolso: 'transferencia', modalidad_firma: 'externa', asesor_nombre: 'Luis', ...extra,
  });
  test('usa ; como separador, CRLF y BOM para abrir bien en Excel', () => {
    const csv = filasACsv([fila()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [cab, datos] = csv.slice(1).split('\r\n');
    expect(cab).toBe('RADICADO;FECHA;DIAS;ESTADO;CEDULA;ASOCIADO;EMPRESA;CATEGORIA;VALOR_SOLICITADO;DESEMBOLSO;FORMA_DESEMBOLSO;FIRMA;ASESOR');
    expect(datos.split(';').slice(0, 4)).toEqual(['CR-2026-000001', '2026-09-20', '4', 'PAGADA']);
    expect(datos).toContain(';5000000;4485000;');
  });
  test('el desembolso vacío queda vacío, no cero', () => {
    expect(filasACsv([fila({ monto_desembolso: null })]).split('\r\n')[1]).toContain(';5000000;;');
  });
  test('cita las celdas con ; comillas o saltos y neutraliza fórmulas', () => {
    const csv = filasACsv([fila({ asociado_nombre: 'Pérez; Juan "El Zurdo"', empresa_nombre: '=CMD()' })]);
    expect(csv).toContain('"Pérez; Juan ""El Zurdo"""');
    expect(csv).toContain("'=CMD()");
  });
  test('sin filas deja solo el encabezado', () => {
    expect(filasACsv([]).split('\r\n').filter(Boolean)).toHaveLength(1);
  });
});
