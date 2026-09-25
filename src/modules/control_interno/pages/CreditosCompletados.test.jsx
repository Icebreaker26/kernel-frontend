import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import CreditosCompletados from './CreditosCompletados.jsx';

const F1 = {
  id: 'id-1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión', valor_solicitado: '5000000.00', monto_desembolso: '4485000.00',
  forma_desembolso: 'transferencia', con_aval: true, aval_porcentaje: '10.00', aval_valor: '500000.00', modalidad_firma: 'externa', firma_electronica_valor: '15000.00', desembolso_neto: '4485000.00',
  estado: 'completada', completada_at: '2026-09-24T15:00:00Z', completada_por_nombre: 'Carolina Cartera', asesor_nombre: 'Luis Asesor', titular_tercero: false, dias: 2,
  revision_decision: null, revision_destino: null, revision_motivo: null, revision_por: null,
};
const F2 = { ...F1, id: 'id-2', radicado: 'CR-2026-000002', con_aval: false, aval_porcentaje: null, aval_valor: '0.00', modalidad_firma: 'presencial', forma_desembolso: 'cheque', firma_electronica_valor: '0.00', desembolso_neto: '5000000.00', dias: 9 };
const F3 = { ...F1, id: 'id-3', radicado: 'CR-2026-000003', titular_tercero: true, dias: 1 };
const APROB = { ...F1, id: 'id-4', radicado: 'CR-2026-000004', estado: 'en_tesoreria', revision_decision: 'aprobada', revision_por: 'Camilo Control', dias: 5 };
const DEV = { ...F1, id: 'id-5', radicado: 'CR-2026-000005', estado: 'recibida', revision_decision: 'devuelta', revision_destino: 'cartera', revision_motivo: 'La cuenta no coincide con el certificado', revision_por: 'Camilo Control', dias: 3 };

const porTab = { por_revisar: [F1, F2, F3], en_tesoreria: [APROB], pagados: [], devueltos: [DEV] };
porTab.todas = [F1, F2, F3, APROB, DEV];
const RESUMEN = { limite: 500, tabs: [{ tab: 'por_revisar', n: 3, valor: 14485000 }, { tab: 'en_tesoreria', n: 1, valor: 4485000 }, { tab: 'devueltos', n: 1, valor: 4485000 }] };
const FILTROS = { categorias: [{ id: 'c-1', nombre: 'Libre inversión' }], empresas: [{ codigo: 'E1', nombre: 'Empresa Uno SA' }], asesores: [{ id: 'u-1', nombre: 'Luis Asesor' }] };

let user;
let ubicacion;
const Sonda = () => { ubicacion = useLocation(); return null; };
const montar = (ruta = '/control-interno/creditos') => render(<MemoryRouter initialEntries={[ruta]}><CreditosCompletados /><Sonda /></MemoryRouter>);
const ultima = (url) => api.get.mock.calls.filter(([u]) => u === url).at(-1);

