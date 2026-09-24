import { useState } from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// pdf.js se simula: dos páginas de 600 × 800 pt. Se prueba la interacción con las cajas, no el dibujo del PDF
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

import VisorColocacion from './VisorColocacion.jsx';
import VistaPreviaModal from './VistaPreviaModal.jsx';

// La página se ve de 600 × 800 px, con su esquina en (100, 50)
const RECT = { left: 100, top: 50, width: 600, height: 800, right: 700, bottom: 850 };
beforeEach(() => {
  pdf.falla = false; pdf.paginas = 2;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
});

const FIRMANTES = [{ nombre: 'Ana Gómez' }, { nombre: 'Luis Ruiz' }];
// Contenedor con estado, como la página real, y una salida para leer las cajas
const Contenedor = ({ inicial = [], activo = null }) => {
  const [cajas, setCajas] = useState(inicial);
  return (
    <>
      <VisorColocacion bytes={new Uint8Array([1, 2, 3])} firmantes={FIRMANTES} cajas={cajas} setCajas={setCajas} activo={activo} />
      <output data-testid="cajas">{JSON.stringify(cajas)}</output>
    </>
  );
};
const cajasActuales = () => JSON.parse(screen.getByTestId('cajas').textContent);
const paginas = () => document.querySelectorAll('[data-pagina]');
const cargado = async () => { await waitFor(() => expect(paginas()).toHaveLength(2)); };
const caja = (extra = {}) => ({ id: 'c1', firmante: 0, tipo: 'firma', pagina: 0, x: 0.2, y: 0.3, w: 0.28, ...extra });
const cajaEnPantalla = (i = 0) => document.querySelectorAll('div.group')[i];

describe('VisorColocacion — páginas', () => {
  test('muestra una hoja por cada página del PDF, numeradas', async () => {
    render(<Contenedor />);
    await cargado();
    expect(screen.getByText('PÁGINA 1 DE 2')).toBeInTheDocument();
    expect(screen.getByText('PÁGINA 2 DE 2')).toBeInTheDocument();
  });

  test('cada hoja conserva la proporción de la página', async () => {
    render(<Contenedor />);
    await cargado();
    expect(paginas()[0].style.aspectRatio).toMatch(/1 \/ 1\.333/);
  });

  test('si el PDF no se puede leer, lo dice en vez de quedar en blanco', async () => {
    pdf.falla = true;
    render(<Contenedor />);
    expect(await screen.findByText('No se pudo mostrar el PDF.')).toBeInTheDocument();
  });
});

