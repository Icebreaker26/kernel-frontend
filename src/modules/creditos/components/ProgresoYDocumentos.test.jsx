import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Eye, Trash2 } from 'lucide-react';

import ProgresoCredito from './ProgresoCredito.jsx';
import CabeceraDocumento, { FichaArchivo, kb } from './CabeceraDocumento.jsx';

const s = (extra = {}) => ({ estado: 'en_tramite', autorizacion_requerida: true, entregada_at: null, recibida_at: null, completada_at: null, ...extra });
const p = (extra = {}) => ({ a_firmar: 5, firmados: 2, firma_completa: false, autorizacion_ok: false, documentos_ok: false, ...extra });

describe('Línea de progreso', () => {
  test('muestra los pasos en dos grupos y cuántos van', () => {
    render(<ProgresoCredito s={s()} p={p()} />);
    const region = screen.getByRole('region', { name: 'Progreso de la solicitud' });
    expect(within(region).getByText('PREPARACIÓN DEL EXPEDIENTE')).toBeInTheDocument();
    expect(within(region).getByText('TRÁMITE Y PAGO')).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem').map((l) => l.textContent.replace(/\d+/, ''))).toHaveLength(7);
    expect(within(region).getByText(/0 de 7/)).toBeInTheDocument();
  });

  test('marca el paso actual con aria-current y expone la barra de avance', () => {
    render(<ProgresoCredito s={s({ estado: 'completada' })} p={p()} />);
    const actual = screen.getAllByRole('listitem').find((l) => l.getAttribute('aria-current') === 'step');
    expect(actual).toHaveTextContent('Control Interno');
    const barra = screen.getByRole('progressbar', { name: 'Avance' });
    expect(barra).toHaveAttribute('aria-valuenow', '5');
    expect(barra).toHaveAttribute('aria-valuemax', '7');
    expect(screen.getByText(/71 %/)).toBeInTheDocument();
  });

  test('cada paso declara su estado', () => {
    render(<ProgresoCredito s={s({ estado: 'devuelta' })} p={p({ firma_completa: true, autorizacion_ok: true, documentos_ok: true })} />);
    const por = Object.fromEntries(screen.getAllByRole('listitem').map((l) => [l.textContent.replace(/^\d+|^$/, '').slice(0, 12), l.getAttribute('data-estado')]));
    expect(screen.getAllByRole('listitem').filter((l) => l.getAttribute('data-estado') === 'alerta')).toHaveLength(1);
    expect(screen.getAllByRole('listitem').find((l) => l.getAttribute('data-estado') === 'alerta')).toHaveTextContent('Entrega a Cartera');
    expect(por).toBeTruthy();
  });

  test('"no aplica" cuando la empresa no exige autorización', () => {
    render(<ProgresoCredito s={s({ autorizacion_requerida: false })} p={p()} />);
    const li = screen.getAllByRole('listitem').find((l) => l.textContent.includes('Autorización de la empresa'));
    expect(li).toHaveTextContent('no la exige');
    expect(li).toHaveAttribute('data-estado', 'na');
    expect(screen.getByText(/0 de 6/)).toBeInTheDocument();
  });

  test('pagada: todo completo al 100 %', () => {
    render(<ProgresoCredito s={s({ estado: 'pagada' })} p={p()} />);
    expect(screen.getByText(/7 de 7/)).toBeInTheDocument();
    expect(screen.getByText(/100 %/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem').some((l) => l.getAttribute('aria-current') === 'step')).toBe(false);
  });

  test('muestra la fecha de cada etapa ya cumplida', () => {
    render(<ProgresoCredito s={s({ estado: 'en_tesoreria', entregada_at: '2026-09-20T15:00:00Z', recibida_at: '2026-09-21T15:00:00Z', completada_at: '2026-09-22T15:00:00Z' })} p={p()} />);
    const li = screen.getAllByRole('listitem').find((l) => l.textContent.includes('Cartera') && !l.textContent.includes('Entrega'));
    expect(li).toHaveTextContent(/21 de sept/);
  });
});

describe('Cabecera de documento', () => {
  const props = { titulo: 'Pagaré', nombre: 'pagare.pdf', mime: 'application/pdf', size: 20480, fechaSubida: '2026-09-22T15:00:00Z', autor: 'Luis Pérez' };

  test('muestra tipo de archivo, título, nombre y datos del archivo', () => {
    render(<CabeceraDocumento {...props} />);
    expect(screen.getByText('Pagaré')).toBeInTheDocument();
    expect(screen.getByText('pagare.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText(/20 KB · 22 de sept de 2026 · Luis Pérez/)).toBeInTheDocument();
  });

  test('una imagen se etiqueta por su formato', () => {
    render(<CabeceraDocumento {...props} nombre="foto.jpeg" mime="image/jpeg" />);
    expect(screen.getByText('JPG')).toBeInTheDocument();
  });

  test('sin datos del archivo no deja huecos', () => {
    render(<CabeceraDocumento titulo="Otro" nombre="x.pdf" mime="application/pdf" />);
    expect(screen.queryByText(/KB/)).toBeNull();
  });

  test('las acciones llevan texto visible y nombre accesible, y responden al clic', async () => {
    const ver = vi.fn(); const quitar = vi.fn();
    render(<CabeceraDocumento {...props} acciones={[{ aria: 'Ver pagare.pdf', texto: 'VER', icono: Eye, onClick: ver }, { aria: 'Quitar pagare.pdf', texto: 'QUITAR', icono: Trash2, peligro: true, onClick: quitar }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver pagare.pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar pagare.pdf' }));
    expect(ver).toHaveBeenCalledTimes(1);
    expect(quitar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ver pagare.pdf' })).toHaveTextContent('VER');
    expect(screen.getByRole('button', { name: 'Quitar pagare.pdf' })).toHaveClass('text-rose-300');
  });

  test('la ficha sola muestra el formato', () => {
    render(<FichaArchivo mime="application/pdf" tono="ok" />);
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  test('los tamaños se leen en KB o MB', () => {
    expect(kb(100)).toBe('1 KB');
    expect(kb(3 * 1048576)).toBe('3.0 MB');
    expect(kb(null)).toBe('');
  });
});
