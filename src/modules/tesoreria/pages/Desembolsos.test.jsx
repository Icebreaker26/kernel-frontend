import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import Desembolsos from './Desembolsos.jsx';

const orden = (extra = {}) => ({
  id: 'o-1', solicitud_id: 's-1', estado: 'pendiente', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', forma_pago: 'transferencia',
  monto: '4485000.00', banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111', titular_es_asociado: true,
  aprobada_at: '2026-09-24T15:00:00Z', aprobada_por_nombre: 'Rita Revisora', dias_espera: 2, ...extra,
});
const CUENTAS = [
  { id: 'c-banco', nombre: 'Bancolombia Operativa', tipo: 'banco', entidad: 'Bancolombia', numero: '0001' },
  { id: 'c-caja', nombre: 'Caja menor', tipo: 'caja' },
  { id: 'c-tarjeta', nombre: 'Tarjeta', tipo: 'tarjeta' },
];
let datos;
let user;
beforeEach(() => {
  user = userEvent.setup();
  datos = { pendiente: [orden(), orden({ id: 'o-2', radicado: 'CR-2026-000002', asociado_nombre: 'LUIS RUIZ', asociado_codigo: '52000222', forma_pago: 'efectivo', banco: null, numero_cuenta: null, titular_nombre: null })], pagada: [], anulada: [] };
  api.get.mockImplementation(async (url, op) => {
    if (url === '/tesoreria/cuentas') return { data: CUENTAS };
    if (url === '/tesoreria/desembolsos') return { data: datos[op.params.estado] };
    throw new Error(`GET inesperado ${url}`);
  });
  api.post.mockResolvedValue({ data: { ok: true } });
});
const tarjeta = (radicado) => screen.getByRole('article', { name: `Desembolso ${radicado}` });

describe('Tesorería — desembolsos por pagar', () => {
  test('pide las órdenes pendientes y muestra una tarjeta por crédito con monto, asociado, cuenta y titular', async () => {
    render(<Desembolsos />);
    const t = within(await waitFor(() => tarjeta('CR-2026-000001')));
    expect(api.get).toHaveBeenCalledWith('/tesoreria/desembolsos', { params: { estado: 'pendiente' } });
    expect(t.getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(t.getAllByText('ANA GÓMEZ', { selector: 'span.font-bold' })).toHaveLength(2);   // asociado y titular
    expect(t.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
    expect(t.getByText(/Aprobado por Rita Revisora/)).toHaveTextContent(/espera 2 día\(s\)/);
  });

  test('las órdenes en efectivo o cheque no llevan cuenta', async () => {
    render(<Desembolsos />);
    const t = within(await waitFor(() => tarjeta('CR-2026-000002')));
    expect(t.getByText(/MONTO A PAGAR EN EFECTIVO/)).toBeInTheDocument();
    expect(t.queryByTestId('numero-cuenta')).toBeNull();
  });

  test('una cuenta de un tercero se marca en rojo', async () => {
    datos.pendiente = [orden({ titular_nombre: 'LUIS RUIZ', titular_documento: '52000222', titular_es_asociado: false })];
    render(<Desembolsos />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/TITULAR DISTINTO AL ASOCIADO/);
  });

  test('sin órdenes lo dice', async () => {
    datos.pendiente = [];
    render(<Desembolsos />);
    expect(await screen.findByText('No hay desembolsos por pagar.')).toBeInTheDocument();
  });

  test('sin permiso o con un error avisa', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 403 } });
    render(<Desembolsos />);
    expect(await screen.findByText('No tienes permiso para ver los desembolsos.')).toBeInTheDocument();
  });

  test('las pestañas piden pagados y devueltos, con cómo se pagó o por qué se devolvió', async () => {
    datos.pagada = [orden({ id: 'o-9', estado: 'pagada', radicado: 'CR-2026-000009', fecha_pago: '2026-09-24T00:00:00.000Z', cuenta_origen_nombre: 'Bancolombia Operativa', referencia_pago: 'TRF-77', pagada_por_nombre: 'Tania Tesorera' })];
    datos.anulada = [orden({ id: 'o-8', estado: 'anulada', radicado: 'CR-2026-000008', anulada_motivo: 'El banco rechazó la cuenta' })];
    render(<Desembolsos />);
    await screen.findByLabelText('Desembolso CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /PAGADOS/ }));
    const pagado = within(await screen.findByLabelText('Desembolso CR-2026-000009'));
    expect(pagado.getByText(/Pagado el/)).toHaveTextContent(/desde Bancolombia Operativa · referencia TRF-77 · por Tania Tesorera/);
    expect(pagado.queryByRole('button', { name: 'PAGAR' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /DEVUELTOS/ }));
    expect(await screen.findByText(/Devuelto a Control Interno: El banco rechazó la cuenta/)).toBeInTheDocument();
  });
});