beforeEach(() => {
  user = userEvent.setup();
  localStorage.clear();
  api.get.mockReset();
  api.get.mockImplementation(async (url, cfg) => {
    if (url === '/control_interno/creditos/filtros') return { data: FILTROS };
    if (url === '/control_interno/creditos/resumen') return { data: RESUMEN };
    if (url === '/control_interno/creditos') return { data: porTab[cfg?.params?.tab] ?? [] };
    if (url.endsWith('/pdf-final')) return { data: new Blob(['%PDF']) };
    throw new Error(`GET inesperado ${url}`);
  });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Control Interno — bandeja: tabla', () => {
  test('abre en "por revisar" y muestra valor solicitado, descuentos, desembolso neto y forma de pago', async () => {
    montar();
    const fila1 = (await screen.findByRole('link', { name: 'CR-2026-000001' })).closest('tr');
    expect(ultima('/control_interno/creditos')[1]).toEqual({ params: { tab: 'por_revisar' } });
    expect(fila1).toHaveTextContent('ANA GÓMEZ');
    expect(fila1).toHaveTextContent('C.C. 1088000111');
    expect(fila1).toHaveTextContent('Aval 10% · $500.000');
    expect(fila1).toHaveTextContent('Firma $15.000');
    expect(fila1).toHaveTextContent('$5.000.000');
    expect(fila1).toHaveTextContent('$4.485.000');
    expect(fila1).toHaveTextContent('Transferencia bancaria');
  });

  test('sin aval ni firma externa muestra un guion en descuentos', async () => {
    montar();
    const fila2 = (await screen.findByRole('link', { name: 'CR-2026-000002' })).closest('tr');
    expect(fila2.querySelectorAll('td')[4]).toHaveTextContent('—');
    expect(fila2).toHaveTextContent('Cheque');
    expect(fila2).toHaveTextContent('$5.000.000');
  });

  test('una cuenta de tercero se marca en la fila y las demás no', async () => {
    montar();
    const fila3 = (await screen.findByRole('link', { name: 'CR-2026-000003' })).closest('tr');
    expect(within(fila3).getByText('CUENTA DE TERCERO')).toBeInTheDocument();
    expect(screen.getAllByText('CUENTA DE TERCERO')).toHaveLength(1);
  });

  test('cada crédito por revisar tiene el botón REVISAR con enlace al detalle', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const enlaces = screen.getAllByRole('link', { name: 'REVISAR' });
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/control-interno/creditos/id-1', '/control-interno/creditos/id-2', '/control-interno/creditos/id-3']);
  });

  test('los días de lo que aún espera se colorean: >3 atención y >7 alerta', async () => {
    montar();
    const celda = async (radicado) => (await screen.findByRole('link', { name: radicado })).closest('tr').querySelectorAll('td')[7];
    expect(await celda('CR-2026-000001')).toHaveClass('text-slate-400');
    expect(await celda('CR-2026-000002')).toHaveClass('text-rose-300');
  });

  test('el pie suma solicitado y desembolso neto de lo que se ve', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    expect(screen.getByTestId('total-solicitado')).toHaveTextContent('$15.000.000');
    expect(screen.getByTestId('total-neto')).toHaveTextContent('$13.970.000');
  });

  test('ordenar por una columna lo pide al servidor y alterna el sentido', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /DESEMBOLSO NETO/ }));
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ orden: 'desembolso', dir: 'desc', tab: 'por_revisar' }));
    await user.click(screen.getByRole('button', { name: /DESEMBOLSO NETO/ }));
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ orden: 'desembolso', dir: 'asc', tab: 'por_revisar' }));
  });

  test('descarga el PDF final del crédito elegido', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: 'Descargar PDF final CR-2026-000001' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/control_interno/creditos/id-1/pdf-final', { responseType: 'blob' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    clic.mockRestore();
  });

  test('si el PDF no se puede armar muestra el mensaje del servidor (viene dentro de un Blob)', async () => {
    api.get.mockImplementation(async (url, cfg) => {
      if (url.endsWith('/pdf-final')) throw { response: { data: new Blob([JSON.stringify({ error: 'Falta el estudio firmado' })]) } };
      if (url === '/control_interno/creditos/filtros') return { data: FILTROS };
      if (url === '/control_interno/creditos/resumen') return { data: RESUMEN };
      return { data: porTab[cfg.params.tab] };
    });
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: 'Descargar PDF final CR-2026-000001' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falta el estudio firmado'));
  });
});

