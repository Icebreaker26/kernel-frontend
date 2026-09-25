import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => { const t = vi.fn(); t.error = vi.fn(); t.success = vi.fn(); return t; });
vi.mock('react-hot-toast', () => ({ default: toast }));

import BandejaPage from './BandejaPage.jsx';

const fila = (extra = {}) => ({
  id: 's1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión',
  valor_solicitado: '5000000', monto_desembolso: null, forma_desembolso: 'cheque', estado: 'entregada', created_at: '2026-09-20T10:00:00Z', entregada_at: '2026-09-21T10:00:00Z', asesor_nombre: 'Luis Pérez', dias: 4,
  a_firmar: 2, firmados: 2, firma_completa: true, autorizacion_requerida: true, autorizacion_estado: 'aprobada', autorizacion_ok: true, documentos_ok: true, expediente_completo: true, ...extra,
});
const porTab = {
  entregadas: [fila({ id: 'e1', radicado: 'CR-E1' })],
  recibidas: [],
  devueltas: [fila({ id: 'd1', radicado: 'CR-D1', estado: 'devuelta' })],
  por_llegar: [fila({ id: 'p1', radicado: 'CR-P1', estado: 'en_tramite' })],
};
porTab.todas = [...porTab.entregadas, ...porTab.devueltas, ...porTab.por_llegar, fila({ id: 'c1', radicado: 'CR-C1', estado: 'completada', monto_desembolso: '4985000' })];
const RESUMEN = { limite: 500, estados: [
  { estado: 'entregada', n: 1, valor: 5000000 }, { estado: 'devuelta', n: 1, valor: 5000000 }, { estado: 'en_tramite', n: 1, valor: 5000000 }, { estado: 'completada', n: 1, valor: 5000000 },
] };
const FILTROS = { categorias: [{ id: 'c-1', nombre: 'Libre inversión' }], empresas: [{ codigo: 'E1', nombre: 'Empresa Uno SA' }], asesores: [{ id: 'u-1', nombre: 'Luis Pérez' }] };

let user;
let ubicacion;
const Sonda = () => { ubicacion = useLocation(); return null; };
const montar = (ruta = '/cartera') => render(<MemoryRouter initialEntries={[ruta]}><BandejaPage /><Sonda /></MemoryRouter>);
const llamadas = (url) => api.get.mock.calls.filter(([u]) => u === url);
const ultima = (url) => llamadas(url).at(-1);

beforeEach(() => {
  user = userEvent.setup();
  localStorage.clear();
  api.get.mockReset();
  api.get.mockImplementation(async (url, cfg) => {
    if (url === '/cartera/filtros') return { data: FILTROS };
    if (url === '/cartera/resumen') return { data: RESUMEN };
    if (url === '/cartera') return { data: porTab[cfg?.params?.tab] ?? [] };
    throw new Error(`GET inesperado ${url}`);
  });
});

