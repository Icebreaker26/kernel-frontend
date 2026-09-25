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
  completada_at: '2026-09-24T15:00:00Z', completada_por_nombre: 'Carlos Cartera', entregada_at: '2026-09-21T15:00:00Z', recibida_at: '2026-09-22T15:00:00Z', asesor_nombre: 'Luis Asesor', proveedor_externo: 'Proveedor X', observaciones: null,
  asociado: { codigo: '1088000111', nombre: 'ANA GÓMEZ' },
  valores: { valor_solicitado: 5000000, aval_porcentaje: 10, aval_valor: 500000, firma_electronica_valor: 15000, desembolso_neto: 4485000 },
  cuenta: CUENTA, autorizacion: { requerida: true, estado: 'aprobada', fecha: '2026-09-22T00:00:00.000Z', canal: 'correo' },
  documentos: [{ id: 'd1', clase: 'firmado', tipo: 'pagare', nombre: 'pagare.pdf', etapa: 'asesor', mime_type: 'application/pdf', size_bytes: 20480, created_at: '2026-09-21T15:00:00Z', subido_por_nombre: 'Luis Asesor' },
    { id: 'd2', clase: 'firmado', tipo: 'comprobante_aprobacion', nombre: 'c.pdf', etapa: 'cartera', mime_type: 'application/pdf', size_bytes: 51200, created_at: '2026-09-24T14:00:00Z', subido_por_nombre: 'Carlos Cartera' },
    { id: 'd3', clase: 'adjunto', tipo: 'certificado_bancario', nombre: 'cert.png', etapa: 'asesor', mime_type: 'image/png', size_bytes: 1048576, created_at: '2026-09-21T15:00:00Z', subido_por_nombre: 'Luis Asesor' }],
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
const lista = () => screen.getByRole('list', { name: 'Lista de verificación' });
const cumple = () => within(lista()).getAllByRole('button', { name: 'CUMPLE' });
const noCumple = () => within(lista()).getAllByRole('button', { name: 'NO CUMPLE' });
const marcarTodo = async () => { for (const c of cumple()) await user.click(c); };

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
    expect(screen.getByText(/Autorización de la empresa:/).closest('p')).toHaveTextContent('APROBADA');
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
  test('no se puede aprobar hasta marcar CUMPLE en todos los puntos', async () => {
    montar();
    const aprobar = await screen.findByRole('button', { name: /APROBAR Y ENVIAR A TESORERÍA/ });
    expect(aprobar).toBeDisabled();
    const botones = cumple();
    for (const c of botones.slice(0, -1)) await user.click(c);
    expect(aprobar).toBeDisabled();
    await user.click(botones.at(-1));
    expect(aprobar).toBeEnabled();
    await user.click(botones[0]);   // volver a pulsar CUMPLE lo desmarca y bloquea otra vez
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
  test('quien completó el crédito ve el motivo y no tiene botones ni verificaciones activas', async () => {
    datos = detalle({ puede_revisar: false, motivo_bloqueo: 'Tú completaste este crédito en Cartera: lo debe revisar otra persona' });
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent(/lo debe revisar otra persona/);
    expect(screen.queryByRole('button', { name: /APROBAR/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'DEVOLVER' })).toBeNull();
    for (const c of [...cumple(), ...noCumple()]) expect(c).toBeDisabled();
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

describe('Control Interno — verificación punto por punto', () => {
  const punto = (texto) => within(lista()).getByText(texto).closest('li');

  test('cada punto tiene dos botones excluyentes y arranca sin marcar', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    expect(within(lista()).getAllByRole('listitem').map((l) => l.getAttribute('data-estado'))).toEqual(['pendiente', 'pendiente', 'pendiente', 'pendiente']);
    expect(screen.queryByRole('checkbox')).toBeNull();   // ya no son casillas
    const li = punto('Los valores son correctos');
    await user.click(within(li).getByRole('button', { name: 'CUMPLE' }));
    expect(li).toHaveAttribute('data-estado', 'ok');
    expect(within(li).getByRole('button', { name: 'CUMPLE' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(li).getByRole('button', { name: 'NO CUMPLE' }));   // cambiar de opinión pasa de una a la otra
    expect(li).toHaveAttribute('data-estado', 'no');
    expect(within(li).getByRole('button', { name: 'CUMPLE' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('cuenta cuántos puntos van verificados y lo dice en la sección', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.getByText('0 DE 4 VERIFICADOS')).toBeInTheDocument();
    await user.click(cumple()[0]);
    await user.click(cumple()[1]);
    expect(screen.getByText('2 DE 4 VERIFICADOS')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Puntos verificados' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText('2/4 VERIFICADOS')).toBeInTheDocument();
  });

  test('un punto que NO CUMPLE impide aprobar, lo avisa y deja DEVOLVER como acción principal', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    await marcarTodo();
    await user.click(noCumple()[3]);
    expect(screen.getByRole('button', { name: /APROBAR Y ENVIAR A TESORERÍA/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Hay un punto que no cumple: no se puede aprobar/);
    expect(screen.getByText('1 NO CUMPLE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DEVOLVER' })).toHaveClass('bg-rose-600');
  });

  test('al devolver, el motivo viene sugerido con lo que no cumple y se puede editar', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    await user.click(noCumple()[2]);
    await user.click(noCumple()[3]);
    await user.click(screen.getByRole('button', { name: 'DEVOLVER' }));
    const modal = screen.getByRole('dialog', { name: 'DEVOLVER EL CRÉDITO' });
    const campoMotivo = within(modal).getByLabelText(/¿QUÉ ESTÁ MAL/);
    expect(campoMotivo).toHaveValue('No cumple: Los valores son correctos; La cuenta coincide con el certificado bancario.');
    await user.type(campoMotivo, ' Revisar con Cartera.');
    await user.click(within(modal).getByRole('button', { name: 'DEVOLVER' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/control_interno/creditos/c-1/revision', {
      decision: 'devuelta', destino: 'cartera', motivo: 'No cumple: Los valores son correctos; La cuenta coincide con el certificado bancario. Revisar con Cartera.', lista: { valores: false, datos_bancarios: false },
    }));
  });

  test('devolver sin marcar nada sigue funcionando: motivo vacío y lista vacía', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: 'DEVOLVER' }));
    expect(within(screen.getByRole('dialog', { name: 'DEVOLVER EL CRÉDITO' })).getByLabelText(/¿QUÉ ESTÁ MAL/)).toHaveValue('');
  });

  test('el destino de la devolución es una tarjeta seleccionable con radio real', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: 'DEVOLVER' }));
    const modal = screen.getByRole('dialog', { name: 'DEVOLVER EL CRÉDITO' });
    expect(within(modal).getAllByRole('radio')).toHaveLength(2);
    expect(within(modal).getByRole('radio', { name: /A Cartera/ })).toBeChecked();
    await user.click(within(modal).getByText('Al asesor'));
    expect(within(modal).getByRole('radio', { name: /Al asesor/ })).toBeChecked();
  });
});

