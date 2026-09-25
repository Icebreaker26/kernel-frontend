import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

// El motor de firma y el visor de PDF se prueban aparte: aquí se ve con qué se abren
const modalFirma = vi.hoisted(() => ({ props: null }));
vi.mock('../../creditos/components/FirmaPresencialModal.jsx', () => ({
  default: (props) => { modalFirma.props = props; return <div data-testid="modal-firma"><button type="button" onClick={props.onTerminado}>[terminó]</button><button type="button" onClick={props.onClose}>[cerrar firma]</button></div>; },
}));
vi.mock('./VisorSellos.jsx', () => ({
  ROTULO_SELLO: { aval: 'AVAL FONDO REGIONAL', firma: 'FIRMA ELECTRONICA', desembolso: 'DESEMBOLSO' },
  COLOR_SELLO: { aval: '#0d5c8c', firma: '#6e42b3', desembolso: '#0d754a' },
  default: ({ sellos, textos }) => <div data-testid="visor">{Object.keys(sellos).filter((k) => textos[k]).join(',')}</div>,
}));

import CierrePanel from './CierrePanel.jsx';

const ASOCIADO = { codigo: '1088000111', nombre: 'ANA', apellido: 'GÓMEZ' };
const doc = (extra) => ({ id: 'b1', clase: 'a_firmar', tipo: 'comprobante_aprobacion', nombre: 'comprobante.pdf', archivo_id: 'ar-1', vigente: true, ...extra });
const firmado = (b, extra) => ({ id: `f-${b.id}`, clase: 'firmado', tipo: b.tipo, nombre: `${b.tipo}_firmado.pdf`, archivo_id: `ar-f-${b.id}`, borrador_id: b.id, vigente: true, ...extra });
const B1 = doc();
const B2 = doc({ id: 'b2', tipo: 'formato_estudio_credito', nombre: 'estudio.pdf', archivo_id: 'ar-2' });

const estado = (extra = {}) => ({
  solicitud_id: 'sol-1', estado: 'recibida', radicado: 'CR-2026-000001', valor_solicitado: 5000000, firma_externa: true, forma_desembolso: 'cheque', tarifa_firma_electronica: 15000,
  cierre: { con_aval: false, aval_porcentaje: null, aval_valor: 0, firma_electronica_valor: 15000, desembolso_neto: 4985000, sellos: {} },
  documentos: [], faltantes: ['Carga el Comprobante de aprobación de crédito', 'Carga el Formato estudio de crédito', 'Guarda el desembolso (aval y sellos)'],
  sellos_aplicables: ['firma', 'desembolso'], puede_editar: true, puede_completar: false, ...extra,
});
let datos;
let user;
const montar = (props = {}) => {
  const p = { id: 'sol-1', asociado: ASOCIADO, onCambio: vi.fn(), ...props };
  return { p, ...render(<CierrePanel {...p} />) };
};
const listo = () => estado({
  documentos: [B1, firmado(B1), B2, firmado(B2)], faltantes: [], puede_completar: true, sellos_aplicables: ['firma', 'desembolso'],
  cierre: { con_aval: false, aval_porcentaje: null, aval_valor: 0, firma_electronica_valor: 15000, desembolso_neto: 4985000, sellos: { firma: { pagina: 0, x: 0.1, y: 0.1 }, desembolso: { pagina: 0, x: 0.1, y: 0.3 } } },
});