describe('Bandeja de Cartera — tabla y pestañas', () => {
  test('abre en "por recibir" con lo entregado, con enlace al detalle de Cartera y siempre con la columna del asesor', async () => {
    montar();
    expect(await screen.findByRole('link', { name: 'CR-E1' })).toHaveAttribute('href', '/cartera/e1');
    expect(ultima('/cartera')[1]).toEqual({ params: { tab: 'entregadas' } });
    expect(screen.getByRole('button', { name: /POR RECIBIR/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', { name: /ASESOR/ })).toBeInTheDocument();
  });

  test('las cinco pestañas traen su contador real desde el primer momento, sin visitarlas', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    const nav = screen.getByRole('navigation', { name: 'Estados' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['POR RECIBIR1', 'RECIBIDAS0', 'COMPLETADAS1', 'DEVUELTAS1', 'EN TRÁMITE1']);
    expect(within(nav).getByLabelText('0 expedientes')).toBeInTheDocument();
  });

  test('cambiar de pestaña pide esa bandeja y la deja en la URL (la de por recibir es la de origen y no la ensucia)', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    await user.click(screen.getByRole('button', { name: /DEVUELTAS/ }));
    expect(await screen.findByRole('link', { name: 'CR-D1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CR-E1' })).toBeNull();
    expect(ubicacion.search).toBe('?tab=devueltas');
    await user.click(screen.getByRole('button', { name: /POR RECIBIR/ }));
    await screen.findByRole('link', { name: 'CR-E1' });
    expect(ubicacion.search).toBe('');
  });

  test('una pestaña abierta por enlace se respeta; una inventada cae en "por recibir"', async () => {
    const { unmount } = montar('/cartera?tab=por_llegar');
    expect(await screen.findByRole('link', { name: 'CR-P1' })).toBeInTheDocument();
    unmount();
    montar('/cartera?tab=inventada');
    expect(await screen.findByRole('link', { name: 'CR-E1' })).toBeInTheDocument();
  });

  test('explica qué contiene la pestaña y resume cuántos hay y cuánto suman', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    const resumen = screen.getByLabelText('Resumen de la bandeja');
    await waitFor(() => expect(resumen).toHaveTextContent('1 expediente · $5.000.000 solicitado'));
    expect(resumen).toHaveTextContent(/Entregadas por los asesores: esperan a Cartera/);
    await user.click(screen.getByRole('button', { name: /RECIBIDAS/ }));
    expect(await screen.findByText('No hay expedientes en esta bandeja')).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de la bandeja')).toHaveTextContent(/0 expedientes · \$0 solicitado/);
    expect(screen.getByLabelText('Resumen de la bandeja')).toHaveTextContent(/Cartera ya las recibió/);
  });

  test('busca por texto sin perder la pestaña', async () => {
    montar('/cartera?tab=devueltas');
    await screen.findByRole('link', { name: 'CR-D1' });
    await user.type(screen.getByLabelText('Buscar en la bandeja'), 'ANA');
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ q: 'ANA', tab: 'devueltas' }));
    expect(ubicacion.search).toContain('q=ANA');
  });

  test('ordenar por una columna lo pide al servidor y alterna el sentido', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    await user.click(screen.getByRole('button', { name: /VALOR SOLICITADO/ }));
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ orden: 'valor', dir: 'desc', tab: 'entregadas' }));
    await user.click(screen.getByRole('button', { name: /VALOR SOLICITADO/ }));
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ orden: 'valor', dir: 'asc', tab: 'entregadas' }));
  });
});

describe('Bandeja de Cartera — filtros', () => {
  const abrir = async () => { await user.click(screen.getByRole('button', { name: /FILTROS/ })); return screen.getByRole('region', { name: 'Filtros' }); };

  test('trae las opciones de Cartera (no las de Créditos) y ofrece asesor pero no "requiere mi acción" ni estado', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    expect(api.get).toHaveBeenCalledWith('/cartera/filtros');
    const panel = await abrir();
    expect(within(panel).getByLabelText('ASESOR')).toBeInTheDocument();
    expect(within(panel).getByRole('option', { name: 'Luis Pérez' })).toBeInTheDocument();
    expect(within(panel).getByRole('option', { name: 'Empresa Uno SA' })).toBeInTheDocument();
    expect(within(panel).queryByLabelText('ESTADO')).toBeNull();
    expect(within(panel).queryByRole('button', { name: /REQUIEREN MI ACCIÓN/ })).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith('/creditos/categorias');
  });

  test('un filtro viaja al servidor junto con la pestaña, aparece como ficha y se puede quitar', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    const panel = await abrir();
    await user.selectOptions(within(panel).getByLabelText('ASESOR'), 'u-1');
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ asesor: 'u-1', tab: 'entregadas' }));
    expect(ultima('/cartera/resumen')[1].params).toEqual({ asesor: 'u-1' });   // el resumen no lleva pestaña
    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Asesor: Luis Pérez' }));
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ tab: 'entregadas' }));
  });

  test('"limpiar todo" quita los filtros pero conserva la pestaña y la búsqueda', async () => {
    montar('/cartera?tab=devueltas&q=ANA&forma=cheque&min=100');
    await screen.findByRole('link', { name: 'CR-D1' });
    await user.click(screen.getByRole('button', { name: 'LIMPIAR TODO' }));
    await waitFor(() => expect(ubicacion.search).toBe('?q=ANA&tab=devueltas'));
  });

  test('los parámetros de Créditos que no aplican (estado, todas, acción) se ignoran', async () => {
    montar('/cartera?estado=pagada&todas=1&accion=1');
    await screen.findByRole('link', { name: 'CR-E1' });
    expect(ultima('/cartera')[1]).toEqual({ params: { tab: 'entregadas' } });
  });
});