describe('Control Interno — presentación del detalle', () => {
  test('muestra el avance del crédito con Control Interno como paso actual', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const region = screen.getByRole('region', { name: 'Progreso de la solicitud' });
    const actual = within(region).getAllByRole('listitem').find((l) => l.getAttribute('aria-current') === 'step');
    expect(actual).toHaveTextContent('Control Interno');
    expect(within(region).getByRole('progressbar', { name: 'Avance' })).toHaveAttribute('aria-valuenow', '5');
  });

  test('las cifras clave: solicitado, desembolso neto, forma de pago y días en Control Interno', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const cifras = screen.getByLabelText('Resumen del crédito');
    expect(cifras).toHaveTextContent('VALOR SOLICITADO$5.000.000');
    expect(cifras).toHaveTextContent('DESEMBOLSO NETO$4.485.000');
    expect(cifras).toHaveTextContent('FORMA DE PAGOTransferencia bancaria');
    expect(cifras).toHaveTextContent('EN CONTROL INTERNO');
  });

  test('cada documento es una ficha con su tipo, quién lo aportó y su tamaño', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const items = within(screen.getByRole('list', { name: 'Documentos del expediente' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Pagaré');
    expect(items[0]).toHaveTextContent('Firmado · Asesor');
    expect(items[0]).toHaveTextContent('20 KB');
    expect(items[0]).toHaveTextContent('Luis Asesor');
    expect(items[1]).toHaveTextContent('Firmado · Cartera');
    expect(items[2]).toHaveTextContent('Del asociado · Asesor');
    expect(items[2]).toHaveTextContent('PNG');
    expect(items[2]).toHaveTextContent('1.0 MB');
  });

  test('la columna lateral dice qué sigue y quién lo hace, y da el contexto del asociado y las condiciones', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    const sig = screen.getByRole('region', { name: 'Siguiente paso' });
    expect(sig).toHaveTextContent('CONTROL INTERNO');
    expect(sig).toHaveTextContent('Verificar el expediente y aprobarlo o devolverlo.');
    expect(screen.getByText('ASESOR').nextSibling).toHaveTextContent('Luis Asesor');
    expect(screen.getByText('FIRMA').nextSibling).toHaveTextContent('Proveedor X');
    expect(screen.getByText('AUTORIZACIÓN').nextSibling).toHaveTextContent('Requerida');
  });

  test('las observaciones solo aparecen si las hay', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.queryByText('OBSERVACIONES')).toBeNull();
  });

  test('el historial arranca plegado', async () => {
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.getByRole('button', { name: /HISTORIAL/ })).toHaveAttribute('aria-expanded', 'false');
  });

  test('cada revisión anterior es una tarjeta con su decisión coloreada', async () => {
    datos = detalle({ revisiones: [{ id: 'r1', decision: 'devuelta', destino: 'asesor', motivo: 'Falta firma', created_at: '2026-09-23T10:00:00Z', revisor: 'Rita Revisora' }, { id: 'r0', decision: 'aprobada', destino: null, motivo: null, created_at: '2026-09-20T10:00:00Z', revisor: 'Ramiro' }] });
    montar();
    await screen.findByText('CR-2026-000001');
    expect(screen.getByText('DEVOLVIÓ A ASESOR')).toHaveClass('text-rose-300');
    expect(screen.getByText('APROBÓ')).toHaveClass('text-emerald-300');
  });
});
