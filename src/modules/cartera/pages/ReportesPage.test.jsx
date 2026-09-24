import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import ReportesPage from './ReportesPage.jsx';

const MES = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
const AVAL = { radicado: 'CR-1', cedula: '1088000111', asociado: 'ANA GÓMEZ', valor_solicitado: '5000000.00', aval_porcentaje: '10.00', aval_valor: '500000.00', desembolso_neto: '4485000.00', fecha_completado: '2026-09-24T00:00:00.000Z' };
const AVAL2 = { ...AVAL, radicado: 'CR-2', cedula: '52000222', asociado: 'LUIS RUIZ', valor_solicitado: '1000000.00', aval_valor: '100000.00', desembolso_neto: '885000.00' };
const FIRMA = { radicado: 'CR-1', cedula: '1088000111', asociado: 'ANA GÓMEZ', proveedor: 'Certicámara', documentos: 4, valor: '15000.00', fecha_completado: '2026-09-24T00:00:00.000Z' };
let datos;
let user;

beforeEach(() => {
  user = userEvent.setup();
  datos = { avales: [AVAL, AVAL2], firmas: [FIRMA], parametros: { tarifa_firma_electronica: 15000, puede_configurar: true } };
  api.get.mockImplementation(async (url, op) => {
    if (op?.params?.formato === 'csv') return { data: new Blob(['﻿A;B']) };
    if (url === '/cartera/reportes/avales') return { data: { mes: op.params.mes, filas: datos.avales } };
    if (url === '/cartera/reportes/firmas-electronicas') return { data: { mes: op.params.mes, filas: datos.firmas } };
    if (url === '/cartera/parametros') return { data: datos.parametros };
    throw new Error(`GET inesperado ${url}`);
  });
  api.put.mockResolvedValue({ data: { tarifa_firma_electronica: 18000 } });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
const montar = () => render(<MemoryRouter><ReportesPage /></MemoryRouter>);
const seccion = (titulo) => screen.getByRole('heading', { name: titulo }).closest('section');

describe('Reportes del mes de Cartera', () => {
  test('pide los dos reportes del mes actual', async () => {
    montar();
    await screen.findByText('CR-2');
    expect(api.get).toHaveBeenCalledWith('/cartera/reportes/avales', { params: { mes: MES } });
    expect(api.get).toHaveBeenCalledWith('/cartera/reportes/firmas-electronicas', { params: { mes: MES } });
    expect(screen.getByLabelText('MES')).toHaveValue(MES);
  });

  test('avales: una fila por crédito y los totales del mes', async () => {
    montar();
    const t = within(await waitFor(() => seccion('AVALES DEL MES')));
    await t.findByText('CR-1');
    expect(t.getAllByRole('row')).toHaveLength(1 + 2 + 1);   // encabezado + 2 créditos + total
    const total = t.getByText(/^TOTAL \(2\)/).closest('tr');
    expect(total).toHaveTextContent('$6.000.000');   // monto
    expect(total).toHaveTextContent('$600.000');     // aval
    expect(total).toHaveTextContent('$5.370.000');   // desembolso neto
    expect(t.getAllByText('10%')).toHaveLength(2);
  });

  test('firmas electrónicas: proveedor, documentos y valor, con su total', async () => {
    montar();
    await screen.findByText('Certicámara');
    const t = within(seccion('FIRMAS ELECTRÓNICAS DEL MES'));
    expect(t.getByText('Certicámara').closest('tr')).toHaveTextContent('$15.000');
    expect(t.getByText(/^TOTAL \(1\)/).closest('tr')).toHaveTextContent('$15.000');
  });

  test('un mes sin registros lo dice y no deja exportar', async () => {
    datos.avales = []; datos.firmas = [];
    montar();
    await waitFor(() => expect(screen.getAllByText('No hay registros en este mes.')).toHaveLength(2));
    for (const b of screen.getAllByRole('button', { name: /EXPORTAR ARCHIVO PLANO/ })) expect(b).toBeDisabled();
  });

  test('cambiar el mes vuelve a pedir ambos reportes', async () => {
    montar();
    await screen.findByText('CR-2');
    fireEvent.change(screen.getByLabelText('MES'), { target: { value: '2026-01' } });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/cartera/reportes/avales', { params: { mes: '2026-01' } }));
    expect(api.get).toHaveBeenCalledWith('/cartera/reportes/firmas-electronicas', { params: { mes: '2026-01' } });
  });

  test('exporta el archivo plano de avales con el nombre del mes', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await screen.findByText('CR-2');
    await user.click(within(seccion('AVALES DEL MES')).getByRole('button', { name: /EXPORTAR ARCHIVO PLANO/ }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/cartera/reportes/avales', { params: { mes: MES, formato: 'csv' }, responseType: 'blob' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(clic.mock.instances[0].download).toBe(`avales_${MES}.csv`);
    clic.mockRestore();
  });

  test('exporta el archivo plano de firmas electrónicas', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    montar();
    await screen.findByText('Certicámara');
    await user.click(within(seccion('FIRMAS ELECTRÓNICAS DEL MES')).getByRole('button', { name: /EXPORTAR ARCHIVO PLANO/ }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(clic.mock.instances[0].download).toBe(`firmas_electronicas_${MES}.csv`);
    expect(api.get).toHaveBeenCalledWith('/cartera/reportes/firmas-electronicas', { params: { mes: MES, formato: 'csv' }, responseType: 'blob' });
    clic.mockRestore();
  });

  test('si la exportación falla muestra el mensaje del servidor (viene dentro de un Blob)', async () => {
    api.get.mockImplementation(async (url, op) => {
      if (op?.params?.formato === 'csv') throw { response: { data: new Blob([JSON.stringify({ error: 'Mes inválido (AAAA-MM)' })]) } };
      return { data: url.endsWith('/parametros') ? datos.parametros : { mes: MES, filas: datos.avales } };
    });
    montar();
    await screen.findAllByText('CR-2');
    await user.click(within(seccion('AVALES DEL MES')).getByRole('button', { name: /EXPORTAR/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Mes inválido (AAAA-MM)'));
  });

  test('un error al cargar los reportes avisa', async () => {
    api.get.mockImplementation(async (url) => { if (url === '/cartera/parametros') return { data: datos.parametros }; throw { response: { data: { error: 'Sin permiso' } } }; });
    montar();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sin permiso'));
  });
});

describe('Reportes — tarifa de la firma electrónica', () => {
  test('quien puede configurar ve el campo con la tarifa vigente y guarda un valor nuevo', async () => {
    montar();
    const campo = await screen.findByLabelText('VALOR (COP)');
    expect(campo).toHaveValue(15000);
    expect(screen.getByRole('button', { name: 'GUARDAR' })).toBeDisabled();   // sin cambios
    await user.clear(campo);
    await user.type(campo, '18000');
    await user.click(screen.getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cartera/parametros/tarifa-firma', { valor: 18000 }));
    expect(toast.success).toHaveBeenCalled();
  });

  test('un valor negativo o vacío no se puede guardar', async () => {
    montar();
    const campo = await screen.findByLabelText('VALOR (COP)');
    await user.clear(campo);
    expect(screen.getByRole('button', { name: 'GUARDAR' })).toBeDisabled();
    await user.type(campo, '-5');
    expect(screen.getByRole('button', { name: 'GUARDAR' })).toBeDisabled();
  });

  test('quien no puede configurar solo ve la tarifa vigente', async () => {
    datos.parametros = { tarifa_firma_electronica: 15000, puede_configurar: false };
    montar();
    expect(await screen.findByText(/Tarifa vigente de la firma electrónica: \$15\.000/)).toBeInTheDocument();
    expect(screen.queryByLabelText('VALOR (COP)')).toBeNull();
  });

  test('si el servidor rechaza el cambio lo dice', async () => {
    api.put.mockRejectedValue({ response: { data: { error: 'Sin permiso' } } });
    montar();
    const campo = await screen.findByLabelText('VALOR (COP)');
    await user.clear(campo);
    await user.type(campo, '20000');
    await user.click(screen.getByRole('button', { name: 'GUARDAR' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sin permiso'));
  });
});
