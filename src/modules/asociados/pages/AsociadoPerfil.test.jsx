import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
// La pestaña se prueba aparte: aquí solo importa cuándo aparece y con qué cédula se abre
vi.mock('../components/DocumentosAsociado.jsx', () => ({ default: ({ codigo }) => <div data-testid="documentos">DOCUMENTOS DE {codigo}</div> }));

import AsociadoPerfil from './AsociadoPerfil.jsx';

const perfil = () => ({
  asociado: {
    codigo: '1088000111', nombre: 'Ana', apellido: 'Gómez', nombre_empresa: 'Empresa Uno SA', is_active: true, portal_activo: false, solicitud_portal_at: null,
    fecha_nacimiento: '1985-04-12', valor_aporte: 50000, saldo_aporte: 0, email: 'ana@x.com', movil: '3001112233', ciudad: 'Pereira', direccion: 'Calle 1',
  },
  bonosActivos: [], premios: [], historial: [], cuotas: [], solicitudesPendientes: [], descuentos: [],
});
let user;

const montar = () => render(
  <MemoryRouter initialEntries={['/asociados/1088000111']}>
    <Routes><Route path="/asociados/:codigo" element={<AsociadoPerfil />} /><Route path="/asociados" element={<p>LISTADO</p>} /></Routes>
  </MemoryRouter>,
);
// El perfil se oculta con la clase `hidden` (Tailwind); en jsdom no hay CSS, así que se comprueba la clase del contenedor
const rejilla = () => screen.getByText('Datos personales').closest('div.grid');
const cargado = () => screen.findByText('ANA'.toUpperCase() + ' ' + 'GÓMEZ');

beforeEach(() => {
  user = userEvent.setup();
  api.get.mockImplementation(async (url) => (url.endsWith('/perfil') ? { data: perfil() } : { data: [] }));
});

describe('Perfil del asociado — pestaña Documentos', () => {
  test.each([
    ['un administrador', { rol: 'admin', modulos: [] }],
    ['quien trabaja Créditos', { rol: 'asesor', modulos: ['creditos'] }],
    ['quien trabaja Cartera', { rol: 'contable', modulos: ['cartera'] }],
    ['quien tiene ambos módulos', { rol: 'asesor', modulos: ['sorteos', 'creditos', 'cartera'] }],
  ])('%s ve la barra PERFIL | DOCUMENTOS', async (_, usuario) => {
    auth.user = usuario;
    montar();
    await cargado();
    const barra = screen.getByRole('navigation', { name: 'Secciones del perfil' });
    expect(barra).toHaveTextContent('PERFIL');
    expect(barra).toHaveTextContent('DOCUMENTOS');
  });

  test.each([
    ['quien no tiene Créditos ni Cartera', { rol: 'asesor', modulos: ['sorteos', 'asociados'] }],
    ['un usuario sin módulos', { rol: 'usuario', modulos: [] }],
    ['un usuario sin datos de módulos', { rol: 'usuario' }],
    ['sin usuario', null],
  ])('%s no ve la pestaña y el perfil queda como antes', async (_, usuario) => {
    auth.user = usuario;
    montar();
    await cargado();
    expect(screen.queryByRole('navigation', { name: 'Secciones del perfil' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'DOCUMENTOS' })).toBeNull();
    expect(screen.queryByTestId('documentos')).toBeNull();
    expect(rejilla()).not.toHaveClass('hidden');
  });

  test('por defecto se abre en PERFIL; al pasar a DOCUMENTOS se muestra la pestaña con la cédula y se oculta el perfil', async () => {
    auth.user = { rol: 'admin', modulos: [] };
    montar();
    await cargado();
    expect(screen.getByRole('button', { name: 'PERFIL' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('documentos')).toBeNull();
    expect(rejilla()).not.toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: 'DOCUMENTOS' }));
    expect(screen.getByTestId('documentos')).toHaveTextContent('DOCUMENTOS DE 1088000111');
    expect(screen.getByRole('button', { name: 'DOCUMENTOS' })).toHaveAttribute('aria-current', 'page');
    expect(rejilla()).toHaveClass('hidden');   // el perfil sigue montado pero oculto (conserva su estado)

    await user.click(screen.getByRole('button', { name: 'PERFIL' }));
    expect(screen.queryByTestId('documentos')).toBeNull();
    expect(rejilla()).not.toHaveClass('hidden');
  });

  test('el encabezado del asociado se ve en las dos pestañas', async () => {
    auth.user = { rol: 'admin', modulos: [] };
    montar();
    await cargado();
    await user.click(screen.getByRole('button', { name: 'DOCUMENTOS' }));
    expect(screen.getByText('ANA GÓMEZ')).toBeInTheDocument();   // el encabezado no está dentro del contenedor oculto
    expect(screen.getByText('ANA GÓMEZ').closest('div.grid')).toBeNull();
  });

  test('un asociado que no existe no muestra pestañas', async () => {
    auth.user = { rol: 'admin', modulos: [] };
    api.get.mockImplementation(async (url) => { if (url.endsWith('/perfil')) throw new Error('404'); return { data: [] }; });
    montar();
    expect(await screen.findByText('ASOCIADO NO ENCONTRADO')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones del perfil' })).toBeNull();
  });
});
