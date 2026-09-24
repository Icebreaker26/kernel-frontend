import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import RevisionCredito from './RevisionCredito.jsx';

const CUENTA = { banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111', titular_es_asociado: true };
const detalle = (extra = {}) => ({
  id: 'c-1', radicado: 'CR-2026-000001', estado: 'completada', categoria: 'Libre inversión', empresa: 'Empresa Uno SA', forma_desembolso: 'transferencia', modalidad_firma: 'externa',
  completada_at: '2026-09-24T15:00:00Z', completada_por_nombre: 'Carlos Cartera', asociado: { codigo: '1088000111', nombre: 'ANA GÓMEZ' },
  valores: { valor_solicitado: 5000000, aval_porcentaje: 10, aval_valor: 500000, firma_electronica_valor: 15000, desembolso_neto: 4485000 },
  cuenta: CUENTA, autorizacion: { requerida: true, estado: 'aprobada', fecha: '2026-09-22T00:00:00.000Z', canal: 'correo' },
  documentos: [{ id: 'd1', clase: 'firmado', tipo: 'pagare', nombre: 'pagare.pdf', etapa: 'asesor' }, { id: 'd2', clase: 'firmado', tipo: 'comprobante_aprobacion', nombre: 'c.pdf', etapa: 'cartera' }, { id: 'd3', clase: 'adjunto', tipo: 'certificado_bancario', nombre: 'cert.pdf', etapa: 'asesor' }],
  revisiones: [], eventos: [{ id: 'e1', tipo: 'completada_por_cartera', detalle: {}, autor_tipo: 'empleado', autor_nombre: 'Carlos Cartera', created_at: '2026-09-24T15:00:00Z' }],
  orden: null,
  lista: [{ clave: 'documentos', texto: 'Los documentos firmados están completos' }, { clave: 'autorizacion', texto: 'La autorización de la empresa está y es vigente' },
    { clave: 'valores', texto: 'Los valores son correctos' }, { clave: 'datos_bancarios', texto: 'La cuenta coincide con el certificado bancario' }],
  puede_revisar: true, motivo_bloqueo: null, ...extra,
});
let datos;
let user;
const Ubicacion = () => <p data-testid="ruta">{useLocation().pathname}</p>;
const montar = () => render(
  <MemoryRouter initialEntries={['/control-interno/creditos/c-1']}>
    <Routes>
      <Route path="/control-interno/creditos/:id" element={<RevisionCredito />} />
      <Route path="/control-interno/creditos" element={<Ubicacion />} />
    </Routes>
  </MemoryRouter>,
);
const marcarTodo = async () => { for (const c of within(screen.getByRole('list', { name: 'Lista de verificación' })).getAllByRole('checkbox')) await user.click(c); };

beforeEach(() => {
  user = userEvent.setup();
  datos = detalle();
  api.get.mockImplementation(async (url) => {
    if (url.endsWith('/certificado')) return { data: { url: 'https://s3.example/cert.pdf' } };
    if (url.endsWith('/pdf-final')) return { data: new Blob(['%PDF']) };
    return { data: datos };
  });
  api.post.mockResolvedValue({ data: {} });
  window.open = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:pdf');
});

describe('Control Interno — revisión de un crédito', () => {
  test('lo primero que se ve es lo que se va a pagar: monto, asociado, banco, cuenta y titular', async () => {
    montar();
    expect(await screen.findByText('CR-2026-000001')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/control_interno/creditos/c-1');
    const pago = screen.getByLabelText('Datos del pago');
    expect(within(pago).getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(pago).toHaveTextContent('ANA GÓMEZ');
    expect(pago).toHaveTextContent('Bancolombia');
    expect(screen.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
    expect(screen.getByText(/completado por Carlos Cartera/)).toBeInTheDocument();
  });

  test('explica cómo se calculó el desembolso neto', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const calculo = screen.getByLabelText('Cómo se calculó el desembolso');
    expect(calculo).toHaveTextContent('Valor solicitado$5.000.000');
    expect(calculo).toHaveTextContent('Aval Fondo Regional (10%)$500.000');
    expect(calculo).toHaveTextContent('Firma electrónica externa$15.000');
    expect(calculo).toHaveTextContent('DESEMBOLSO NETO$4.485.000');
  });

  test('sin aval ni firma externa no muestra esas líneas', async () => {
    datos = detalle({ valores: { valor_solicitado: 5000000, aval_porcentaje: null, aval_valor: 0, firma_electronica_valor: 0, desembolso_neto: 5000000 } });
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.getByLabelText('Cómo se calculó el desembolso')).not.toHaveTextContent(/Aval|Firma electrónica/);
  });

  test('un titular distinto al asociado se destaca', async () => {
    datos = detalle({ cuenta: { ...CUENTA, titular_nombre: 'LUIS RUIZ', titular_documento: '52000222', titular_es_asociado: false },
      lista: [...detalle().lista, { clave: 'titular_tercero', texto: 'El titular de la cuenta NO es el asociado: confirmo que está autorizado' }] });
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent(/TITULAR DISTINTO AL ASOCIADO/);
    expect(screen.getByText(/El titular de la cuenta NO es el asociado/)).toBeInTheDocument();
  });

  test('con cheque no hay cuenta ni botón del certificado', async () => {
    datos = detalle({ forma_desembolso: 'cheque', cuenta: null, lista: detalle().lista.filter((i) => i.clave !== 'datos_bancarios') });
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.queryByRole('button', { name: /CERTIFICADO BANCARIO/ })).toBeNull();
    expect(screen.queryByTestId('numero-cuenta')).toBeNull();
  });

  test('lista los documentos y el estado de la autorización de la empresa', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const docs = screen.getByRole('list', { name: 'Documentos del expediente' });
    expect(docs).toHaveTextContent('Pagaré');
    expect(docs).toHaveTextContent('Comprobante de aprobación de crédito');
    expect(docs).toHaveTextContent('Cartera');
    expect(screen.getByText(/Autorización de la empresa:/)).toHaveTextContent('APROBADA');
  });

  test('abre el PDF final en una pestaña nueva', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: /ABRIR PDF FINAL/ }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/control_interno/creditos/c-1/pdf-final', { responseType: 'blob' }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:pdf', '_blank', 'noopener'));
  });

  test('si el PDF no se puede armar muestra el mensaje del servidor (viene dentro de un Blob)', async () => {
    api.get.mockImplementation(async (url) => {
      if (url.endsWith('/pdf-final')) throw { response: { data: new Blob([JSON.stringify({ error: 'Falta el Formato estudio de crédito firmado' })]) } };
      return { data: datos };
    });
    montar();
    await user.click(await screen.findByRole('button', { name: /ABRIR PDF FINAL/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falta el Formato estudio de crédito firmado'));
  });

  test('abre el certificado bancario por su enlace temporal', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: /ABRIR CERTIFICADO BANCARIO/ }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('https://s3.example/cert.pdf', '_blank', 'noopener,noreferrer'));
  });
});

