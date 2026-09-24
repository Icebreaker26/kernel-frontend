import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
// El motor de firma se prueba aparte: aquí solo importa con qué documentos se abre
vi.mock('./FirmaPresencialModal.jsx', () => ({
  default: ({ pendientes, onClose }) => (
    <div role="dialog" aria-label="firma presencial">
      <ul>{pendientes.map((p) => <li key={p.id}>{p.nombre}</li>)}</ul>
      <button type="button" onClick={onClose}>cerrar firma</button>
    </div>
  ),
}));

// El panel de cierre de Cartera se prueba aparte: aquí solo importa cuándo aparece y con qué datos
const cierrePanel = vi.hoisted(() => ({ props: null }));
vi.mock('../../cartera/components/CierrePanel.jsx', () => ({
  default: (props) => { cierrePanel.props = props; return <div data-testid="cierre-panel">cierre de {props.id}</div>; },
}));

import ExpedienteDetalle from './ExpedienteDetalle.jsx';

// ── Datos de prueba ───────────────────────────────────────────────────────────
const ID = 'sol-1';
const solicitud = (extra = {}) => ({
  id: ID, radicado: 'CR-2026-000123', estado: 'en_tramite', asesor_nombre: 'Luis Pérez', asesor_uuid: 'u-1', created_at: '2026-09-20T15:00:00Z', entregada_at: null,
  empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión', canal_origen: 'presencial', valor_solicitado: '5000000', monto_desembolso: null,
  motivo_diferencia: null, cuotas: 36, cuota_mensual: '260000', forma_desembolso: 'cheque', modalidad_firma: 'presencial', proveedor_externo: null,
  autorizacion_requerida: true, autorizacion_momento: 'indiferente', override_motivo: null, observaciones: null, devuelta_motivo: null, cierre_motivo: null, ...extra,
});
const pistas = (extra = {}) => ({
  a_firmar: 0, firmados: 0, firma_completa: false, autorizacion_requerida: true, autorizacion_estado: null, autorizacion_ok: false,
  tiene_desprendible: false, certificado_requerido: false, tiene_certificado: false, documentos_ok: false, listo: false, expediente_completo: false, ...extra,
});
const doc = (extra = {}) => ({
  id: 'd1', clase: 'a_firmar', tipo: 'pagare', nombre: 'pagare.pdf', sha256: 'a'.repeat(64), borrador_id: null, folio: null, lote_id: null, proveedor: null, id_transaccion: null,
  fecha_firma: null, vigente: true, invalidado_motivo: null, archivo_id: 'arch-1', created_at: '2026-09-20T16:00:00Z', mime_type: 'application/pdf', size_bytes: 1000, subido_por_nombre: 'Luis Pérez', ...extra,
});
const ronda = (extra = {}) => ({ id: 'r1', estado: 'solicitada', enviada_a: ['nomina@empresa.com'], enviada_at: '2026-09-20T17:00:00Z', canal: 'correo', fecha_autorizacion: null, archivo_id: null, cuota_autorizada: null, motivo_rechazo: null, created_at: '2026-09-20T17:00:00Z', ...extra });
const detalle = (extra = {}) => ({
  solicitud: solicitud(), asociado: { codigo: '1088000111', nombre: 'ANA', apellido: 'GÓMEZ', movil: '3001112233', email: null }, documentos: [], autorizaciones: [],
  eventos: [{ id: 'e1', tipo: 'radicada', detalle: {}, autor_tipo: 'empleado', autor_nombre: 'Luis Pérez', created_at: '2026-09-20T15:00:00Z' }],
  pistas: pistas(), faltantes: ['Sube los documentos a firmar'], puede_editar: true, puede_reasignar: false, ...extra,
});
// Un expediente completo listo para entregar (firmado, autorizado, con desprendible)
const completo = (extra = {}) => detalle({
  documentos: [doc(), doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', folio: 'abcdef1234567890', archivo_id: 'arch-f', nombre: 'pagare_firmado.pdf' }), doc({ id: 'a1', clase: 'adjunto', tipo: 'desprendible_nomina', nombre: 'desprendible.pdf', archivo_id: 'arch-a' })],
  autorizaciones: [ronda({ estado: 'aprobada', fecha_autorizacion: '2026-09-22', archivo_id: 'arch-aut', cuota_autorizada: '260000' })],
  pistas: pistas({ a_firmar: 1, firmados: 1, firma_completa: true, autorizacion_estado: 'aprobada', autorizacion_ok: true, tiene_desprendible: true, documentos_ok: true, listo: true, expediente_completo: true }),
  faltantes: [], ...extra,
});

let user; let actual;
const responder = (d) => { actual = d; api.get.mockImplementation(async (url) => { if (url === `/creditos/${ID}` || url === `/cartera/${ID}`) return { data: actual }; if (url.endsWith('/url')) return { data: { url: 'https://s3.example/doc.pdf' } }; if (url === '/creditos/asesores') return { data: [{ id: 'u-1', nombre: 'Luis Pérez', email: 'luis@x.com' }, { id: 'u-2', nombre: 'María Ríos', email: 'maria@x.com' }] }; throw new Error(`GET inesperado ${url}`); }); };
const montar = async (d = detalle(), { modo = 'asesor', api: base = '/creditos' } = {}) => {
  responder(d);
  const r = render(<MemoryRouter><ExpedienteDetalle id={ID} api={base} modo={modo} volver={base} /></MemoryRouter>);
  await screen.findByText(d.solicitud.radicado);
  return r;
};
const boton = (t) => screen.getByRole('button', { name: new RegExp(t, 'i') });
const sinBoton = (t) => expect(screen.queryByRole('button', { name: new RegExp(t, 'i') })).toBeNull();
const dialogo = (nombre) => screen.getByRole('dialog', { name: nombre });
const formData = (llamada) => Object.fromEntries([...llamada[1].entries()].map(([k, v]) => [k, v instanceof File ? `archivo:${v.name}` : v]));

beforeEach(() => {
  user = userEvent.setup({ applyAccept: false });
  window.open = vi.fn();
  api.post.mockResolvedValue({ data: { ok: true } });
  api.put.mockResolvedValue({ data: { solicitud: {}, invalidados: 0 } });
  api.delete.mockResolvedValue({ data: { ok: true } });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Expediente — carga y datos', () => {
  test('muestra la solicitud con su estado, el asociado, la empresa y los valores', async () => {
    await montar(detalle({ solicitud: solicitud({ observaciones: 'Urgente', override_motivo: 'La empresa lo pidió' }) }));
    expect(screen.getByRole('heading', { name: /CR-2026-000123/ })).toBeInTheDocument();
    expect(screen.getByText('EN TRÁMITE')).toBeInTheDocument();
    expect(screen.getByText(/Radicada el .* por Luis Pérez/)).toBeInTheDocument();
    expect(screen.getByText('ANA GÓMEZ', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/C\.C\. 1088000111 · 3001112233/)).toBeInTheDocument();
    expect(screen.getByText('Empresa Uno SA')).toBeInTheDocument();
    expect(screen.getByText('Libre inversión')).toBeInTheDocument();
    expect(screen.getByText('$5.000.000')).toBeInTheDocument();
    expect(screen.getByText('Lo calcula Cartera')).toBeInTheDocument();   // el asesor no digita el monto a desembolsar
    expect(screen.getByText('36 × $260.000')).toBeInTheDocument();
    expect(screen.getByText('Cheque')).toBeInTheDocument();
    expect(screen.getByText('Firma presencial (tableta / huella)')).toBeInTheDocument();
    expect(screen.getByText('Requerida')).toBeInTheDocument();
    expect(screen.getByText('La empresa lo pidió')).toBeInTheDocument();
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  test('firma externa muestra el proveedor y una empresa sin autorización lo indica', async () => {
    await montar(detalle({ solicitud: solicitud({ modalidad_firma: 'externa', proveedor_externo: 'Firmamos SA', autorizacion_requerida: false }) }));
    expect(screen.getByText('Firmamos SA')).toBeInTheDocument();
    expect(screen.getByText('No requerida')).toBeInTheDocument();
  });

  test('un 404 explica que no existe o no tiene acceso, y ofrece volver', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    render(<MemoryRouter><ExpedienteDetalle id={ID} api="/creditos" modo="asesor" volver="/creditos" /></MemoryRouter>);
    expect(await screen.findByText(/No se encontró la solicitud \(o no tienes acceso a ella\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /VOLVER/ })).toHaveAttribute('href', '/creditos');
  });

  test('otro error muestra el mensaje del servidor', async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { error: 'Base de datos no disponible' } } });
    render(<MemoryRouter><ExpedienteDetalle id={ID} api="/creditos" modo="asesor" volver="/creditos" /></MemoryRouter>);
    expect(await screen.findByText('Base de datos no disponible')).toBeInTheDocument();
  });

  test('mientras carga muestra un indicador', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ExpedienteDetalle id={ID} api="/creditos" modo="asesor" volver="/creditos" /></MemoryRouter>);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  test('la línea de tiempo y los avisos de estado', async () => {
    await montar(detalle({ solicitud: solicitud({ estado: 'devuelta', devuelta_motivo: 'Desprendible ilegible' }) }));
    expect(screen.getByText(/Cartera devolvió esta solicitud:/).closest('p')).toHaveTextContent('Desprendible ilegible');
    expect(screen.getByText('Solicitud radicada')).toBeInTheDocument();
  });

  test('una solicitud cerrada muestra el motivo y no ofrece acciones', async () => {
    await montar(detalle({ solicitud: solicitud({ estado: 'desistida', cierre_motivo: 'El asociado ya no lo necesita' }), puede_editar: false }));
    expect(screen.getByText(/Cerrada: El asociado ya no lo necesita/)).toBeInTheDocument();
    sinBoton('EDITAR CONDICIONES'); sinBoton('ENTREGAR A CARTERA'); sinBoton('SUBIR PDF');
  });
});

