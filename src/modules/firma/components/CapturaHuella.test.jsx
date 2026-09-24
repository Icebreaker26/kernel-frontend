import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// El hook se simula: aquí se prueba solo lo que la pantalla muestra en cada estado del lector
const hook = vi.hoisted(() => ({ valor: null }));
vi.mock('../hooks/useHuellero.js', () => ({ useHuellero: () => hook.valor }));

import CapturaHuella from './CapturaHuella.jsx';

const base = () => ({ estado: 'buscando', mensaje: '', muestra: null, dispositivo: null, iniciar: vi.fn(), descartar: vi.fn() });
beforeEach(() => { hook.valor = base(); });

describe('CapturaHuella — estados del lector', () => {
  test('arranca la búsqueda del lector al montarse', () => {
    render(<CapturaHuella onChange={() => {}} />);
    expect(hook.valor.iniciar).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Buscando el lector/)).toBeInTheDocument();
  });

  test('listo: pide apoyar el dedo', () => {
    hook.valor = { ...base(), estado: 'listo' };
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.getByText(/apoye el dedo índice sobre el lector/i)).toBeInTheDocument();
  });

  test('sin servicio: explica cómo resolverlo y ofrece reintentar', () => {
    hook.valor = { ...base(), estado: 'sin_servicio' };
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.getByText(/HID Authentication Device Client/)).toBeInTheDocument();
    expect(screen.getByText(/red local/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(hook.valor.iniciar).toHaveBeenCalledTimes(2);   // una al montar y otra al reintentar
  });

  test('sin lector: pide conectarlo y ofrece reintentar', () => {
    hook.valor = { ...base(), estado: 'sin_lector' };
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.getByText(/Conéctelo por USB/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });

  test('muestra la indicación de calidad que reporta el lector', () => {
    hook.valor = { ...base(), estado: 'listo', mensaje: 'Poca presión o dedo muy seco. Presione un poco más.' };
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.getByText(/Poca presión/)).toBeInTheDocument();
  });

  test('capturada: muestra la imagen, confirma y permite repetir; no ofrece reintentar', () => {
    hook.valor = { ...base(), estado: 'capturada', muestra: 'data:image/png;base64,HUELLA' };
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.getByRole('img', { name: 'Huella capturada' })).toHaveAttribute('src', 'data:image/png;base64,HUELLA');
    expect(screen.getByText('Huella capturada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Repetir la captura/ }));
    expect(hook.valor.descartar).toHaveBeenCalledTimes(1);
  });

  test('sin muestra no hay botón de repetir', () => {
    render(<CapturaHuella onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /Repetir/ })).toBeNull();
  });
});

describe('CapturaHuella — lo que entrega al asistente', () => {
  test('sin huella entrega null', () => {
    const onChange = vi.fn();
    render(<CapturaHuella onChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  test('con huella entrega la imagen y el dispositivo', () => {
    hook.valor = { ...base(), estado: 'capturada', muestra: 'data:image/png;base64,HUELLA', dispositivo: 'DigitalPersona uid-1' };
    const onChange = vi.fn();
    render(<CapturaHuella onChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith({ png: 'data:image/png;base64,HUELLA', dispositivo: 'DigitalPersona uid-1' });
  });

  test('al descartar la huella vuelve a entregar null', () => {
    hook.valor = { ...base(), estado: 'capturada', muestra: 'data:image/png;base64,HUELLA', dispositivo: 'X' };
    const onChange = vi.fn();
    const { rerender } = render(<CapturaHuella onChange={onChange} />);
    hook.valor = { ...base(), estado: 'listo', muestra: null, dispositivo: 'X' };
    rerender(<CapturaHuella onChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
