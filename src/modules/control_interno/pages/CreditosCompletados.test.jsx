import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import CreditosCompletados from './CreditosCompletados.jsx';

const F1 = {
  id: 'id-1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', valor_solicitado: '5000000.00', monto_desembolso: '4485000.00',
  forma_desembolso: 'transferencia', con_aval: true, aval_porcentaje: '10.00', aval_valor: '500000.00', modalidad_firma: 'externa', firma_electronica_valor: '15000.00', desembolso_neto: '4485000.00', completada_at: '2026-09-24T15:00:00Z',
};
const F2 = { ...F1, id: 'id-2', radicado: 'CR-2026-000002', con_aval: false, aval_porcentaje: null, aval_valor: '0.00', modalidad_firma: 'presencial', forma_desembolso: 'cheque', firma_electronica_valor: '0.00', desembolso_neto: '5000000.00' };
let user;
beforeEach(() => {
  user = userEvent.setup();
  api.get.mockResolvedValue({ data: [F1, F2] });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Control Interno — créditos completados', () => {
  test('lista los créditos que Cartera completó, con aval, firma y desembolso', async () => {
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    const fila1 = (await screen.findByText('CR-2026-000001')).closest('tr');
    expect(api.get).toHaveBeenCalledWith('/control_interno/creditos');
    expect(fila1).toHaveTextContent('ANA GÓMEZ');
    expect(fila1).toHaveTextContent('C.C. 1088000111');
    expect(fila1).toHaveTextContent('10% · $500.000');
    expect(fila1).toHaveTextContent('$15.000');
    expect(fila1).toHaveTextContent('$4.485.000');
  });

  test('sin aval ni firma externa muestra guiones', async () => {
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    const fila2 = (await screen.findByText('CR-2026-000002')).closest('tr');
    expect(fila2.querySelectorAll('td')[4]).toHaveTextContent('—');
    expect(fila2.querySelectorAll('td')[5]).toHaveTextContent('—');
    expect(fila2).toHaveTextContent('$5.000.000');
  });

  test('cada crédito tiene un enlace para revisarlo y muestra la forma de pago', async () => {
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    await screen.findByText('CR-2026-000001');
    const enlaces = screen.getAllByRole('link', { name: 'REVISAR' });
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/control-interno/creditos/id-1', '/control-interno/creditos/id-2']);
    expect(screen.getByText('Transferencia bancaria')).toBeInTheDocument();
    expect(screen.getByText('Cheque')).toBeInTheDocument();
  });

  test('sin créditos lo dice', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    expect(await screen.findByText('No hay créditos pendientes de validación.')).toBeInTheDocument();
  });

  test('sin permiso o con un error avisa', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 403 } });
    const { unmount } = render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    expect(await screen.findByText('No tienes permiso para ver esta bandeja.')).toBeInTheDocument();
    unmount();
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    expect(await screen.findByText('No se pudo cargar la bandeja.')).toBeInTheDocument();
  });

  test('actualizar vuelve a pedir la lista', async () => {
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    await screen.findByText('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  test('descarga el PDF final del crédito elegido', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.get.mockImplementation(async (url) => (url.endsWith('/pdf-final') ? { data: new Blob(['%PDF']) } : { data: [F1, F2] }));
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Descargar PDF final CR-2026-000002' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/control_interno/creditos/id-2/pdf-final', { responseType: 'blob' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(clic.mock.instances[0].download).toBe('credito_CR-2026-000002.pdf');
    clic.mockRestore();
  });

  test('si no se puede armar el PDF muestra el mensaje del servidor', async () => {
    api.get.mockImplementation(async (url) => {
      if (url.endsWith('/pdf-final')) throw { response: { data: new Blob([JSON.stringify({ error: 'Falta el Formato estudio de crédito firmado' })]) } };
      return { data: [F1] };
    });
    render(<MemoryRouter><CreditosCompletados /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /Descargar PDF final/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falta el Formato estudio de crédito firmado'));
  });
});