describe('Bandeja de Cartera — tablero', () => {
  const abrirTablero = async () => { montar(); await screen.findByRole('link', { name: 'CR-E1' }); await user.click(screen.getByRole('button', { name: /TABLERO/ })); return screen.findByRole('group', { name: 'Tablero de créditos por estado' }); };

  test('muestra solo los estados de Cartera, uno por columna, y oculta las pestañas', async () => {
    const tablero = await abrirTablero();
    expect(within(tablero).getAllByRole('heading').map((h) => h.textContent)).toEqual(['EN TRÁMITE', 'DEVUELTA', 'ENTREGADA A CARTERA', 'RECIBIDA POR CARTERA', 'COMPLETADA · EN CONTROL INTERNO']);
    expect(screen.queryByRole('navigation', { name: 'Estados' })).toBeNull();
    await waitFor(() => expect(ultima('/cartera')[1].params).toEqual({ tab: 'todas' }));
    expect(within(within(tablero).getByRole('region', { name: 'Columna COMPLETADA · EN CONTROL INTERNO' })).getByRole('link', { name: 'CR-C1' })).toHaveAttribute('href', '/cartera/c1');
  });

  test('el resumen cuenta todo lo que hay en el tablero y la vista se recuerda', async () => {
    await abrirTablero();
    await waitFor(() => expect(screen.getByLabelText('Resumen de la bandeja')).toHaveTextContent('4 expedientes · $20.000.000 solicitado'));
    expect(localStorage.getItem('cartera:vista')).toBe('kanban');
  });

  test('una tarjeta devuelta dice que espera al asesor (no que te toca a ti)', async () => {
    await abrirTablero();
    expect(await screen.findByText('Devuelta: espera la corrección del asesor')).toBeInTheDocument();
    expect(screen.queryByText(/requiere tu acción/)).toBeNull();
  });

  test('con la vista guardada, la bandeja abre directo en tablero', async () => {
    localStorage.setItem('cartera:vista', 'kanban');
    montar();
    expect(await screen.findByRole('group', { name: 'Tablero de créditos por estado' })).toBeInTheDocument();
  });
});

describe('Bandeja de Cartera — exportar y errores', () => {
  test('exporta lo que se ve como CSV', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
    montar();
    await screen.findByRole('link', { name: 'CR-E1' });
    await user.click(screen.getByRole('button', { name: /EXPORTAR CSV \(1\)/ }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(await blob.text()).toContain('CR-E1');
    clic.mockRestore();
  });

  test('avisa cuando hay más expedientes de los que caben', async () => {
    api.get.mockImplementation(async (url, cfg) => {
      if (url === '/cartera/filtros') return { data: FILTROS };
      if (url === '/cartera/resumen') return { data: { limite: 500, estados: [{ estado: 'entregada', n: 730, valor: 1 }] } };
      return { data: porTab[cfg.params.tab] ?? [] };
    });
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent('Se muestran los 1 más antiguos: hay 729 más que no caben');
  });

  test('sin permiso de Cartera muestra el aviso', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    montar();
    expect(await screen.findByText('No tienes permiso para ver la bandeja de Cartera.')).toBeInTheDocument();
  });

  test('un error del servidor avisa', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/cartera/filtros') return { data: FILTROS };
      throw { response: { status: 500, data: { error: 'Error interno' } } };
    });
    montar();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error interno'));
  });
});