describe('VisorColocacion — colocar cajas', () => {
  test('sin firmante armado, un clic en la página no crea nada', async () => {
    render(<Contenedor />);
    await cargado();
    fireEvent.click(paginas()[0], { clientX: 400, clientY: 450 });
    expect(cajasActuales()).toEqual([]);
  });

  test('con la firma de un firmante armada, el clic coloca la caja centrada en ese punto', async () => {
    render(<Contenedor activo={{ firmante: 1, tipo: 'firma' }} />);
    await cargado();
    fireEvent.click(paginas()[1], { clientX: 400, clientY: 450 });   // en la página: (300, 400) → (0.5, 0.5)
    const [c] = cajasActuales();
    expect(c).toMatchObject({ firmante: 1, tipo: 'firma', pagina: 1, w: 0.28 });
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(c.x).toBeCloseTo(0.5 - 0.28 / 2, 5);
    // alto de la caja de firma (3:1) sobre la proporción de la página 4:3 → 0.28/3/1.3333 = 0.07
    expect(c.y).toBeCloseTo(0.5 - 0.07 / 2, 5);
  });

  test('la caja de huella es más pequeña y cuadrada', async () => {
    render(<Contenedor activo={{ firmante: 0, tipo: 'huella' }} />);
    await cargado();
    fireEvent.click(paginas()[0], { clientX: 400, clientY: 450 });
    const [c] = cajasActuales();
    expect(c).toMatchObject({ tipo: 'huella', w: 0.13 });
    expect(c.y).toBeCloseTo(0.5 - (0.13 / 1.3333333) / 2, 3);   // alto = ancho (cuadrada) sobre la proporción de la página
  });

  test('una caja colocada en el borde no se sale de la página', async () => {
    render(<Contenedor activo={{ firmante: 0, tipo: 'firma' }} />);
    await cargado();
    fireEvent.click(paginas()[0], { clientX: 100, clientY: 50 });    // esquina superior izquierda
    fireEvent.click(paginas()[0], { clientX: 700, clientY: 850 });   // esquina inferior derecha
    const [a, b] = cajasActuales();
    expect(a.x).toBe(0); expect(a.y).toBe(0);
    expect(b.x).toBeCloseTo(1 - 0.28, 5); expect(b.y).toBeCloseTo(1 - 0.07, 3);
  });

  test('cada clic agrega otra caja (un firmante puede tener varias)', async () => {
    render(<Contenedor activo={{ firmante: 0, tipo: 'firma' }} />);
    await cargado();
    fireEvent.click(paginas()[0], { clientX: 300, clientY: 200 });
    fireEvent.click(paginas()[0], { clientX: 300, clientY: 600 });
    expect(cajasActuales()).toHaveLength(2);
  });

  test('un clic sobre una caja existente no coloca otra encima', async () => {
    render(<Contenedor inicial={[caja()]} activo={{ firmante: 0, tipo: 'firma' }} />);
    await cargado();
    fireEvent.click(cajaEnPantalla(), { clientX: 300, clientY: 300 });
    expect(cajasActuales()).toHaveLength(1);
  });

  test('las cajas se dibujan en su página con el nombre del firmante y el tipo', async () => {
    render(<Contenedor inicial={[caja(), caja({ id: 'c2', firmante: 1, tipo: 'huella', pagina: 1 })]} />);
    await cargado();
    expect(within(paginas()[0]).getByText('Firma · Ana Gómez')).toBeInTheDocument();
    expect(within(paginas()[1]).getByText('Huella · Luis Ruiz')).toBeInTheDocument();
  });
});

