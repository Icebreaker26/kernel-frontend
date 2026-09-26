import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
const auth = vi.hoisted(() => ({ user: { rol: 'admin' } }));
vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: auth.user }) }));

import TabFlexible from './TabFlexible.jsx';

const F = (extra = {}) => ({ id: 'f1', estado: 'recibida', created_at: '2026-09-25T18:00:00Z', solicitada_por_nombre: 'Admin', nombre_archivo: 'FLEXIBLE - 2026-09-25 18.30.csv',
  filas: 2029, tamano_bytes: 3_200_000, tiene_archivo: true, recibida_at: '2026-09-25T18:31:00Z', ...extra });
const ANALISIS = { total_csv: 2029, validos: 2029, errores_formato: 0, impacto: { nuevos: 12, actualizados: 2000, retirados: 8, activos_actuales: 2025 }, advertencias: [] };

let lista; let analisis;
const preparar = (l, a = ANALISIS) => {
  lista = l; analisis = a;
  api.get.mockImplementation(async (url) => {
    if (url === '/rpa/flexibles') return { data: lista };
    if (url.endsWith('/analisis')) return { data: analisis };
    throw new Error(`GET no simulado: ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
};
const abrirRevision = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /REVISAR Y APROBAR/ }));
  const dialogo = await screen.findByRole('dialog');
  await within(dialogo).findByTestId('impacto-nuevos');
  return dialogo;
};

beforeEach(() => {
  api.get.mockReset(); api.post.mockReset(); toast.error.mockReset(); toast.success.mockReset();
  window.confirm = vi.fn(() => true);
  auth.user = { rol: 'admin' };
});

describe('TabFlexible', () => {
  test('un usuario que no es admin no ve el botón de pedir ni el de cancelar (el servidor también lo rechaza)', async () => {
    auth.user = { rol: 'asesor' };
    preparar([F({ estado: 'solicitada', nombre_archivo: null, filas: null, tiene_archivo: false })]);
    render(<TabFlexible />);
    expect(await screen.findByTestId('solo-admin')).toBeInTheDocument();
    expect(screen.queryByTestId('pedir-flexible')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CANCELAR' })).not.toBeInTheDocument();
  });

  test('sin exportaciones lo dice y se puede pedir el flexible', async () => {
    preparar([]);
    render(<TabFlexible />);
    expect(await screen.findByText(/Todavía no se ha pedido/)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('pedir-flexible'));
    expect(api.post).toHaveBeenCalledWith('/rpa/flexibles');
    expect(toast.success).toHaveBeenCalled();
  });

  test('mientras hay una exportación en curso no se puede pedir otra, y se puede cancelar si el agente no empezó', async () => {
    preparar([F({ estado: 'solicitada', nombre_archivo: null, filas: null, tiene_archivo: false })]);
    render(<TabFlexible />);
    expect(await screen.findByTestId('estado-flexible')).toHaveAttribute('data-estado', 'solicitada');
    expect(screen.getByTestId('pedir-flexible')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
    expect(api.post).toHaveBeenCalledWith('/rpa/flexibles/f1/cancelar');
  });

  test('una exportación recibida muestra el análisis de impacto antes de aprobar', async () => {
    preparar([F()]);
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    expect(within(dialogo).getByTestId('impacto-nuevos')).toHaveTextContent('12');
    expect(within(dialogo).getByTestId('impacto-actualizados')).toHaveTextContent(/2\.?000/);
    expect(within(dialogo).getByTestId('impacto-retirados')).toHaveTextContent('8');
    expect(api.get).toHaveBeenCalledWith('/rpa/flexibles/f1/analisis');
  });

  test('si el archivo trae punto decimal lo avisa (se convirtió automáticamente)', async () => {
    preparar([F()], { ...ANALISIS, formato_numerico: 'punto_decimal' });
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    expect(within(dialogo).getByTestId('formato-numerico')).toHaveTextContent(/punto decimal.*convirtieron/);
  });

  test('aprobar pide confirmación con el resumen; si se cancela no aplica nada', async () => {
    preparar([F()]);
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    window.confirm = vi.fn(() => false);
    await userEvent.click(within(dialogo).getByTestId('aplicar-flexible'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/12 nuevos.*actualizados.*8 retirados/s));
    expect(api.post).not.toHaveBeenCalledWith('/rpa/flexibles/f1/aplicar');
  });

  test('confirmado, aplica y avisa con los números', async () => {
    preparar([F()]);
    api.post.mockResolvedValue({ data: { aplicada: true, nuevos: 12, actualizados: 2000, retirados: 8 } });
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    await userEvent.click(within(dialogo).getByTestId('aplicar-flexible'));
    expect(api.post).toHaveBeenCalledWith('/rpa/flexibles/f1/aplicar');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/12 nuevos/)));
  });

  test('si el sistema rechaza el archivo (guardas de retiros) muestra el motivo y no lo da por aplicado', async () => {
    preparar([F()]);
    api.post.mockRejectedValue({ response: { status: 422, data: { error: 'Este sync retiraría 900 asociados (44 %). El límite de seguridad es 20 %.' } } });
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    await userEvent.click(within(dialogo).getByTestId('aplicar-flexible'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/retiraría 900/)));
    expect(toast.success).not.toHaveBeenCalled();
  });

  test('una advertencia bloqueante del análisis se muestra en rojo', async () => {
    preparar([F()], { ...ANALISIS, impacto: { ...ANALISIS.impacto, retirados: 900 },
      advertencias: [{ tipo: 'retiros_excesivos', mensaje: 'Este sync retiraría 900 asociados (44 % del padrón).', bloqueante: true }] });
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    expect(within(dialogo).getByRole('alert')).toHaveTextContent(/retiraría 900.*no lo dejará aplicar/);
  });

  test('rechazar exige un motivo de al menos 5 caracteres', async () => {
    preparar([F()]);
    render(<TabFlexible />);
    const dialogo = await abrirRevision();
    await userEvent.click(within(dialogo).getByRole('button', { name: /RECHAZAR/ }));
    const confirmar = within(dialogo).getByRole('button', { name: 'CONFIRMAR RECHAZO' });
    expect(confirmar).toBeDisabled();
    await userEvent.type(within(dialogo).getByLabelText('MOTIVO DEL RECHAZO'), 'Archivo de otra fecha');
    await userEvent.click(confirmar);
    expect(api.post).toHaveBeenCalledWith('/rpa/flexibles/f1/rechazar', { nota: 'Archivo de otra fecha' });
  });

  test('se ve el resultado de las aplicadas, el error de las fallidas y el motivo de las rechazadas', async () => {
    preparar([
      F({ id: 'a', estado: 'aplicada', revisada_por_nombre: 'Admin', revisada_at: '2026-09-25T19:00:00Z', resultado: { nuevos: 3, actualizados: 2000, retirados: 1 } }),
      F({ id: 'b', estado: 'fallida', error: 'Excel no abrió el archivo', nombre_archivo: null, filas: null, tiene_archivo: false }),
      F({ id: 'c', estado: 'rechazada', nota: 'Era de ayer', revisada_por_nombre: 'Admin' }),
    ]);
    render(<TabFlexible />);
    expect(await screen.findByText(/3 nuevos, .*actualizados, 1 retirados/)).toBeInTheDocument();
    expect(screen.getByText('Excel no abrió el archivo')).toBeInTheDocument();
    expect(screen.getByText(/Rechazada por Admin: Era de ayer/)).toBeInTheDocument();
    expect(screen.getAllByTestId('estado-flexible').map((e) => e.dataset.estado)).toEqual(['aplicada', 'fallida', 'rechazada']);
  });
});
