import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => { const t = vi.fn(); t.error = vi.fn(); t.success = vi.fn(); return t; });
vi.mock('react-hot-toast', () => ({ default: toast }));

import NuevaPage from './NuevaPage.jsx';

const CATEGORIAS = [{ id: 'cat-1', codigo: 'libre_inversion', nombre: 'Libre inversión' }, { id: 'cat-2', codigo: 'caja_rapida', nombre: 'Caja rápida' }];
const infoAsociado = (extra = {}) => ({
  codigo: '1088000111', nombre: 'ANA', apellido: 'GÓMEZ', movil: '3001112233', saldo_aporte: '1500000', fecha_ingreso: '2018-05-10T00:00:00Z',
  empresa_codigo: 'E1', empresa_nombre: 'Empresa Uno SA', empresa_contacto_email: 'rrhh@empresa.com',
  config: { requiere_autorizacion: true, momento_autorizacion: 'indiferente', emails_autorizacion: [], sin_configurar: true },
  creditos_vigentes: [], solicitudes_abiertas: [], ...extra,
});
let user; let info;

const montar = () => render(
  <MemoryRouter initialEntries={['/creditos/nueva']}>
    <Routes>
      <Route path="/creditos/nueva" element={<NuevaPage />} />
      <Route path="/creditos/:id" element={<p>DETALLE DE LA SOLICITUD</p>} />
      <Route path="/creditos" element={<p>LISTA DE SOLICITUDES</p>} />
    </Routes>
  </MemoryRouter>,
);
const elegirAsociado = async () => {
  await user.type(screen.getByLabelText('Buscar asociado'), 'ANA');
  await user.click(await screen.findByRole('button', { name: /GÓMEZ ANA|ANA GÓMEZ/ }));
  await screen.findByText('CAMBIAR ASOCIADO');
};
const campo = (t) => screen.getByLabelText(new RegExp(t));
const escribir = async (etiqueta, valor) => { const c = campo(etiqueta); await user.clear(c); await user.type(c, valor); };
const enviar = () => user.click(screen.getByRole('button', { name: /RADICAR SOLICITUD/ }));
const cuerpoEnviado = () => api.post.mock.calls[0][1];
const llenarBasico = async () => { await escribir('VALOR DE LA SOLICITUD', '8000000'); await escribir('MONTO A DESEMBOLSAR', '8000000'); };

beforeEach(() => {
  user = userEvent.setup();
  info = infoAsociado();
  api.get.mockImplementation(async (url) => {
    if (url === '/creditos/categorias') return { data: CATEGORIAS };
    if (url === '/creditos/asociados/buscar') return { data: [{ codigo: '1088000111', nombre: 'ANA', apellido: 'GÓMEZ', empresa_nombre: 'Empresa Uno SA' }] };
    if (url.startsWith('/creditos/asociados/')) return { data: info };
    throw new Error(`GET inesperado ${url}`);
  });
  api.post.mockResolvedValue({ data: { solicitud: { id: 'sol-9', radicado: 'CR-2026-000009' }, correo: { resultado: 'solicitada' } } });
});