describe('Tesorería — pagar', () => {
  const abrir = async (radicado = 'CR-2026-000001') => {
    render(<Desembolsos />);
    await user.click(within(await waitFor(() => tarjeta(radicado))).getByRole('button', { name: 'PAGAR' }));
    return screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' });
  };

  test('el formulario repite a quién, cuánto y a dónde antes de pagar', async () => {
    const m = within(await abrir());
    expect(m.getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(m.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
    expect(m.getByText(/Confirmo que hice el pago de/)).toHaveTextContent('$4.485.000 a ANA GÓMEZ · Bancolombia ahorros 1234 5678 901');
  });

  test('una transferencia solo ofrece cuentas bancarias de la cooperativa', async () => {
    const m = within(await abrir());
    const opciones = within(m.getByLabelText(/CUENTA DE LA COOPERATIVA/)).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['— elige —', 'Bancolombia Operativa · Bancolombia · 0001']);
  });

  test('en efectivo ofrece también las cajas, nunca tarjetas', async () => {
    const m = within(await abrir('CR-2026-000002'));
    const opciones = within(m.getByLabelText(/CUENTA DE LA COOPERATIVA/)).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['— elige —', 'Bancolombia Operativa · Bancolombia · 0001', 'Caja menor']);
  });

  test('no se puede registrar sin cuenta, referencia y la confirmación', async () => {
    const m = within(await abrir());
    const boton = m.getByRole('button', { name: 'REGISTRAR PAGO' });
    expect(boton).toBeDisabled();
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), 'c-banco');
    await user.type(m.getByLabelText(/REFERENCIA/), 'TR');
    await user.click(m.getByRole('checkbox'));
    expect(boton).toBeDisabled();   // referencia demasiado corta
    await user.type(m.getByLabelText(/REFERENCIA/), 'F-1');
    expect(boton).toBeEnabled();
    await user.click(m.getByRole('checkbox'));
    expect(boton).toBeDisabled();   // sin confirmar
  });

  test('registra el pago con cuenta, referencia y fecha; recarga la lista', async () => {
    const m = within(await abrir());
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), 'c-banco');
    await user.type(m.getByLabelText(/REFERENCIA/), '  TRF-000123 ');
    await user.click(m.getByRole('checkbox'));
    datos.pendiente = [datos.pendiente[1]];
    await user.click(m.getByRole('button', { name: 'REGISTRAR PAGO' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tesoreria/desembolsos/o-1/pagar', {
      cuenta_origen_id: 'c-banco', referencia: 'TRF-000123', fecha_pago: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
    expect(toast.success).toHaveBeenCalledWith('Pago registrado');
    await waitFor(() => expect(screen.queryByLabelText('Desembolso CR-2026-000001')).toBeNull());
    expect(screen.queryByRole('dialog', { name: 'REGISTRAR EL PAGO' })).toBeNull();
  });

  test('si el servidor rechaza el pago muestra su mensaje y deja el formulario abierto', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'No puedes pagar un desembolso que tú mismo aprobaste en Control Interno' } } });
    const m = within(await abrir());
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), 'c-banco');
    await user.type(m.getByLabelText(/REFERENCIA/), 'TRF-1');
    await user.click(m.getByRole('checkbox'));
    await user.click(m.getByRole('button', { name: 'REGISTRAR PAGO' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No puedes pagar un desembolso que tú mismo aprobaste en Control Interno'));
    expect(screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' })).toBeInTheDocument();
  });

  test('cancelar cierra sin pagar', async () => {
    const m = within(await abrir());
    await user.click(m.getByRole('button', { name: 'CANCELAR' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('Tesorería — no se puede pagar', () => {
  const abrir = async () => {
    render(<Desembolsos />);
    await user.click(within(await waitFor(() => tarjeta('CR-2026-000001'))).getByRole('button', { name: /NO SE PUEDE PAGAR/ }));
    return within(screen.getByRole('dialog', { name: /NO SE PUEDE PAGAR/ }));
  };

  test('exige el motivo y devuelve la orden a Control Interno', async () => {
    const m = await abrir();
    const boton = m.getByRole('button', { name: 'DEVOLVER' });
    expect(boton).toBeDisabled();
    await user.type(m.getByLabelText(/POR QUÉ NO SE PUEDE PAGAR/), ' El banco rechazó la cuenta ');
    datos.pendiente = [datos.pendiente[1]];
    await user.click(boton);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tesoreria/desembolsos/o-1/devolver', { motivo: 'El banco rechazó la cuenta' }));
    expect(toast.success).toHaveBeenCalledWith('Devuelto a Control Interno');
    await waitFor(() => expect(screen.queryByLabelText('Desembolso CR-2026-000001')).toBeNull());
  });

  test('muestra la orden que se devuelve para no equivocarse de crédito', async () => {
    const m = await abrir();
    expect(m.getByText(/CR-2026-000001/)).toHaveTextContent('$4.485.000 a ANA GÓMEZ');
  });
});
