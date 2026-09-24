import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Lector simulado: reemplaza al SDK de DigitalPersona para probar todos los estados sin hardware
const h = vi.hoisted(() => {
  const estado = { instancias: [], dispositivos: ['uid-1'], falloEnumerar: false, falloInicio: false, detenciones: [] };
  class FingerprintReader {
    constructor() { this.handlers = {}; this.apagado = false; estado.instancias.push(this); }
    on(evento, fn) { (this.handlers[evento] ??= []).push(fn); return fn; }
    off() { this.handlers = {}; this.apagado = true; return this; }
    async enumerateDevices() { if (estado.falloEnumerar) throw new Error('Communication failure.'); return [...estado.dispositivos]; }
    async startAcquisition(formato, uid) { if (estado.falloInicio) throw new Error('no se pudo iniciar'); this.inicio = [formato, uid]; }
    async stopAcquisition(uid) { estado.detenciones.push(uid); }
    emitir(evento, datos) { (this.handlers[evento] ?? []).forEach((fn) => fn(datos)); }
  }
  return { estado, FingerprintReader };
});
vi.mock('@digitalpersona/devices', () => ({ FingerprintReader: h.FingerprintReader, SampleFormat: { Raw: 1, PngImage: 5 } }));

import { useHuellero } from './useHuellero.js';

const ultimo = () => h.estado.instancias[h.estado.instancias.length - 1];
const arrancar = async () => {
  const r = renderHook(() => useHuellero());
  await act(async () => { await r.result.current.iniciar(); });
  return r;
};

beforeEach(() => {
  window.WebSdk = {};   // el script del cliente ya "está cargado": no se intenta descargar en la prueba
  Object.assign(h.estado, { instancias: [], dispositivos: ['uid-1'], falloEnumerar: false, falloInicio: false, detenciones: [] });
});

describe('useHuellero — conexión con el lector', () => {
  test('empieza inactivo, sin muestra ni mensaje', () => {
    const { result } = renderHook(() => useHuellero());
    expect(result.current).toMatchObject({ estado: 'inactivo', mensaje: '', muestra: null, dispositivo: null });
  });

  test('con un lector conectado queda "listo" y pide la imagen PNG de la huella (nunca plantillas)', async () => {
    const { result } = await arrancar();
    expect(result.current.estado).toBe('listo');
    expect(result.current.dispositivo).toBe('DigitalPersona uid-1');
    expect(ultimo().inicio).toEqual([5, 'uid-1']);   // SampleFormat.PngImage
  });

  test('sin lector conectado queda "sin_lector" y no inicia la captura', async () => {
    h.estado.dispositivos = [];
    const { result } = await arrancar();
    expect(result.current.estado).toBe('sin_lector');
    expect(ultimo().inicio).toBeUndefined();
  });

  test('al conectar el lector después, arranca solo', async () => {
    h.estado.dispositivos = [];
    const { result } = await arrancar();
    expect(result.current.estado).toBe('sin_lector');
    h.estado.dispositivos = ['uid-2'];
    await act(async () => { ultimo().emitir('DeviceConnected', {}); });
    await waitFor(() => expect(result.current.estado).toBe('listo'));
    expect(result.current.dispositivo).toBe('DigitalPersona uid-2');
  });

  test('si el servicio local no responde, queda "sin_servicio" (cliente de HID no instalado o permiso de red local)', async () => {
    h.estado.falloEnumerar = true;
    const { result } = await arrancar();
    expect(result.current.estado).toBe('sin_servicio');
  });

  test('si falla al iniciar la captura, también queda "sin_servicio"', async () => {
    h.estado.falloInicio = true;
    const { result } = await arrancar();
    expect(result.current.estado).toBe('sin_servicio');
  });

  test('un fallo de comunicación reportado por el SDK pasa a "sin_servicio"', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('CommunicationFailed', {}); });
    expect(result.current.estado).toBe('sin_servicio');
  });

  test('desconectar el lector pasa a "sin_lector"', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('DeviceDisconnected', {}); });
    expect(result.current.estado).toBe('sin_lector');
  });
});