describe('Control Interno — bandeja: pestañas', () => {
  test('las cuatro pestañas traen su contador real desde el primer momento', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const nav = screen.getByRole('navigation', { name: 'Estados' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['POR REVISAR3', 'EN TESORERÍA1', 'PAGADOS0', 'DEVUELTOS1']);
    expect(screen.getByRole('button', { name: /POR REVISAR/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('cambiar de pestaña pide esa bandeja y la deja en la URL (la de origen no la ensucia)', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /EN TESORERÍA/ }));
    expect(await screen.findByRole('link', { name: 'CR-2026-000004' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CR-2026-000001' })).toBeNull();
    expect(ubicacion.search).toBe('?tab=en_tesoreria');
    await user.click(screen.getByRole('button', { name: /POR REVISAR/ }));
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    expect(ubicacion.search).toBe('');
  });

  test('en lo ya aprobado el botón es VER y se lee quién aprobó', async () => {
    montar('/control-interno/creditos?tab=en_tesoreria');
    const fila = (await screen.findByRole('link', { name: 'CR-2026-000004' })).closest('tr');
    expect(within(fila).getByRole('link', { name: 'VER' })).toHaveAttribute('href', '/control-interno/creditos/id-4');
    expect(fila).toHaveTextContent('Aprobó Camilo Control');
  });

  test('en devueltos se lee a quién se devolvió y por qué', async () => {
    montar('/control-interno/creditos?tab=devueltos');
    const fila = (await screen.findByRole('link', { name: 'CR-2026-000005' })).closest('tr');
    expect(fila).toHaveTextContent('Devuelto a Cartera: La cuenta no coincide con el certificado');
  });

  test('una pestaña vacía lo dice con su propio mensaje; una inventada cae en "por revisar"', async () => {
    const { unmount } = montar('/control-interno/creditos?tab=pagados');
    expect(await screen.findByText('Todavía no hay créditos pagados con estos filtros.')).toBeInTheDocument();
    unmount();
    montar('/control-interno/creditos?tab=inventada');
    expect(await screen.findByRole('link', { name: 'CR-2026-000001' })).toBeInTheDocument();
  });

  test('explica qué contiene la pestaña y resume cuántos hay y cuánto se desembolsa', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const resumen = screen.getByLabelText('Resumen de la bandeja');
    await waitFor(() => expect(resumen).toHaveTextContent('3 créditos · $14.485.000 a desembolsar'));
    expect(resumen).toHaveTextContent(/Cartera ya los completó: esperan tu validación/);
  });
});

describe('Control Interno — bandeja: búsqueda y filtros', () => {
  test('busca por texto sin perder la pestaña', async () => {
    montar('/control-interno/creditos?tab=devueltos');
    await screen.findByRole('link', { name: 'CR-2026-000005' });
    await user.type(screen.getByLabelText('Buscar en la bandeja'), 'ANA');
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ q: 'ANA', tab: 'devueltos' }));
  });

  test('ofrece asesor y "días en Control Interno", pero no estado ni "requiere mi acción"', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    const panel = screen.getByRole('region', { name: 'Filtros' });
    expect(within(panel).getByLabelText('ASESOR')).toBeInTheDocument();
    expect(within(panel).getByLabelText('DÍAS EN CONTROL INTERNO (MÍNIMO)')).toBeInTheDocument();
    expect(within(panel).queryByLabelText('ESTADO')).toBeNull();
    expect(within(panel).queryByRole('button', { name: /REQUIEREN MI ACCIÓN/ })).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/control_interno/creditos/filtros');
  });

  test('un filtro viaja junto con la pestaña, aparece como ficha y se puede quitar', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    await user.selectOptions(within(screen.getByRole('region', { name: 'Filtros' })).getByLabelText('ASESOR'), 'u-1');
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ asesor: 'u-1', tab: 'por_revisar' }));
    expect(ultima('/control_interno/creditos/resumen')[1].params).toEqual({ asesor: 'u-1' });
    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Asesor: Luis Asesor' }));
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ tab: 'por_revisar' }));
  });

  test('"limpiar todo" quita los filtros pero conserva pestaña y búsqueda', async () => {
    montar('/control-interno/creditos?tab=devueltos&q=ANA&forma=cheque&min=100');
    await screen.findByRole('link', { name: 'CR-2026-000005' });
    await user.click(screen.getByRole('button', { name: 'LIMPIAR TODO' }));
    await waitFor(() => expect(ubicacion.search).toBe('?q=ANA&tab=devueltos'));
  });
});

