import { describe, test, expect } from 'vitest';
import {
  ESTADOS_JOB, ESTADOS_AGENTE, etapasCompletas, infoJob, esExito, enCurso, infoSolido, infoAgente, hace, faltanteLegible, resumenAgentes,
} from './estados.js';

describe('estados del trabajo', () => {
  test('solo cargado y ya_existe cuentan como éxito', () => {
    const exitos = Object.keys(ESTADOS_JOB).filter(esExito);
    expect(exitos.sort()).toEqual(['cargado', 'ya_existe']);
  });

  test('fallido, revisión y cancelado NO son éxito ni están en curso', () => {
    for (const e of ['fallido', 'revision_humana', 'cancelado', 'requiere_datos']) {
      expect(esExito(e)).toBe(false);
      expect(enCurso(e)).toBe(false);
    }
  });

  test('los estados en curso son los que avanzan solos o esperan una aprobación', () => {
    expect(Object.keys(ESTADOS_JOB).filter(enCurso).sort())
      .toEqual(['aprobado', 'guardando', 'listo_para_aprobar', 'llenando', 'pendiente']);
  });

  test('todo estado tiene etiqueta, tono conocido y las etapas van de 0 a 4', () => {
    for (const [k, v] of Object.entries(ESTADOS_JOB)) {
      expect(v.label).toBeTruthy();
      expect(['emerald', 'sky', 'blue', 'amber', 'red', 'slate']).toContain(v.tono);
      expect(etapasCompletas(k)).toBeGreaterThanOrEqual(0);
      expect(etapasCompletas(k)).toBeLessThanOrEqual(4);
    }
    expect(etapasCompletas('cargado')).toBe(4);
    expect(etapasCompletas('pendiente')).toBe(1);
  });

  test('un estado desconocido no rompe la pantalla', () => {
    expect(infoJob('inventado')).toMatchObject({ label: 'inventado', tono: 'slate' });
    expect(infoJob(undefined).label).toBe('Sin estado');
    expect(etapasCompletas('inventado')).toBe(0);
  });

  test('lo que necesita una persona trae la acción a seguir', () => {
    for (const e of ['requiere_datos', 'listo_para_aprobar', 'revision_humana', 'fallido']) expect(ESTADOS_JOB[e].accion).toBeTruthy();
  });
});

describe('estado en las listas', () => {
  test('cargado se distingue de en cola y de revisar', () => {
    expect(infoSolido('cargado')).toMatchObject({ exito: true, tono: 'emerald' });
    expect(infoSolido('en_cola').exito).toBeUndefined();
    expect(infoSolido('revision').tono).toBe('red');
  });
  test('sin estado no muestra nada', () => {
    expect(infoSolido(null)).toBeNull();
    expect(infoSolido(undefined)).toBeNull();
  });
});

describe('estado del agente', () => {
  test('activo y trabajando son sanos; bloqueado, pausado y apagado no', () => {
    expect(['activo', 'trabajando'].every((e) => ESTADOS_AGENTE[e].ok)).toBe(true);
    expect(['bloqueado', 'pausado', 'apagado', 'sin_agente'].every((e) => !ESTADOS_AGENTE[e].ok)).toBe(true);
  });
  test('bloqueado dice cómo resolverlo', () => {
    expect(infoAgente('bloqueado').detalle).toMatch(/desbloquear/);
    expect(infoAgente('apagado').detalle).toMatch(/encendido/);
  });
  test('un estado nuevo del servidor cae en "sin agente" en vez de romper', () => {
    expect(infoAgente('raro')).toBe(ESTADOS_AGENTE.sin_agente);
  });
});

describe('hace()', () => {
  test.each([[0, 'hace 0 s'], [12, 'hace 12 s'], [59, 'hace 59 s'], [60, 'hace 1 min'], [250, 'hace 4 min'],
    [3600, 'hace 1 h'], [7300, 'hace 2 h'], [86400, 'hace 1 d'], [null, 'nunca'], [undefined, 'nunca']])('%s → %s', (s, esperado) => {
    expect(hace(s)).toBe(esperado);
  });
  test('un valor negativo (reloj adelantado) no muestra "hace -5 s"', () => expect(hace(-5)).toBe('hace 0 s'));
});

describe('faltanteLegible', () => {
  test('cumplimiento usa el mensaje del servidor', () => {
    expect(faltanteLegible({ campo: 'cumplimiento', motivo: 'sin_consulta', mensaje: 'Falta la consulta en listas.' })).toBe('Falta la consulta en listas.');
    expect(faltanteLegible({ campo: 'cumplimiento' })).toMatch(/Oficial de Cumplimiento/);
  });
  test('asesor sin cédula explica a quién pedírsela', () => {
    expect(faltanteLegible({ campo: 'asesor', motivo: 'dato_faltante' })).toMatch(/administración/);
  });
  test('una ciudad sin equivalencia nombra la ciudad y el departamento', () => {
    expect(faltanteLegible({ campo: 'ciudad', motivo: 'sin_equivalencia', texto: 'Pereira', departamento: 'Risaralda' }))
      .toBe('La ciudad de residencia "Pereira" (Risaralda) no tiene código de SOLIDO: hay que registrar su equivalencia.');
  });
  test('un dato ausente y un campo desconocido', () => {
    expect(faltanteLegible({ campo: 'email', motivo: 'dato_faltante' })).toBe('El correo no está en la solicitud.');
    expect(faltanteLegible({ campo: 'algo_nuevo', motivo: 'dato_faltante' })).toBe('El dato "algo_nuevo" no está en la solicitud.');
  });
});

describe('resumenAgentes', () => {
  test('elige el mejor estado: un agente activo gana a uno apagado o pausado', () => {
    const r = resumenAgentes([{ estado: 'apagado', segundos_sin_latido: 9000 }, { estado: 'pausado', segundos_sin_latido: 20 }, { estado: 'activo', segundos_sin_latido: 8 }]);
    expect(r).toEqual({ estado: 'activo', segundos_sin_latido: 8 });
  });
  test('bloqueado es mejor que pausado y apagado (al menos está en línea)', () => {
    expect(resumenAgentes([{ estado: 'apagado' }, { estado: 'bloqueado', segundos_sin_latido: 30 }]).estado).toBe('bloqueado');
  });
  test('sin agentes o lista vacía', () => {
    expect(resumenAgentes([]).estado).toBe('sin_agente');
    expect(resumenAgentes(undefined).estado).toBe('sin_agente');
  });
  test('un estado desconocido no gana a uno conocido', () => {
    expect(resumenAgentes([{ estado: 'raro' }, { estado: 'apagado', segundos_sin_latido: 1 }]).estado).toBe('apagado');
  });
});
