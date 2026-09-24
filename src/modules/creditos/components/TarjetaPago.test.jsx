import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import TarjetaPago from './TarjetaPago.jsx';

const ASOCIADO = { codigo: '1088000111', nombre: 'ANA GÓMEZ' };
const CUENTA = { banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111', titular_es_asociado: true };
let user;
let portapapeles;
beforeEach(() => {
  user = userEvent.setup();
  portapapeles = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: portapapeles }, configurable: true });
});

describe('Tarjeta de pago', () => {
  test('transferencia: muestra monto, asociado con cédula, banco, tipo, número separado en grupos y titular', () => {
    render(<TarjetaPago asociado={ASOCIADO} monto={4485000} forma="transferencia" cuenta={CUENTA} />);
    expect(screen.getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(screen.getByText('MONTO A TRANSFERIR')).toBeInTheDocument();
    const region = screen.getByLabelText('Datos del pago');
    expect(region).toHaveTextContent('ANA GÓMEZ');
    expect(region).toHaveTextContent('C.C. 1088000111');
    expect(region).toHaveTextContent('Bancolombia');
    expect(region).toHaveTextContent('Ahorros');
    expect(screen.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
    expect(region).toHaveTextContent('Transferencia bancaria');
  });

  test('cuenta a nombre del asociado: lo confirma en verde y no alerta', () => {
    render(<TarjetaPago asociado={ASOCIADO} monto={1000} forma="transferencia" cuenta={CUENTA} />);
    expect(screen.getByText(/La cuenta está a nombre del asociado/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('titular distinto al asociado: alerta clara en rojo', () => {
    render(<TarjetaPago asociado={ASOCIADO} monto={1000} forma="transferencia" cuenta={{ ...CUENTA, titular_nombre: 'LUIS RUIZ', titular_documento: '52000222', titular_es_asociado: false }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/TITULAR DISTINTO AL ASOCIADO/);
    expect(screen.getByLabelText('Datos del pago')).toHaveTextContent('LUIS RUIZ');
    expect(screen.queryByText(/La cuenta está a nombre del asociado/)).toBeNull();
  });

  test('copia el número de cuenta sin espacios y lo confirma', async () => {
    render(<TarjetaPago asociado={ASOCIADO} monto={1000} forma="transferencia" cuenta={CUENTA} />);
    await user.click(screen.getByRole('button', { name: 'Copiar número de cuenta' }));
    expect(portapapeles).toHaveBeenCalledWith('12345678901');
    expect(await screen.findByText('COPIADO')).toBeInTheDocument();
  });

  test('si no se puede copiar avisa', async () => {
    portapapeles.mockRejectedValue(new Error('denegado'));
    render(<TarjetaPago asociado={ASOCIADO} monto={1000} forma="transferencia" cuenta={CUENTA} />);
    await user.click(screen.getByRole('button', { name: 'Copiar número de cuenta' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo copiar'));
  });

  test.each([['efectivo', 'Efectivo / ventanilla', 'EFECTIVO'], ['cheque', 'Cheque', 'CHEQUE']])('%s: sin cuenta, dice a nombre de quién', (forma, etiqueta, rotulo) => {
    render(<TarjetaPago asociado={ASOCIADO} monto={2500000} forma={forma} cuenta={null} />);
    expect(screen.getByText(new RegExp(`MONTO A PAGAR EN ${rotulo}`))).toBeInTheDocument();
    expect(screen.getByText('A NOMBRE DE')).toBeInTheDocument();
    expect(screen.getByLabelText('Datos del pago')).toHaveTextContent(etiqueta);
    expect(screen.queryByTestId('numero-cuenta')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copiar número de cuenta' })).toBeNull();
  });
});
