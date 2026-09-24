import { useState } from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// pdf.js se simula: páginas de 600 × 800 pt. Se prueba la interacción con los sellos, no el dibujo del PDF
const pdf = vi.hoisted(() => ({ falla: false, paginas: 2 }));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: pdf.falla ? Promise.reject(new Error('PDF dañado')) : Promise.resolve({
      numPages: pdf.paginas, destroy: vi.fn(),
      getPage: async () => ({ getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }), render: () => ({ promise: Promise.resolve() }) }),
    }),
  }),
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }));

import VisorSellos, { SELLO_ANCHO, SELLO_ASPECTO } from './VisorSellos.jsx';

// Cada página se ve de 600 × 800 px con su esquina en (100, 50)
const RECT = { left: 100, top: 50, width: 600, height: 800, right: 700, bottom: 850 };
beforeEach(() => {
  pdf.falla = false; pdf.paginas = 2;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
});

const TEXTOS = {
  aval: { titulo: 'AVAL FONDO REGIONAL', detalle: '10% · $500.000' },
  firma: { titulo: 'FIRMA ELECTRONICA', detalle: '$15.000' },
  desembolso: { titulo: 'DESEMBOLSO', detalle: '$4.485.000' },
};
const Contenedor = ({ inicial, textos = TEXTOS }) => {
  const [sellos, setSellos] = useState(inicial);
  return (
    <>
      <VisorSellos bytes={new Uint8Array([1, 2, 3])} sellos={sellos} onChange={setSellos} textos={textos} />
      <output data-testid="sellos">{JSON.stringify(sellos)}</output>
    </>
  );
};
const actuales = () => JSON.parse(screen.getByTestId('sellos').textContent);
const cargado = async () => { await waitFor(() => expect(document.querySelectorAll('[data-pagina]')).toHaveLength(2)); };
const INICIAL = { desembolso: { pagina: 0, x: 0.2, y: 0.3 } };

describe('VisorSellos', () => {
  test('muestra una hoja por página y el sello con su título y valor', async () => {
    render(<Contenedor inicial={INICIAL} />);
    await cargado();
    expect(screen.getByText('PÁGINA 2 DE 2')).toBeInTheDocument();
    const sello = screen.getByRole('button', { name: /Sello DESEMBOLSO/ });
    expect(sello).toHaveTextContent('DESEMBOLSO');
    expect(sello).toHaveTextContent('$4.485.000');
  });

  test('el sello mide lo mismo que en el PDF final y va en su posición', async () => {
    render(<Contenedor inicial={INICIAL} />);
    await cargado();
    const sello = screen.getByRole('button', { name: /Sello DESEMBOLSO/ });
    expect(sello.style.width).toBe(`${SELLO_ANCHO * 100}%`);
    expect(sello.style.aspectRatio).toBe(`${SELLO_ASPECTO} / 1`);
    expect(sello.style.left).toBe('20%');
    expect(sello.style.top).toBe('30%');
  });

  test('cada sello aparece en la página donde está colocado', async () => {
    render(<Contenedor inicial={{ ...INICIAL, aval: { pagina: 1, x: 0.1, y: 0.1 } }} />);
    await cargado();
    const paginas = document.querySelectorAll('[data-pagina]');
    expect(paginas[0].querySelector('[data-sello="desembolso"]')).toBeTruthy();
    expect(paginas[1].querySelector('[data-sello="aval"]')).toBeTruthy();
    expect(paginas[0].querySelector('[data-sello="aval"]')).toBeNull();
  });

  test('no dibuja sellos que no tienen texto (ya no aplican)', async () => {
    render(<Contenedor inicial={{ ...INICIAL, aval: { pagina: 0, x: 0.1, y: 0.1 } }} textos={{ desembolso: TEXTOS.desembolso }} />);
    await cargado();
    expect(document.querySelector('[data-sello="aval"]')).toBeNull();
  });

  test('arrastrar mueve el sello (fracciones de la página) sin salirse de ella', async () => {
    render(<Contenedor inicial={INICIAL} />);
    await cargado();
    const sello = screen.getByRole('button', { name: /Sello DESEMBOLSO/ });
    // Lo agarra en su esquina (x=.2 → 220 px, y=.3 → 290 px) y lo lleva 60 px a la derecha y 80 abajo
    fireEvent.pointerDown(sello, { pointerId: 1, clientX: 220, clientY: 290 });
    fireEvent.pointerMove(sello, { pointerId: 1, clientX: 280, clientY: 370 });
    const { pagina, x, y } = actuales().desembolso;
    expect(pagina).toBe(0);
    expect(x).toBeCloseTo(0.3, 5);
    expect(y).toBeCloseTo(0.4, 5);
    fireEvent.pointerMove(sello, { pointerId: 1, clientX: 5000, clientY: 5000 });
    const fin = actuales().desembolso;
    expect(fin.x).toBeCloseTo(1 - SELLO_ANCHO, 5);
    expect(fin.y).toBeLessThan(1);
    fireEvent.pointerUp(sello, { pointerId: 1 });
    fireEvent.pointerMove(sello, { pointerId: 1, clientX: 150, clientY: 100 });
    expect(actuales().desembolso.x).toBeCloseTo(fin.x, 5);   // al soltar deja de seguir al puntero
  });

  test('las flechas del teclado lo mueven un poco, y con Mayús más', async () => {
    render(<Contenedor inicial={INICIAL} />);
    await cargado();
    const sello = screen.getByRole('button', { name: /Sello DESEMBOLSO/ });
    fireEvent.keyDown(sello, { key: 'ArrowRight' });
    expect(actuales().desembolso.x).toBeCloseTo(0.21, 5);
    fireEvent.keyDown(sello, { key: 'ArrowDown', shiftKey: true });
    expect(actuales().desembolso.y).toBeCloseTo(0.35, 5);
    fireEvent.keyDown(sello, { key: 'a' });
    expect(actuales().desembolso.x).toBeCloseTo(0.21, 5);
  });

  test('con el teclado no se sale de la página', async () => {
    render(<Contenedor inicial={{ desembolso: { pagina: 0, x: 0, y: 0 } }} />);
    await cargado();
    const sello = screen.getByRole('button', { name: /Sello DESEMBOLSO/ });
    fireEvent.keyDown(sello, { key: 'ArrowLeft' });
    fireEvent.keyDown(sello, { key: 'ArrowUp' });
    expect(actuales().desembolso).toMatchObject({ x: 0, y: 0 });
  });

  test('si el PDF no se puede leer, lo dice', async () => {
    pdf.falla = true;
    render(<Contenedor inicial={INICIAL} />);
    expect(await screen.findByText('No se pudo mostrar el PDF.')).toBeInTheDocument();
  });
});
