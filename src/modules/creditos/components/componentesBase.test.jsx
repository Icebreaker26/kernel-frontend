import { describe, test, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Modal from './Modal.jsx';
import Timeline from './Timeline.jsx';
import TablaSolicitudes, { Pistas, Etiqueta } from './TablaSolicitudes.jsx';

const enRuta = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Modal ─────────────────────────────────────────────────────────────────────
describe('Modal', () => {
  test('muestra título y contenido, y se cierra con la X, con Esc y con clic fuera', () => {
    const onClose = vi.fn();
    render(<Modal titulo="EDITAR" onClose={onClose}><p>contenido</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'EDITAR' })).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('dialog'));   // el velo
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  test('un clic dentro del contenido no lo cierra, y otra tecla tampoco', () => {
    const onClose = vi.fn();
    render(<Modal titulo="X" onClose={onClose}><button>dentro</button></Modal>);
    fireEvent.click(screen.getByText('dentro'));
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('deja de escuchar Esc al desmontarse', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Modal titulo="X" onClose={onClose}>a</Modal>);
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Línea de tiempo ───────────────────────────────────────────────────────────
describe('Timeline', () => {
  const ev = (id, tipo, extra = {}) => ({ id, tipo, detalle: {}, autor_tipo: 'empleado', autor_nombre: 'Luis Pérez', created_at: `2026-09-2${id}T15:00:00.000Z`, ...extra });

  test('muestra lo más reciente primero, con texto legible, autor y fecha', () => {
    render(<Timeline eventos={[ev(1, 'radicada'), ev(2, 'firma_completa'), ev(3, 'entregada_a_cartera')]} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Entregada a Cartera');
    expect(items[1]).toHaveTextContent('Firma completa');
    expect(items[2]).toHaveTextContent('Solicitud radicada');
    expect(items[0]).toHaveTextContent('Luis Pérez');
  });

  test('un evento del sistema o de la empresa muestra su origen si no hay nombre', () => {
    render(<Timeline eventos={[ev(1, 'correo_enviado', { autor_nombre: null, autor_tipo: 'sistema' }), ev(2, 'radicada', { autor_nombre: null, autor_tipo: 'empresa' })]} />);
    expect(screen.getByText(/Sistema/)).toBeInTheDocument();
    expect(screen.getByText(/empresa/)).toBeInTheDocument();
  });

  test('un código de evento desconocido se muestra tal cual en vez de fallar', () => {
    render(<Timeline eventos={[ev(1, 'evento_nuevo_del_futuro')]} />);
    expect(screen.getByText('evento_nuevo_del_futuro')).toBeInTheDocument();
  });

  test('muestra el detalle: mensaje, motivo, documento o destinatarios', () => {
    render(<Timeline eventos={[
      ev(1, 'correo_fallido', { detalle: { mensaje: 'No se pudo enviar a x@y.com' } }),
      ev(2, 'devuelta_por_cartera', { detalle: { motivo: 'Desprendible ilegible' } }),
      ev(3, 'documento_firmado', { detalle: { tipo: 'pagare', nombre: 'pagare.pdf' } }),
      ev(4, 'autorizacion_solicitada', { detalle: { a: ['a@e.com', 'b@e.com'] } }),
    ]} />);
    expect(screen.getByText('No se pudo enviar a x@y.com')).toBeInTheDocument();
    expect(screen.getByText('Desprendible ilegible')).toBeInTheDocument();
    expect(screen.getByText('pagare — pagare.pdf')).toBeInTheDocument();
    expect(screen.getByText('A: a@e.com, b@e.com')).toBeInTheDocument();
  });

  test('la reasignación cuenta de quién a quién y por qué', () => {
    render(<Timeline eventos={[ev(1, 'reasignada', { detalle: { de: 'Ana', a: 'Luis', motivo: 'Vacaciones' } })]} />);
    expect(screen.getByText('Solicitud reasignada a otro asesor')).toBeInTheDocument();
    expect(screen.getByText('De Ana a Luis — Vacaciones')).toBeInTheDocument();
  });

  test('los eventos de alerta se marcan en rojo y los de éxito en verde', () => {
    const { container } = render(<Timeline eventos={[ev(1, 'radicada'), ev(2, 'correo_fallido', { detalle: { mensaje: 'x' } }), ev(3, 'autorizacion_aprobada')]} />);
    expect(container.querySelectorAll('.bg-rose-500')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-emerald-400')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-slate-600')).toHaveLength(1);
  });

  test('sin eventos no muestra nada', () => {
    render(<Timeline eventos={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

// ── Semáforo y tabla ──────────────────────────────────────────────────────────
const fila = (extra = {}) => ({
  id: 'id-1', radicado: 'CR-2026-000123', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión',
  monto_desembolso: '5000000', estado: 'en_tramite', created_at: '2026-09-20T10:00:00Z', entregada_at: null, asesor_nombre: 'Luis Pérez', dias: 4,
  a_firmar: 2, firmados: 1, firma_completa: false, autorizacion_requerida: true, autorizacion_estado: 'solicitada', autorizacion_ok: false,
  documentos_ok: false, expediente_completo: false, ...extra,
});

describe('Pistas (semáforo del expediente)', () => {
  const texto = (s) => enRuta(<Pistas s={s} />).container.textContent;

  test('firma: muestra cuántos documentos van firmados y cambia de color al completarse', () => {
    const { container, rerender } = enRuta(<Pistas s={fila()} />);
    expect(container).toHaveTextContent('Firma 1/2');
    expect(container.querySelector('[title="Documentos firmados"]')).toHaveClass('text-amber-400');
    rerender(<MemoryRouter><Pistas s={fila({ firmados: 2, firma_completa: true })} /></MemoryRouter>);
    expect(container.querySelector('[title="Documentos firmados"]')).toHaveClass('text-emerald-400');
  });

  test.each([
    ['no la exige la empresa', { autorizacion_requerida: false, autorizacion_estado: null, autorizacion_ok: true }, 'Autor. N/A', 'text-slate-500'],
    ['aprobada', { autorizacion_estado: 'aprobada', autorizacion_ok: true }, 'Autor. ✓', 'text-emerald-400'],
    ['pedida, esperando respuesta', { autorizacion_estado: 'solicitada' }, 'Autor. ⏳', 'text-amber-400'],
    ['aún no pedida', { autorizacion_estado: null }, 'Autor. —', 'text-amber-400'],
    ['rechazada', { autorizacion_estado: 'rechazada' }, 'Autor. ✗', 'text-rose-400'],
    ['sin destinatario', { autorizacion_estado: 'sin_destinatario' }, 'Autor. ✗', 'text-rose-400'],
    ['perdió vigencia', { autorizacion_estado: 'invalidada' }, 'Autor. ✗', 'text-rose-400'],
  ])('autorización %s', (_, extra, txt, clase) => {
    const { container } = enRuta(<Pistas s={fila(extra)} />);
    expect(container).toHaveTextContent(txt);
    expect(container.querySelector('[title="Autorización de la empresa"]')).toHaveClass(clase);
  });

  test('documentos del asociado y marca de expediente completo', () => {
    const { container, rerender } = enRuta(<Pistas s={fila()} />);
    expect(container).toHaveTextContent('Docs —');
    expect(screen.queryByLabelText('Expediente completo')).toBeNull();
    rerender(<MemoryRouter><Pistas s={fila({ documentos_ok: true, expediente_completo: true })} /></MemoryRouter>);
    expect(container).toHaveTextContent('Docs ✓');
    expect(screen.getByLabelText('Expediente completo')).toBeInTheDocument();
  });
});

describe('Etiqueta de estado', () => {
  test('muestra el nombre del estado; uno desconocido se muestra tal cual', () => {
    const { rerender } = render(<Etiqueta estado="entregada" />);
    expect(screen.getByText('ENTREGADA A CARTERA')).toBeInTheDocument();
    rerender(<Etiqueta estado="raro" />);
    expect(screen.getByText('raro')).toBeInTheDocument();
  });
});

describe('TablaSolicitudes', () => {
  test('lista las solicitudes con enlace al expediente, valores y días', () => {
    enRuta(<TablaSolicitudes filas={[fila(), fila({ id: 'id-2', radicado: 'CR-2026-000124', asociado_nombre: 'LUIS RUIZ', monto_desembolso: '750000' })]} base="/creditos" />);
    const enlace = screen.getByRole('link', { name: 'CR-2026-000123' });
    expect(enlace).toHaveAttribute('href', '/creditos/id-1');
    expect(screen.getByRole('link', { name: 'CR-2026-000124' })).toHaveAttribute('href', '/creditos/id-2');
    expect(screen.getByText('ANA GÓMEZ')).toBeInTheDocument();
    expect(screen.getByText('$5.000.000')).toBeInTheDocument();
    expect(screen.getByText('$750.000')).toBeInTheDocument();
    expect(screen.getAllByText('Libre inversión')).toHaveLength(2);
  });

  test('la base de la ruta cambia según el módulo (Créditos o Cartera)', () => {
    enRuta(<TablaSolicitudes filas={[fila()]} base="/cartera" />);
    expect(screen.getByRole('link', { name: 'CR-2026-000123' })).toHaveAttribute('href', '/cartera/id-1');
  });

  test('sin filas muestra el mensaje indicado', () => {
    enRuta(<TablaSolicitudes filas={[]} base="/creditos" vacio="Aún no hay solicitudes con esos filtros" />);
    expect(screen.getByText('Aún no hay solicitudes con esos filtros')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  test('la columna del asesor solo aparece cuando se pide', () => {
    const { rerender } = enRuta(<TablaSolicitudes filas={[fila()]} base="/creditos" />);
    expect(screen.queryByText('ASESOR')).toBeNull();
    expect(screen.queryByText('Luis Pérez')).toBeNull();
    rerender(<MemoryRouter><TablaSolicitudes filas={[fila()]} base="/creditos" mostrarAsesor /></MemoryRouter>);
    expect(screen.getByText('ASESOR')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  test('la solicitud entregada muestra desde cuándo espera a Cartera', () => {
    enRuta(<TablaSolicitudes filas={[fila({ estado: 'entregada', entregada_at: '2026-09-22T12:00:00Z' })]} base="/cartera" />);
    const celda = screen.getByText('ENTREGADA A CARTERA').closest('td');
    expect(within(celda).getByText(/22/)).toBeInTheDocument();
  });
});