describe('Control Interno — bandeja: tablero', () => {
  const abrirTablero = async () => { montar(); await screen.findByRole('link', { name: 'CR-2026-000001' }); await user.click(screen.getByRole('button', { name: /TABLERO/ })); return screen.findByRole('group', { name: 'Tablero de créditos en Control Interno' }); };

  test('muestra una columna por momento del crédito, con su total y desembolso, y oculta las pestañas', async () => {
    const tablero = await abrirTablero();
    expect(within(tablero).getAllByRole('heading').map((h) => h.textContent)).toEqual(['POR REVISAR', 'EN TESORERÍA', 'PAGADOS', 'DEVUELTOS']);
    expect(screen.queryByRole('navigation', { name: 'Estados' })).toBeNull();
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ tab: 'todas' }));
    const porRevisar = within(tablero).getByRole('region', { name: 'Columna POR REVISAR' });
    expect(porRevisar).toHaveTextContent('$14.485.000 a desembolsar');
    expect(within(porRevisar).getByLabelText('3 créditos')).toBeInTheDocument();
  });

  test('cada tarjeta va a su columna y trae desembolso neto, aviso de tercero y última revisión', async () => {
    const tablero = await abrirTablero();
    const dev = within(await within(tablero).findByRole('region', { name: 'Columna DEVUELTOS' }));
    expect(await dev.findByRole('link', { name: 'CR-2026-000005' })).toHaveAttribute('href', '/control-interno/creditos/id-5');
    expect(dev.getByText(/Devuelto a Cartera: La cuenta no coincide/)).toBeInTheDocument();
    expect(await within(within(tablero).getByRole('region', { name: 'Columna POR REVISAR' })).findByText('Cuenta de un tercero')).toBeInTheDocument();
    expect(within(within(tablero).getByRole('region', { name: 'Columna EN TESORERÍA' })).getByRole('link', { name: 'CR-2026-000004' })).toBeInTheDocument();
  });

  test('el resumen cuenta todo lo del tablero y la vista se recuerda', async () => {
    await abrirTablero();
    await waitFor(() => expect(screen.getByLabelText('Resumen de la bandeja')).toHaveTextContent('5 créditos · $23.455.000 a desembolsar'));
    expect(localStorage.getItem('control_interno:vista')).toBe('kanban');
  });

  test('al cambiar a tablero no parpadea el aviso de "no caben" con las filas de la pestaña anterior', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /TABLERO/ }));
    expect(screen.queryByRole('status')).toBeNull();   // aún no llegaron las filas del tablero: el conteo del resumen no se compara con las viejas
    await screen.findByRole('group', { name: 'Tablero de créditos en Control Interno' });
    await waitFor(() => expect(ultima('/control_interno/creditos')[1].params).toEqual({ tab: 'todas' }));
    expect(await screen.findByRole('link', { name: 'CR-2026-000005' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('con la vista guardada, la bandeja abre directo en tablero', async () => {
    localStorage.setItem('control_interno:vista', 'kanban');
    montar();
    expect(await screen.findByRole('group', { name: 'Tablero de créditos en Control Interno' })).toBeInTheDocument();
  });
});

describe('Control Interno — bandeja: exportar, actualizar y errores', () => {
  test('exporta lo que se ve como CSV', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /EXPORTAR CSV \(3\)/ }));
    const blob = URL.createObjectURL.mock.calls[0][0];
    const texto = await blob.text();
    expect(texto).toContain('CR-2026-000001');
    expect(texto).toContain('DESEMBOLSO_NETO');
    clic.mockRestore();
  });

  test('actualizar vuelve a pedir la lista y el resumen', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const antes = api.get.mock.calls.filter(([u]) => u === '/control_interno/creditos').length;
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === '/control_interno/creditos').length).toBe(antes + 1));
  });

  test('avisa cuando hay más créditos de los que caben', async () => {
    api.get.mockImplementation(async (url, cfg) => {
      if (url === '/control_interno/creditos/filtros') return { data: FILTROS };
      if (url === '/control_interno/creditos/resumen') return { data: { limite: 500, tabs: [{ tab: 'por_revisar', n: 730, valor: 1 }] } };
      return { data: porTab[cfg.params.tab] };
    });
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent('Se muestran los 3 más antiguos: hay 727 más que no caben');
  });

  test('sin permiso o con un error avisa', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    const { unmount } = montar();
    expect(await screen.findByText('No tienes permiso para ver esta bandeja.')).toBeInTheDocument();
    unmount();
    api.get.mockRejectedValue({ response: { status: 500 } });
    montar();
    expect(await screen.findByText('No se pudo cargar la bandeja.')).toBeInTheDocument();
  });
});
