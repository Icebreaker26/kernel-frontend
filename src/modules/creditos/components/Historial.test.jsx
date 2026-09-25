import { describe, test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Historial from './Historial.jsx';
import Timeline, { agruparPorDia } from './Timeline.jsx';

// Del más viejo al más nuevo, como los entrega el servidor. Las horas están en UTC; Bogotá va 5 horas atrás.
const ev = (id, tipo, creado, extra = {}) => ({ id, tipo, detalle: {}, autor_tipo: 'empleado', autor_nombre: 'Luis Pérez', created_at: creado, ...extra });
const EVENTOS = [
  ev(1, 'radicada', '2026-09-22T15:00:00.000Z'),
  ev(2, 'firma_completa', '2026-09-22T20:30:00.000Z'),
  ev(3, 'entregada_a_cartera', '2026-09-24T15:10:00.000Z', { autor_nombre: 'Carolina Cartera' }),
  ev(4, 'devuelta_por_cartera', '2026-09-24T21:45:00.000Z', { detalle: { motivo: 'Falta el desprendible' }, autor_nombre: 'Carolina Cartera' }),
];

describe('Historial — plegado de origen', () => {
  test('arranca cerrado: solo la tarjeta con el conteo y el último evento, sin la línea de tiempo', () => {
    render(<Historial eventos={EVENTOS} />);
    const boton = screen.getByRole('button', { name: /HISTORIAL/ });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveTextContent('4 eventos');
    expect(boton).toHaveTextContent('Último: Devuelta por Cartera');
    expect(boton).toHaveTextContent(/24 .* 2026, 4:45|24 .* 2026, 04:45/);
    expect(boton).toHaveTextContent('Carolina Cartera');
    expect(boton).toHaveTextContent('VER HISTORIAL');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);   // nada de la línea de tiempo está en pantalla
    expect(screen.queryByText('Solicitud radicada')).toBeNull();
  });

  test('un clic la despliega y otro la pliega; la línea de tiempo solo existe abierta', async () => {
    const user = userEvent.setup();
    render(<Historial eventos={EVENTOS} />);
    const boton = screen.getByRole('button', { name: /HISTORIAL/ });
    await user.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(boton).toHaveTextContent('OCULTAR');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Solicitud radicada')).toBeInTheDocument();
    expect(boton).not.toHaveTextContent('Último:');   // abierto, la vista previa sobra
    await user.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('funciona con el teclado (Enter y espacio) porque es un botón', async () => {
    const user = userEvent.setup();
    render(<Historial eventos={EVENTOS} />);
    await user.tab();
    expect(screen.getByRole('button', { name: /HISTORIAL/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    await user.keyboard(' ');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('el botón declara qué región controla', async () => {
    const user = userEvent.setup();
    render(<Historial eventos={EVENTOS} />);
    const boton = screen.getByRole('button', { name: /HISTORIAL/ });
    const destino = document.getElementById(boton.getAttribute('aria-controls'));
    expect(destino).not.toBeNull();
    expect(destino).toHaveAttribute('hidden');
    await user.click(boton);
    expect(destino).not.toHaveAttribute('hidden');
  });

  test('con un solo evento habla en singular; sin eventos lo dice al abrirlo', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Historial eventos={[EVENTOS[0]]} />);
    expect(screen.getByRole('button', { name: /HISTORIAL/ })).toHaveTextContent('1 evento');
    expect(screen.getByRole('button', { name: /HISTORIAL/ })).not.toHaveTextContent('1 eventos');
    unmount();
    render(<Historial eventos={[]} />);
    await user.click(screen.getByRole('button', { name: /HISTORIAL/ }));
    expect(screen.getByText('Aún no hay eventos.')).toBeInTheDocument();
  });

  test('con muchos eventos abre solo los 12 más recientes y ofrece ver los anteriores', async () => {
    const user = userEvent.setup();
    const muchos = Array.from({ length: 30 }, (_, i) => ev(i + 1, 'documento_consultado', `2026-09-24T${String(10 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}:00.000Z`));
    render(<Historial eventos={muchos} />);
    await user.click(screen.getByRole('button', { name: /HISTORIAL/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    const mas = screen.getByRole('button', { name: 'VER LOS 18 ANTERIORES' });
    await user.click(mas);
    expect(screen.getAllByRole('listitem')).toHaveLength(30);
    expect(screen.queryByRole('button', { name: /ANTERIORES/ })).toBeNull();
  });

  test('con 12 eventos o menos no ofrece "ver los anteriores"', async () => {
    const user = userEvent.setup();
    render(<Historial eventos={EVENTOS} />);
    await user.click(screen.getByRole('button', { name: /HISTORIAL/ }));
    expect(screen.queryByRole('button', { name: /ANTERIORES/ })).toBeNull();
  });

  test('un último evento de alerta se resalta en rojo en la vista previa', () => {
    render(<Historial eventos={EVENTOS} />);
    expect(within(screen.getByRole('button', { name: /HISTORIAL/ })).getByText('Devuelta por Cartera')).toHaveClass('text-rose-300');
  });
});

describe('Línea de tiempo — agrupada por día', () => {
  test('agrupa por día de Bogotá, con el día más reciente primero y lo más nuevo arriba dentro del día', () => {
    const g = agruparPorDia(EVENTOS);
    expect(g.map((x) => x.clave)).toEqual(['2026-09-24', '2026-09-22']);
    expect(g[0].eventos.map((e) => e.id)).toEqual([4, 3]);
    expect(g[1].eventos.map((e) => e.id)).toEqual([2, 1]);
  });

  test('un evento de la noche cuenta en el día de Colombia, no en el de UTC', () => {
    const g = agruparPorDia([ev(1, 'radicada', '2026-09-25T02:30:00.000Z')]);   // 24 de septiembre, 9:30 p. m. en Bogotá
    expect(g[0].clave).toBe('2026-09-24');
  });

  test('cada día lleva su encabezado con cuántos eventos tuvo y la hora de cada uno a la izquierda', () => {
    render(<Timeline eventos={EVENTOS} />);
    const dia24 = screen.getByRole('region', { name: /Eventos del 24/ });
    expect(within(dia24).getByRole('heading')).toHaveTextContent(/24 .* 2026/);
    expect(within(dia24).getByRole('heading')).toHaveTextContent('2');
    const items = within(dia24).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/4:45|04:45/);      // 21:45 UTC = 4:45 p. m. en Bogotá
    expect(items[0]).toHaveTextContent('Falta el desprendible');
    expect(items[1]).toHaveTextContent(/10:10/);
  });

  test('mantiene los colores: rojo para alertas, verde para éxito, gris para el resto', () => {
    const { container } = render(<Timeline eventos={EVENTOS} />);
    expect(container.querySelectorAll('.bg-rose-500')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-emerald-400')).toHaveLength(2);
    expect(container.querySelectorAll('.bg-slate-600')).toHaveLength(1);
  });
});
