import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import DocumentosAsociado from './DocumentosAsociado.jsx';

const d = (extra = {}) => ({
  id: 'x1', clase: 'firmado', tipo: 'pagare', nombre: 'pagare_firmado.pdf', archivo_id: 'arch-1', vigente: true, created_at: '2026-09-22T15:30:00Z', folio: 'folio-1',
  solicitud_id: 's1', radicado: 'CR-2026-000123', solicitud_estado: 'entregada', size_bytes: 20480, mime_type: 'application/pdf', subido_por_nombre: 'Luis Pérez', ...extra,
});
let user;
beforeEach(() => { user = userEvent.setup(); window.open = vi.fn(); });

describe('Pestaña Documentos del asociado', () => {
  test('pide los documentos del asociado y muestra un indicador mientras carga', async () => {
    let liberar;
    api.get.mockReturnValue(new Promise((res) => { liberar = () => res({ data: [] }); }));
    const { container } = render(<DocumentosAsociado codigo="1088000111" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/creditos/asociados/1088000111/documentos');
    liberar();
    await screen.findByText(/aún no tiene documentos de crédito/);
  });

  test('codifica la cédula en la ruta', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<DocumentosAsociado codigo="A/B 1" />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/creditos/asociados/A%2FB%201/documentos'));
  });

  test('agrupa por solicitud, con radicado y estado', async () => {
    api.get.mockResolvedValue({ data: [
      d(), d({ id: 'x2', clase: 'adjunto', tipo: 'desprendible_nomina', nombre: 'desprendible.pdf', archivo_id: 'arch-2' }),
      d({ id: 'y1', solicitud_id: 's2', radicado: 'CR-2026-000090', solicitud_estado: 'en_tramite', nombre: 'carta.pdf', tipo: 'carta_instrucciones', archivo_id: 'arch-3', clase: 'a_firmar' }),
    ] });
    render(<DocumentosAsociado codigo="1" />);
    const grupos = await screen.findAllByRole('heading', { level: 3 });
    expect(grupos.map((g) => g.textContent).sort()).toEqual(['CR-2026-000090', 'CR-2026-000123']);
    const g1 = screen.getByRole('heading', { name: 'CR-2026-000123' }).closest('section');
    expect(within(g1).getAllByRole('listitem')).toHaveLength(2);
    expect(within(g1).getByText('ENTREGADA A CARTERA')).toBeInTheDocument();
    const g2 = screen.getByRole('heading', { name: 'CR-2026-000090' }).closest('section');
    expect(within(g2).getByText('EN TRÁMITE')).toBeInTheDocument();
  });

  test('la solicitud con el documento más reciente aparece primero', async () => {
    api.get.mockResolvedValue({ data: [
      d({ id: 'a', solicitud_id: 'viejo', radicado: 'CR-VIEJO', created_at: '2026-09-01T10:00:00Z', archivo_id: 'a1' }),
      d({ id: 'b', solicitud_id: 'nuevo', radicado: 'CR-NUEVO', created_at: '2026-09-23T10:00:00Z', archivo_id: 'a2' }),
    ] });
    render(<DocumentosAsociado codigo="1" />);
    const grupos = await screen.findAllByRole('heading', { level: 3 });
    expect(grupos.map((g) => g.textContent)).toEqual(['CR-NUEVO', 'CR-VIEJO']);
  });

  test.each([
    [{ clase: 'firmado', tipo: 'pagare' }, 'Pagaré · Documento firmado'],
    [{ clase: 'a_firmar', tipo: 'libranza' }, 'Libranza · Documento a firmar (sin firmar)'],
    [{ clase: 'evidencia_externa', tipo: 'solicitud_credito' }, 'Solicitud · Evidencia de la firma externa'],
    [{ clase: 'adjunto', tipo: 'desprendible_nomina' }, 'Desprendible de nómina · Documento del asociado'],
    [{ clase: 'autorizacion', tipo: 'soporte' }, 'Autorización de la empresa'],
  ])('etiqueta legible para %j', async (extra, etiqueta) => {
    api.get.mockResolvedValue({ data: [d(extra)] });
    render(<DocumentosAsociado codigo="1" />);
    expect(await screen.findByText(new RegExp(`^${etiqueta.replace(/[()]/g, '\\$&')}`))).toBeInTheDocument();
  });

  test('cada archivo muestra nombre, tamaño, fecha y quién lo subió', async () => {
    api.get.mockResolvedValue({ data: [d()] });
    render(<DocumentosAsociado codigo="1" />);
    const linea = await screen.findByText(/pagare_firmado\.pdf/);
    expect(linea).toHaveTextContent('20 KB');
    expect(linea).toHaveTextContent('Luis Pérez');
    expect(linea).toHaveTextContent(/22/);
  });

  test('los tamaños se muestran en KB o MB', async () => {
    api.get.mockResolvedValue({ data: [d({ size_bytes: 3 * 1048576, archivo_id: 'a' }), d({ id: 'x9', size_bytes: 100, archivo_id: 'b', nombre: 'chico.pdf' }), d({ id: 'x8', size_bytes: null, archivo_id: 'c', nombre: 'sin_tamano.pdf' })] });
    render(<DocumentosAsociado codigo="1" />);
    expect(await screen.findByText(/3\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/chico\.pdf · 1 KB/)).toBeInTheDocument();
  });

  test('lo que perdió vigencia se ve atenuado y marcado', async () => {
    api.get.mockResolvedValue({ data: [d(), d({ id: 'x2', vigente: false, nombre: 'anterior.pdf', archivo_id: 'arch-2' })] });
    render(<DocumentosAsociado codigo="1" />);
    await screen.findByText(/pagare_firmado\.pdf/);
    expect(screen.getAllByText('SIN VIGENCIA')).toHaveLength(1);
    expect(screen.getByText(/anterior\.pdf/).closest('li')).toHaveClass('opacity-50');
    expect(screen.getByText(/pagare_firmado\.pdf/).closest('li')).not.toHaveClass('opacity-50');
  });

  test('el ojito abre el archivo por el enlace temporal en una pestaña nueva', async () => {
    api.get.mockImplementation(async (url) => (url.endsWith('/url') ? { data: { url: 'https://s3.example/x.pdf' } } : { data: [d()] }));
    render(<DocumentosAsociado codigo="1088000111" />);
    await user.click(await screen.findByRole('button', { name: 'Abrir pagare_firmado.pdf' }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('https://s3.example/x.pdf', '_blank', 'noopener,noreferrer'));
    expect(api.get).toHaveBeenCalledWith('/creditos/asociados/1088000111/documentos/arch-1/url');
  });

  test('si no se puede abrir, muestra el mensaje del servidor', async () => {
    api.get.mockImplementation(async (url) => { if (url.endsWith('/url')) throw { response: { data: { error: 'Archivo no encontrado' } } }; return { data: [d()] }; });
    render(<DocumentosAsociado codigo="1" />);
    await user.click(await screen.findByRole('button', { name: /Abrir/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Archivo no encontrado'));
    expect(window.open).not.toHaveBeenCalled();
  });

  test('advierte que las consultas quedan registradas', async () => {
    api.get.mockResolvedValue({ data: [d()] });
    render(<DocumentosAsociado codigo="1" />);
    expect(await screen.findByText(/Ley 1581/)).toHaveTextContent(/queda registrado en el historial de la solicitud/);
  });

  test('sin permiso explica qué permiso hace falta', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    render(<DocumentosAsociado codigo="1" />);
    expect(await screen.findByText(/Necesitas permiso de Créditos o de Cartera/)).toBeInTheDocument();
  });

  test('un error del servidor avisa', async () => {
    api.get.mockRejectedValue({ response: { status: 500 } });
    render(<DocumentosAsociado codigo="1" />);
    expect(await screen.findByText('No se pudieron cargar los documentos.')).toBeInTheDocument();
  });

  test('al cambiar de asociado vuelve a pedir los documentos', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { rerender } = render(<DocumentosAsociado codigo="111" />);
    await screen.findByText(/aún no tiene documentos/);
    rerender(<DocumentosAsociado codigo="222" />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/creditos/asociados/222/documentos'));
  });
});
