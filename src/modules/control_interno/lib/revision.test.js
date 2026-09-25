// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { diasEn, listaDeMarcas, motivoDesdeMarcas, origenDocumento, textoDias, todoCumple } from './revision.js';

const ITEMS = [{ clave: 'documentos', texto: 'Los documentos están completos.' }, { clave: 'valores', texto: 'Los valores son correctos' }, { clave: 'datos_bancarios', texto: 'La cuenta coincide con el certificado' }];

describe('Días en Control Interno', () => {
  const ahora = Date.parse('2026-09-24T18:00:00Z');
  test('cuenta días completos y nunca es negativo', () => {
    expect(diasEn('2026-09-24T15:00:00Z', ahora)).toBe(0);
    expect(diasEn('2026-09-23T15:00:00Z', ahora)).toBe(1);
    expect(diasEn('2026-09-14T15:00:00Z', ahora)).toBe(10);
    expect(diasEn('2026-09-30T00:00:00Z', ahora)).toBe(0);
    expect(diasEn(null, ahora)).toBeNull();
  });
  test('se lee en español', () => {
    expect([0, 1, 5, null].map(textoDias)).toEqual(['Hoy', '1 día', '5 días', '—']);
  });
});

describe('Verificación', () => {
  test('solo se puede aprobar si TODOS los puntos cumplen', () => {
    expect(todoCumple(ITEMS, { documentos: 'ok', valores: 'ok', datos_bancarios: 'ok' })).toBe(true);
    expect(todoCumple(ITEMS, { documentos: 'ok', valores: 'ok' })).toBe(false);                     // uno sin revisar
    expect(todoCumple(ITEMS, { documentos: 'ok', valores: 'ok', datos_bancarios: 'no' })).toBe(false);   // uno que no cumple
    expect(todoCumple([], {})).toBe(false);                                                              // sin lista no hay nada que aprobar
  });
  test('al servidor solo van los puntos marcados: CUMPLE es true y NO CUMPLE es false', () => {
    expect(listaDeMarcas({ documentos: 'ok', valores: 'no', datos_bancarios: undefined })).toEqual({ documentos: true, valores: false });
    expect(listaDeMarcas({})).toEqual({});
  });
  test('el motivo sugerido junta los puntos que no cumplen, sin puntos finales repetidos', () => {
    expect(motivoDesdeMarcas(ITEMS, { documentos: 'no', valores: 'ok', datos_bancarios: 'no' })).toBe('No cumple: Los documentos están completos; La cuenta coincide con el certificado.');
    expect(motivoDesdeMarcas(ITEMS, { documentos: 'ok' })).toBe('');
  });
});

describe('Origen de un documento', () => {
  test('dice qué es y quién lo aportó', () => {
    expect(origenDocumento({ clase: 'firmado', etapa: 'cartera' })).toBe('Firmado · Cartera');
    expect(origenDocumento({ clase: 'adjunto', etapa: 'asesor' })).toBe('Del asociado · Asesor');
    expect(origenDocumento({ clase: 'evidencia_externa', etapa: 'asesor' })).toBe('Evidencia · Asesor');
    expect(origenDocumento({ clase: 'otro', etapa: 'asesor' })).toBe('Documento · Asesor');
  });
});
