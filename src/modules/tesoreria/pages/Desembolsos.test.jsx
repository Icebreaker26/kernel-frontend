import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import Desembolsos from './Desembolsos.jsx';

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const orden = (extra = {}) => ({
  id: 'o-1', solicitud_id: 's-1', estado: 'pendiente', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', forma_pago: 'transferencia',
  monto: '4485000.00', banco: 'Bancolombia', tipo_cuenta: 'ahorros', numero_cuenta: '12345678901', titular_nombre: 'ANA GÓMEZ', titular_documento: '1088000111', titular_es_asociado: true,
  aprobada_at: new Date(Date.now() - 2 * 864e5).toISOString(), aprobada_por_nombre: 'Rita Revisora', empresa_codigo: 'E1', empresa_nombre: 'Empresa Uno SA', dias_espera: 2,
  puede_pagar: true, puede_devolver: true, motivo_bloqueo: null, ...extra,
});
const EFECTIVO = () => orden({ id: 'o-2', radicado: 'CR-2026-000002', asociado_nombre: 'LUIS RUIZ', asociado_codigo: '52000222', forma_pago: 'efectivo', banco: null, numero_cuenta: null, titular_nombre: null, monto: '2000000.00', dias_espera: 6 });
const CUENTAS = [
  { id: 'c-banco', nombre: 'Bancolombia Operativa', tipo: 'banco', entidad: 'Bancolombia', numero: '0001' },
  { id: 'c-caja', nombre: 'Caja menor', tipo: 'caja' },
  { id: 'c-tarjeta', nombre: 'Tarjeta', tipo: 'tarjeta' },
];
const FILTROS = { empresas: [{ codigo: 'E1', nombre: 'Empresa Uno SA' }], aprobadores: [{ id: 'u-1', nombre: 'Rita Revisora' }], cuentas: [{ id: 'c-banco', nombre: 'Bancolombia Operativa' }] };

let datos;
let resumen;
let user;
let ubicacion;
const Sonda = () => { ubicacion = useLocation(); return null; };
const montar = (ruta = '/tesoreria/desembolsos') => render(<MemoryRouter initialEntries={[ruta]}><Desembolsos /><Sonda /></MemoryRouter>);
const ultima = (url) => api.get.mock.calls.filter(([u]) => u === url).at(-1);
const tarjeta = (radicado) => screen.findByRole('article', { name: `Desembolso ${radicado}` });

