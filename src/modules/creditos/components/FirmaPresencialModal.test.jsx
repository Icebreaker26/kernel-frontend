import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

// El motor de firma real se prueba aparte: este doble deja ver con qué se abre y permite "terminar la firma"
const motor = vi.hoisted(() => ({ props: null, resultados: [] }));
vi.mock('../../firma/pages/FirmarPage.jsx', () => ({
  MotorFirma: (props) => {
    motor.props = props;
    return (
      <div data-testid="motor">
        <ul>{props.documentosIniciales.map((d) => <li key={d.id}>{`${d.nombre}:${d.bytes.length}`}</li>)}</ul>
        <button type="button" onClick={() => props.onFirmados(motor.resultados)}>[terminar la firma]</button>
        <button type="button" onClick={props.onCancelar}>[cancelar motor]</button>
      </div>
    );
  },
}));

import FirmaPresencialModal from './FirmaPresencialModal.jsx';

const ASOCIADO = { codigo: '1088000111', nombre: 'ANA', apellido: 'GÓMEZ' };
const PENDIENTES = [{ id: 'd1', archivo_id: 'arch-1', nombre: 'pagare.pdf', tipo: 'pagare' }, { id: 'd2', archivo_id: 'arch-2', nombre: 'libranza.pdf', tipo: 'libranza' }];
const firmado = (id, nombre, folio) => ({ id, nombre, folio, bytes: new TextEncoder().encode(`%PDF-firmado-${id}`), registrado: true });
const formData = (llamada) => Object.fromEntries([...llamada[1].entries()].map(([k, v]) => [k, v instanceof Blob ? `blob:${v.name}:${v.type}` : v]));
let user;

const montar = (extra = {}) => {
  const props = { solicitudId: 'sol-1', asociado: ASOCIADO, pendientes: PENDIENTES, onTerminado: vi.fn(), onClose: vi.fn(), ...extra };
  return { props, ...render(<FirmaPresencialModal {...props} />) };
};

beforeEach(() => {
  user = userEvent.setup();
  motor.props = null;
  motor.resultados = [firmado('d1', 'pagare_firmado.pdf', 'folio-1'), firmado('d2', 'libranza_firmado.pdf', 'folio-2')];
  api.get.mockImplementation(async (url) => ({ data: new TextEncoder().encode(`%PDF-1.4 ${url}`).buffer }));
  api.post.mockResolvedValue({ data: {} });
});

