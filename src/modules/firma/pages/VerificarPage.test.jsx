import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../components/GeometricBackground.jsx', () => ({ default: () => null }));

import VerificarPage from './VerificarPage.jsx';
import FirmaLayout from '../components/FirmaLayout.jsx';

let user;
beforeEach(() => { user = userEvent.setup({ applyAccept: false }); });
const subir = (container, nombre = 'firmado.pdf') => user.upload(container.querySelector('input[type=file]'), new File(['%PDF-1.4'], nombre, { type: 'application/pdf' }));

describe('Verificar un PDF firmado', () => {
  test('envía el archivo al servidor como formulario y no lo guarda en pantalla', async () => {
    api.post.mockResolvedValue({ data: { valido: false, hash: 'a'.repeat(64) } });
    const { container } = render(<VerificarPage />);
    expect(screen.getByText(/el archivo no se guarda/)).toBeInTheDocument();
    await subir(container);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/firma/verificar', expect.any(FormData)));
    expect(api.post.mock.calls[0][1].get('archivo')).toBeInstanceOf(File);
    expect(api.post.mock.calls[0][1].get('archivo').name).toBe('firmado.pdf');
  });

  test('un documento reconocido muestra folio, fecha, funcionario y firmantes', async () => {
    api.post.mockResolvedValue({ data: {
      valido: true, hash: 'a'.repeat(64), folio: '3f6d1f0e-8a52-4c5e-9d0f-2b7d51f9c111', nombre_archivo: 'contrato.pdf', paginas: 3, fecha: '2026-09-24T15:00:00.000Z', empleado: 'Luis Pérez',
      firmantes: [{ nombre: 'Ana Gómez', tipo_doc: 'CC', num_doc: '1088000111', rol: 'asociado', con_huella: true }, { nombre: 'Luis Ruiz', tipo_doc: 'CC', num_doc: '79111222', rol: 'testigo', con_huella: false }],
    } });
    const { container } = render(<VerificarPage />);
    await subir(container);
    expect(await screen.findByText(/El documento coincide con el registro de Kernel/)).toBeInTheDocument();
    expect(screen.getByText('3f6d1f0e-8a52-4c5e-9d0f-2b7d51f9c111')).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf (3 pág.)')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText(/Ana Gómez · CC 1088000111 · asociado · con huella/)).toBeInTheDocument();
    expect(screen.getByText(/Luis Ruiz · CC 79111222 · testigo$/)).toBeInTheDocument();
  });

  test('un documento no reconocido explica por qué puede ser y muestra su huella', async () => {
    api.post.mockResolvedValue({ data: { valido: false, hash: 'b'.repeat(64) } });
    const { container } = render(<VerificarPage />);
    await subir(container);
    expect(await screen.findByText(/No se encontró este documento en el registro/)).toBeInTheDocument();
    expect(screen.getByText(/volver a guardarlo en otro programa cambia su huella/)).toBeInTheDocument();
    expect(screen.getByText(`SHA-256 ${'b'.repeat(64)}`)).toBeInTheDocument();
  });

  test('el resultado anterior desaparece al verificar otro archivo', async () => {
    api.post.mockResolvedValueOnce({ data: { valido: false, hash: 'a'.repeat(64) } });
    const { container } = render(<VerificarPage />);
    await subir(container, 'uno.pdf');
    await screen.findByText(/No se encontró este documento/);
    let liberar;
    api.post.mockReturnValueOnce(new Promise((res) => { liberar = () => res({ data: { valido: false, hash: 'c'.repeat(64) } }); }));
    await subir(container, 'dos.pdf');
    expect(screen.queryByText(/No se encontró este documento/)).toBeNull();   // mientras verifica no se muestra el anterior
    expect(screen.getByRole('button', { name: /VERIFICANDO…/ })).toBeDisabled();
    liberar();
    expect(await screen.findByText(`SHA-256 ${'c'.repeat(64)}`)).toBeInTheDocument();
  });

  test('si el servidor falla avisa con su mensaje', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'Adjunta el PDF a verificar' } } });
    const { container } = render(<VerificarPage />);
    await subir(container);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Adjunta el PDF a verificar'));
    expect(screen.queryByText(/coincide con el registro/)).toBeNull();
    api.post.mockRejectedValue(new Error('x'));
    await subir(container);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo verificar el archivo.'));
  });
});

describe('Encabezado de Firma electrónica', () => {
  test('tiene las dos pestañas (firmar y verificar) y vuelve al selector', () => {
    render(<MemoryRouter><FirmaLayout /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'FIRMA ELECTRÓNICA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FIRMAR' })).toHaveAttribute('href', '/firma');
    expect(screen.getByRole('link', { name: 'VERIFICAR' })).toHaveAttribute('href', '/firma/verificar');
    expect(screen.getByRole('button', { name: 'Volver al selector' })).toBeInTheDocument();
  });

  test('marca la pestaña activa según la ruta', () => {
    render(<MemoryRouter initialEntries={['/firma/verificar']}><FirmaLayout /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'VERIFICAR' })).toHaveClass('text-[#38bdf8]');
    expect(screen.getByRole('link', { name: 'FIRMAR' })).not.toHaveClass('text-[#38bdf8]');
  });
});