beforeEach(() => {
  user = userEvent.setup();
  localStorage.clear();
  datos = { pendiente: [orden(), EFECTIVO()], pagada: [], anulada: [] };
  datos.todas = [...datos.pendiente];
  resumen = { limite: 500, estados: [{ estado: 'pendiente', n: 2, valor: 6485000 }] };
  api.get.mockReset();
  api.post.mockReset();
  api.get.mockImplementation(async (url, op) => {
    if (url === '/tesoreria/cuentas') return { data: CUENTAS };
    if (url === '/tesoreria/desembolsos/filtros') return { data: FILTROS };
    if (url === '/tesoreria/desembolsos/resumen') return { data: resumen };
    if (url === '/tesoreria/desembolsos') return { data: datos[op.params.estado] ?? [] };
    throw new Error(`GET inesperado ${url}`);
  });
  api.post.mockResolvedValue({ data: { ok: true } });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Tesorería — desembolsos por pagar (tarjetas)', () => {
  test('pide las órdenes pendientes y muestra una tarjeta por crédito con monto, asociado, cuenta y titular', async () => {
    montar();
    const t = within(await tarjeta('CR-2026-000001'));
    expect(ultima('/tesoreria/desembolsos')[1]).toEqual({ params: { estado: 'pendiente' } });
    expect(t.getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(t.getAllByText('ANA GÓMEZ', { selector: 'span.font-bold' })).toHaveLength(2);   // asociado y titular
    expect(t.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
    expect(t.getByText(/Aprobado por Rita Revisora/)).toHaveTextContent(/espera 2 días/);
    expect(t.getByRole('heading')).toHaveTextContent('Empresa Uno SA');
  });

  test('las órdenes en efectivo o cheque no llevan cuenta', async () => {
    montar();
    const t = within(await tarjeta('CR-2026-000002'));
    expect(t.getByText(/MONTO A PAGAR EN EFECTIVO/)).toBeInTheDocument();
    expect(t.queryByTestId('numero-cuenta')).toBeNull();
  });

  test('una cuenta de un tercero se marca en rojo', async () => {
    datos.pendiente = [orden({ titular_nombre: 'LUIS RUIZ', titular_documento: '52000222', titular_es_asociado: false })];
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent(/TITULAR DISTINTO AL ASOCIADO/);
  });

  test('la espera se colorea: >2 días atención y >5 alerta', async () => {
    montar();
    const t1 = within(await tarjeta('CR-2026-000001')).getByText('espera 2 días');
    const t2 = within(await tarjeta('CR-2026-000002')).getByText('espera 6 días');
    expect(t1).toHaveClass('text-slate-400');
    expect(t2).toHaveClass('text-rose-300');
  });

  test('sin órdenes lo dice', async () => {
    datos.pendiente = [];
    montar();
    expect(await screen.findByText('No hay desembolsos por pagar.')).toBeInTheDocument();
  });

  test('sin permiso de leer o con un error avisa', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    const { unmount } = montar();
    expect(await screen.findByText('No tienes permiso para ver los desembolsos.')).toBeInTheDocument();
    unmount();
    api.get.mockRejectedValue({ response: { status: 500 } });
    montar();
    expect(await screen.findByText('No se pudieron cargar los desembolsos.')).toBeInTheDocument();
  });
});

describe('Tesorería — pestañas', () => {
  test('las tres pestañas traen su contador real desde el primer momento', async () => {
    resumen = { limite: 500, estados: [{ estado: 'pendiente', n: 2, valor: 6485000 }, { estado: 'pagada', n: 5, valor: 30000000 }, { estado: 'anulada', n: 1, valor: 100 }] };
    montar();
    await tarjeta('CR-2026-000001');
    const nav = screen.getByRole('navigation', { name: 'Estado de los desembolsos' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['POR PAGAR2', 'PAGADOS5', 'DEVUELTOS1']);
    expect(within(nav).getByRole('button', { name: /POR PAGAR/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('las pestañas piden pagados y devueltos, con cómo se pagó o por qué se devolvió', async () => {
    datos.pagada = [orden({ id: 'o-9', estado: 'pagada', radicado: 'CR-2026-000009', fecha_pago: '2026-09-24T00:00:00.000Z', cuenta_origen_nombre: 'Bancolombia Operativa', referencia_pago: 'TRF-77', pagada_por_nombre: 'Tania Tesorera', dias_espera: 1, puede_pagar: false, puede_devolver: false })];
    datos.anulada = [orden({ id: 'o-8', estado: 'anulada', radicado: 'CR-2026-000008', anulada_motivo: 'El banco rechazó la cuenta', dias_espera: null, puede_pagar: false, puede_devolver: false })];
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /PAGADOS/ }));
    const pagado = within(await tarjeta('CR-2026-000009'));
    expect(pagado.getByText(/Pagado el/)).toHaveTextContent(/desde Bancolombia Operativa · referencia TRF-77 · por Tania Tesorera/);
    expect(pagado.queryByRole('button', { name: 'PAGAR' })).toBeNull();
    expect(pagado.getByText(/Aprobado por/)).toHaveTextContent('tardó 1 día en pagarse');
    expect(ubicacion.search).toBe('?tab=pagada');
    await user.click(screen.getByRole('button', { name: /DEVUELTOS/ }));
    expect(await screen.findByText(/Devuelto a Control Interno: El banco rechazó la cuenta/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /POR PAGAR/ }));
    await tarjeta('CR-2026-000001');
    expect(ubicacion.search).toBe('');   // la de origen no ensucia la URL
  });

  test('una pestaña abierta por enlace se respeta y una inventada cae en "por pagar"', async () => {
    datos.pagada = [orden({ id: 'o-9', estado: 'pagada', radicado: 'CR-2026-000009', cuenta_origen_nombre: 'X', referencia_pago: 'R', pagada_por_nombre: 'Y', fecha_pago: '2026-09-24' })];
    const { unmount } = montar('/tesoreria/desembolsos?tab=pagada');
    expect(await tarjeta('CR-2026-000009')).toBeInTheDocument();
    unmount();
    montar('/tesoreria/desembolsos?tab=inventada');
    expect(await tarjeta('CR-2026-000001')).toBeInTheDocument();
  });

  test('resume cuántos hay y cuánto suman, y explica la pestaña', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    const r = screen.getByLabelText('Resumen de desembolsos');
    await waitFor(() => expect(r).toHaveTextContent('2 desembolsos · $6.485.000'));
    expect(r).toHaveTextContent(/Aprobados por Control Interno: esperan tu pago/);
  });
});

describe('Tesorería — búsqueda y filtros', () => {
  test('busca por texto sin perder la pestaña', async () => {
    montar('/tesoreria/desembolsos?tab=pagada');
    await screen.findByText('Todavía no hay desembolsos pagados con estos filtros.');
    await user.type(screen.getByLabelText('Buscar desembolsos'), 'TRF-77');
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ q: 'TRF-77', estado: 'pagada' }));
  });

  test('trae las opciones de Tesorería y ofrece los filtros propios', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    const panel = screen.getByRole('region', { name: 'Filtros' });
    for (const l of ['FORMA DE PAGO', 'EMPRESA', 'APROBADO POR', 'PAGADO DESDE (CUENTA)', 'APROBADOS DESDE', 'APROBADOS HASTA', 'MONTO MÍNIMO', 'MONTO MÁXIMO', 'ESPERA MÍNIMA (DÍAS)']) expect(within(panel).getByLabelText(l)).toBeInTheDocument();
    expect(within(panel).getByRole('option', { name: 'Rita Revisora' })).toBeInTheDocument();
    expect(within(panel).getByRole('option', { name: 'Bancolombia Operativa' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /SOLO CUENTAS DE TERCEROS/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('un filtro viaja junto con el estado, aparece como ficha y se puede quitar; el resumen no lleva estado', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    await user.selectOptions(within(screen.getByRole('region', { name: 'Filtros' })).getByLabelText('FORMA DE PAGO'), 'efectivo');
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ forma: 'efectivo', estado: 'pendiente' }));
    expect(ultima('/tesoreria/desembolsos/resumen')[1].params).toEqual({ forma: 'efectivo' });
    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Forma: Efectivo / ventanilla' }));
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ estado: 'pendiente' }));
  });

  test('"solo cuentas de terceros" viaja como 1', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    await user.click(screen.getByRole('button', { name: /SOLO CUENTAS DE TERCEROS/ }));
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ tercero: 1, estado: 'pendiente' }));
    expect(screen.getByRole('button', { name: 'Quitar filtro: Solo cuentas de terceros' })).toBeInTheDocument();
  });

  test('"limpiar todo" quita los filtros pero conserva pestaña, vista y búsqueda', async () => {
    montar('/tesoreria/desembolsos?tab=pagada&q=ANA&forma=cheque&min=100&vista=tabla');
    await screen.findByText('Todavía no hay desembolsos pagados con estos filtros.');
    await user.click(screen.getByRole('button', { name: 'LIMPIAR TODO' }));
    await waitFor(() => expect(ubicacion.search).toBe('?q=ANA&tab=pagada&vista=tabla'));
  });

  test('un parámetro que no es de Tesorería se ignora', async () => {
    montar('/tesoreria/desembolsos?estado=pagada&todas=1');
    await tarjeta('CR-2026-000001');
    expect(ultima('/tesoreria/desembolsos')[1]).toEqual({ params: { estado: 'pendiente' } });
  });
});