describe('Expediente — quién puede hacer qué (modo asesor)', () => {
  test('el asesor de la solicitud ve las acciones de edición, subida y entrega', async () => {
    await montar(detalle());
    expect(boton('EDITAR CONDICIONES')).toBeInTheDocument();
    expect(boton('DESISTIR / CERRAR')).toBeInTheDocument();
    expect(boton('SUBIR PDF')).toBeInTheDocument();
    expect(boton('ENTREGAR A CARTERA')).toBeInTheDocument();
    sinBoton('REASIGNAR');
  });

  test('quien solo puede ver muestra un aviso con el nombre del asesor y ninguna acción', async () => {
    await montar(detalle({ puede_editar: false, documentos: [doc()], pistas: pistas({ a_firmar: 1 }) }));
    expect(screen.getByText(/Solo lectura: esta solicitud la gestiona/)).toHaveTextContent('Luis Pérez');
    for (const t of ['EDITAR CONDICIONES', 'DESISTIR', 'SUBIR PDF', 'ENTREGAR A CARTERA', 'REGISTRAR RESPUESTA', 'ENVIAR CORREO', 'FIRMAR CON EL ASOCIADO']) sinBoton(t);
    expect(screen.queryByRole('button', { name: /Quitar pagare/ })).toBeNull();
  });

  test('el aviso de solo lectura no aparece en una solicitud ya cerrada', async () => {
    await montar(detalle({ solicitud: solicitud({ estado: 'recibida' }), puede_editar: false }));
    expect(screen.queryByText(/Solo lectura/)).toBeNull();
  });

  test('solo el admin ve REASIGNAR, y lo puede hacer aunque no sea el asesor', async () => {
    await montar(detalle({ puede_editar: true, puede_reasignar: true }));
    expect(boton('REASIGNAR')).toBeInTheDocument();
  });

  test('si puede_reasignar es falso, no se muestra aunque pueda editar', async () => {
    await montar(detalle({ puede_editar: true, puede_reasignar: false }));
    sinBoton('REASIGNAR');
  });
});