describe('Firma presencial desde una solicitud — apertura', () => {
  test('descarga cada documento pendiente por el backend (no directo de S3) y abre el motor con ellos', async () => {
    montar();
    expect(screen.getByText(/Descargando los documentos a firmar/)).toBeInTheDocument();
    await screen.findByTestId('motor');
    expect(api.get).toHaveBeenCalledWith('/creditos/sol-1/documentos/d1/contenido', { responseType: 'arraybuffer' });
    expect(api.get).toHaveBeenCalledWith('/creditos/sol-1/documentos/d2/contenido', { responseType: 'arraybuffer' });
    const items = within(screen.getByTestId('motor')).getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toMatch(/^pagare\.pdf:\d+$/);
    expect(items[1]).toMatch(/^libranza\.pdf:\d+$/);
    expect(motor.props.documentosIniciales.every((d) => ArrayBuffer.isView(d.bytes))).toBe(true);
    expect(motor.props.documentosIniciales.map((d) => d.id)).toEqual(['d1', 'd2']);   // el id del documento a firmar, para volver a enlazarlo
  });

  test('el firmante es el asociado, con su cédula, y el consentimiento adicional dice que se conserva el documento', async () => {
    montar();
    await screen.findByTestId('motor');
    expect(motor.props.firmantesIniciales).toEqual([{ nombre: 'ANA GÓMEZ', tipo_doc: 'CC', num_doc: '1088000111', rol: 'asociado' }]);
    expect(motor.props.versionTexto).toBe('firma-credito-v1');
    expect(motor.props.textoExtra).toMatch(/conserve estos documentos firmados/);
    expect(motor.props.textoExtra).toMatch(/huella/);
    expect(motor.props.textoExtra).toMatch(/trámite, la administración y el cobro/);
  });

  test('el encabezado dice quién firma y qué documentos', async () => {
    montar();
    expect(screen.getByText(/FIRMA PRESENCIAL · ANA GÓMEZ/)).toBeInTheDocument();
    expect(screen.getByText('Pagaré · Libranza')).toBeInTheDocument();
  });

  test('si no se pueden descargar los documentos, lo dice y no abre el motor', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Documento no encontrado' } } });
    montar();
    expect(await screen.findByText('Documento no encontrado')).toBeInTheDocument();
    expect(screen.queryByTestId('motor')).toBeNull();
  });

  test('cerrar llama a onClose, desde el botón del encabezado o desde el motor', async () => {
    const { props } = montar();
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: /CERRAR/ }));
    await user.click(screen.getByRole('button', { name: '[cancelar motor]' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Firma presencial desde una solicitud — guardar en el expediente', () => {
  test('cada PDF firmado se sube por el backend con su folio, sin enviar llaves de S3', async () => {
    const { props } = montar();
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(api.post.mock.calls[0][0]).toBe('/creditos/sol-1/firmado');
    expect(formData(api.post.mock.calls[0])).toEqual({ folio: 'folio-1', archivo: 'blob:pagare_firmado.pdf:application/pdf' });
    expect(formData(api.post.mock.calls[1])).toEqual({ folio: 'folio-2', archivo: 'blob:libranza_firmado.pdf:application/pdf' });
    await waitFor(() => expect(props.onTerminado).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Documentos firmados y guardados en el expediente');
    expect(props.onClose).not.toHaveBeenCalled();   // no se cierra solo: el asesor aún puede descargar los PDF
  });

  test('muestra el avance por documento', async () => {
    let liberar;
    api.post.mockImplementationOnce(() => new Promise((res) => { liberar = () => res({ data: {} }); }));
    montar();
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    expect(await screen.findByText('GUARDANDO EN EL EXPEDIENTE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CERRAR/ })).toBeDisabled();   // no se puede cerrar a mitad de guardado
    liberar();
    await waitFor(() => expect(screen.getByRole('button', { name: /CERRAR/ })).toBeEnabled());
  });

  test('si un documento no se puede guardar, muestra su error y reintenta solo lo que falta', async () => {
    api.post.mockImplementation(async (url, fd) => {
      if (fd.get('folio') === 'folio-2' && !api.post.yaReintentado) { api.post.yaReintentado = true; throw { response: { data: { error: 'El archivo no coincide con el documento que produjo la firma (huella distinta)' } } }; }
      return { data: {} };
    });
    api.post.yaReintentado = false;
    const { props } = montar();
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    expect(await screen.findByText(/huella distinta/)).toBeInTheDocument();
    expect(props.onTerminado).not.toHaveBeenCalled();
    expect(screen.getByText(/siguen disponibles abajo para descargarlos/)).toBeInTheDocument();

    api.post.mockClear();
    await user.click(screen.getByRole('button', { name: /REINTENTAR LO QUE FALTA/ }));
    await waitFor(() => expect(props.onTerminado).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledTimes(1);   // solo el que había fallado
    expect(api.post.mock.calls[0][1].get('folio')).toBe('folio-2');
    expect(screen.queryByRole('button', { name: /REINTENTAR LO QUE FALTA/ })).toBeNull();
  });

  test('un fallo que no trae mensaje muestra uno genérico', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    montar();
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    expect((await screen.findAllByText('Network Error')).length).toBeGreaterThan(0);
  });
});

describe('Firma presencial — rutas propias (Cartera firma sus documentos con el mismo motor)', () => {
  const cartera = { urlContenido: (p) => `/cartera/sol-1/cierre/documentos/${p.id}/contenido`, urlFirmado: '/cartera/sol-1/cierre/firmado' };

  test('descarga los documentos por la ruta indicada, no por la del asesor', async () => {
    montar(cartera);
    await screen.findByTestId('motor');
    expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/cierre/documentos/d1/contenido', { responseType: 'arraybuffer' });
    expect(api.get).toHaveBeenCalledWith('/cartera/sol-1/cierre/documentos/d2/contenido', { responseType: 'arraybuffer' });
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/creditos/'), expect.anything());
  });

  test('sube cada firmado a la ruta indicada', async () => {
    montar(cartera);
    await screen.findByTestId('motor');
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(api.post.mock.calls.map((c) => c[0])).toEqual(['/cartera/sol-1/cierre/firmado', '/cartera/sol-1/cierre/firmado']);
  });

  test('sin rutas propias sigue usando las de Créditos', async () => {
    montar();
    await screen.findByTestId('motor');
    expect(api.get).toHaveBeenCalledWith('/creditos/sol-1/documentos/d1/contenido', { responseType: 'arraybuffer' });
    await user.click(screen.getByRole('button', { name: '[terminar la firma]' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/creditos/sol-1/firmado', expect.any(FormData)));
  });
});