describe('Tesorería — vistas', () => {
  test('la vista de origen son las tarjetas y la elegida se recuerda', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    expect(screen.getByRole('button', { name: /TARJETAS/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /TABLA/ }));
    expect(localStorage.getItem('tesoreria:vista')).toBe('tabla');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('article')).toBeNull();
  });

  test('la tabla muestra el destino enmascarado, el titular, la espera y el pie con el total', async () => {
    montar('/tesoreria/desembolsos?vista=tabla');
    const fila = (await screen.findByText('CR-2026-000001')).closest('tr');
    expect(fila).toHaveTextContent('Bancolombia ahorros ****8901');
    expect(fila).toHaveTextContent('titular ANA GÓMEZ');
    expect(fila).toHaveTextContent('$4.485.000');
    expect(fila).not.toHaveTextContent('12345678901');   // el número completo no se muestra en la tabla
    expect(screen.getByTestId('total-monto')).toHaveTextContent('$6.485.000');
    expect(fila.querySelectorAll('td')[5]).toHaveTextContent('2');
  });

  test('en la tabla, una cuenta de tercero se marca y las demás no', async () => {
    datos.pendiente = [orden({ titular_es_asociado: false, titular_nombre: 'LUIS RUIZ' }), EFECTIVO()];
    montar('/tesoreria/desembolsos?vista=tabla');
    await screen.findByText('CR-2026-000001');
    expect(screen.getAllByText('CUENTA DE TERCERO')).toHaveLength(1);
  });

  test('ordenar por una columna lo pide al servidor y alterna el sentido', async () => {
    montar('/tesoreria/desembolsos?vista=tabla');
    await screen.findByText('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /MONTO/ }));
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ orden: 'monto', dir: 'desc', estado: 'pendiente' }));
    await user.click(screen.getByRole('button', { name: /MONTO/ }));
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ orden: 'monto', dir: 'asc', estado: 'pendiente' }));
  });

  test('el tablero pide todos los estados, muestra una columna por estado y oculta las pestañas', async () => {
    datos.todas = [orden(), orden({ id: 'o-9', estado: 'pagada', radicado: 'CR-2026-000009', fecha_pago: '2026-09-24', referencia_pago: 'TRF-77', puede_pagar: false }), orden({ id: 'o-8', estado: 'anulada', radicado: 'CR-2026-000008', anulada_motivo: 'Cuenta rechazada', puede_pagar: false })];
    resumen = { limite: 500, estados: [{ estado: 'pendiente', n: 1, valor: 4485000 }, { estado: 'pagada', n: 1, valor: 4485000 }, { estado: 'anulada', n: 1, valor: 4485000 }] };
    montar('/tesoreria/desembolsos?vista=kanban');
    const tablero = await screen.findByRole('group', { name: 'Tablero de desembolsos por estado' });
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ estado: 'todas' }));
    expect(within(tablero).getAllByRole('heading').map((h) => h.textContent)).toEqual(['POR PAGAR', 'PAGADOS', 'DEVUELTOS']);
    expect(screen.queryByRole('navigation', { name: 'Estado de los desembolsos' })).toBeNull();
    expect(await within(within(tablero).getByRole('region', { name: 'Columna PAGADOS' })).findByText('CR-2026-000009')).toBeInTheDocument();
    expect(within(within(tablero).getByRole('region', { name: 'Columna DEVUELTOS' })).getByText('Cuenta rechazada')).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de desembolsos')).toHaveTextContent('3 desembolsos · $13.455.000');
  });

  test('desde el tablero también se puede pagar', async () => {
    datos.todas = [orden()];
    montar('/tesoreria/desembolsos?vista=kanban');
    await user.click(await screen.findByRole('button', { name: 'Pagar CR-2026-000001' }));
    expect(screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' })).toBeInTheDocument();
  });

  test('al cambiar de vista no parpadea el aviso de "no caben" con filas de la consulta anterior', async () => {
    resumen = { limite: 500, estados: [{ estado: 'pendiente', n: 2, valor: 1 }, { estado: 'pagada', n: 3, valor: 1 }] };
    datos.todas = [orden(), EFECTIVO(), orden({ id: 'o-9', estado: 'pagada', radicado: 'CR-9', fecha_pago: '2026-09-24' }), orden({ id: 'o-10', estado: 'pagada', radicado: 'CR-10', fecha_pago: '2026-09-24' }), orden({ id: 'o-11', estado: 'pagada', radicado: 'CR-11', fecha_pago: '2026-09-24' })];
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /TABLERO/ }));
    expect(screen.queryByRole('status')).toBeNull();
    await screen.findByRole('group', { name: 'Tablero de desembolsos por estado' });
    await waitFor(() => expect(ultima('/tesoreria/desembolsos')[1].params).toEqual({ estado: 'todas' }));
    await screen.findByText('CR-11');
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('avisa cuando hay más desembolsos de los que caben', async () => {
    resumen = { limite: 500, estados: [{ estado: 'pendiente', n: 730, valor: 1 }] };
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent('Se muestran los 2 primeros: hay 728 más que no caben');
  });
});