describe('Expediente — 1. documentos firmados', () => {
  test('lista cada documento a firmar con su estado: pendiente o firmado con folio', async () => {
    await montar(detalle({
      documentos: [doc(), doc({ id: 'd2', tipo: 'libranza', nombre: 'libranza.pdf', archivo_id: 'arch-2' }),
        doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', folio: 'abcdef1234567890', archivo_id: 'arch-f' })],
      pistas: pistas({ a_firmar: 2, firmados: 1 }),
    }));
    expect(screen.getByText('pagare.pdf')).toBeInTheDocument();
    expect(screen.getByText('libranza.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Firmado · folio abcdef12…/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente de firma')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  test('sin documentos avisa que aún no hay', async () => {
    await montar(detalle());
    expect(screen.getByText('Aún no hay documentos a firmar.')).toBeInTheDocument();
  });

  test('el selector ofrece exactamente los cinco tipos de la cooperativa', async () => {
    await montar(detalle());
    const opciones = within(screen.getByLabelText('Tipo de documento a firmar')).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['Carta de instrucciones', 'Libranza', 'Pagaré', 'Solicitud', 'Proyección']);
  });

  test('subir un PDF envía el tipo elegido y el archivo, avisa y recarga', async () => {
    const { container } = await montar(detalle());
    await user.selectOptions(screen.getByLabelText('Tipo de documento a firmar'), 'libranza');
    const archivo = new File(['%PDF-1.4'], 'libranza.pdf', { type: 'application/pdf' });
    await user.upload(container.querySelector('input[type=file]'), archivo);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/documentos/borrador`, expect.any(FormData)));
    expect(formData(api.post.mock.calls[0])).toEqual({ tipo: 'libranza', archivo: 'archivo:libranza.pdf' });
    expect(toast.success).toHaveBeenCalledWith('Documento cargado');
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === `/creditos/${ID}`).length).toBeGreaterThan(1));
  });

  test('si el servidor rechaza el archivo, muestra su mensaje', async () => {
    const { container } = await montar(detalle());
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Tipo de archivo no permitido (solo PDF)' } } });
    await user.upload(container.querySelector('input[type=file]'), new File(['x'], 'x.pdf'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Tipo de archivo no permitido (solo PDF)'));
  });

  test('firma presencial pendiente: ofrece firmar con el asociado y abre el motor con los documentos pendientes', async () => {
    await montar(detalle({
      documentos: [doc(), doc({ id: 'd2', tipo: 'libranza', nombre: 'libranza.pdf', archivo_id: 'arch-2' }), doc({ id: 'd3', tipo: 'proyeccion', nombre: 'proyeccion.pdf', archivo_id: 'arch-3' }),
        doc({ id: 'f1', clase: 'firmado', borrador_id: 'd3', folio: 'zzzzzzzz00', archivo_id: 'arch-f' })],
      pistas: pistas({ a_firmar: 3, firmados: 1 }),
    }));
    await user.click(boton('FIRMAR CON EL ASOCIADO \\(2\\)'));
    const modal = dialogo('firma presencial');
    expect(within(modal).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['pagare.pdf', 'libranza.pdf']);   // solo los pendientes
    await user.click(within(modal).getByRole('button', { name: 'cerrar firma' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === `/creditos/${ID}`).length).toBeGreaterThan(1));   // al cerrar se recarga
  });

  test('no ofrece firmar si no hay documentos pendientes o si la firma es externa', async () => {
    await montar(detalle({ documentos: [doc(), doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', folio: 'abcdef1234567890', archivo_id: 'arch-f' })], pistas: pistas({ a_firmar: 1, firmados: 1, firma_completa: true }) }));
    sinBoton('FIRMAR CON EL ASOCIADO');
  });

  test('firma externa: en vez del motor ofrece registrar la firma de cada documento pendiente', async () => {
    await montar(detalle({ solicitud: solicitud({ modalidad_firma: 'externa', proveedor_externo: 'Firmamos SA' }), documentos: [doc()], pistas: pistas({ a_firmar: 1 }) }));
    sinBoton('FIRMAR CON EL ASOCIADO');
    await user.click(screen.getByRole('button', { name: /registrar firma externa/i }));
    const modal = dialogo(/REGISTRAR FIRMA EXTERNA · PAGARÉ/);
    expect(within(modal).getByLabelText(/PROVEEDOR/)).toHaveValue('Firmamos SA');
  });

  test('registrar la firma externa pide proveedor, fecha y PDF (sin evidencia obligatoria) y envía los datos', async () => {
    await montar(detalle({ solicitud: solicitud({ modalidad_firma: 'externa', proveedor_externo: 'Firmamos SA' }), documentos: [doc()], pistas: pistas({ a_firmar: 1 }) }));
    await user.click(screen.getByRole('button', { name: /registrar firma externa/i }));
    const modal = dialogo(/REGISTRAR FIRMA EXTERNA/);
    const enviar = within(modal).getByRole('button', { name: 'REGISTRAR FIRMA' });
    expect(enviar).toBeDisabled();
    expect(within(modal).queryByText(/EVIDENCIA/i)).toBeNull();   // el certificado del proveedor no se pide
    await user.type(within(modal).getByLabelText(/ID DE LA TRANSACCIÓN/), 'TX-99');
    await user.upload(within(modal).getByLabelText(/PDF FIRMADO/), new File(['%PDF'], 'firmado.pdf', { type: 'application/pdf' }));
    expect(enviar).toBeEnabled();
    await user.click(enviar);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/firma-externa`, expect.any(FormData)));
    const datos = formData(api.post.mock.calls[0]);
    expect(datos).toMatchObject({ borrador_id: 'd1', proveedor: 'Firmamos SA', id_transaccion: 'TX-99', archivo: 'archivo:firmado.pdf' });
    expect(datos.fecha_firma).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(datos).not.toHaveProperty('evidencia');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());   // se cierra al terminar
  });

  test('un documento firmado con proveedor externo muestra el proveedor y el enlace a su evidencia si la hay', async () => {
    await montar(detalle({
      solicitud: solicitud({ modalidad_firma: 'externa' }),
      documentos: [doc(), doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', proveedor: 'Firmamos SA', archivo_id: 'arch-f' }), doc({ id: 'ev1', clase: 'evidencia_externa', borrador_id: 'd1', archivo_id: 'arch-ev' })],
      pistas: pistas({ a_firmar: 1, firmados: 1, firma_completa: true }),
    }));
    expect(screen.getByText(/Firmado · Firmamos SA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'evidencia' })).toBeInTheDocument();
  });

  test('un documento sin firmar se puede quitar; uno ya firmado no', async () => {
    await montar(detalle({
      documentos: [doc(), doc({ id: 'd2', tipo: 'libranza', nombre: 'libranza.pdf', archivo_id: 'arch-2' }), doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', folio: 'abcdef1234567890', archivo_id: 'arch-f' })],
      pistas: pistas({ a_firmar: 2, firmados: 1 }),
    }));
    expect(screen.queryByRole('button', { name: 'Quitar pagare.pdf' })).toBeNull();   // ya firmado
    await user.click(screen.getByRole('button', { name: 'Quitar libranza.pdf' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/creditos/${ID}/documentos/d2`));
    expect(toast.success).toHaveBeenCalledWith('Documento retirado');
  });
});

describe('Expediente — 2. autorización de la empresa', () => {
  test('si la empresa no la exige, lo dice y no ofrece acciones', async () => {
    await montar(detalle({ solicitud: solicitud({ autorizacion_requerida: false }), pistas: pistas({ autorizacion_requerida: false, autorizacion_ok: true }) }));
    expect(screen.getByText('Esta empresa no exige autorización para este crédito.')).toBeInTheDocument();
    sinBoton('ENVIAR CORREO'); sinBoton('REGISTRAR RESPUESTA');
  });

  test('con la firma primero explica cuándo saldrá el correo', async () => {
    await montar(detalle({ solicitud: solicitud({ autorizacion_momento: 'despues_firma' }) }));
    expect(screen.getByText(/saldrá cuando la firma quede completa/)).toBeInTheDocument();
  });

  test('sin rondas y con momento normal: aún no se ha pedido, y ofrece enviar o registrar', async () => {
    await montar(detalle());
    expect(screen.getByText('Aún no se ha pedido.')).toBeInTheDocument();
    expect(boton('ENVIAR CORREO')).toBeInTheDocument();
    expect(boton('REGISTRAR RESPUESTA')).toBeInTheDocument();
  });

  test.each([
    ['solicitada', ronda({ estado: 'solicitada' }), /SOLICITADA/, /Enviada a nomina@empresa\.com/],
    ['sin destinatario', ronda({ estado: 'sin_destinatario', enviada_a: [], enviada_at: null }), /SIN DESTINATARIO/, /No hay a quién pedírsela/],
    ['rechazada', ronda({ estado: 'rechazada', motivo_rechazo: 'Cuota muy alta' }), /RECHAZADA/, /Motivo: Cuota muy alta/],
    ['invalidada', ronda({ estado: 'invalidada' }), /PERDIÓ VIGENCIA/, /Enviada a/],
  ])('ronda %s', async (_, r, estado, detalleTxt) => {
    await montar(detalle({ autorizaciones: [r], pistas: pistas({ autorizacion_estado: r.estado }) }));
    expect(screen.getAllByText(estado).length).toBeGreaterThan(0);
    expect(screen.getByText(detalleTxt)).toBeInTheDocument();
  });

  test('con varias rondas, la última manda; "enviar de nuevo" reemplaza a "enviar correo"', async () => {
    await montar(detalle({ autorizaciones: [ronda({ id: 'r2', estado: 'solicitada' }), ronda({ id: 'r1', estado: 'rechazada', motivo_rechazo: 'x' })], pistas: pistas({ autorizacion_estado: 'solicitada' }) }));
    expect(screen.getAllByText(/SOLICITADA|RECHAZADA/)).toHaveLength(3);
    expect(boton('ENVIAR DE NUEVO')).toBeInTheDocument();
    sinBoton('^ENVIAR CORREO');
  });

  test('una autorización aprobada muestra fecha, cuota y soporte, y ya no ofrece acciones', async () => {
    await montar(completo());
    expect(screen.getByText('AUTORIZADA')).toBeInTheDocument();
    expect(screen.getByText(/Fecha de la autorización: .*22.* · Correo electrónico · cuota \$260\.000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver soporte/ })).toBeInTheDocument();
    sinBoton('REGISTRAR RESPUESTA'); sinBoton('ENVIAR DE NUEVO');
  });

  test('enviar el correo: prellena las direcciones de la última ronda, valida y pide al servidor', async () => {
    await montar(detalle({ autorizaciones: [ronda({ estado: 'rechazada', enviada_a: ['a@e.com', 'b@e.com'], motivo_rechazo: 'x' })], pistas: pistas({ autorizacion_estado: 'rechazada' }) }));
    api.post.mockResolvedValueOnce({ data: { resultado: 'solicitada' } });
    await user.click(boton('ENVIAR DE NUEVO'));
    const modal = dialogo('PEDIR AUTORIZACIÓN A LA EMPRESA');
    const campo = within(modal).getByPlaceholderText('nomina@empresa.com');
    expect(campo).toHaveValue('a@e.com, b@e.com');
    await user.clear(campo); await user.type(campo, 'mal-correo');
    expect(within(modal).getByText(/Correo inválido: mal-correo/)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'ENVIAR CORREO' })).toBeDisabled();
    await user.clear(campo); await user.type(campo, ' Nomina@Empresa.com ; rrhh@empresa.com');
    await user.click(within(modal).getByRole('button', { name: 'ENVIAR CORREO' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/autorizacion/enviar`, { emails: ['nomina@empresa.com', 'rrhh@empresa.com'] }));
    expect(toast.success).toHaveBeenCalledWith('Correo enviado a la empresa');
  });

  test('con el campo vacío usa el correo configurado de la empresa (cuerpo vacío)', async () => {
    await montar(detalle());
    api.post.mockResolvedValueOnce({ data: { resultado: 'sin_destinatario' } });
    await user.click(boton('ENVIAR CORREO'));
    await user.click(within(dialogo('PEDIR AUTORIZACIÓN A LA EMPRESA')).getByRole('button', { name: 'ENVIAR CORREO' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/autorizacion/enviar`, {}));
    expect(toast.success).toHaveBeenCalledWith('No se pudo enviar el correo: revisa la dirección');
  });

  describe('registrar la respuesta de la empresa', () => {
    const abrir = async () => { await montar(detalle({ autorizaciones: [ronda()], pistas: pistas({ autorizacion_estado: 'solicitada' }) })); await user.click(boton('REGISTRAR RESPUESTA')); return dialogo('REGISTRAR RESPUESTA DE LA EMPRESA'); };

    test('aprobar exige la fecha y el PDF del correo como soporte', async () => {
      const modal = await abrir();
      const registrar = within(modal).getByRole('button', { name: 'REGISTRAR' });
      expect(registrar).toBeDisabled();
      expect(within(modal).getByText(/SOPORTE — PDF DEL CORREO DE LA EMPRESA \(OBLIGATORIO\)/)).toBeInTheDocument();
      await user.upload(within(modal).getByLabelText(/SOPORTE/), new File(['%PDF'], 'correo.pdf', { type: 'application/pdf' }));
      expect(registrar).toBeEnabled();
      await user.type(within(modal).getByLabelText(/CUOTA AUTORIZADA/), '260.000abc');
      await user.click(registrar);
      await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/autorizacion/registrar`, expect.any(FormData)));
      expect(formData(api.post.mock.calls[0])).toMatchObject({ decision: 'aprobada', canal: 'correo', cuota_autorizada: '260000', archivo: 'archivo:correo.pdf' });
      expect(formData(api.post.mock.calls[0]).fecha_autorizacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(toast.success).toHaveBeenCalledWith('Respuesta de la empresa registrada');
    });

    test('rechazar exige el motivo y el soporte es opcional', async () => {
      const modal = await abrir();
      await user.click(within(modal).getByLabelText(/La empresa RECHAZA/));
      const registrar = within(modal).getByRole('button', { name: 'REGISTRAR' });
      expect(registrar).toBeDisabled();
      expect(within(modal).getByText(/SOPORTE \(OPCIONAL\)/)).toBeInTheDocument();
      await user.type(within(modal).getByLabelText(/MOTIVO DEL RECHAZO/), 'Cuota muy alta');
      expect(registrar).toBeEnabled();
      await user.click(registrar);
      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(formData(api.post.mock.calls[0])).toEqual({ decision: 'rechazada', canal: 'correo', motivo_rechazo: 'Cuota muy alta' });
    });

    test('se puede indicar por qué medio respondió la empresa', async () => {
      const modal = await abrir();
      const canales = within(within(modal).getByLabelText(/MEDIO DE LA RESPUESTA/)).getAllByRole('option').map((o) => o.textContent);
      expect(canales).toEqual(['Correo electrónico', 'Teléfono', 'Documento físico', 'Otro']);
    });

    test('si el servidor rechaza, muestra el mensaje y deja el modal abierto', async () => {
      const modal = await abrir();
      api.post.mockRejectedValueOnce({ response: { data: { error: 'La fecha de la autorización no puede ser futura' } } });
      await user.upload(within(modal).getByLabelText(/SOPORTE/), new File(['%PDF'], 'c.pdf'));
      await user.click(within(modal).getByRole('button', { name: 'REGISTRAR' }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La fecha de la autorización no puede ser futura'));
      expect(screen.getByRole('dialog', { name: 'REGISTRAR RESPUESTA DE LA EMPRESA' })).toBeInTheDocument();
    });
  });
});

describe('Expediente — 3. documentos del asociado', () => {
  test('el desprendible siempre se exige; el certificado bancario solo con transferencia', async () => {
    const { unmount } = await montar(detalle({ pistas: pistas({ certificado_requerido: false }) }));
    expect(screen.getByText('Desprendible de nómina')).toBeInTheDocument();
    expect(screen.getByText(/Certificado bancario: no se exige \(cheque\)/)).toBeInTheDocument();
    unmount();
    await montar(detalle({ solicitud: solicitud({ forma_desembolso: 'transferencia' }), pistas: pistas({ certificado_requerido: true }) }));
    expect(screen.getByText('FALTAN')).toBeInTheDocument();      // encabezado de la pista
    expect(screen.getAllByText('FALTA')).toHaveLength(2);        // desprendible y certificado
    expect(screen.queryByText(/no se exige/)).toBeNull();
  });

  test('un adjunto ya cargado se muestra con opción de verlo y quitarlo; permite agregar otro', async () => {
    await montar(completo());
    expect(screen.getByText('desprendible.pdf')).toBeInTheDocument();
    expect(screen.getByText('CARGADO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver desprendible.pdf' })).toBeInTheDocument();
    expect(screen.getByText('reemplazar / agregar otro')).toBeInTheDocument();
  });

  test('subir el desprendible envía el tipo correcto', async () => {
    await montar(detalle());
    const etiqueta = screen.getAllByText('subir archivo')[0].closest('label');
    await user.upload(etiqueta.querySelector('input'), new File(['%PDF'], 'nomina.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/documentos/adjunto`, expect.any(FormData)));
    expect(formData(api.post.mock.calls[0])).toEqual({ tipo: 'desprendible_nomina', archivo: 'archivo:nomina.pdf' });
    expect(toast.success).toHaveBeenCalledWith('Desprendible de nómina cargado');
  });

  test('con transferencia, el segundo campo sube el certificado bancario', async () => {
    await montar(detalle({ solicitud: solicitud({ forma_desembolso: 'transferencia' }), pistas: pistas({ certificado_requerido: true }) }));
    const etiqueta = screen.getAllByText('subir archivo')[1].closest('label');
    await user.upload(etiqueta.querySelector('input'), new File(['%PDF'], 'banco.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(formData(api.post.mock.calls[0]).tipo).toBe('certificado_bancario');
  });

  test('quitar un adjunto lo retira', async () => {
    await montar(completo());
    await user.click(screen.getByRole('button', { name: 'Quitar desprendible.pdf' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/creditos/${ID}/documentos/a1`));
  });

  test('los documentos retirados o invalidados se cuentan en una nota', async () => {
    await montar(detalle({ documentos: [doc({ vigente: false }), doc({ id: 'd9', vigente: false })] }));
    expect(screen.getByText(/2 documento\(s\) sin vigencia/)).toBeInTheDocument();
  });
});

describe('Expediente — ver documentos', () => {
  test('el ojito abre el enlace temporal en una pestaña nueva y recarga (la consulta queda en el historial)', async () => {
    await montar(completo());
    api.get.mockClear();
    responder(actual);
    await user.click(screen.getByRole('button', { name: 'Ver pagare.pdf' }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('https://s3.example/doc.pdf', '_blank', 'noopener,noreferrer'));
    expect(api.get).toHaveBeenCalledWith(`/creditos/${ID}/archivos/arch-1/url`);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/creditos/${ID}`));
  });

  test('si no se puede abrir, avisa', async () => {
    await montar(completo());
    api.get.mockImplementation(async (url) => { if (url.endsWith('/url')) throw { response: { data: { error: 'Archivo no encontrado' } } }; return { data: actual }; });
    await user.click(screen.getByRole('button', { name: 'Ver pagare.pdf' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Archivo no encontrado'));
    expect(window.open).not.toHaveBeenCalled();
  });

  test('en modo Cartera usa las rutas de Cartera', async () => {
    await montar(completo({ solicitud: solicitud({ estado: 'entregada' }) }), { modo: 'cartera', api: '/cartera' });
    await user.click(screen.getByRole('button', { name: 'Ver pagare.pdf' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/cartera/${ID}/archivos/arch-1/url`));
  });
});

describe('Expediente — entrega a Cartera', () => {
  test('mientras falte algo, lista lo que falta y no deja entregar', async () => {
    await montar(detalle({ faltantes: ['Sube los documentos a firmar', 'Falta el desprendible de nómina'] }));
    expect(screen.getByText('Falta el desprendible de nómina')).toBeInTheDocument();
    expect(boton('ENTREGAR A CARTERA')).toBeDisabled();
  });

  test('con el expediente completo lo dice y entrega', async () => {
    await montar(completo());
    expect(screen.getByText(/El expediente está completo y listo para entregar/)).toBeInTheDocument();
    await user.click(boton('ENTREGAR A CARTERA'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/entregar`));
    expect(toast.success).toHaveBeenCalledWith('Solicitud entregada a Cartera');
  });

  test('si el servidor responde 409 con faltantes, los muestra', async () => {
    await montar(completo());
    api.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'La solicitud aún no está lista para Cartera', faltantes: ['Firma: 0 de 1 documentos firmados'] } } });
    await user.click(boton('ENTREGAR A CARTERA'));
    expect(await screen.findByText(/No se pudo entregar: Firma: 0 de 1 documentos firmados/)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('La solicitud aún no está lista para Cartera');
  });
});

describe('Expediente — editar, cerrar y reasignar', () => {
  test('editar condiciones: precarga los valores, valida y envía solo lo necesario', async () => {
    await montar(detalle());
    await user.click(boton('EDITAR CONDICIONES'));
    const modal = dialogo('EDITAR CONDICIONES');
    const campos = within(modal).getAllByRole('textbox');
    const valor = within(modal).getByLabelText('VALOR SOLICITADO');
    expect(valor).toHaveValue('5000000');
    expect(within(modal).queryByLabelText('MONTO A DESEMBOLSAR')).toBeNull();
    expect(within(modal).queryByLabelText('MOTIVO DE LA DIFERENCIA')).toBeNull();
    expect(campos.length).toBeGreaterThan(3);
    const guardar = within(modal).getByRole('button', { name: 'GUARDAR CAMBIOS' });
    expect(guardar).toBeEnabled();

    await user.clear(valor);
    expect(guardar).toBeDisabled();   // sin valor no se guarda
    await user.type(valor, '6000000');
    expect(guardar).toBeEnabled();
    await user.click(guardar);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/creditos/${ID}`, expect.objectContaining({
      valor_solicitado: 6000000, cuotas: 36, cuota_mensual: 260000, forma_desembolso: 'cheque',
    })));
    const enviado = api.put.mock.calls[0][1];
    expect(enviado).not.toHaveProperty('monto_desembolso');
    expect(enviado).not.toHaveProperty('motivo_diferencia');
  });

  test('avisa que cambiar las condiciones invalida lo firmado y autorizado, solo si hay algo que invalidar', async () => {
    await montar(completo());
    await user.click(boton('EDITAR CONDICIONES'));
    const modal = dialogo('EDITAR CONDICIONES');
    expect(within(modal).queryByText(/pierdan vigencia/)).toBeNull();   // aún no cambió nada
    await user.clear(within(modal).getByLabelText('CUOTAS')); await user.type(within(modal).getByLabelText('CUOTAS'), '48');
    expect(within(modal).getByText(/pierdan vigencia/)).toBeInTheDocument();
    await user.clear(within(modal).getByLabelText('CUOTAS')); await user.type(within(modal).getByLabelText('CUOTAS'), '36');
    expect(within(modal).queryByText(/pierdan vigencia/)).toBeNull();   // volvió al valor original
    await user.selectOptions(within(modal).getByLabelText('FORMA DE DESEMBOLSO'), 'transferencia');
    expect(within(modal).queryByText(/pierdan vigencia/)).toBeNull();   // la forma de desembolso no invalida nada
  });

  test('sin firmas ni autorización, cambiar valores no avisa de invalidaciones', async () => {
    await montar(detalle());
    await user.click(boton('EDITAR CONDICIONES'));
    const modal = dialogo('EDITAR CONDICIONES');
    await user.clear(within(modal).getByLabelText('VALOR SOLICITADO')); await user.type(within(modal).getByLabelText('VALOR SOLICITADO'), '6000000');
    expect(within(modal).queryByText(/pierdan vigencia/)).toBeNull();
  });

  test('al guardar con invalidaciones el aviso lo dice', async () => {
    await montar(completo());
    api.put.mockResolvedValueOnce({ data: { solicitud: {}, invalidados: 2 } });
    await user.click(boton('EDITAR CONDICIONES'));
    const modal = dialogo('EDITAR CONDICIONES');
    await user.clear(within(modal).getByLabelText('CUOTAS')); await user.type(within(modal).getByLabelText('CUOTAS'), '48');
    await user.click(within(modal).getByRole('button', { name: 'GUARDAR CAMBIOS' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Condiciones actualizadas: hay que volver a firmar y a pedir la autorización'));
  });

  test('desistir o cerrar pide un motivo y la razón del cierre', async () => {
    await montar(detalle());
    await user.click(boton('DESISTIR / CERRAR'));
    const modal = dialogo('DESISTIR / CERRAR LA SOLICITUD');
    const cerrar = within(modal).getByRole('button', { name: 'CERRAR SOLICITUD' });
    expect(cerrar).toBeDisabled();
    expect(within(within(modal).getByRole('combobox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['El asociado desistió', 'La solicitud fue rechazada']);
    await user.type(within(modal).getByRole('textbox'), 'ab');
    expect(cerrar).toBeDisabled();   // mínimo 3 caracteres
    await user.type(within(modal).getByRole('textbox'), 'c ya no lo necesita');
    await user.selectOptions(within(modal).getByRole('combobox'), 'rechazada');
    await user.click(cerrar);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/cerrar`, { estado: 'rechazada', motivo: 'abc ya no lo necesita' }));
    expect(toast.success).toHaveBeenCalledWith('Solicitud cerrada');
  });

  describe('reasignar', () => {
    const abrir = async () => { await montar(detalle({ puede_reasignar: true })); await user.click(boton('REASIGNAR')); return dialogo('REASIGNAR SOLICITUD'); };

    test('lista a los demás asesores (no al actual), y exige elegir uno y dar un motivo', async () => {
      const modal = await abrir();
      await waitFor(() => expect(within(modal).getByRole('option', { name: /María Ríos/ })).toBeInTheDocument());
      expect(within(modal).queryByRole('option', { name: /Luis Pérez/ })).toBeNull();   // ya es el asesor
      const reasignar = within(modal).getByRole('button', { name: 'REASIGNAR' });
      expect(reasignar).toBeDisabled();
      await user.selectOptions(within(modal).getByRole('combobox'), 'u-2');
      expect(reasignar).toBeDisabled();
      await user.type(within(modal).getByPlaceholderText(/vacaciones/), 'El asesor está de vacaciones');
      expect(reasignar).toBeEnabled();
      await user.click(reasignar);
      await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/creditos/${ID}/reasignar`, { asesor_uuid: 'u-2', motivo: 'El asesor está de vacaciones' }));
      expect(toast.success).toHaveBeenCalledWith('Solicitud reasignada');
    });

    test('advierte que el asesor anterior perderá el acceso', async () => {
      const modal = await abrir();
      expect(within(modal).getByText(/quien la tenía dejará de verla y ya no podrá modificarla/)).toBeInTheDocument();
    });

    test('si no se puede cargar la lista de asesores, avisa', async () => {
      responder(detalle({ puede_reasignar: true }));
      const previo = api.get.getMockImplementation();
      api.get.mockImplementation(async (url) => { if (url === '/creditos/asesores') throw { response: { data: { error: 'Solo un administrador puede reasignar solicitudes' } } }; return previo(url); });
      render(<MemoryRouter><ExpedienteDetalle id={ID} api="/creditos" modo="asesor" volver="/creditos" /></MemoryRouter>);
      await user.click(await screen.findByRole('button', { name: /REASIGNAR/ }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Solo un administrador puede reasignar solicitudes'));
    });
  });
});

describe('Expediente — modo Cartera', () => {
  const cartera = (extra = {}) => montar(completo({ solicitud: solicitud({ estado: 'entregada' }), puede_editar: false, ...extra }), { modo: 'cartera', api: '/cartera' });

  test('Cartera no ve ninguna acción de edición', async () => {
    await cartera();
    for (const t of ['EDITAR CONDICIONES', 'DESISTIR', 'SUBIR PDF', 'ENTREGAR A CARTERA', 'REGISTRAR RESPUESTA', 'ENVIAR', 'REASIGNAR', 'FIRMAR CON EL ASOCIADO']) sinBoton(t);
    expect(screen.queryByText(/Solo lectura/)).toBeNull();   // ese aviso es del modo asesor
    expect(screen.queryByRole('button', { name: /Quitar/ })).toBeNull();
  });

  test('una solicitud entregada ofrece descargar el expediente, recibir y devolver', async () => {
    await cartera();
    expect(boton('DESCARGAR EXPEDIENTE \\(ZIP\\)')).toBeInTheDocument();
    expect(boton('RECIBIR EXPEDIENTE')).toBeInTheDocument();
    expect(boton('DEVOLVER AL ASESOR')).toBeInTheDocument();
    expect(boton('VERIFICAR INTEGRIDAD')).toBeInTheDocument();
  });

  test.each([['recibida', true, false], ['en_tramite', false, false], ['devuelta', false, false], ['desistida', false, false]])('en estado %s: descarga=%s, decisión=%s', async (estado, descarga, decide) => {
    await montar(completo({ solicitud: solicitud({ estado }), puede_editar: false }), { modo: 'cartera', api: '/cartera' });
    expect(!!screen.queryByRole('button', { name: /DESCARGAR EXPEDIENTE/ })).toBe(descarga);
    expect(!!screen.queryByRole('button', { name: /RECIBIR EXPEDIENTE/ })).toBe(decide);
    expect(!!screen.queryByRole('button', { name: /DEVOLVER AL ASESOR/ })).toBe(decide);
  });

  test('descargar el expediente pide el ZIP y lo entrega con el nombre del radicado', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { descarga = this.download; });
    let descarga;
    URL.createObjectURL = vi.fn(() => 'blob:zip'); URL.revokeObjectURL = vi.fn();
    await cartera();
    api.get.mockImplementation(async (url, opciones) => { if (url === `/cartera/${ID}/expediente`) { expect(opciones).toEqual({ responseType: 'blob' }); return { data: new Blob(['zip']) }; } return { data: actual }; });
    await user.click(boton('DESCARGAR EXPEDIENTE'));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(descarga).toBe('expediente_CR-2026-000123.zip');
    expect(toast.success).toHaveBeenCalledWith('Expediente descargado');
    clic.mockRestore();
  });

  test('mientras prepara el ZIP el botón lo indica y se bloquea', async () => {
    await cartera();
    let liberar;
    api.get.mockImplementation((url) => (url.endsWith('/expediente') ? new Promise((res) => { liberar = () => res({ data: new Blob(['z']) }); }) : Promise.resolve({ data: actual })));
    URL.createObjectURL = vi.fn(() => 'blob:z'); URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(boton('DESCARGAR EXPEDIENTE'));
    expect(await screen.findByRole('button', { name: /PREPARANDO…/ })).toBeDisabled();
    liberar();
    await waitFor(() => expect(screen.getByRole('button', { name: /DESCARGAR EXPEDIENTE/ })).toBeEnabled());
    clic.mockRestore();
  });

  test('si el servidor rechaza la descarga, muestra su mensaje (viene dentro de un Blob)', async () => {
    await cartera();
    const cuerpo = new Blob([JSON.stringify({ error: 'Solo se descarga el expediente de solicitudes entregadas a Cartera' })]);
    api.get.mockImplementation(async (url) => { if (url.endsWith('/expediente')) throw { response: { data: { text: async () => JSON.stringify({ error: 'Solo se descarga el expediente de solicitudes entregadas a Cartera' }) } } }; return { data: actual }; });
    await user.click(boton('DESCARGAR EXPEDIENTE'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Solo se descarga el expediente de solicitudes entregadas a Cartera'));
    expect(cuerpo.size).toBeGreaterThan(0);
  });

  test('si el error no trae detalle, usa un mensaje genérico', async () => {
    await cartera();
    api.get.mockImplementation(async (url) => { if (url.endsWith('/expediente')) throw new Error('Network Error'); return { data: actual }; });
    await user.click(boton('DESCARGAR EXPEDIENTE'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo descargar el expediente'));
  });

  test('verificar integridad marca cada documento como íntegro o alterado', async () => {
    await cartera();
    api.get.mockImplementation(async (url) => { if (url.endsWith('/integridad')) return { data: [{ id: 'f1', integro: false }, { id: 'a1', integro: true }] }; return { data: actual }; });
    await user.click(boton('VERIFICAR INTEGRIDAD'));
    expect(await screen.findByText(/¡NO COINCIDE!/)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Hay documentos que NO coinciden con su huella digital');
  });

  test('si todo es íntegro lo confirma', async () => {
    await cartera();
    api.get.mockImplementation(async (url) => { if (url.endsWith('/integridad')) return { data: [{ id: 'f1', integro: true }] }; return { data: actual }; });
    await user.click(boton('VERIFICAR INTEGRIDAD'));
    expect(await screen.findByText(/íntegro ✓/)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Todos los documentos coinciden con su huella digital');
  });

  test('recibir el expediente', async () => {
    await cartera();
    await user.click(boton('RECIBIR EXPEDIENTE'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/cartera/${ID}/recibir`));
    expect(toast.success).toHaveBeenCalledWith('Expediente recibido');
  });

  test('devolver exige un motivo real y avisa al asesor', async () => {
    await cartera();
    await user.click(boton('DEVOLVER AL ASESOR'));
    const modal = dialogo('DEVOLVER AL ASESOR');
    const devolver = within(modal).getByRole('button', { name: 'DEVOLVER' });
    expect(devolver).toBeDisabled();
    await user.type(within(modal).getByPlaceholderText(/qué debe corregir/i), 'ab');
    expect(devolver).toBeDisabled();
    await user.type(within(modal).getByPlaceholderText(/qué debe corregir/i), 'c: el desprendible está ilegible');
    await user.click(devolver);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/cartera/${ID}/devolver`, { motivo: 'abc: el desprendible está ilegible' }));
    expect(toast.success).toHaveBeenCalledWith('Solicitud devuelta al asesor');
  });

  test('advierte si el expediente dejó de estar completo después de entregarse', async () => {
    await cartera({ pistas: pistas({ a_firmar: 1, firmados: 0, expediente_completo: false }) });
    expect(screen.getByText(/ya no está completo/)).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Expediente — cierre de Cartera', () => {
  const cartera = (estado, extra = {}) => montar(completo({ solicitud: solicitud({ estado }), puede_editar: false, ...extra }), { modo: 'cartera', api: '/cartera' });

  test.each(['recibida', 'completada'])('Cartera ve el panel de cierre cuando la solicitud está %s', async (estado) => {
    cierrePanel.props = null;
    await cartera(estado);
    expect(screen.getByTestId('cierre-panel')).toHaveTextContent('cierre de sol-1');
    expect(cierrePanel.props.asociado).toMatchObject({ codigo: '1088000111' });
  });

  test.each(['entregada', 'devuelta', 'en_tramite'])('no aparece con la solicitud %s', async (estado) => {
    await cartera(estado);
    expect(screen.queryByTestId('cierre-panel')).toBeNull();
  });

  test('el asesor nunca ve el panel de cierre', async () => {
    await montar(completo({ solicitud: solicitud({ estado: 'recibida' }), puede_editar: false }));
    expect(screen.queryByTestId('cierre-panel')).toBeNull();
  });

  test('cuando el panel cambia algo, el expediente se vuelve a cargar', async () => {
    await cartera('recibida');
    const llamadas = api.get.mock.calls.length;
    cierrePanel.props.onCambio();
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(llamadas));
  });

  test('los documentos de Cartera no se mezclan con los del asesor (ni cuentan como firmas pendientes)', async () => {
    const propios = [
      doc({ id: 'c1', tipo: 'comprobante_aprobacion', nombre: 'comprobante_cartera.pdf', etapa: 'cartera', archivo_id: 'ar-c1' }),
      doc({ id: 'c2', clase: 'firmado', tipo: 'comprobante_aprobacion', nombre: 'comprobante_cartera_firmado.pdf', borrador_id: 'c1', etapa: 'cartera', archivo_id: 'ar-c2' }),
    ];
    const base = completo();
    await cartera('recibida', { documentos: [...base.documentos, ...propios] });
    expect(screen.queryByText(/Comprobante de aprobación/)).toBeNull();
    expect(screen.queryByText('comprobante_cartera.pdf')).toBeNull();
    expect(screen.queryByText('comprobante_cartera_firmado.pdf')).toBeNull();
    expect(screen.getAllByText(/Pagaré/).length).toBeGreaterThan(0);   // lo del asesor sigue en su lugar
  });
});

describe('Expediente — estado completada', () => {
  test('se ve con su etiqueta de Control Interno', async () => {
    await montar(completo({ solicitud: solicitud({ estado: 'completada' }), puede_editar: false }), { modo: 'cartera', api: '/cartera' });
    expect(screen.getByText('COMPLETADA · EN CONTROL INTERNO')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Expediente — rediseño: progreso, siguiente paso, cifras y documentos', () => {
  test('muestra la línea de progreso con el paso actual', async () => {
    await montar(detalle({ pistas: pistas({ a_firmar: 5, firmados: 2 }) }));
    const region = screen.getByRole('region', { name: 'Progreso de la solicitud' });
    expect(within(region).getByText('2/5 documentos')).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem').find((l) => l.getAttribute('aria-current') === 'step')).toHaveTextContent('Firma');
  });

  test('en Tesorería el progreso está casi completo y el siguiente paso es de Tesorería', async () => {
    await montar(completo({ solicitud: solicitud({ estado: 'en_tesoreria', monto_desembolso: '4485000' }), puede_editar: false }), { modo: 'cartera', api: '/cartera' });
    const sig = screen.getByRole('region', { name: 'Siguiente paso' });
    expect(sig).toHaveTextContent('TESORERÍA');
    expect(sig).toHaveTextContent('Pagar el desembolso.');
    expect(screen.getByRole('progressbar', { name: 'Avance' })).toHaveAttribute('aria-valuenow', '6');
  });

  test('el siguiente paso del asesor es lo primero que falta y cuántos más hay', async () => {
    await montar(detalle({ faltantes: ['Sube los documentos a firmar', 'Falta el desprendible de nómina'] }));
    const sig = screen.getByRole('region', { name: 'Siguiente paso' });
    expect(sig).toHaveTextContent('ASESOR');
    expect(sig).toHaveTextContent('Sube los documentos a firmar');
    expect(sig).toHaveTextContent('y 1 más por completar');
  });

  test('una solicitud pagada dice que el proceso terminó', async () => {
    await montar(completo({ solicitud: solicitud({ estado: 'pagada', monto_desembolso: '4485000' }), puede_editar: false }));
    expect(screen.getByRole('region', { name: 'Siguiente paso' })).toHaveTextContent('Proceso terminado');
    expect(screen.getByText('ESTADO FINAL')).toBeInTheDocument();
  });

  test('las cifras clave van juntas arriba: valor, desembolso, forma y cuotas', async () => {
    await montar(detalle());
    const cifras = screen.getByLabelText('Resumen del crédito');
    expect(cifras).toHaveTextContent('VALOR SOLICITADO$5.000.000');
    expect(cifras).toHaveTextContent('A DESEMBOLSARLo calcula Cartera');
    expect(cifras).toHaveTextContent('FORMA DE DESEMBOLSOCheque');
    expect(cifras).toHaveTextContent('36 × $260.000');
  });

  test('el contexto (asociado, empresa y condiciones) está en la columna lateral', async () => {
    await montar(detalle());
    const lateral = document.querySelector('aside');
    expect(within(lateral).getByText('ANA GÓMEZ', { exact: false })).toBeInTheDocument();
    expect(within(lateral).getByText('Empresa Uno SA')).toBeInTheDocument();
    expect(within(lateral).getByText('Firma presencial (tableta / huella)')).toBeInTheDocument();
    expect(within(lateral).getByText('Requerida')).toBeInTheDocument();
  });

  test('cada documento se muestra como ficha con formato, peso, fecha y quién lo subió', async () => {
    await montar(completo());
    const ficha = screen.getByRole('button', { name: 'Ver desprendible.pdf' }).closest('div.flex.items-start');
    expect(within(ficha).getByText('Desprendible de nómina')).toBeInTheDocument();
    expect(within(ficha).getByText('PDF')).toBeInTheDocument();
    expect(within(ficha).getByText(/1 KB · 20 de sept de 2026 · Luis Pérez/)).toBeInTheDocument();
    expect(within(ficha).getByRole('button', { name: 'Ver desprendible.pdf' })).toHaveTextContent('VER');
  });

  test('los documentos firmados y los pendientes se distinguen por color', async () => {
    await montar(detalle({ documentos: [doc(), doc({ id: 'd2', tipo: 'libranza', nombre: 'libranza.pdf', archivo_id: 'arch-2' }), doc({ id: 'f1', clase: 'firmado', borrador_id: 'd1', nombre: 'pagare_firmado.pdf', archivo_id: 'arch-f', folio: 'abcdef1234567890' })], pistas: pistas({ a_firmar: 2, firmados: 1 }) }));
    expect(screen.getByRole('button', { name: 'Ver pagare.pdf' }).closest('li')).toHaveClass('border-emerald-800/50');
    expect(screen.getByRole('button', { name: 'Ver libranza.pdf' }).closest('li')).toHaveClass('border-amber-800/50');
  });

  test('un adjunto que falta se ve como un espacio vacío con explicación', async () => {
    await montar(detalle());
    expect(screen.getAllByText(/Todavía no hay ningún archivo/)).toHaveLength(1);
    expect(screen.getAllByText('FALTA')).toHaveLength(1);
  });
});
