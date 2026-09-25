import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => { const t = vi.fn(); t.error = vi.fn(); t.success = vi.fn(); return t; });
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../components/GeometricBackground.jsx', () => ({ default: () => null }));

import SolicitudesPage from './SolicitudesPage.jsx';
import EmpresasPage from './EmpresasPage.jsx';
import CreditosLayout from '../components/CreditosLayout.jsx';
import CarteraLayout from '../../cartera/components/CarteraLayout.jsx';

const fila = (extra = {}) => ({
  id: 's1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión',
  monto_desembolso: '5000000', estado: 'en_tramite', created_at: '2026-09-20T10:00:00Z', entregada_at: null, asesor_nombre: 'Luis Pérez', dias: 2,
  a_firmar: 1, firmados: 0, firma_completa: false, autorizacion_requerida: true, autorizacion_estado: null, autorizacion_ok: false, documentos_ok: false, expediente_completo: false, ...extra,
});
const enRuta = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
let user;
beforeEach(() => { user = userEvent.setup(); });
const ultimaLlamada = (url) => api.get.mock.calls.filter(([u]) => u === url).at(-1);

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Lista de solicitudes de crédito', () => {
  beforeEach(() => { api.get.mockResolvedValue({ data: [fila(), fila({ id: 's2', radicado: 'CR-2026-000002', asociado_nombre: 'LUIS RUIZ' })] }); });

  test('carga las solicitudes del asesor y las muestra con enlace al expediente', async () => {
    enRuta(<SolicitudesPage />);
    expect(await screen.findByRole('link', { name: 'CR-2026-000001' })).toHaveAttribute('href', '/creditos/s1');
    expect(screen.getByRole('link', { name: 'CR-2026-000002' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/creditos', { params: {} });
    expect(screen.getByRole('link', { name: /NUEVA SOLICITUD/ })).toHaveAttribute('href', '/creditos/nueva');
  });

  test('filtra por estado desde el panel de filtros (todas las opciones) y lo manda al servidor', async () => {
    enRuta(<SolicitudesPage />);
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    const filtro = screen.getByLabelText('ESTADO');
    expect(within(filtro).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', 'EN TRÁMITE', 'ENTREGADA A CARTERA', 'RECIBIDA POR CARTERA', 'COMPLETADA · EN CONTROL INTERNO', 'APROBADA · EN TESORERÍA', 'PAGADA', 'DEVUELTA', 'RECHAZADA', 'DESISTIDA']);
    await user.selectOptions(filtro, 'devuelta');
    await waitFor(() => expect(ultimaLlamada('/creditos')[1].params.estado).toBe('devuelta'));
  });

  test('busca por texto sin saturar el servidor (espera a que termine de escribir)', async () => {
    enRuta(<SolicitudesPage />);
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    api.get.mockClear();
    await user.type(screen.getByLabelText('Buscar solicitudes'), 'CR-2026');
    await waitFor(() => expect(ultimaLlamada('/creditos')[1].params.q).toBe('CR-2026'));
    expect(api.get.mock.calls.length).toBeLessThan(4);   // no una petición por cada letra
  });

  test('"ver las de todos los asesores" pide todas y agrega la columna del asesor', async () => {
    enRuta(<SolicitudesPage />);
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    expect(screen.queryByText('ASESOR')).toBeNull();
    await user.click(screen.getByRole('button', { name: /TODOS LOS ASESORES/ }));
    await waitFor(() => expect(ultimaLlamada('/creditos')[1].params.todas).toBe(1));
    expect(await screen.findByText('ASESOR')).toBeInTheDocument();
  });

  test('sin resultados muestra el mensaje', async () => {
    api.get.mockResolvedValue({ data: [] });
    enRuta(<SolicitudesPage />);
    expect(await screen.findByText('Aún no hay solicitudes con esos filtros')).toBeInTheDocument();
  });

  test('sin permiso o con un error avisa', async () => {
    api.get.mockImplementation(async (url) => { if (url === '/creditos') throw { response: { status: 403 } }; return { data: [] }; });
    const { unmount } = enRuta(<SolicitudesPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No tienes permiso para ver los créditos'));
    unmount();
    api.get.mockImplementation(async (url) => { if (url === '/creditos') throw { response: { status: 500, data: { error: 'Base de datos no disponible' } } }; return { data: [] }; });
    enRuta(<SolicitudesPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Base de datos no disponible'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Configuración de empresas', () => {
  const empresa = (extra = {}) => ({ codigo: 'E1', nombre: 'Empresa Uno SA', contacto_email: 'rrhh@empresa.com', configurada: false, requiere_autorizacion: true, momento_autorizacion: 'indiferente', emails_autorizacion: [], ...extra });
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [empresa(), empresa({ codigo: 'E2', nombre: 'Empresa Dos SA', contacto_email: null, configurada: true, requiere_autorizacion: false, emails_autorizacion: ['n@e2.com'] })] });
    api.put.mockImplementation(async (url, body) => ({ data: { empresa_codigo: 'E1', ...body } }));
  });
  const fila1 = () => screen.getByText('Empresa Uno SA').closest('tr');

  test('lista las empresas y marca las que no están configuradas', async () => {
    enRuta(<EmpresasPage />);
    expect(await screen.findByText('Empresa Uno SA')).toBeInTheDocument();
    expect(screen.getByText(/E1 · sin configurar \(exige autorización\)/)).toBeInTheDocument();
    expect(screen.queryByText(/E2 · sin configurar/)).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/creditos/config/empresas', { params: { q: undefined } });
  });

  test('explica el criterio por defecto', async () => {
    enRuta(<EmpresasPage />);
    expect(await screen.findByText(/Una empresa sin configurar se trata como/)).toBeInTheDocument();
  });

  test('busca por nombre', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    await user.type(screen.getByLabelText('Buscar empresa'), 'Dos');
    await waitFor(() => expect(ultimaLlamada('/creditos/config/empresas')[1].params.q).toBe('Dos'));
  });

  test('sugiere el contacto general como marcador, y sin contacto muestra "sin correo"', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    expect(within(fila1()).getByPlaceholderText('(contacto general: rrhh@empresa.com)')).toBeInTheDocument();
    expect(within(screen.getByText('Empresa Dos SA').closest('tr')).getByDisplayValue('n@e2.com')).toBeInTheDocument();
  });

  test('una empresa que no exige autorización tiene deshabilitados el momento y los correos', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Dos SA');
    const dos = screen.getByText('Empresa Dos SA').closest('tr');
    expect(within(dos).getByRole('combobox')).toBeDisabled();
    expect(within(dos).getByDisplayValue('n@e2.com')).toBeDisabled();
    await user.click(within(dos).getByRole('checkbox'));
    expect(within(dos).getByRole('combobox')).toBeEnabled();
  });

  test('el momento ofrece las tres opciones', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    expect(within(within(fila1()).getByRole('combobox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Al radicar', 'Al radicar (antes de la firma)', 'Cuando la firma quede completa']);
  });

  test('una empresa sin configurar deja guardar de inmediato; una configurada, solo si hay cambios', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    expect(within(fila1()).getByRole('button', { name: 'GUARDAR' })).toBeEnabled();
    const dos = screen.getByText('Empresa Dos SA').closest('tr');
    expect(within(dos).getByRole('button', { name: 'GUARDAR' })).toBeDisabled();
    await user.click(within(dos).getByRole('checkbox'));
    expect(within(dos).getByRole('button', { name: 'GUARDAR' })).toBeEnabled();
  });

  test('guarda la política con los correos normalizados', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    await user.selectOptions(within(fila1()).getByRole('combobox'), 'despues_firma');
    await user.type(within(fila1()).getByPlaceholderText(/contacto general/), ' Nomina@Empresa.com ; rrhh@empresa.com ');
    await user.click(within(fila1()).getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/creditos/config/empresas/E1', {
      requiere_autorizacion: true, momento_autorizacion: 'despues_firma', emails_autorizacion: ['nomina@empresa.com', 'rrhh@empresa.com'],
    }));
    expect(toast.success).toHaveBeenCalledWith('Empresa Uno SA: guardado');
    await waitFor(() => expect(within(fila1()).queryByText(/sin configurar/)).toBeNull());   // ya quedó configurada
  });

  test('un correo inválido no se envía', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    await user.type(within(fila1()).getByPlaceholderText(/contacto general/), 'no-es-correo');
    await user.click(within(fila1()).getByRole('button', { name: 'GUARDAR' }));
    expect(toast.error).toHaveBeenCalledWith('Hay un correo inválido');
    expect(api.put).not.toHaveBeenCalled();
  });

  test('desmarcar "exige" se guarda como una empresa que no pide autorización', async () => {
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    await user.click(within(fila1()).getByRole('checkbox'));
    await user.click(within(fila1()).getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/creditos/config/empresas/E1', expect.objectContaining({ requiere_autorizacion: false })));
  });

  test('si el servidor rechaza, muestra su mensaje', async () => {
    api.put.mockRejectedValueOnce({ response: { data: { error: 'Empresa no encontrada' } } });
    enRuta(<EmpresasPage />);
    await screen.findByText('Empresa Uno SA');
    await user.click(within(fila1()).getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Empresa no encontrada'));
  });

  test('sin el permiso CONFIGURAR muestra el aviso en vez de la tabla', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    enRuta(<EmpresasPage />);
    expect(await screen.findByText(/Necesitas el permiso CONFIGURAR del módulo Créditos/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Encabezados de los módulos', () => {
  test('Créditos tiene su navegación (solicitudes, nueva, empresas) y vuelve al selector', () => {
    enRuta(<CreditosLayout />);
    expect(screen.getByRole('heading', { name: 'CRÉDITOS' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SOLICITUDES' })).toHaveAttribute('href', '/creditos');
    expect(screen.getByRole('link', { name: 'NUEVA' })).toHaveAttribute('href', '/creditos/nueva');
    expect(screen.getByRole('link', { name: 'EMPRESAS' })).toHaveAttribute('href', '/creditos/empresas');
    expect(screen.getByRole('button', { name: 'Volver al selector' })).toBeInTheDocument();
  });

  test('Cartera tiene su título y vuelve al selector', () => {
    enRuta(<CarteraLayout />);
    expect(screen.getByRole('heading', { name: 'CARTERA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al selector' })).toBeInTheDocument();
  });

  test('Cartera tiene su navegación (bandeja y reportes)', () => {
    enRuta(<CarteraLayout />);
    expect(screen.getByRole('link', { name: 'BANDEJA' })).toHaveAttribute('href', '/cartera');
    expect(screen.getByRole('link', { name: 'REPORTES DEL MES' })).toHaveAttribute('href', '/cartera/reportes');
  });
});