describe('Tesorería — exportar y actualizar', () => {
  test('exporta lo que se ve como CSV con la cuenta enmascarada', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await tarjeta('CR-2026-000001');
    await user.click(screen.getByRole('button', { name: /EXPORTAR CSV \(2\)/ }));
    const texto = await URL.createObjectURL.mock.calls[0][0].text();
    expect(texto).toContain('CR-2026-000001;POR PAGAR');
    expect(texto).toContain('****8901');
    expect(texto).not.toContain('12345678901');
    clic.mockRestore();
  });

  test('actualizar vuelve a pedir la lista', async () => {
    montar();
    await tarjeta('CR-2026-000001');
    const antes = api.get.mock.calls.filter(([u]) => u === '/tesoreria/desembolsos').length;
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === '/tesoreria/desembolsos').length).toBe(antes + 1));
  });
});

describe('Tesorería — quién puede pagar', () => {
  test('quien aprobó el crédito ve por qué no puede pagarlo, sí puede devolverlo', async () => {
    datos.pendiente = [orden({ puede_pagar: false, motivo_bloqueo: 'Tú aprobaste este crédito en Control Interno: lo debe pagar otra persona' })];
    montar();
    const t = within(await tarjeta('CR-2026-000001'));
    expect(t.getByRole('note')).toHaveTextContent('lo debe pagar otra persona');
    expect(t.getByRole('button', { name: 'PAGAR' })).toBeDisabled();
    expect(t.getByRole('button', { name: /NO SE PUEDE PAGAR/ })).toBeEnabled();
  });

  test('sin el permiso de pagar, ni pagar ni devolver', async () => {
    datos.pendiente = [orden({ puede_pagar: false, puede_devolver: false, motivo_bloqueo: 'No tienes el permiso para pagar desembolsos' })];
    montar();
    const t = within(await tarjeta('CR-2026-000001'));
    expect(t.getByRole('note')).toHaveTextContent('No tienes el permiso para pagar desembolsos');
    expect(t.getByRole('button', { name: 'PAGAR' })).toBeDisabled();
    expect(t.getByRole('button', { name: /NO SE PUEDE PAGAR/ })).toBeDisabled();
  });

  test('en la tabla los botones respetan lo mismo', async () => {
    datos.pendiente = [orden({ puede_pagar: false, motivo_bloqueo: 'Tú aprobaste este crédito en Control Interno: lo debe pagar otra persona' })];
    montar('/tesoreria/desembolsos?vista=tabla');
    await screen.findByText('CR-2026-000001');
    expect(screen.getByRole('button', { name: 'Pagar CR-2026-000001' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Devolver CR-2026-000001' })).toBeEnabled();
  });
});

describe('Tesorería — pagar (dos pasos)', () => {
  const abrir = async (radicado = 'CR-2026-000001') => {
    montar();
    await user.click(within(await tarjeta(radicado)).getByRole('button', { name: 'PAGAR' }));
    return screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' });
  };
  const llenar = async (m, { cuenta = 'c-banco', referencia = 'TRF-000123' } = {}) => {
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), cuenta);
    await user.type(m.getByLabelText(/REFERENCIA/), referencia);
  };

  test('el formulario repite a quién, cuánto y a dónde antes de pagar', async () => {
    const m = within(await abrir());
    expect(m.getByTestId('monto-pago')).toHaveTextContent('$4.485.000');
    expect(m.getByTestId('numero-cuenta')).toHaveTextContent('1234 5678 901');
  });

  test('una transferencia solo ofrece cuentas bancarias de la cooperativa', async () => {
    const m = within(await abrir());
    const opciones = within(m.getByLabelText(/CUENTA DE LA COOPERATIVA/)).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['— elige —', 'Bancolombia Operativa · Bancolombia · 0001']);
  });

  test('en efectivo ofrece también las cajas, nunca tarjetas', async () => {
    const m = within(await abrir('CR-2026-000002'));
    const opciones = within(m.getByLabelText(/CUENTA DE LA COOPERATIVA/)).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['— elige —', 'Bancolombia Operativa · Bancolombia · 0001', 'Caja menor']);
  });

  test('si no hay ninguna cuenta desde la que se pueda pagar, lo dice y no deja avanzar', async () => {
    api.get.mockImplementation(async (url, op) => {
      if (url === '/tesoreria/cuentas') return { data: [CUENTAS[2]] };   // solo una tarjeta
      if (url === '/tesoreria/desembolsos/filtros') return { data: FILTROS };
      if (url === '/tesoreria/desembolsos/resumen') return { data: resumen };
      return { data: datos[op.params.estado] ?? [] };
    });
    const m = within(await abrir());
    expect(m.getByRole('alert')).toHaveTextContent(/No hay una cuenta de la cooperativa desde la que se pueda pagar/);
    expect(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' })).toBeDisabled();
  });

  test('no se puede avanzar sin cuenta ni referencia de al menos 3 caracteres', async () => {
    const m = within(await abrir());
    const seguir = m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' });
    expect(seguir).toBeDisabled();
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), 'c-banco');
    await user.type(m.getByLabelText(/REFERENCIA/), 'TR');
    expect(seguir).toBeDisabled();
    await user.type(m.getByLabelText(/REFERENCIA/), 'F');
    expect(seguir).toBeEnabled();
  });

  test('no hay casilla: la confirmación es un segundo paso con el resumen de lo que se va a registrar', async () => {
    const m = within(await abrir());
    expect(m.queryByRole('checkbox')).toBeNull();
    await llenar(m);
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    const c = within(screen.getByLabelText('Confirmación del pago'));
    expect(c.getByText('CONFIRMA ANTES DE REGISTRAR')).toBeInTheDocument();
    expect(c.getByTestId('monto-confirmado')).toHaveTextContent('$4.485.000');
    expect(c.getByText('Bancolombia ahorros ****8901', { exact: false })).toBeInTheDocument();
    expect(c.getByText('Bancolombia Operativa')).toBeInTheDocument();
    expect(c.getByText('TRF-000123')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();   // nada se registra hasta el segundo paso
  });

  test('el segundo paso permite volver y corregir sin perder lo escrito', async () => {
    const m = within(await abrir());
    await llenar(m);
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    await user.click(screen.getByRole('button', { name: /VOLVER Y CORREGIR/ }));
    const otra = within(screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' }));
    expect(otra.getByLabelText(/REFERENCIA/)).toHaveValue('TRF-000123');
    expect(otra.getByLabelText(/CUENTA DE LA COOPERATIVA/)).toHaveValue('c-banco');
  });

  test('registra el pago con cuenta, referencia y fecha; recarga la lista', async () => {
    const m = within(await abrir());
    await user.selectOptions(m.getByLabelText(/CUENTA DE LA COOPERATIVA/), 'c-banco');
    await user.type(m.getByLabelText(/REFERENCIA/), '  TRF-000123 ');
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    datos.pendiente = [datos.pendiente[1]];
    await user.click(screen.getByRole('button', { name: /SÍ, YA PAGUÉ/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tesoreria/desembolsos/o-1/pagar', { cuenta_origen_id: 'c-banco', referencia: 'TRF-000123', fecha_pago: hoy() }));
    expect(toast.success).toHaveBeenCalledWith('Pago registrado');
    await waitFor(() => expect(screen.queryByLabelText('Desembolso CR-2026-000001')).toBeNull());
    expect(screen.queryByRole('dialog', { name: 'REGISTRAR EL PAGO' })).toBeNull();
  });

  test('el botón no se puede pulsar dos veces mientras se registra', async () => {
    let resolver;
    api.post.mockImplementation(() => new Promise((r) => { resolver = r; }));
    const m = within(await abrir());
    await llenar(m);
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    await user.click(screen.getByRole('button', { name: /SÍ, YA PAGUÉ/ }));
    expect(screen.getByRole('button', { name: /REGISTRANDO/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /REGISTRANDO/ }));
    expect(api.post).toHaveBeenCalledTimes(1);
    resolver({ data: { ok: true } });
  });

  test('si el servidor rechaza el pago muestra su mensaje y vuelve a los datos con lo escrito', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'Esa referencia ya se usó en otro desembolso desde esta cuenta' } } });
    const m = within(await abrir());
    await llenar(m);
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    await user.click(screen.getByRole('button', { name: /SÍ, YA PAGUÉ/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Esa referencia ya se usó en otro desembolso desde esta cuenta'));
    const otra = within(screen.getByRole('dialog', { name: 'REGISTRAR EL PAGO' }));
    expect(otra.getByLabelText(/REFERENCIA/)).toHaveValue('TRF-000123');   // se corrige y se reintenta
    expect(screen.queryByLabelText('Confirmación del pago')).toBeNull();
  });

  test('la fecha del pago no puede ser anterior a la aprobación ni futura', async () => {
    const m = within(await abrir());
    await llenar(m);
    const fecha = m.getByLabelText('FECHA DEL PAGO');
    expect(fecha).toHaveAttribute('max', hoy());
    expect(fecha.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const antes = new Date(Date.now() - 5 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    await user.clear(fecha);
    await user.type(fecha, antes);
    expect(m.getByRole('alert')).toHaveTextContent(/anterior a la aprobación de Control Interno/);
    expect(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' })).toBeDisabled();
    const manana = new Date(Date.now() + 2 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    await user.clear(fecha);
    await user.type(fecha, manana);
    expect(m.getByRole('alert')).toHaveTextContent(/futura/);
  });

  test('si la cuenta es de un tercero, la confirmación lo vuelve a advertir', async () => {
    datos.pendiente = [orden({ titular_es_asociado: false, titular_nombre: 'LUIS RUIZ', titular_documento: '52000222' })];
    const m = within(await abrir());
    await llenar(m);
    await user.click(m.getByRole('button', { name: 'REVISAR Y CONFIRMAR' }));
    expect(within(screen.getByLabelText('Confirmación del pago')).getByRole('alert')).toHaveTextContent(/La cuenta es de un tercero \(LUIS RUIZ\)/);
  });

  test('cancelar cierra sin pagar', async () => {
    const m = within(await abrir());
    await user.click(m.getByRole('button', { name: 'CANCELAR' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('Tesorería — no se puede pagar', () => {
  const abrir = async () => {
    montar();
    await user.click(within(await tarjeta('CR-2026-000001')).getByRole('button', { name: /NO SE PUEDE PAGAR/ }));
    return within(screen.getByRole('dialog', { name: /NO SE PUEDE PAGAR/ }));
  };

  test('exige el motivo y devuelve la orden a Control Interno', async () => {
    const m = await abrir();
    const boton = m.getByRole('button', { name: 'DEVOLVER' });
    expect(boton).toBeDisabled();
    await user.type(m.getByLabelText(/POR QUÉ NO SE PUEDE PAGAR/), ' El banco rechazó la cuenta ');
    datos.pendiente = [datos.pendiente[1]];
    await user.click(boton);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tesoreria/desembolsos/o-1/devolver', { motivo: 'El banco rechazó la cuenta' }));
    expect(toast.success).toHaveBeenCalledWith('Devuelto a Control Interno');
    await waitFor(() => expect(screen.queryByLabelText('Desembolso CR-2026-000001')).toBeNull());
  });

  test('los motivos frecuentes se ofrecen como atajos y se pueden editar', async () => {
    const m = await abrir();
    await user.click(m.getByRole('button', { name: 'El banco rechazó la cuenta' }));
    const campoMotivo = m.getByLabelText(/POR QUÉ NO SE PUEDE PAGAR/);
    expect(campoMotivo).toHaveValue('El banco rechazó la cuenta');
    await user.type(campoMotivo, ' (rechazo del 24/09)');
    expect(campoMotivo).toHaveValue('El banco rechazó la cuenta (rechazo del 24/09)');
    expect(m.getByRole('button', { name: 'DEVOLVER' })).toBeEnabled();
  });

  test('muestra la orden que se devuelve para no equivocarse de crédito', async () => {
    const m = await abrir();
    expect(m.getByText(/CR-2026-000001/)).toHaveTextContent('$4.485.000 a ANA GÓMEZ');
  });

  test('si el servidor rechaza la devolución muestra su mensaje', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'Solo se devuelve una orden pendiente' } } });
    const m = await abrir();
    await user.type(m.getByLabelText(/POR QUÉ NO SE PUEDE PAGAR/), 'Cuenta mal escrita');
    await user.click(m.getByRole('button', { name: 'DEVOLVER' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Solo se devuelve una orden pendiente'));
    expect(screen.getByRole('dialog', { name: /NO SE PUEDE PAGAR/ })).toBeInTheDocument();
  });
});