describe('VisorColocacion — botones de la caja (borrar y duplicar)', () => {
  const controles = (c = cajaEnPantalla()) => c.querySelector('span.absolute.right-0');

  test('los botones están pegados a la caja: el relleno cubre el hueco para que el hover no se pierda al llegar a ellos', async () => {
    render(<Contenedor inicial={[caja()]} />);
    await cargado();
    expect(controles()).toHaveClass('bottom-full', 'pb-2');
    expect(controles()).not.toHaveClass('-top-6');
  });

  test('en una caja pegada al borde superior de la página, los botones salen por debajo', async () => {
    render(<Contenedor inicial={[caja({ y: 0.02 })]} />);
    await cargado();
    expect(controles()).toHaveClass('top-full', 'pt-2');
  });

  test('sin selección solo se muestran al pasar el mouse; al seleccionar la caja se quedan visibles (tableta y pantalla táctil)', async () => {
    render(<Contenedor inicial={[caja()]} />);
    await cargado();
    expect(controles()).toHaveClass('hidden', 'group-hover:flex');
    fireEvent.pointerDown(cajaEnPantalla(), { pointerId: 1, clientX: 200, clientY: 200 });
    expect(controles()).toHaveClass('flex');
    expect(controles()).not.toHaveClass('hidden');
  });

  test('un clic en la página (fuera de las cajas) deselecciona', async () => {
    render(<Contenedor inicial={[caja()]} />);
    await cargado();
    fireEvent.pointerDown(cajaEnPantalla(), { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.click(paginas()[0], { clientX: 650, clientY: 800 });
    expect(controles()).toHaveClass('hidden');
  });

  test('los botones son grandes (fáciles de acertar) y accesibles', async () => {
    render(<Contenedor inicial={[caja()]} />);
    await cargado();
    const botones = within(controles()).getAllByRole('button');
    expect(botones).toHaveLength(2);
    botones.forEach((b) => expect(b).toHaveClass('p-2'));
    expect(screen.getByRole('button', { name: 'Quitar esta caja' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repetir en todas las páginas' })).toBeInTheDocument();
  });

  test('quitar elimina solo esa caja', async () => {
    render(<Contenedor inicial={[caja(), caja({ id: 'c2', x: 0.6, y: 0.6 })]} />);
    await cargado();
    fireEvent.click(within(controles(cajaEnPantalla(0))).getByRole('button', { name: 'Quitar esta caja' }));
    expect(cajasActuales().map((c) => c.id)).toEqual(['c2']);
  });

  test('repetir en todas las páginas copia la caja a las que no la tienen, en la misma posición', async () => {
    render(<Contenedor inicial={[caja({ x: 0.3, y: 0.7 })]} />);
    await cargado();
    fireEvent.click(screen.getByRole('button', { name: 'Repetir en todas las páginas' }));
    const cajas = cajasActuales();
    expect(cajas).toHaveLength(2);
    expect(cajas.map((c) => c.pagina).sort()).toEqual([0, 1]);
    const copia = cajas.find((c) => c.pagina === 1);
    expect(copia).toMatchObject({ x: 0.3, y: 0.7, w: 0.28, firmante: 0, tipo: 'firma' });
    expect(copia.id).not.toBe('c1');
  });

  test('repetir dos veces no duplica en las páginas que ya la tienen', async () => {
    render(<Contenedor inicial={[caja()]} />);
    await cargado();
    fireEvent.click(screen.getByRole('button', { name: 'Repetir en todas las páginas' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Repetir en todas las páginas' })[0]);
    expect(cajasActuales()).toHaveLength(2);
  });

  test('repetir no mezcla firmantes ni tipos: la firma de otro firmante en la página no cuenta como "ya tiene"', async () => {
    render(<Contenedor inicial={[caja(), caja({ id: 'otra', firmante: 1, pagina: 1, x: 0.5, y: 0.5 })]} />);
    await cargado();
    fireEvent.click(within(controles(cajaEnPantalla(0))).getByRole('button', { name: 'Repetir en todas las páginas' }));
    const deAna = cajasActuales().filter((c) => c.firmante === 0);
    expect(deAna.map((c) => c.pagina).sort()).toEqual([0, 1]);
  });
});

describe('VisorColocacion — mover y redimensionar', () => {
  test('arrastrar mueve la caja lo que se movió el puntero', async () => {
    render(<Contenedor inicial={[caja({ x: 0.2, y: 0.3 })]} />);
    await cargado();
    const el = cajaEnPantalla();
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 360, clientY: 480 });   // +60 px de 600 = 0.1; +80 px de 800 = 0.1
    fireEvent.pointerUp(el, { pointerId: 1 });
    const [c] = cajasActuales();
    expect(c.x).toBeCloseTo(0.3, 5);
    expect(c.y).toBeCloseTo(0.4, 5);
  });

  test('no se puede arrastrar fuera de la página', async () => {
    render(<Contenedor inicial={[caja({ x: 0.2, y: 0.3 })]} />);
    await cargado();
    const el = cajaEnPantalla();
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 3000, clientY: 4000 });
    let [c] = cajasActuales();
    expect(c.x).toBeCloseTo(1 - 0.28, 5);
    expect(c.y).toBeCloseTo(1 - 0.07, 3);
    fireEvent.pointerMove(el, { pointerId: 1, clientX: -3000, clientY: -4000 });
    [c] = cajasActuales();
    expect(c.x).toBe(0); expect(c.y).toBe(0);
  });

  test('después de soltar, mover el puntero ya no arrastra', async () => {
    render(<Contenedor inicial={[caja({ x: 0.2, y: 0.3 })]} />);
    await cargado();
    const el = cajaEnPantalla();
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 360, clientY: 400 });
    fireEvent.pointerUp(el, { pointerId: 1 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 600, clientY: 400 });
    expect(cajasActuales()[0].x).toBeCloseTo(0.3, 5);
  });

  test('la esquina redimensiona la caja conservando su proporción', async () => {
    render(<Contenedor inicial={[caja({ x: 0.2, y: 0.3, w: 0.28 })]} />);
    await cargado();
    const asa = cajaEnPantalla().querySelector('span.cursor-nwse-resize');
    fireEvent.pointerDown(asa, { pointerId: 1, clientX: 400, clientY: 400 });
    fireEvent.pointerMove(asa, { pointerId: 1, clientX: 460, clientY: 400 });   // +60 px = +0.1 de ancho
    expect(cajasActuales()[0].w).toBeCloseTo(0.38, 5);
    expect(cajasActuales()[0].x).toBeCloseTo(0.2, 5);   // no se mueve, solo crece
  });

  test('el tamaño tiene mínimo y máximo (más pequeño para la huella)', async () => {
    render(<Contenedor inicial={[caja({ w: 0.28 }), caja({ id: 'h', tipo: 'huella', w: 0.13, x: 0.6, y: 0.6 })]} />);
    await cargado();
    const asaFirma = cajaEnPantalla(0).querySelector('span.cursor-nwse-resize');
    fireEvent.pointerDown(asaFirma, { pointerId: 1, clientX: 400, clientY: 400 });
    fireEvent.pointerMove(asaFirma, { pointerId: 1, clientX: -2000, clientY: 400 });
    expect(cajasActuales().find((c) => c.id === 'c1').w).toBeCloseTo(0.1, 5);       // mínimo de firma
    fireEvent.pointerMove(asaFirma, { pointerId: 1, clientX: 5000, clientY: 400 });
    expect(cajasActuales().find((c) => c.id === 'c1').w).toBeLessThanOrEqual(0.6);   // máximo
    const asaHuella = cajaEnPantalla(1).querySelector('span.cursor-nwse-resize');
    fireEvent.pointerDown(asaHuella, { pointerId: 2, clientX: 400, clientY: 400 });
    fireEvent.pointerMove(asaHuella, { pointerId: 2, clientX: -2000, clientY: 400 });
    expect(cajasActuales().find((c) => c.id === 'h').w).toBeCloseTo(0.06, 5);        // mínimo de huella
  });

  test('funciona aunque el navegador no permita capturar el puntero', async () => {
    render(<Contenedor inicial={[caja({ x: 0.2 })]} />);
    await cargado();
    const el = cajaEnPantalla();
    el.setPointerCapture = () => { throw new Error('InvalidPointerId'); };
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 300, clientY: 400 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 360, clientY: 400 });
    expect(cajasActuales()[0].x).toBeCloseTo(0.3, 5);
  });
});

describe('VistaPreviaModal', () => {
  const archivo = { nombre: 'contrato.pdf', paginas: 2, bytes: new Uint8Array([1]) };

  test('muestra el nombre, las páginas y el PDF sin cajas ni acciones de colocación', async () => {
    render(<VistaPreviaModal archivo={archivo} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Vista previa de contrato.pdf' })).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2 pág\. · vista previa/)).toBeInTheDocument();
    await cargado();
    fireEvent.click(paginas()[0], { clientX: 300, clientY: 300 });
    expect(document.querySelectorAll('div.group')).toHaveLength(0);   // solo lectura: no se pueden poner cajas
  });

  test('se cierra con el botón, con Esc y con clic en el fondo; no con clic en el contenido', () => {
    const onClose = vi.fn();
    render(<VistaPreviaModal archivo={archivo} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByText('contrato.pdf'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