describe('Nueva solicitud — asociado', () => {
  test('carga las categorías y elige la primera por defecto', async () => {
    montar();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Caja rápida' })).toBeInTheDocument());
    expect(campo('CATEGORÍA')).toHaveValue('cat-1');
  });

  test('busca solo con 3 o más caracteres y muestra empresa y cédula en los resultados', async () => {
    montar();
    await user.type(screen.getByLabelText('Buscar asociado'), 'AN');
    await new Promise((r) => setTimeout(r, 350));
    expect(api.get).not.toHaveBeenCalledWith('/creditos/asociados/buscar', expect.anything());
    await user.type(screen.getByLabelText('Buscar asociado'), 'A');
    const resultado = await screen.findByRole('button', { name: /GÓMEZ ANA/ });
    expect(resultado).toHaveTextContent('1088000111 · Empresa Uno SA');
    expect(api.get).toHaveBeenCalledWith('/creditos/asociados/buscar', { params: { q: 'ANA' } });
  });

  test('sin coincidencias lo dice', async () => {
    api.get.mockImplementation(async (url) => (url === '/creditos/categorias' ? { data: CATEGORIAS } : { data: [] }));
    montar();
    await user.type(screen.getByLabelText('Buscar asociado'), 'ZZZ');
    expect(await screen.findByText(/Sin coincidencias entre los asociados vigentes/)).toBeInTheDocument();
  });

  test('al elegirlo muestra su ficha y la política de su empresa', async () => {
    montar();
    await elegirAsociado();
    expect(api.get).toHaveBeenCalledWith('/creditos/asociados/1088000111');
    expect(screen.getByText('GÓMEZ ANA')).toBeInTheDocument();   // se muestra apellido y nombre
    expect(screen.getByText(/C\.C\. 1088000111 · 3001112233/)).toBeInTheDocument();
    expect(screen.getByText(/Aportes \$1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/exige autorización/)).toBeInTheDocument();
    expect(screen.getByText(/empresa sin configurar: se asume que la exige/)).toBeInTheDocument();
  });

  test.each([
    ['no exige autorización', { requiere_autorizacion: false, momento_autorizacion: 'indiferente', emails_autorizacion: [] }, /no exige autorización/],
    ['pide la firma primero', { requiere_autorizacion: true, momento_autorizacion: 'despues_firma', emails_autorizacion: [] }, /Cuando la firma quede completa/],
    ['antes de la firma', { requiere_autorizacion: true, momento_autorizacion: 'antes_firma', emails_autorizacion: [] }, /Al radicar \(antes de la firma\)/],
  ])('política de la empresa: %s', async (_, config, texto) => {
    info = infoAsociado({ config });
    montar();
    await elegirAsociado();
    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  test('advierte si ya tiene solicitudes abiertas, con enlace a cada una, y muestra sus créditos vigentes', async () => {
    info = infoAsociado({
      solicitudes_abiertas: [{ id: 's-1', radicado: 'CR-2026-000001' }, { id: 's-2', radicado: 'CR-2026-000002' }],
      creditos_vigentes: [{ nombre_linea: 'CRÉDITO LIBRE INVERSIÓN', saldo_credito: '3000000', valor: '150000' }],
    });
    montar();
    await elegirAsociado();
    expect(screen.getByText(/Ya tiene 2 solicitudes abiertas/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CR-2026-000001' })).toHaveAttribute('href', '/creditos/s-1');
    expect(screen.getByRole('link', { name: 'CR-2026-000002' })).toHaveAttribute('href', '/creditos/s-2');
    expect(screen.getByText(/CRÉDITO LIBRE INVERSIÓN — saldo \$3\.000\.000 · cuota \$150\.000/)).toBeInTheDocument();
  });

  test('una sola solicitud abierta se dice en singular', async () => {
    info = infoAsociado({ solicitudes_abiertas: [{ id: 's-1', radicado: 'CR-2026-000001' }] });
    montar();
    await elegirAsociado();
    expect(screen.getByText(/Ya tiene una solicitud abierta/)).toBeInTheDocument();
  });

  test('si el asociado no se puede usar (retirado, sin empresa) muestra el motivo del servidor', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/creditos/categorias') return { data: CATEGORIAS };
      if (url === '/creditos/asociados/buscar') return { data: [{ codigo: '1', nombre: 'ANA', apellido: 'GÓMEZ', empresa_nombre: null }] };
      throw { response: { data: { error: 'La empresa del asociado no está registrada: corrige el asociado antes de radicar' } } };
    });
    montar();
    await user.type(screen.getByLabelText('Buscar asociado'), 'ANA');
    await user.click(await screen.findByRole('button', { name: /GÓMEZ ANA/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La empresa del asociado no está registrada: corrige el asociado antes de radicar'));
    expect(screen.queryByText('CAMBIAR ASOCIADO')).toBeNull();
  });

  test('cambiar de asociado vuelve al buscador', async () => {
    montar();
    await elegirAsociado();
    await user.click(screen.getByRole('button', { name: 'CAMBIAR ASOCIADO' }));
    expect(screen.getByLabelText('Buscar asociado')).toHaveValue('');
  });
});

describe('Nueva solicitud — datos del crédito', () => {
  test('los valores solo admiten dígitos y se muestran con formato', async () => {
    montar();
    await escribir('VALOR DE LA SOLICITUD', '8.000.000abc');
    expect(campo('VALOR DE LA SOLICITUD')).toHaveValue('8000000');
    expect(screen.getByText('$8.000.000')).toBeInTheDocument();
  });

  test('si el monto es menor al valor pide explicar la diferencia', async () => {
    montar();
    await llenarBasico();
    expect(screen.queryByLabelText(/MOTIVO DE LA DIFERENCIA/)).toBeNull();
    await escribir('MONTO A DESEMBOLSAR', '7500000');
    expect(campo('MOTIVO DE LA DIFERENCIA')).toBeInTheDocument();
  });

  test('con transferencia avisa que se exige el certificado bancario', async () => {
    montar();
    expect(campo('FORMA DE DESEMBOLSO').closest('label')).toHaveTextContent(/se exige el certificado bancario/);
    await user.selectOptions(campo('FORMA DE DESEMBOLSO'), 'cheque');
    expect(campo('FORMA DE DESEMBOLSO').closest('label')).not.toHaveTextContent(/certificado bancario/);
  });

  test('la firma externa pide el proveedor', async () => {
    montar();
    expect(screen.queryByLabelText(/PROVEEDOR DE FIRMA/)).toBeNull();
    await user.selectOptions(campo('TIPO DE FIRMA'), 'externa');
    expect(campo('PROVEEDOR DE FIRMA')).toBeInTheDocument();
  });

  test('la cuota mensual avisa que va en el correo a la empresa', () => {
    montar();
    expect(campo('CUOTA MENSUAL')).toBeInTheDocument();
    expect(screen.getByText(/Va en el correo a la empresa/)).toBeInTheDocument();
  });
});

describe('Nueva solicitud — política de autorización', () => {
  test('propone los correos de la configuración de la empresa; si no hay, el contacto general', async () => {
    info = infoAsociado({ config: { requiere_autorizacion: true, momento_autorizacion: 'indiferente', emails_autorizacion: ['nomina@e.com', 'rrhh@e.com'] } });
    const { unmount } = montar();
    await elegirAsociado();
    expect(screen.getByPlaceholderText(/nomina@empresa\.com/)).toHaveValue('nomina@e.com, rrhh@e.com');
    unmount();
    info = infoAsociado();
    montar();
    await elegirAsociado();
    expect(screen.getByPlaceholderText(/nomina@empresa\.com/)).toHaveValue('rrhh@empresa.com');
  });

  test('sin ningún correo avisa que se podrá indicar después', async () => {
    info = infoAsociado({ empresa_contacto_email: null });
    montar();
    await elegirAsociado();
    expect(screen.getByText(/Sin correo no se podrá pedir la autorización por este medio/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nomina@empresa\.com/)).toHaveValue('');
  });

  test('una excepción a la política exige un motivo y se envía en la solicitud', async () => {
    info = infoAsociado({ config: { requiere_autorizacion: false, momento_autorizacion: 'indiferente', emails_autorizacion: [] } });
    montar();
    await elegirAsociado();
    await llenarBasico();
    await user.click(screen.getByLabelText(/Hacer una excepción para esta solicitud/));
    await user.selectOptions(screen.getByDisplayValue('No requiere autorización'), 'si');
    await enviar();
    expect(toast.error).toHaveBeenCalledWith('Explica por qué cambias lo que exige la empresa');
    expect(api.post).not.toHaveBeenCalled();
    await user.type(screen.getByPlaceholderText(/Motivo de la excepción/), 'La empresa lo pidió por teléfono');
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(cuerpoEnviado()).toMatchObject({ autorizacion_requerida: true, override_motivo: 'La empresa lo pidió por teléfono' });
  });

  test('si la empresa no exige autorización no envía correos', async () => {
    info = infoAsociado({ config: { requiere_autorizacion: false, momento_autorizacion: 'indiferente', emails_autorizacion: ['x@e.com'] } });
    montar();
    await elegirAsociado();
    await llenarBasico();
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(cuerpoEnviado()).not.toHaveProperty('emails_autorizacion');
    expect(cuerpoEnviado()).not.toHaveProperty('autorizacion_requerida');
  });
});

describe('Nueva solicitud — validación al radicar', () => {
  test.each([
    ['sin asociado', async () => {}, 'Selecciona al asociado'],
    ['sin valor', async () => { await elegirAsociado(); }, 'Indica el valor de la solicitud'],
    ['sin monto', async () => { await elegirAsociado(); await escribir('VALOR DE LA SOLICITUD', '8000000'); }, 'Indica el monto a desembolsar'],
    ['monto mayor al valor', async () => { await elegirAsociado(); await escribir('VALOR DE LA SOLICITUD', '5000000'); await escribir('MONTO A DESEMBOLSAR', '6000000'); }, 'El monto a desembolsar no puede superar el valor solicitado'],
    ['diferencia sin motivo', async () => { await elegirAsociado(); await escribir('VALOR DE LA SOLICITUD', '8000000'); await escribir('MONTO A DESEMBOLSAR', '7000000'); }, 'Explica la diferencia entre el valor solicitado y el monto a desembolsar'],
    ['firma externa sin proveedor', async () => { await elegirAsociado(); await llenarBasico(); await user.selectOptions(campo('TIPO DE FIRMA'), 'externa'); }, 'Indica el proveedor de la firma externa'],
    ['correo inválido', async () => { await elegirAsociado(); await llenarBasico(); await user.clear(screen.getByPlaceholderText(/nomina@empresa/)); await user.type(screen.getByPlaceholderText(/nomina@empresa/), 'no-es-correo'); }, 'Correo inválido: no-es-correo'],
  ])('%s: avisa y no envía', async (_, preparar, mensaje) => {
    montar();
    await preparar();
    await enviar();
    expect(toast.error).toHaveBeenCalledWith(mensaje);
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText(mensaje, { selector: 'span' })).toBeInTheDocument();   // y lo deja visible junto al botón
  });
});

describe('Nueva solicitud — radicar', () => {
  test('envía el cuerpo completo y lleva a la solicitud creada', async () => {
    montar();
    await elegirAsociado();
    await escribir('VALOR DE LA SOLICITUD', '8000000');
    await escribir('MONTO A DESEMBOLSAR', '7500000');
    await user.type(campo('MOTIVO DE LA DIFERENCIA'), 'Recoge un saldo');
    await escribir('NÚMERO DE CUOTAS', '36');
    await escribir('CUOTA MENSUAL', '260000');
    await user.selectOptions(campo('CATEGORÍA'), 'cat-2');
    await user.selectOptions(campo('SOLICITADO POR'), 'whatsapp');
    await user.selectOptions(campo('FORMA DE DESEMBOLSO'), 'cheque');
    await user.type(campo('OBSERVACIONES'), 'Cliente antiguo');
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/creditos', expect.any(Object)));
    expect(cuerpoEnviado()).toEqual({
      clave: expect.stringMatching(/^[0-9a-f-]{36}$/), asociado_codigo: '1088000111', categoria_id: 'cat-2', canal_origen: 'whatsapp',
      valor_solicitado: 8000000, monto_desembolso: 7500000, forma_desembolso: 'cheque', modalidad_firma: 'presencial',
      motivo_diferencia: 'Recoge un saldo', cuotas: 36, cuota_mensual: 260000, observaciones: 'Cliente antiguo', emails_autorizacion: ['rrhh@empresa.com'],
    });
    expect(await screen.findByText('DETALLE DE LA SOLICITUD')).toBeInTheDocument();
  });

  test('omite los campos opcionales vacíos', async () => {
    montar();
    await elegirAsociado();
    await llenarBasico();
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const c = cuerpoEnviado();
    for (const k of ['motivo_diferencia', 'cuotas', 'cuota_mensual', 'observaciones', 'proveedor_externo']) expect(c).not.toHaveProperty(k);
  });

  test('la firma externa envía el proveedor', async () => {
    montar();
    await elegirAsociado(); await llenarBasico();
    await user.selectOptions(campo('TIPO DE FIRMA'), 'externa');
    await user.type(campo('PROVEEDOR DE FIRMA'), '  Firmamos SA ');
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(cuerpoEnviado()).toMatchObject({ modalidad_firma: 'externa', proveedor_externo: 'Firmamos SA' });
  });

  test('el mensaje depende de lo que pasó con el correo a la empresa', async () => {
    const respuestas = [
      [{ resultado: 'solicitada' }, /Se pidió la autorización a la empresa/],
      [{ resultado: 'sin_destinatario' }, /no hay a quién pedirle la autorización/],
      [{ resultado: 'espera_firma' }, /saldrá cuando la firma quede completa|recibirá el correo cuando la firma quede completa/],
      [{ resultado: 'no_requerida' }, /^Solicitud CR-2026-000009 radicada$/],
    ];
    for (const [correo, texto] of respuestas) {
      toast.mockClear(); toast.success.mockClear(); api.post.mockClear();
      api.post.mockResolvedValueOnce({ data: { solicitud: { id: 'sol-9', radicado: 'CR-2026-000009' }, correo } });
      const { unmount } = montar();
      await elegirAsociado(); await llenarBasico(); await enviar();
      await waitFor(() => expect(api.post).toHaveBeenCalled());
      const mensajes = [...toast.mock.calls, ...toast.success.mock.calls].map(([m]) => m);
      expect(mensajes.some((m) => texto.test(m))).toBe(true);
      unmount();
    }
  });

  test('si el servidor rechaza, avisa, deja el formulario y al reintentar usa la misma clave (no duplica)', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'El asociado está retirado: no se le pueden radicar créditos' } } });
    montar();
    await elegirAsociado(); await llenarBasico();
    await enviar();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('El asociado está retirado: no se le pueden radicar créditos'));
    expect(screen.getByRole('button', { name: /RADICAR SOLICITUD/ })).toBeEnabled();
    expect(campo('VALOR DE LA SOLICITUD')).toHaveValue('8000000');
    await enviar();
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(api.post.mock.calls[1][1].clave).toBe(api.post.mock.calls[0][1].clave);
  });

  test('mientras envía el botón se bloquea (un doble clic no crea dos solicitudes)', async () => {
    let liberar;
    api.post.mockImplementationOnce(() => new Promise((res) => { liberar = () => res({ data: { solicitud: { id: 's', radicado: 'CR-1' }, correo: { resultado: 'no_requerida' } } }); }));
    montar();
    await elegirAsociado(); await llenarBasico();
    await enviar();
    expect(await screen.findByRole('button', { name: /RADICANDO…/ })).toBeDisabled();
    liberar();
    await screen.findByText('DETALLE DE LA SOLICITUD');
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test('cancelar vuelve a la lista', async () => {
    montar();
    await user.click(screen.getByRole('link', { name: 'CANCELAR' }));
    expect(await screen.findByText('LISTA DE SOLICITUDES')).toBeInTheDocument();
  });
});