describe('Control Interno — aprobar', () => {
  test('no se puede aprobar hasta marcar todos los puntos', async () => {
    montar();
    const aprobar = await screen.findByRole('button', { name: /APROBAR Y ENVIAR A TESORERÍA/ });
    expect(aprobar).toBeDisabled();
    const casillas = within(screen.getByRole('list', { name: 'Lista de verificación' })).getAllByRole('checkbox');
    for (const c of casillas.slice(0, -1)) await user.click(c);
    expect(aprobar).toBeDisabled();
    await user.click(casillas.at(-1));
    expect(aprobar).toBeEnabled();
    await user.click(casillas[0]);   // desmarcar uno vuelve a bloquear
    expect(aprobar).toBeDisabled();
  });

  test('aprobar envía la lista marcada, avisa y vuelve a la bandeja', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    await marcarTodo();
    await user.click(screen.getByRole('button', { name: /APROBAR Y ENVIAR A TESORERÍA/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/control_interno/creditos/c-1/revision', {
      decision: 'aprobada', lista: { documentos: true, autorizacion: true, valores: true, datos_bancarios: true },
    }));
    expect(toast.success).toHaveBeenCalledWith('Aprobado: el desembolso pasó a Tesorería');
    expect(await screen.findByTestId('ruta')).toHaveTextContent('/control-interno/creditos');
  });

  test('si el servidor rechaza la aprobación muestra su mensaje y se queda en la pantalla', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'No puedes revisar un crédito que tú mismo completaste en Cartera' } } });
    montar();
    await screen.findByText('CR-2026-000001');
    await marcarTodo();
    await user.click(screen.getByRole('button', { name: /APROBAR Y ENVIAR A TESORERÍA/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No puedes revisar un crédito que tú mismo completaste en Cartera'));
    expect(screen.queryByTestId('ruta')).toBeNull();
  });
});

