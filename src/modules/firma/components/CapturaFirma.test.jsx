import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CapturaFirma from './CapturaFirma.jsx';

// jsdom no dibuja: se simula el contexto del lienzo para comprobar qué se pinta y qué se entrega
let ctx;
beforeEach(() => {
  ctx = { setTransform: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), clearRect: vi.fn(), lineWidth: 0 };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FIRMA');
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 400, height: 220, right: 410, bottom: 240 });
});

const lienzo = () => screen.getByLabelText('Área de firma');
const punto = (x, y, extra = {}) => ({ pointerId: 1, pointerType: 'pen', pressure: 0.5, clientX: 10 + x, clientY: 20 + y, ...extra });
const trazar = (el, tramos, extra) => {
  fireEvent.pointerDown(el, punto(tramos[0][0], tramos[0][1], extra));
  tramos.slice(1).forEach(([x, y]) => fireEvent.pointerMove(el, punto(x, y, extra)));
  fireEvent.pointerUp(el, punto(...tramos[tramos.length - 1], extra));
};
const LARGO = [[0, 100], [60, 100], [120, 100]];   // 120 px de trazo
const CORTO = [[0, 100], [20, 100]];                // 20 px: un toque suelto, no una firma

describe('CapturaFirma — trazo y entrega', () => {
  test('al inicio muestra la indicación y no entrega nada; al tocar la oculta', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    expect(screen.getByText(/Firme aquí con el lápiz/)).toBeInTheDocument();
    fireEvent.pointerDown(lienzo(), punto(5, 5));
    expect(screen.queryByText(/Firme aquí con el lápiz/)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('un trazo corto (toque suelto) no cuenta como firma', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), CORTO);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  test('un trazo suficiente entrega el PNG y con qué se firmó', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), LARGO);
    expect(onChange).toHaveBeenLastCalledWith({ png: 'data:image/png;base64,FIRMA', metodo: 'pen' });
  });

  test.each([['pen', 'pen'], ['touch', 'touch'], ['mouse', 'mouse']])('el método se registra según el dispositivo: %s', (tipo, esperado) => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), LARGO, { pointerType: tipo });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: esperado }));
  });

  test('si en algún momento se usó el mouse, el método queda como mouse (el de menor valor probatorio)', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), CORTO, { pointerType: 'pen' });
    trazar(lienzo(), LARGO, { pointerType: 'mouse' });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'mouse' }));
  });

  test('el trazo se suma entre varios toques: dos trazos cortos que juntos pasan el mínimo cuentan', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), [[0, 100], [40, 100]]);
    expect(onChange).toHaveBeenLastCalledWith(null);
    trazar(lienzo(), [[0, 150], [40, 150]]);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'pen' }));
  });
});

describe('CapturaFirma — dibujo', () => {
  test('el grosor sigue la presión del lápiz', () => {
    render(<CapturaFirma onChange={() => {}} />);
    fireEvent.pointerDown(lienzo(), punto(0, 0, { pressure: 1 }));
    fireEvent.pointerMove(lienzo(), punto(30, 0, { pressure: 1 }));
    const fuerte = ctx.lineWidth;
    fireEvent.pointerMove(lienzo(), punto(60, 0, { pressure: 0.1 }));
    const suave = ctx.lineWidth;
    expect(fuerte).toBeCloseTo(1.2 + 3.2 * 1);
    expect(suave).toBeCloseTo(1.2 + 3.2 * 0.1);
    expect(fuerte).toBeGreaterThan(suave);
  });

  test('con mouse o dedo (sin presión real) usa un grosor medio', () => {
    render(<CapturaFirma onChange={() => {}} />);
    fireEvent.pointerDown(lienzo(), punto(0, 0, { pointerType: 'mouse', pressure: 0 }));
    fireEvent.pointerMove(lienzo(), punto(30, 0, { pointerType: 'mouse', pressure: 0 }));
    expect(ctx.lineWidth).toBeCloseTo(1.2 + 3.2 * 0.5);
  });

  test('las coordenadas se toman relativas al lienzo', () => {
    render(<CapturaFirma onChange={() => {}} />);
    fireEvent.pointerDown(lienzo(), punto(15, 40));
    fireEvent.pointerMove(lienzo(), punto(55, 60));
    expect(ctx.moveTo).toHaveBeenLastCalledWith(15, 40);
    expect(ctx.lineTo).toHaveBeenLastCalledWith(55, 60);
  });

  test('mover sin haber apoyado no dibuja nada', () => {
    render(<CapturaFirma onChange={() => {}} />);
    fireEvent.pointerMove(lienzo(), punto(50, 50));
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  test('un trazo cancelado (p. ej. la palma sale de la tableta) también termina y entrega', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    fireEvent.pointerDown(lienzo(), punto(0, 100));
    LARGO.slice(1).forEach(([x, y]) => fireEvent.pointerMove(lienzo(), punto(x, y)));
    fireEvent.pointerCancel(lienzo(), punto(120, 100));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'pen' }));
  });

  test('funciona aunque el navegador no permita capturar el puntero', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    lienzo().setPointerCapture = () => { throw new Error('InvalidPointerId'); };
    expect(() => trazar(lienzo(), LARGO)).not.toThrow();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'pen' }));
  });

  test('usa los eventos coalescidos del lápiz cuando el navegador los da', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    fireEvent.pointerDown(lienzo(), punto(0, 100));
    const antes = ctx.lineTo.mock.calls.length;   // apoyar dibuja un punto
    const mover = new Event('pointermove', { bubbles: true, cancelable: true });
    Object.assign(mover, { pointerType: 'pen', pressure: 0.5, clientX: 10 + 70, clientY: 20 + 100, getCoalescedEvents: () => [
      { clientX: 10 + 20, clientY: 20 + 100, pointerType: 'pen', pressure: 0.5 }, { clientX: 10 + 45, clientY: 20 + 100, pointerType: 'pen', pressure: 0.5 },
      { clientX: 10 + 70, clientY: 20 + 100, pointerType: 'pen', pressure: 0.5 },
    ] });
    lienzo().dispatchEvent(mover);
    expect(ctx.lineTo.mock.calls.length - antes).toBe(3);   // un segmento por cada evento coalescido
    fireEvent.pointerUp(lienzo(), punto(70, 100));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'pen' }));
  });
});

describe('CapturaFirma — borrar', () => {
  test('borrar deshabilitado sin tinta; con tinta limpia, avisa y vuelve la indicación', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    const borrar = screen.getByRole('button', { name: /Borrar y firmar de nuevo/ });
    expect(borrar).toBeDisabled();
    trazar(lienzo(), LARGO);
    expect(borrar).toBeEnabled();
    fireEvent.click(borrar);
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/Firme aquí con el lápiz/)).toBeInTheDocument();
    expect(borrar).toBeDisabled();
  });

  test('tras borrar, el trazo y el método se cuentan desde cero', () => {
    const onChange = vi.fn();
    render(<CapturaFirma onChange={onChange} />);
    trazar(lienzo(), LARGO, { pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: /Borrar/ }));
    trazar(lienzo(), LARGO, { pointerType: 'pen' });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ metodo: 'pen' }));
    fireEvent.click(screen.getByRole('button', { name: /Borrar/ }));
    trazar(lienzo(), CORTO);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