beforeEach(() => {
  user = userEvent.setup({ applyAccept: false });
  datos = estado();
  modalFirma.props = null;
  api.get.mockImplementation(async (url) => {
    if (url.endsWith('/cierre')) return { data: datos };
    if (url.endsWith('/cierre/comprobante')) return { data: new TextEncoder().encode('%PDF-1.4').buffer };
    if (url.includes('/archivos/')) return { data: { url: 'https://s3.example/x.pdf' } };
    if (url.endsWith('/pdf-final')) return { data: new Blob(['%PDF']), headers: { 'x-documentos-omitidos': '0' } };
    throw new Error(`GET inesperado ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockImplementation(async (url, body) => { datos = { ...datos, cierre: { ...datos.cierre, con_aval: body.con_aval, aval_porcentaje: body.aval_porcentaje ?? null, sellos: body.sellos ?? datos.cierre.sellos } }; return { data: datos }; });
  window.open = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Cierre de Cartera — documentos', () => {
  test('pide el cierre de la solicitud y muestra los dos documentos sin cargar', async () => {
    montar();
    expect(await screen.findByText('Comprobante de aprobación de crédito')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/cierre');
    expect(screen.getAllByText('Sin cargar')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'CARGAR PDF' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /FIRMAR CON EL MOTOR \(0\)/ })).toBeDisabled();
  });

  test('cargar un PDF lo envía como formulario con su tipo y recarga el cierre', async () => {
    const { p } = montar();
    await screen.findByText('Comprobante de aprobación de crédito');
    const archivo = new File(['%PDF-1.4'], 'mi_comprobante.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Archivo de Comprobante de aprobación de crédito'), archivo);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/cartera/sol-1/cierre/documentos', expect.any(FormData)));
    const fd = api.post.mock.calls[0][1];
    expect(fd.get('tipo')).toBe('comprobante_aprobacion');
    expect(fd.get('archivo').name).toBe('mi_comprobante.pdf');
    expect(toast.success).toHaveBeenCalledWith('Comprobante de aprobación de crédito cargado');
    await waitFor(() => expect(p.onCambio).toHaveBeenCalled());
  });

  test('un documento cargado sin firmar ofrece reemplazarlo y se cuenta como pendiente de firma', async () => {
    datos = estado({ documentos: [B1] });
    montar();
    expect(await screen.findByText('comprobante.pdf')).toBeInTheDocument();
    expect(screen.getByText('Falta firmar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REEMPLAZAR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FIRMAR CON EL MOTOR \(1\)/ })).toBeEnabled();
  });

  test('firmar abre el motor con los pendientes y las rutas de Cartera', async () => {
    datos = estado({ documentos: [B1, B2] });
    montar();
    await user.click(await screen.findByRole('button', { name: /FIRMAR CON EL MOTOR \(2\)/ }));
    expect(screen.getByTestId('modal-firma')).toBeInTheDocument();
    expect(modalFirma.props.pendientes.map((d) => d.id)).toEqual(['b1', 'b2']);
    expect(modalFirma.props.asociado).toBe(ASOCIADO);
    expect(modalFirma.props.urlContenido({ id: 'b1' })).toBe('/cartera/sol-1/cierre/documentos/b1/contenido');
    expect(modalFirma.props.urlFirmado).toBe('/cartera/sol-1/cierre/firmado');
  });

  test('al terminar la firma recarga; cerrar el motor lo quita', async () => {
    datos = estado({ documentos: [B1, B2] });
    const { p } = montar();
    await user.click(await screen.findByRole('button', { name: /FIRMAR CON EL MOTOR/ }));
    datos = estado({ documentos: [B1, firmado(B1), B2, firmado(B2)] });
    await user.click(screen.getByRole('button', { name: '[terminó]' }));
    await waitFor(() => expect(p.onCambio).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: '[cerrar firma]' }));
    expect(screen.queryByTestId('modal-firma')).toBeNull();
    expect(await screen.findAllByText('Firmado')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'CARGAR PDF' })).toBeNull();   // lo firmado ya no se reemplaza
  });

  test('el ojito abre el archivo por su enlace temporal', async () => {
    datos = estado({ documentos: [B1, firmado(B1)] });
    montar();
    await user.click(await screen.findByRole('button', { name: 'Abrir Comprobante de aprobación de crédito' }));
    expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/archivos/ar-f-b1/url');
    expect(window.open).toHaveBeenCalledWith('https://s3.example/x.pdf', '_blank', 'noopener,noreferrer');
  });

  test('si el servidor rechaza la carga muestra su mensaje', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'Tipo de archivo no permitido (solo PDF)' } } });
    montar();
    await screen.findByText('Comprobante de aprobación de crédito');
    await user.upload(screen.getByLabelText('Archivo de Comprobante de aprobación de crédito'), new File(['x'], 'x.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Tipo de archivo no permitido (solo PDF)'));
  });
});

describe('Cierre de Cartera — avance y presentación', () => {
  const pasos = async () => within(await screen.findByRole('list', { name: 'Avance del cierre' })).getAllByRole('listitem');

  test('muestra los cuatro pasos y marca el primero que falta', async () => {
    montar();
    const p = await pasos();
    expect(p.map((l) => l.getAttribute('data-estado'))).toEqual(['actual', 'pendiente', 'pendiente', 'pendiente']);
    expect(p[0]).toHaveAttribute('aria-current', 'step');
    expect(p[0]).toHaveTextContent('0/2 firmados');
    expect(p[2]).toHaveTextContent('0/2 ubicados');
  });

  test('con todo hecho, los pasos quedan completos salvo cerrar, y avisa que está listo', async () => {
    datos = { ...listo(), cierre_guardado: true };
    montar();
    expect((await pasos()).map((l) => l.getAttribute('data-estado'))).toEqual(['hecho', 'hecho', 'hecho', 'actual']);
    expect(screen.getByText(/El cierre está completo/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Lo que falta' })).toBeNull();
    expect(screen.getByText('LISTO PARA COMPLETAR')).toBeInTheDocument();
  });

  test('cada sección dice su estado', async () => {
    montar();
    await pasos();
    expect(screen.getByText('0/2 FIRMADOS')).toBeInTheDocument();
    expect(screen.getByText('SIN GUARDAR')).toBeInTheDocument();
    expect(screen.getByText('0/2 UBICADOS')).toBeInTheDocument();
    expect(screen.getByText('FALTAN PASOS')).toBeInTheDocument();
  });

  test('un documento cargado muestra su ficha con tamaño, fecha y quién lo subió', async () => {
    datos = estado({ documentos: [{ ...B1, mime_type: 'application/pdf', size_bytes: 20480, created_at: '2026-09-22T15:00:00Z', subido_por_nombre: 'Luis Pérez' }] });
    montar();
    expect(await screen.findByText(/20 KB · 22 de sept de 2026 · Luis Pérez/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir Comprobante de aprobación de crédito' })).toHaveTextContent('VER');
  });

  test('el aval se elige con botones (no con una casilla) y "sin aval" es lo de origen', async () => {
    montar();
    expect(await screen.findByRole('button', { name: 'SIN AVAL' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('checkbox')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'SIN AVAL' }));
    expect(screen.queryByLabelText(/PORCENTAJE DEL AVAL/)).toBeNull();
  });

  test('cada sello se muestra con su valor y dónde quedó', async () => {
    datos = listo();
    montar();
    const lista = await screen.findByRole('list', { name: 'Sellos a ubicar' });
    expect(within(lista).getByText('$15.000')).toBeInTheDocument();
    expect(within(lista).getByText('$4.985.000')).toBeInTheDocument();
    expect(within(lista).getAllByText('Página 1')).toHaveLength(2);
  });
});

describe('Cierre de Cartera — aval y desembolso', () => {
  const fila = (texto) => within(screen.getByLabelText('Resumen del desembolso')).getByText(texto).closest('div');

  test('sin aval, con firma externa: resta solo la firma electrónica', async () => {
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    expect(fila('Valor solicitado')).toHaveTextContent('$5.000.000');
    expect(fila('− Firma electrónica externa')).toHaveTextContent('$15.000');
    expect(fila('DESEMBOLSO')).toHaveTextContent('$4.985.000');
    expect(screen.queryByText(/Aval Fondo Regional \(/)).toBeNull();
    expect(screen.queryByLabelText(/PORCENTAJE DEL AVAL/)).toBeNull();
  });

  test('sin firma externa no aparece esa línea', async () => {
    datos = estado({ firma_externa: false, cierre: { ...estado().cierre, firma_electronica_valor: 0, desembolso_neto: 5000000 }, sellos_aplicables: ['desembolso'] });
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    expect(screen.queryByText('− Firma electrónica externa')).toBeNull();
    expect(fila('DESEMBOLSO')).toHaveTextContent('$5.000.000');
  });

  test('marcar el aval pregunta el porcentaje y recalcula al escribirlo', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: 'CON AVAL' }));
    const pct = screen.getByLabelText(/PORCENTAJE DEL AVAL/);
    await user.type(pct, '10');
    expect(fila('− Aval Fondo Regional (10%)')).toHaveTextContent('$500.000');
    expect(fila('DESEMBOLSO')).toHaveTextContent('$4.485.000');   // 5.000.000 − 500.000 − 15.000
  });

  test('un porcentaje vacío o fuera de rango se avisa y bloquea el guardado', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: 'CON AVAL' }));
    expect(screen.getByText(/Indica un porcentaje entre/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' })).toBeDisabled();
    await user.type(screen.getByLabelText(/PORCENTAJE DEL AVAL/), '150');
    expect(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' })).toBeDisabled();
  });

  test('guardar envía si hay aval y su porcentaje', async () => {
    montar();
    await user.click(await screen.findByRole('button', { name: 'CON AVAL' }));
    await user.type(screen.getByLabelText(/PORCENTAJE DEL AVAL/), '12.5');
    await user.click(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cartera/sol-1/cierre', { con_aval: true, aval_porcentaje: 12.5 }));
    expect(toast.success).toHaveBeenCalledWith('Desembolso guardado');
  });

  test('sin aval no manda porcentaje', async () => {
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    await user.click(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cartera/sol-1/cierre', { con_aval: false }));
  });

  test('avisa si los descuentos superan el valor solicitado', async () => {
    datos = estado({ valor_solicitado: 10000 });
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    expect(screen.getByText('Los descuentos superan el valor solicitado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' })).toBeDisabled();
  });

  test('avisa si la tarifa de la firma electrónica está en cero', async () => {
    datos = estado({ tarifa_firma_electronica: 0 });
    montar();
    expect(await screen.findByText(/tarifa de la firma electrónica está en \$0/)).toBeInTheDocument();
  });

  test('un error del servidor al guardar se muestra', async () => {
    api.put.mockRejectedValue({ response: { data: { error: 'Los descuentos superan el monto a desembolsar' } } });
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    await user.click(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Los descuentos superan el monto a desembolsar'));
  });

  test('carga lo ya guardado (aval y porcentaje)', async () => {
    datos = estado({ cierre: { ...estado().cierre, con_aval: true, aval_porcentaje: '8.00', aval_valor: 400000, desembolso_neto: 4585000 }, sellos_aplicables: ['aval', 'firma', 'desembolso'] });
    montar();
    expect(await screen.findByRole('button', { name: 'CON AVAL' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/PORCENTAJE DEL AVAL/)).toHaveValue(8);
  });
});

describe('Cierre de Cartera — cuenta bancaria del asociado', () => {
  const transferencia = (extra = {}) => estado({ forma_desembolso: 'transferencia', ...extra });
  const grupo = () => screen.findByRole('group', { name: 'Cuenta bancaria del asociado' });
  const campoCuenta = (nombre) => within(screen.getByRole('group', { name: 'Cuenta bancaria del asociado' })).getByLabelText(nombre);
  const llenar = async () => {
    await user.type(campoCuenta('BANCO'), 'Bancolombia');
    await user.type(campoCuenta('NÚMERO DE CUENTA'), '123 4567-8901');
    await user.type(campoCuenta('DOCUMENTO DEL TITULAR'), '1088000111');
    await user.type(campoCuenta('NOMBRE DEL TITULAR'), 'ana gómez');
  };

  test('con transferencia pide los datos de la cuenta; con efectivo solo dice a nombre de quién se paga', async () => {
    datos = transferencia();
    const { unmount } = montar();
    await grupo();
    unmount();
    datos = estado({ forma_desembolso: 'efectivo' });
    montar();
    await screen.findByRole('group', { name: 'Aval del Fondo Regional' });
    expect(screen.queryByRole('group', { name: 'Cuenta bancaria del asociado' })).toBeNull();
    expect(screen.getByText(/No requiere cuenta bancaria/)).toHaveTextContent(/EFECTIVO.*a nombre de ANA GÓMEZ \(C\.C\. 1088000111\)/);
  });

  test('el número solo admite dígitos (ignora espacios y letras)', async () => {
    datos = transferencia();
    montar();
    await grupo();
    await user.type(campoCuenta('NÚMERO DE CUENTA'), '12 ab-34');
    expect(campoCuenta('NÚMERO DE CUENTA')).toHaveValue('1234');
  });

  test('datos a medias bloquean el guardado y lo dicen', async () => {
    datos = transferencia();
    montar();
    await grupo();
    await user.type(campoCuenta('BANCO'), 'Davivienda');
    expect(screen.getByText(/Completa todos los datos de la cuenta/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' })).toBeDisabled();
  });

  test('guarda la cuenta junto con el desembolso', async () => {
    datos = transferencia();
    montar();
    await grupo();
    await llenar();
    await user.click(screen.getByRole('button', { name: 'GUARDAR DESEMBOLSO' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cartera/sol-1/cierre', {
      con_aval: false, cuenta: { banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ana gómez', titular_documento: '1088000111' },
    }));
  });

  test('"el titular es el asociado" llena el nombre y el documento', async () => {
    datos = transferencia();
    montar();
    await grupo();
    await user.click(screen.getByRole('button', { name: 'EL TITULAR ES EL ASOCIADO' }));
    expect(campoCuenta('NOMBRE DEL TITULAR')).toHaveValue('ANA GÓMEZ');
    expect(campoCuenta('DOCUMENTO DEL TITULAR')).toHaveValue('1088000111');
  });

  test('avisa en rojo si el titular no es el asociado', async () => {
    datos = transferencia();
    montar();
    await grupo();
    await llenar();
    await user.clear(campoCuenta('DOCUMENTO DEL TITULAR'));
    await user.type(campoCuenta('DOCUMENTO DEL TITULAR'), '5222333');
    expect(screen.getByText(/El titular NO es el asociado/)).toBeInTheDocument();
  });

  test('carga la cuenta ya guardada y no hay cambios pendientes', async () => {
    datos = transferencia({ cierre: { ...estado().cierre, banco: 'Bancolombia', tipo_cuenta: 'corriente', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111' } });
    montar();
    await grupo();
    expect(campoCuenta('BANCO')).toHaveValue('Bancolombia');
    expect(campoCuenta('TIPO DE CUENTA')).toHaveValue('corriente');
    expect(campoCuenta('NÚMERO DE CUENTA')).toHaveValue('12345678901');
    expect(screen.queryByText(/hay cambios sin guardar/)).toBeNull();
  });

  test('cambiar un dato de la cuenta cuenta como cambio sin guardar', async () => {
    datos = transferencia({ documentos: [B1, firmado(B1)], cierre: { ...estado().cierre, banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111' } });
    montar();
    await grupo();
    await user.type(campoCuenta('NÚMERO DE CUENTA'), '9');
    expect(screen.getByRole('button', { name: 'UBICAR SELLOS' })).toBeDisabled();
    expect(screen.getByText('Guarda el desembolso: hay cambios sin guardar')).toBeInTheDocument();
  });
});

describe('Cierre de Cartera — sellos', () => {
  test('lista los sellos que aplican y cuáles faltan por ubicar', async () => {
    datos = estado({ sellos_aplicables: ['aval', 'firma', 'desembolso'], cierre: { ...estado().cierre, con_aval: true, aval_porcentaje: '8', sellos: { desembolso: { pagina: 1, x: 0.1, y: 0.1 } } } });
    montar();
    await screen.findByText('AVAL FONDO REGIONAL');
    const lista = screen.getByText('AVAL FONDO REGIONAL').closest('ul');
    expect(within(lista).getByText('AVAL FONDO REGIONAL').closest('li')).toHaveTextContent('Sin ubicar');
    expect(within(lista).getByText('DESEMBOLSO').closest('li')).toHaveTextContent('Página 2');
  });

  test('no se pueden ubicar sin el comprobante firmado', async () => {
    montar();
    expect(await screen.findByRole('button', { name: 'UBICAR SELLOS' })).toBeDisabled();
    expect(screen.getByText('Primero firma el comprobante de aprobación.')).toBeInTheDocument();
  });

  test('cambios sin guardar bloquean ubicar sellos y completar', async () => {
    datos = listo();
    montar();
    await user.click(await screen.findByRole('button', { name: 'CON AVAL' }));
    await user.type(screen.getByLabelText(/PORCENTAJE DEL AVAL/), '5');
    expect(screen.getByRole('button', { name: 'UBICAR SELLOS' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'MARCAR COMPLETADO' })).toBeDisabled();
    expect(screen.getByText('Guarda el desembolso: hay cambios sin guardar')).toBeInTheDocument();
  });

  test('abre el comprobante firmado por el backend con los sellos que aplican y los guarda', async () => {
    datos = listo();
    montar();
    await user.click(await screen.findByRole('button', { name: 'UBICAR SELLOS' }));
    expect(await screen.findByTestId('visor')).toHaveTextContent('firma,desembolso');
    expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/cierre/comprobante', { responseType: 'arraybuffer' });
    await user.click(screen.getByRole('button', { name: 'GUARDAR SELLOS' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cartera/sol-1/cierre', { con_aval: false, sellos: { firma: { pagina: 0, x: 0.1, y: 0.1 }, desembolso: { pagina: 0, x: 0.1, y: 0.3 } } }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ubicar sellos' })).toBeNull());
  });

  test('los sellos nuevos arrancan apilados en la primera página', async () => {
    datos = { ...listo(), cierre: { ...listo().cierre, sellos: {} } };
    montar();
    await user.click(await screen.findByRole('button', { name: 'UBICAR SELLOS' }));
    await screen.findByTestId('visor');
    await user.click(screen.getByRole('button', { name: 'GUARDAR SELLOS' }));
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const { sellos } = api.put.mock.calls[0][1];
    expect(Object.keys(sellos).sort()).toEqual(['desembolso', 'firma']);
    expect(sellos.firma.pagina).toBe(0);
  });

  test('cancelar cierra sin guardar; un error al cargar el comprobante se muestra', async () => {
    datos = listo();
    api.get.mockImplementation(async (url) => {
      if (url.endsWith('/cierre')) return { data: datos };
      throw { response: { data: { error: 'Aún no hay comprobante de aprobación firmado' } } };
    });
    montar();
    await user.click(await screen.findByRole('button', { name: 'UBICAR SELLOS' }));
    expect(await screen.findByText('Aún no hay comprobante de aprobación firmado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GUARDAR SELLOS' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /CANCELAR/ }));
    expect(screen.queryByRole('dialog', { name: 'Ubicar sellos' })).toBeNull();
    expect(api.put).not.toHaveBeenCalled();
  });
});

describe('Cierre de Cartera — PDF final y completar', () => {
  test('muestra lo que falta para poder completar y deshabilita el botón', async () => {
    montar();
    const lista = await screen.findByRole('list', { name: 'Lo que falta' });
    expect(within(lista).getAllByRole('listitem').map((l) => l.textContent)).toEqual(estado().faltantes);
    expect(screen.getByRole('button', { name: 'MARCAR COMPLETADO' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'DESCARGAR PDF FINAL' })).toBeDisabled();
  });

  test('descarga el PDF final como archivo', async () => {
    datos = listo();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await user.click(await screen.findByRole('button', { name: 'DESCARGAR PDF FINAL' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/pdf-final', { responseType: 'blob' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('PDF final descargado');
    clic.mockRestore();
  });

  test('avisa si algún documento no se pudo incorporar', async () => {
    datos = listo();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.get.mockImplementation(async (url) => (url.endsWith('/cierre') ? { data: datos } : { data: new Blob(['%PDF']), headers: { 'x-documentos-omitidos': '2' } }));
    montar();
    await user.click(await screen.findByRole('button', { name: 'DESCARGAR PDF FINAL' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('2 documento(s) no se pudieron incorporar'), expect.anything()));
    clic.mockRestore();
  });

  test('si el servidor no puede armar el PDF muestra su mensaje (viene dentro de un Blob)', async () => {
    datos = listo();
    api.get.mockImplementation(async (url) => {
      if (url.endsWith('/cierre')) return { data: datos };
      throw { response: { data: new Blob([JSON.stringify({ error: 'Falta el Formato estudio de crédito firmado' })]) } };
    });
    montar();
    await user.click(await screen.findByRole('button', { name: 'DESCARGAR PDF FINAL' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falta el Formato estudio de crédito firmado'));
  });

  test('completar pide confirmación y muestra el desembolso final; cancelar no hace nada', async () => {
    datos = listo();
    montar();
    await user.click(await screen.findByRole('button', { name: 'MARCAR COMPLETADO' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Confirmar cierre' });
    expect(dialogo).toHaveTextContent('$4.985.000');
    await user.click(within(dialogo).getByRole('button', { name: 'CANCELAR' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('confirmar completa el crédito y avisa que pasa a Control Interno', async () => {
    datos = listo();
    const { p } = montar();
    await user.click(await screen.findByRole('button', { name: 'MARCAR COMPLETADO' }));
    await user.click(screen.getByRole('button', { name: 'SÍ, COMPLETAR' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/cartera/sol-1/completar'));
    expect(toast.success).toHaveBeenCalledWith('Crédito completado: pasa a Control Interno');
    await waitFor(() => expect(p.onCambio).toHaveBeenCalled());
  });

  test('si el servidor responde que falta algo, lo muestra', async () => {
    datos = listo();
    api.post.mockRejectedValue({ response: { data: { error: 'El cierre aún no está completo' } } });
    montar();
    await user.click(await screen.findByRole('button', { name: 'MARCAR COMPLETADO' }));
    await user.click(screen.getByRole('button', { name: 'SÍ, COMPLETAR' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('El cierre aún no está completo'));
  });
});

describe('Cierre de Cartera — crédito completado', () => {
  test('queda de solo lectura, dice que está en Control Interno y aún permite el PDF final', async () => {
    datos = { ...listo(), estado: 'completada', puede_editar: false, puede_completar: false };
    montar();
    expect(await screen.findByText(/Está en Control Interno para su validación/)).toBeInTheDocument();
    for (const n of ['MARCAR COMPLETADO', 'GUARDAR DESEMBOLSO', 'UBICAR SELLOS', /FIRMAR CON EL MOTOR/, 'CARGAR PDF', 'REEMPLAZAR']) {
      expect(screen.queryByRole('button', { name: n })).toBeNull();
    }
    expect(screen.getByRole('button', { name: 'CON AVAL' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'SIN AVAL' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'DESCARGAR PDF FINAL' })).toBeEnabled();
    expect(screen.queryByRole('list', { name: 'Lo que falta' })).toBeNull();
  });

  test('un error al cargar el cierre se muestra', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Solicitud no encontrada' } } });
    montar();
    expect(await screen.findByText('Solicitud no encontrada')).toBeInTheDocument();
  });
});
