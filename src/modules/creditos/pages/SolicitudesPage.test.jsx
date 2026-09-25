import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import SolicitudesPage from './SolicitudesPage.jsx';

const fila = (extra = {}) => ({
  id: 's1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión',
  valor_solicitado: '5000000', monto_desembolso: null, forma_desembolso: 'cheque', modalidad_firma: 'externa', estado: 'en_tramite', created_at: '2026-09-20T10:00:00Z',
  asesor_nombre: 'Luis Pérez', dias: 2, a_firmar: 1, firmados: 0, firma_completa: false, autorizacion_requerida: true, autorizacion_ok: false, documentos_ok: false, expediente_completo: false, ...extra,
});
const RESUMEN = { limite: 500, estados: [{ estado: 'en_tramite', n: 2, valor: 8000000 }, { estado: 'pagada', n: 1, valor: 3000000 }] };
const FILAS = [fila(), fila({ id: 's2', radicado: 'CR-2', valor_solicitado: '3000000' }), fila({ id: 's3', radicado: 'CR-3', estado: 'pagada', monto_desembolso: '2500000', valor_solicitado: '3000000' })];
let filas; let resumen;
let user;
const Ruta = () => <p data-testid="ruta">{useLocation().search}</p>;
const montar = (url = '/creditos') => render(<MemoryRouter initialEntries={[url]}><SolicitudesPage /><Ruta /></MemoryRouter>);
const llamadas = (u) => api.get.mock.calls.filter(([x]) => x === u);
const ultima = (u) => llamadas(u).at(-1)[1]?.params;