describe('Control Interno — devolver', () => {
  const abrir = async () => { montar(); await user.click(await screen.findByRole('button', { name: 'DEVOLVER' })); return screen.getByRole('dialog', { name: 'DEVOLVER EL CRÉDITO' }); };

  test('pide a quién se devuelve (Cartera por defecto) y un motivo obligatorio', async () => {
    const modal = await abrir();
    expect(within(modal).getByLabelText(/A Cartera/)).toBeChecked();
    expect(within(modal).getByLabelText(/Al asesor/)).not.toBeChecked();
    const boton = within(modal).getByRole('button', { name: 'DEVOLVER' });
    expect(boton).toBeDisabled();
    await user.type(within(modal).getByLabelText(/¿QUÉ ESTÁ MAL/), 'x');
    expect(boton).toBeDisabled();
    await user.type(within(modal).getByLabelText(/¿QUÉ ESTÁ MAL/), 'yz');
    expect(boton).toBeEnabled();
  });

  test('devolver a Cartera envía destino y motivo', async () => {
    const modal = await abrir();
    await user.type(within(modal).getByLabelText(/¿QUÉ ESTÁ MAL/), '  El número de cuenta no coincide  ');
    await user.click(within(modal).getByRole('button', { name: 'DEVOLVER' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/control_interno/creditos/c-1/revision', { decision: 'devuelta', destino: 'cartera', motivo: 'El número de cuenta no coincide', lista: {} }));
    expect(toast.success).toHaveBeenCalledWith('Crédito devuelto');
    expect(await screen.findByTestId('ruta')).toBeInTheDocument();
  });

  test('devolver al asesor cambia el destino', async () => {
    const modal = await abrir();
    await user.click(within(modal).getByLabelText(/Al asesor/));
    await user.type(within(modal).getByLabelText(/¿QUÉ ESTÁ MAL/), 'Falta la firma en la libranza');
    await user.click(within(modal).getByRole('button', { name: 'DEVOLVER' }));
    await waitFor(() => expect(api.post.mock.calls[0][1]).toMatchObject({ decision: 'devuelta', destino: 'asesor', motivo: 'Falta la firma en la libranza' }));
  });

  test('cancelar cierra sin enviar nada', async () => {
    const modal = await abrir();
    await user.click(within(modal).getByRole('button', { name: 'CANCELAR' }));
    expect(screen.queryByRole('dialog', { name: 'DEVOLVER EL CRÉDITO' })).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('Control Interno — quién puede revisar', () => {
  test('quien completó el crédito ve el motivo y no tiene botones ni casillas activas', async () => {
    datos = detalle({ puede_revisar: false, motivo_bloqueo: 'Tú completaste este crédito en Cartera: lo debe revisar otra persona' });
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent(/lo debe revisar otra persona/);
    expect(screen.queryByRole('button', { name: /APROBAR/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'DEVOLVER' })).toBeNull();
    for (const c of within(screen.getByRole('list', { name: 'Lista de verificación' })).getAllByRole('checkbox')) expect(c).toBeDisabled();
  });

  test('un crédito que ya no está en Control Interno (404) lo explica y ofrece volver', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    montar();
    expect(await screen.findByText(/ya no está pendiente en Control Interno/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /VOLVER A LA BANDEJA/ })).toHaveAttribute('href', '/control-interno/creditos');
  });

  test('muestra las revisiones anteriores con quién devolvió y por qué', async () => {
    datos = detalle({ revisiones: [{ id: 'r1', decision: 'devuelta', destino: 'cartera', motivo: 'Cuenta mal escrita', created_at: '2026-09-23T10:00:00Z', revisor: 'Rita Revisora' }] });
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.getByText(/Rita Revisora/).closest('li')).toHaveTextContent(/DEVOLVIÓ A CARTERA — Cuenta mal escrita/);
  });
});
