import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import SolidoPage from './SolidoPage.jsx';

const AGENTE = { id: 'a1', nombre: 'pc-solido-02', estado: 'activo', segundos_sin_latido: 10, pausado: false, permite_guardar: false, version: '0.1.0' };
const JOB = (extra = {}) => ({ id: 'j1', estado: 'listo_para_aprobar', cedula: '88801012', nombres: 'Ana', apellidos: 'Prueba', asesor_nombre: 'Asesora Uno', updated_at: '2026-09-25T15:00:00Z', ...extra });
const DETALLE = (extra = {}) => ({
  ...JOB(), capturas: [{ id: 'c1', etiqueta: 'pagina1' }, { id: 'c2', etiqueta: 'pagina2' }], faltantes: null, error: null,
  payload: {
    cabecera: { codigo: '88801012', apellido: 'PRUEBA', nombre: 'ANA' },
    pagina1: { empresa: '0010', clase_dscto: 'Caja', asesor: '1087546671', cabeza_de_familia: true, telefono2: null },
    pagina2: { salario: 2000000 }, pagina3: { egresos: 5, deudas_terceros: 7 }, pagina4: { segmento: '001' },
    informativo: { empresa_origen: 'equivalencia', empresa_kernel: 'Empresa Uno', valor_aporte: 80000, periodicidad_descuento: 'mensual', seguro_vida: false, bono_sorteo: false },
  }, ...extra,
});

