import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import PanelSolido from './PanelSolido.jsx';

const VALIDADA = { estado: 'validada', mensaje: 'El Oficial de Cumplimiento dio el visto bueno.', validada_at: '2026-09-25T15:00:00Z' };
const AGENTE_OK = { estado: 'activo', segundos_sin_latido: 12 };
const estado = (extra = {}) => ({
  vinculacion: { estado: 'entregada', solido_estado: null, solido_cargado_at: null },
  cumplimiento: VALIDADA, job: null, agente: AGENTE_OK, puede_subir: true, motivo: null, es_titular: true, reintento: false, ...extra,
});
const job = (extra = {}) => ({ id: 'j1', estado: 'pendiente', error: null, faltantes: null, created_at: '2026-09-25T15:10:00Z', terminado_at: null, ...extra });
const montar = (props = {}) => render(<PanelSolido vinculacionId="v1" entregada {...props} />);
const respuesta = (datos) => api.get.mockResolvedValue({ data: datos });

beforeEach(() => { api.get.mockReset(); api.post.mockReset(); });

describe('PanelSolido — botón y visto bueno de Cumplimiento', () => {
  test('con el visto bueno vigente el botón está habilitado y no hay motivo de bloqueo', async () => {
    respuesta(estado());
    montar();
    const boton = await screen.findByTestId('boton-subir-solido');
    expect(boton).toBeEnabled();
    expect(boton).toHaveTextContent('SUBIR A SOLIDO');
    expect(screen.getByTestId('solido-cumplimiento')).toHaveAttribute('data-estado', 'validada');
    expect(screen.queryByTestId('solido-motivo')).not.toBeInTheDocument();
  });

  test('sin el visto bueno el botón está deshabilitado y dice por qué', async () => {
    const cump = { estado: 'pendiente_validacion', mensaje: 'La consulta en listas está hecha y espera el visto bueno del Oficial de Cumplimiento.' };
    respuesta(estado({ cumplimiento: cump, puede_subir: false, motivo: cump.mensaje }));
    montar();
    const boton = await screen.findByTestId('boton-subir-solido');
    expect(boton).toBeDisabled();
    expect(screen.getByTestId('solido-motivo')).toHaveTextContent(/espera el visto bueno del Oficial de Cumplimiento/);
    expect(screen.getByTestId('solido-cumplimiento')).toHaveAttribute('data-estado', 'pendiente_validacion');
  });

  test.each(['sin_consulta', 'observada', 'desactualizada'])('cumplimiento "%s" también bloquea el botón', async (e) => {
    respuesta(estado({ cumplimiento: { estado: e, mensaje: `mensaje ${e}` }, puede_subir: false, motivo: `mensaje ${e}` }));
    montar();
    expect(await screen.findByTestId('boton-subir-solido')).toBeDisabled();
    expect(screen.getByTestId('solido-motivo')).toHaveTextContent(`mensaje ${e}`);
  });

  test('otro asesor (no titular) ve el botón bloqueado con el motivo del servidor', async () => {
    respuesta(estado({ puede_subir: false, es_titular: false, motivo: 'Solo el asesor titular de la solicitud puede subirla a SOLIDO.' }));
    montar();
    expect(await screen.findByTestId('boton-subir-solido')).toBeDisabled();
    expect(screen.getByTestId('solido-motivo')).toHaveTextContent(/asesor titular/);
  });

  test('al pulsar sube la solicitud y muestra el nuevo estado', async () => {
    respuesta(estado());
    api.post.mockResolvedValue({ data: estado({ job: job(), puede_subir: false, motivo: 'Ya hay una carga en curso.' }) });
    montar();
    await userEvent.click(await screen.findByTestId('boton-subir-solido'));
    expect(api.post).toHaveBeenCalledWith('/rpa/vinculaciones/v1/subir');
    expect(await screen.findByTestId('job-badge')).toHaveAttribute('data-estado', 'pendiente');
    expect(screen.getByTestId('boton-subir-solido')).toBeDisabled();
    expect(toast.success).toHaveBeenCalled();
  });

  test('si el servidor rechaza (p. ej. perdió el visto bueno), avisa y recarga el estado', async () => {
    respuesta(estado());
    api.post.mockRejectedValue({ response: { status: 409, data: { error: 'Cambió la cédula o el nombre después de la consulta en listas.' } } });
    montar();
    await userEvent.click(await screen.findByTestId('boton-subir-solido'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cambió la cédula o el nombre después de la consulta en listas.'));
    expect(api.get).toHaveBeenCalledTimes(2);            // recargó
  });
});

describe('PanelSolido — estados del trabajo', () => {
  test('cargado: éxito claramente distinguido, sin botón', async () => {
    respuesta(estado({ job: job({ estado: 'cargado', terminado_at: '2026-09-25T15:30:00Z' }), puede_subir: false, motivo: 'El asociado ya está en SOLIDO.',
      vinculacion: { estado: 'entregada', solido_estado: 'cargado', solido_cargado_at: '2026-09-25T15:30:00Z' } }));
    montar();
    expect(await screen.findByTestId('solido-exito')).toHaveTextContent(/Cargado en SOLIDO/);
    expect(screen.getByTestId('job-badge')).toHaveAttribute('data-estado', 'cargado');
    expect(screen.queryByTestId('boton-subir-solido')).not.toBeInTheDocument();
  });

  test('ya_existe: también es éxito pero con otro mensaje (no se cargó de nuevo)', async () => {
    respuesta(estado({ job: job({ estado: 'ya_existe' }), puede_subir: false }));
    montar();
    expect(await screen.findByTestId('solido-exito')).toHaveTextContent(/ya estaba registrado/i);
    expect(screen.queryByTestId('boton-subir-solido')).not.toBeInTheDocument();
  });

  test.each(['fallido', 'revision_humana', 'requiere_datos'])('%s NO se muestra como éxito', async (e) => {
    respuesta(estado({ job: job({ estado: e, error: 'algo pasó', faltantes: [] }), puede_subir: e === 'fallido' }));
    montar();
    await screen.findByTestId('panel-solido');
    expect(screen.queryByTestId('solido-exito')).not.toBeInTheDocument();
  });

  test('requiere_datos lista lo que falta en lenguaje entendible y ofrece reintentar', async () => {
    respuesta(estado({
      reintento: true,
      job: job({ estado: 'requiere_datos', faltantes: [
        { campo: 'ciudad', motivo: 'sin_equivalencia', texto: 'Pereira', departamento: 'Risaralda' },
        { campo: 'asesor', motivo: 'dato_faltante' },
      ] }),
    }));
    montar();
    const lista = await screen.findByTestId('solido-faltantes');
    expect(lista).toHaveTextContent(/"Pereira" \(Risaralda\) no tiene código de SOLIDO/);
    expect(lista).toHaveTextContent(/cédula cargada/);
    expect(screen.getByTestId('boton-subir-solido')).toHaveTextContent('REVISAR Y REINTENTAR');
  });

  test('revisión humana muestra el error para que una persona verifique en SOLIDO', async () => {
    respuesta(estado({ job: job({ estado: 'revision_humana', error: 'El agente se reinició mientras guardaba: verifica en SOLIDO' }), puede_subir: false }));
    montar();
    expect(await screen.findByText(/verifica en SOLIDO/)).toBeInTheDocument();
    expect(screen.getByText(/Hay que verificar en SOLIDO/)).toBeInTheDocument();
  });

  test('esperando aprobación indica que necesita a una persona', async () => {
    respuesta(estado({ job: job({ estado: 'listo_para_aprobar' }), puede_subir: false, motivo: 'Ya hay una carga en curso.' }));
    montar();
    expect(await screen.findByText(/permiso de aprobación/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /Avance de la carga/ }).children).toHaveLength(4);
  });
});

describe('PanelSolido — agente', () => {
  test('agente activo: sin advertencias', async () => {
    respuesta(estado());
    montar();
    expect(await screen.findByTestId('estado-agente')).toHaveAttribute('data-estado', 'activo');
    expect(screen.queryByText(/quedará en cola/)).not.toBeInTheDocument();
  });

  test.each([
    ['bloqueado', /desbloquear/],
    ['apagado', /encendido/],
    ['pausado', /reactivarlo/],
  ])('agente %s: lo explica y avisa que la solicitud quedará en cola', async (e, texto) => {
    respuesta(estado({ agente: { estado: e, segundos_sin_latido: 900 } }));
    montar();
    expect(await screen.findByTestId('estado-agente')).toHaveAttribute('data-estado', e);
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.getByText(/quedará en cola/)).toBeInTheDocument();
    expect(screen.getByTestId('boton-subir-solido')).toBeEnabled();          // se puede enviar igual
  });
});

describe('PanelSolido — cuándo no aparece', () => {
  test('no está entregada: no muestra nada ni consulta', () => {
    montar({ entregada: false });
    expect(screen.queryByTestId('panel-solido')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  test('sin permiso sobre la solicitud (403) se oculta', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    montar();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByTestId('panel-solido')).not.toBeInTheDocument();
  });
});