describe('useHuellero — captura', () => {
  test('una lectura buena entrega la imagen como data URL PNG, suelta el lector y queda "capturada"', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: ['iVBORw0KGgo'] }); });
    expect(result.current.estado).toBe('capturada');
    expect(result.current.muestra).toBe('data:image/png;base64,iVBORw0KGgo=');   // base64url → base64 con relleno
    expect(h.estado.detenciones).toContain('uid-1');
  });

  test('convierte los caracteres de base64url (- y _) y agrega el relleno que falte', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: ['-__-'] }); });
    expect(result.current.muestra).toBe('data:image/png;base64,+//+');
    await act(async () => { await result.current.descartar(); });
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: ['YWI'] }); });
    expect(result.current.muestra).toBe('data:image/png;base64,YWI=');
    await act(async () => { await result.current.descartar(); });
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: ['YQ'] }); });
    expect(result.current.muestra).toBe('data:image/png;base64,YQ==');
  });

  test('acepta también la muestra como objeto con su campo Data', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: [{ Header: {}, Data: 'YWJj' }] }); });
    expect(result.current.muestra).toBe('data:image/png;base64,YWJj');
  });

  test('una muestra vacía o sin datos se ignora', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: [] }); });
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: [{ Header: {} }] }); });
    await act(async () => { ultimo().emitir('SamplesAcquired', {}); });
    expect(result.current.estado).toBe('listo');
    expect(result.current.muestra).toBeNull();
  });

  test.each([
    [2, /presión/i], [3, /suave|húmedo/i], [7, /Centre/i], [8, /no parece un dedo/i], [14, /rápido/i], [21, /húmedo/i], [22, /dedo falso/i], [24, /rotado/i],
  ])('la calidad %i muestra una indicación en español', async (codigo, patron) => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('QualityReported', { quality: codigo }); });
    expect(result.current.mensaje).toMatch(patron);
  });

  test('una calidad desconocida muestra un mensaje genérico y una buena lo limpia', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('QualityReported', { quality: 99 }); });
    expect(result.current.mensaje).toMatch(/no fue buena/i);
    await act(async () => { ultimo().emitir('QualityReported', { quality: 0 }); });
    expect(result.current.mensaje).toBe('');
  });

  test('un error del lector muestra un mensaje sin cambiar de estado', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('ErrorOccurred', { error: 5 }); });
    expect(result.current.mensaje).toMatch(/error/i);
    expect(result.current.estado).toBe('listo');
  });

  test('descartar borra la muestra y vuelve a esperar el dedo con un lector nuevo', async () => {
    const { result } = await arrancar();
    await act(async () => { ultimo().emitir('SamplesAcquired', { samples: ['YWJj'] }); });
    expect(result.current.estado).toBe('capturada');
    const antes = h.estado.instancias.length;
    await act(async () => { await result.current.descartar(); });
    expect(result.current.muestra).toBeNull();
    expect(result.current.estado).toBe('listo');
    expect(h.estado.instancias.length).toBe(antes + 1);
  });
});

describe('useHuellero — limpieza', () => {
  test('al desmontar suelta el lector y deja de escuchar sus eventos', async () => {
    const { unmount } = await arrancar();
    const lector = ultimo();
    unmount();
    await waitFor(() => expect(lector.apagado).toBe(true));
    expect(h.estado.detenciones).toContain('uid-1');
    expect(lector.handlers).toEqual({});
  });

  test('reiniciar reemplaza al lector anterior: los eventos del viejo ya no cambian el estado', async () => {
    const { result } = await arrancar();
    const viejo = ultimo();
    await act(async () => { await result.current.iniciar(); });
    expect(ultimo()).not.toBe(viejo);
    await act(async () => { viejo.emitir('SamplesAcquired', { samples: ['YWJj'] }); });
    expect(result.current.muestra).toBeNull();
    expect(viejo.apagado).toBe(true);
  });

  test('un arranque que se desmonta a mitad no deja estado colgado ni lanza errores', async () => {
    const { result, unmount } = renderHook(() => useHuellero());
    const promesa = act(async () => { await result.current.iniciar(); });
    unmount();
    await expect(promesa).resolves.not.toThrow();
  });
});