let datos;
const preparar = (extra = {}) => {
  datos = { agentes: [AGENTE], jobs: [JOB()], detalle: DETALLE(), equivalencias: [], sugeridas: [], ...extra };
  api.get.mockImplementation(async (url, cfg) => {
    if (cfg?.responseType === 'blob') return { data: new Blob(['x'], { type: 'image/jpeg' }) };
    if (url === '/rpa/agentes') return { data: datos.agentes };
    if (url === '/rpa/jobs' || url.startsWith('/rpa/jobs?')) return { data: url.includes('requiere_datos') ? datos.jobs.filter((j) => j.estado === 'requiere_datos') : datos.jobs };
    if (url.startsWith('/rpa/jobs/')) return { data: datos.detalle };
    if (url === '/rpa/equivalencias') return { data: datos.equivalencias };
    if (url === '/rpa/asesores/cedulas-sugeridas') { if (datos.sinPermiso) throw { response: { status: 403 } }; return { data: datos.sugeridas }; }
    throw new Error(`GET no simulado: ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
};
const irA = async (nombre) => userEvent.click(await screen.findByRole('tab', { name: new RegExp(nombre, 'i') }));

beforeEach(() => {
  api.get.mockReset(); api.post.mockReset(); api.put.mockReset(); api.delete.mockReset();
  global.URL.createObjectURL = vi.fn(() => 'blob:captura');
  global.URL.revokeObjectURL = vi.fn();
  window.confirm = vi.fn(() => true);
  preparar();
});

describe('SolidoPage — encabezado', () => {
  test('muestra el estado del agente (el mejor entre todos)', async () => {
    preparar({ agentes: [{ ...AGENTE, id: 'x', estado: 'apagado', segundos_sin_latido: 9999 }, AGENTE] });
    render(<SolidoPage />);
    expect(await screen.findByText('ACTIVO')).toBeInTheDocument();
  });
  test('sin agentes lo dice', async () => {
    preparar({ agentes: [] });
    render(<SolidoPage />);
    expect(await screen.findByText('SIN AGENTE')).toBeInTheDocument();
  });
});

describe('SolidoPage — trabajos', () => {
  test('lista los trabajos con su estado y filtra "Por aprobar"', async () => {
    preparar({ jobs: [JOB(), JOB({ id: 'j2', estado: 'cargado', cedula: '999', nombres: 'Beto' }), JOB({ id: 'j3', estado: 'fallido', cedula: '888', nombres: 'Carla' })] });
    render(<SolidoPage />);
    expect(await screen.findByText(/Beto/)).toBeInTheDocument();
    expect(screen.getAllByTestId('job-badge').map((b) => b.dataset.estado).sort()).toEqual(['cargado', 'fallido', 'listo_para_aprobar']);
    await userEvent.click(screen.getByRole('button', { name: /Por aprobar \(1\)/ }));
    expect(screen.queryByText(/Beto/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Cargados \(1\)/ }));
    expect(screen.getByText(/Beto/)).toBeInTheDocument();
  });

  test('revisar un trabajo por aprobar muestra capturas y lo que se digitará, y aprobar llama al servidor', async () => {
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /REVISAR/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findAllByRole('img')).toHaveLength(2);
    expect(within(dialogo).getByText('clase_dscto')).toBeInTheDocument();
    expect(within(dialogo).getByText('Caja')).toBeInTheDocument();
    expect(within(dialogo).getByText('Sí')).toBeInTheDocument();                                  // booleano legible
    expect(within(dialogo).queryByText('telefono2')).not.toBeInTheDocument();                     // nulos no se listan
    await userEvent.click(within(dialogo).getByRole('button', { name: /APROBAR Y GUARDAR/ }));
    expect(api.post).toHaveBeenCalledWith('/rpa/jobs/j1/aprobar', undefined);
    expect(toast.success).toHaveBeenCalled();
  });

  test('advierte que aprobar no guardará si ningún agente tiene el guardado habilitado', async () => {
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /REVISAR/ }));
    expect(await screen.findByText(/Ningún agente tiene el guardado habilitado/)).toBeInTheDocument();
  });

  test('con el guardado habilitado esa advertencia no aparece', async () => {
    preparar({ agentes: [{ ...AGENTE, permite_guardar: true }] });
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /REVISAR/ }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.queryByText(/Ningún agente tiene el guardado habilitado/)).not.toBeInTheDocument());
  });

  test('si la empresa quedó por defecto (0010) lo advierte antes de aprobar', async () => {
    const d = DETALLE(); d.payload.informativo = { ...d.payload.informativo, empresa_origen: 'por_defecto', empresa_kernel: 'EMPRESA NUEVA' };
    preparar({ detalle: d });
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /REVISAR/ }));
    expect(await screen.findByText(/"EMPRESA NUEVA" no tiene equivalencia/)).toBeInTheDocument();
  });

  test('un error del servidor al aprobar (sin permiso) se muestra y no rompe', async () => {
    api.post.mockRejectedValue({ response: { status: 403, data: { error: 'Sin permiso' } } });
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /REVISAR/ }));
    await userEvent.click(await screen.findByRole('button', { name: /APROBAR Y GUARDAR/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sin permiso'));
  });

  test('revisión humana: exige una nota de 5+ caracteres y envía la decisión', async () => {
    preparar({ jobs: [JOB({ estado: 'revision_humana' })], detalle: DETALLE({ estado: 'revision_humana', payload: null, capturas: [], error: 'El agente se reinició mientras guardaba' }) });
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /VER/ }));
    await userEvent.click(await screen.findByRole('button', { name: /YA VERIFIQUÉ EN SOLIDO/ }));
    const confirmar = screen.getByRole('button', { name: 'CONFIRMAR' });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Nota/), 'Lo vi en SOLIDO');
    await userEvent.click(screen.getByRole('button', { name: 'No quedó cargado' }));
    await userEvent.click(confirmar);
    expect(api.post).toHaveBeenCalledWith('/rpa/jobs/j1/resolver', { resultado: 'no_cargado', nota: 'Lo vi en SOLIDO' });
  });

  test('un trabajo que requiere datos ofrece reevaluar y muestra lo que falta', async () => {
    preparar({ jobs: [JOB({ estado: 'requiere_datos' })], detalle: DETALLE({ estado: 'requiere_datos', payload: null, capturas: [],
      faltantes: [{ campo: 'ciudad', motivo: 'sin_equivalencia', catalogo: 'ciudad', texto: 'Pereira', departamento: 'Risaralda' }] }) });
    render(<SolidoPage />);
    await userEvent.click(await screen.findByRole('button', { name: /VER/ }));
    expect(await screen.findByText(/"Pereira" \(Risaralda\) no tiene código de SOLIDO/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /REEVALUAR/ }));
    expect(api.post).toHaveBeenCalledWith('/rpa/jobs/j1/reevaluar', undefined);
  });
});

describe('SolidoPage — agentes', () => {
  test('pausar y reanudar', async () => {
    render(<SolidoPage />);
    await irA('AGENTES');
    await userEvent.click(await screen.findByRole('button', { name: /PAUSAR/ }));
    expect(api.put).toHaveBeenCalledWith('/rpa/agentes/a1', { pausado: true });
  });

  test('habilitar el guardado exige escribir GUARDAR', async () => {
    render(<SolidoPage />);
    await irA('AGENTES');
    await userEvent.click(await screen.findByRole('button', { name: /HABILITAR GUARDADO/ }));
    const habilitar = screen.getByRole('button', { name: 'HABILITAR' });
    expect(habilitar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Confirmación'), 'guardar');       // minúsculas no valen
    expect(habilitar).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Confirmación'));
    await userEvent.type(screen.getByLabelText('Confirmación'), 'GUARDAR');
    await userEvent.click(habilitar);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/rpa/agentes/a1', { permite_guardar: true }));
  });

  test('deshabilitar el guardado es inmediato (sin confirmación)', async () => {
    preparar({ agentes: [{ ...AGENTE, permite_guardar: true }] });
    render(<SolidoPage />);
    await irA('AGENTES');
    expect(await screen.findByText('HABILITADO')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /DESHABILITAR GUARDADO/ }));
    expect(api.put).toHaveBeenCalledWith('/rpa/agentes/a1', { permite_guardar: false });
  });

  test('crear un agente muestra el token UNA vez y al cerrar desaparece', async () => {
    api.post.mockResolvedValue({ data: { id: 'a9', nombre: 'pc-solido-03', token: 'rpa_SECRETO_DE_PRUEBA_123456789' } });
    render(<SolidoPage />);
    await irA('AGENTES');
    await userEvent.type(await screen.findByPlaceholderText(/pc-solido-03/), 'pc-solido-03');
    await userEvent.click(screen.getByRole('button', { name: /CREAR/ }));
    expect(await screen.findByLabelText('Token del agente')).toHaveValue('rpa_SECRETO_DE_PRUEBA_123456789');
    expect(api.post).toHaveBeenCalledWith('/rpa/agentes', { nombre: 'pc-solido-03' });
    await userEvent.click(screen.getByRole('button', { name: 'CERRAR' }));
    expect(screen.queryByLabelText('Token del agente')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/SECRETO_DE_PRUEBA/)).not.toBeInTheDocument();
  });

  test('cada estado del agente se ve en su tarjeta', async () => {
    preparar({ agentes: [{ ...AGENTE, id: 'b', nombre: 'bloq', estado: 'bloqueado' }, { ...AGENTE, id: 'p', nombre: 'paus', estado: 'pausado', pausado: true }] });
    render(<SolidoPage />);
    await irA('AGENTES');
    const tarjetas = await screen.findAllByTestId('tarjeta-agente');
    expect(tarjetas).toHaveLength(2);
    expect(within(tarjetas[0]).getByTestId('estado-agente')).toHaveAttribute('data-estado', 'bloqueado');
    expect(within(tarjetas[1]).getByRole('button', { name: /REANUDAR/ })).toBeInTheDocument();
  });
});

describe('SolidoPage — equivalencias', () => {
  test('ofrece completar con un clic las que faltan en los trabajos detenidos', async () => {
    preparar({ jobs: [JOB({ estado: 'requiere_datos' })], detalle: DETALLE({ estado: 'requiere_datos',
      faltantes: [{ campo: 'ciudad', motivo: 'sin_equivalencia', catalogo: 'ciudad', texto: 'Dosquebradas', departamento: 'Risaralda' }] }) });
    render(<SolidoPage />);
    await irA('EQUIVALENCIAS');
    const bloque = await screen.findByTestId('equivalencias-faltantes');
    await userEvent.click(within(bloque).getByRole('button', { name: /Dosquebradas/ }));
    expect(screen.getByDisplayValue('Dosquebradas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Risaralda')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('66001'), '66170');
    await userEvent.click(screen.getByRole('button', { name: /GUARDAR/ }));
    expect(api.post).toHaveBeenCalledWith('/rpa/equivalencias', { catalogo: 'ciudad', texto: 'Dosquebradas', codigo_solido: '66170', departamento: 'Risaralda' });
  });

  test('lista y elimina con confirmación', async () => {
    preparar({ equivalencias: [{ id: 'e1', catalogo: 'ciudad', texto_original: 'Pereira, Risaralda', codigo_solido: '66001' }] });
    render(<SolidoPage />);
    await irA('EQUIVALENCIAS');
    expect(await screen.findByText('66001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Quitar Pereira/ }));
    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith('/rpa/equivalencias/e1');
  });

  test('el departamento solo aplica a ciudades', async () => {
    render(<SolidoPage />);
    await irA('EQUIVALENCIAS');
    await userEvent.selectOptions(await screen.findByLabelText(/CATÁLOGO/), 'empresa');
    expect(screen.getByLabelText(/DEPARTAMENTO/)).toBeDisabled();
  });
});

describe('SolidoPage — asesores', () => {
  const SUG = [
    { usuario_id: 'u1', nombre: 'Luisa Medina', email: 'l@x.co', coincidencia: 'exacta', candidatos: [{ codigo: '1087553651', nombre: 'LUISA FERNANDA', apellido: 'MEDINA SALAZAR' }] },
    { usuario_id: 'u2', nombre: 'gestor', email: 'g@x.co', coincidencia: 'ninguna', candidatos: [] },
  ];

  test('propone la cédula del padrón y la asigna solo cuando la persona la confirma', async () => {
    preparar({ sugeridas: SUG });
    api.put.mockResolvedValue({ data: { cedula: '1087553651', en_padron: true } });
    render(<SolidoPage />);
    await irA('ASESORES');
    const filas = await screen.findAllByTestId('fila-asesor');
    expect(filas).toHaveLength(2);
    expect(api.put).not.toHaveBeenCalled();                               // nada se asigna solo
    await userEvent.click(within(filas[0]).getByRole('button', { name: /USAR ESTA CÉDULA/ }));
    expect(api.put).toHaveBeenCalledWith('/rpa/usuarios/u1/cedula', { cedula: '1087553651' });
  });

  test('la cédula manual solo admite 4 a 15 dígitos', async () => {
    preparar({ sugeridas: SUG });
    render(<SolidoPage />);
    await irA('ASESORES');
    const entrada = await screen.findByLabelText('Cédula de gestor');
    const guardar = within(entrada.closest('form')).getByRole('button', { name: 'GUARDAR' });
    await userEvent.type(entrada, '12ab');
    expect(guardar).toBeDisabled();
    await userEvent.clear(entrada);
    await userEvent.type(entrada, '1234567');
    expect(guardar).toBeEnabled();
  });

  test('avisa si la cédula guardada no figura en el padrón', async () => {
    preparar({ sugeridas: SUG });
    api.put.mockResolvedValue({ data: { cedula: '999999', en_padron: false } });
    render(<SolidoPage />);
    await irA('ASESORES');
    const entrada = await screen.findByLabelText('Cédula de gestor');
    await userEvent.type(entrada, '999999');
    await userEvent.click(within(entrada.closest('form')).getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/no figura en el padrón/)));
  });

  test('si todos tienen cédula, lo dice', async () => {
    render(<SolidoPage />);
    await irA('ASESORES');
    expect(await screen.findByTestId('asesores-completos')).toBeInTheDocument();
  });

  test('sin permiso de administración muestra un aviso en vez de fallar', async () => {
    preparar({ sinPermiso: true });
    render(<SolidoPage />);
    await irA('ASESORES');
    expect(await screen.findByText(/solo para administración/)).toBeInTheDocument();
  });
});