beforeEach(() => {
  user = userEvent.setup();
  try { localStorage.clear(); } catch { /* jsdom */ }
  filas = FILAS; resumen = RESUMEN;
  api.get.mockImplementation(async (url) => {
    if (url === '/creditos') return { data: filas };
    if (url === '/creditos/resumen') return { data: resumen };
    if (url === '/creditos/categorias') return { data: [{ id: 'c1', nombre: 'Vivienda' }] };
    if (url === '/creditos/filtros') return { data: { empresas: [{ codigo: 'E1', nombre: 'Empresa Uno' }], asesores: [{ id: 'u1', nombre: 'Luis' }] } };
    throw new Error(`GET inesperado ${url}`);
  });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('Lista de créditos — vista y layout', () => {
  test('por defecto muestra la tabla con el resumen y los conteos por estado', async () => {
    montar();
    expect(await screen.findByRole('link', { name: 'CR-2026-000001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TABLA' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('3 solicitudes · $11.000.000 solicitado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /EN TRÁMITE · 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PAGADA · 1/ })).toBeInTheDocument();
  });

  test('el botón Tablero cambia a las columnas, lo recuerda y lo deja en la URL', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: 'TABLERO' }));
    expect(await screen.findByRole('group', { name: 'Tablero de créditos por estado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TABLERO' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ruta')).toHaveTextContent('vista=kanban');
    expect(localStorage.getItem('creditos:vista')).toBe('kanban');
  });

  test('recuerda la última vista al volver', async () => {
    localStorage.setItem('creditos:vista', 'kanban');
    montar();
    expect(await screen.findByRole('group', { name: 'Tablero de créditos por estado' })).toBeInTheDocument();
  });

  test('la URL manda sobre lo recordado', async () => {
    localStorage.setItem('creditos:vista', 'kanban');
    montar('/creditos?vista=tabla');
    expect(await screen.findByRole('link', { name: 'CR-2026-000001' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Tablero de créditos por estado' })).toBeNull();
  });

  test('la barra de búsqueda y sus controles son los mismos en tabla y tablero (el layout no se mueve)', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const controles = () => [...document.querySelectorAll('.mb-3.flex.flex-wrap')[0].children].map((e) => e.getAttribute('aria-label') ?? e.tagName + (e.textContent.trim() ? ':' + e.textContent.trim().slice(0, 12) : ''));
    const enTabla = controles();
    await user.click(screen.getByRole('button', { name: 'TABLERO' }));
    await screen.findByRole('group', { name: 'Tablero de créditos por estado' });
    expect(controles()).toEqual(enTabla);
    expect(screen.queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
  });

  test('el tablero pide todos los estados: no manda el filtro de estado', async () => {
    montar('/creditos?estado=pagada&vista=kanban');
    await screen.findByRole('group', { name: 'Tablero de créditos por estado' });
    await waitFor(() => expect(llamadas('/creditos').length).toBeGreaterThan(0));
    expect(ultima('/creditos').estado).toBeUndefined();
    expect(ultima('/creditos/resumen').estado).toBeUndefined();
  });

  test('en el tablero se pueden mostrar las rechazadas y desistidas', async () => {
    montar('/creditos?vista=kanban');
    await screen.findByRole('group', { name: 'Tablero de créditos por estado' });
    expect(screen.queryByRole('region', { name: 'Columna DESISTIDA' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /RECHAZADAS Y DESISTIDAS/ }));
    expect(screen.getByRole('region', { name: 'Columna DESISTIDA' })).toBeInTheDocument();
  });
});

describe('Lista de créditos — filtros', () => {
  test('el alcance es un selector Mías / Todos los asesores (no una casilla) y pide todas=1', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    expect(screen.queryByRole('checkbox', { name: /todos los asesores/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'MÍAS' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'TODOS LOS ASESORES' }));
    await waitFor(() => expect(ultima('/creditos').todas).toBe(1));
    expect(screen.getByRole('columnheader', { name: 'ASESOR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TODOS LOS ASESORES' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('volver a "Mías" quita también el filtro de asesor', async () => {
    montar('/creditos?todas=1&asesor=u1');
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: 'MÍAS' }));
    await waitFor(() => expect(screen.getByTestId('ruta')).not.toHaveTextContent('asesor'));
    await waitFor(() => expect(ultima('/creditos').asesor).toBeUndefined());
  });

  test('los filtros de la URL se aplican al abrir la página y se envían al servidor', async () => {
    montar('/creditos?estado=pagada&forma=cheque&min=1000000&dias=15&accion=1&q=ana');
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    expect(ultima('/creditos')).toEqual({ q: 'ana', estado: 'pagada', forma: 'cheque', min: '1000000', dias: '15', accion: 1 });
    expect(screen.getByRole('button', { name: /FILTROS \(5\)/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar solicitudes')).toHaveValue('ana');
  });

  test('cambiar un filtro del panel actualiza la URL y vuelve a pedir la lista', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /FILTROS/ }));
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'c1');
    await waitFor(() => expect(ultima('/creditos').categoria).toBe('c1'));
    expect(screen.getByTestId('ruta')).toHaveTextContent('categoria=c1');
    expect(ultima('/creditos/resumen').categoria).toBe('c1');
  });

  test('las cifras por estado tocan el filtro de estado (y vuelven a tocarse para quitarlo)', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(await screen.findByRole('button', { name: /PAGADA · 1/ }));
    await waitFor(() => expect(ultima('/creditos').estado).toBe('pagada'));
    expect(screen.getByRole('button', { name: /PAGADA · 1/ })).toHaveAttribute('aria-pressed', 'true');
    // Con un estado elegido el resumen sigue trayendo todos los estados (para poder cambiar de uno a otro)
    expect(ultima('/creditos/resumen').estado).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /PAGADA · 1/ }));
    await waitFor(() => expect(ultima('/creditos').estado).toBeUndefined());
  });

  test('con un estado elegido el encabezado cuenta solo ese estado', async () => {
    montar('/creditos?estado=pagada');
    expect(await screen.findByText('1 solicitud · $3.000.000 solicitado')).toBeInTheDocument();
  });

  test('"limpiar todo" conserva la búsqueda, el alcance y la vista', async () => {
    montar('/creditos?q=ana&todas=1&vista=kanban&forma=cheque');
    await screen.findByRole('group', { name: 'Tablero de créditos por estado' });
    await user.click(screen.getByRole('button', { name: 'LIMPIAR TODO' }));
    await waitFor(() => expect(screen.getByTestId('ruta')).not.toHaveTextContent('forma'));
    expect(screen.getByTestId('ruta')).toHaveTextContent('q=ana');
    expect(screen.getByTestId('ruta')).toHaveTextContent('todas=1');
    expect(screen.getByTestId('ruta')).toHaveTextContent('vista=kanban');
  });

  test('buscar sin saturar al servidor (espera a que termine de escribir)', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    const antes = llamadas('/creditos').length;
    await user.type(screen.getByLabelText('Buscar solicitudes'), 'ana');
    await waitFor(() => expect(ultima('/creditos').q).toBe('ana'));
    expect(llamadas('/creditos').length - antes).toBeLessThanOrEqual(2);
  });
});

describe('Lista de créditos — orden, aviso de límite y exportación', () => {
  test('clic en un encabezado ordena; otro clic invierte; el valor y los días empiezan de mayor a menor', async () => {
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /VALOR SOLICITADO/ }));
    await waitFor(() => expect(ultima('/creditos')).toMatchObject({ orden: 'valor', dir: 'desc' }));
    await user.click(screen.getByRole('button', { name: /VALOR SOLICITADO/ }));
    await waitFor(() => expect(ultima('/creditos')).toMatchObject({ orden: 'valor', dir: 'asc' }));
    await user.click(screen.getByRole('button', { name: /RADICADO/ }));
    await waitFor(() => expect(ultima('/creditos')).toMatchObject({ orden: 'radicado', dir: 'asc' }));
    expect(ultima('/creditos/resumen').orden).toBeUndefined();
  });

  test('avisa cuando hay más solicitudes de las que caben', async () => {
    resumen = { limite: 500, estados: [{ estado: 'en_tramite', n: 900, valor: 1 }] };
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent(/Se muestran las 3 más recientes: hay 897 más/);
  });

  test('no avisa cuando todo cabe', async () => {
    montar();
    await screen.findByText('3 solicitudes · $11.000.000 solicitado');
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('exporta lo que se ve a un CSV con fecha en el nombre', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await screen.findByRole('link', { name: 'CR-2026-000001' });
    await user.click(screen.getByRole('button', { name: /EXPORTAR CSV \(3\)/ }));
    expect(clic).toHaveBeenCalled();
    expect(clic.mock.instances[0].download).toMatch(/^creditos_\d{4}-\d{2}-\d{2}\.csv$/);
    const blob = URL.createObjectURL.mock.calls.at(-1)[0];
    expect(await blob.text()).toContain('CR-2026-000001');
    clic.mockRestore();
  });

  test('sin resultados no se puede exportar y la tabla lo dice', async () => {
    filas = []; resumen = { limite: 500, estados: [] };
    montar();
    expect(await screen.findByText('Aún no hay solicitudes con esos filtros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /EXPORTAR CSV \(0\)/ })).toBeDisabled();
  });

  test('un error del servidor avisa', async () => {
    api.get.mockImplementation(async (url) => { if (url === '/creditos') throw { response: { status: 500, data: { error: 'Base de datos no disponible' } } }; return { data: [] }; });
    montar();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Base de datos no disponible'));
  });
});
