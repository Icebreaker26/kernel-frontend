import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstadoAgente from './EstadoAgente.jsx';
import { SolidoBadge, JobBadge } from './BadgeSolido.jsx';

describe('EstadoAgente', () => {
  test.each([
    ['activo', 'ACTIVO'], ['trabajando', 'TRABAJANDO'], ['bloqueado', 'PANTALLA BLOQUEADA'],
    ['pausado', 'PAUSADO'], ['apagado', 'APAGADO O SIN CONEXIÓN'], ['sin_agente', 'SIN AGENTE'],
  ])('%s se rotula %s', (estado, rotulo) => {
    render(<EstadoAgente agente={{ estado, segundos_sin_latido: 30 }} />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/Agente de SOLIDO/);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });

  test('muestra cuánto hace de la última señal', () => {
    render(<EstadoAgente agente={{ estado: 'activo', segundos_sin_latido: 250 }} />);
    expect(screen.getByText(/última señal hace 4 min/)).toBeInTheDocument();
  });

  test('un agente sano no explica nada; uno con problemas sí, salvo en modo compacto', () => {
    const { rerender } = render(<EstadoAgente agente={{ estado: 'activo', segundos_sin_latido: 5 }} />);
    expect(screen.queryByText(/Listo para recibir/)).not.toBeInTheDocument();
    rerender(<EstadoAgente agente={{ estado: 'bloqueado', segundos_sin_latido: 5 }} />);
    expect(screen.getByText(/desbloquearlo/)).toBeInTheDocument();
    rerender(<EstadoAgente agente={{ estado: 'bloqueado', segundos_sin_latido: 5 }} compacto />);
    expect(screen.queryByText(/desbloquearlo/)).not.toBeInTheDocument();
  });

  test('sin datos no rompe', () => {
    render(<EstadoAgente agente={undefined} />);
    expect(screen.getByTestId('estado-agente')).toHaveAttribute('data-estado', 'sin_agente');
  });
});

describe('insignias', () => {
  test('SolidoBadge no muestra nada sin estado y distingue éxito de pendiente', () => {
    const { container, rerender } = render(<SolidoBadge estado={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SolidoBadge estado="cargado" />);
    expect(screen.getByTestId('solido-badge')).toHaveTextContent('EN SOLIDO');
    rerender(<SolidoBadge estado="en_cola" />);
    expect(screen.getByTestId('solido-badge')).toHaveTextContent('EN COLA SOLIDO');
    rerender(<SolidoBadge estado="revision" />);
    expect(screen.getByTestId('solido-badge')).toHaveTextContent('REVISAR SOLIDO');
  });

  test('JobBadge rotula cada estado', () => {
    render(<JobBadge estado="listo_para_aprobar" />);
    expect(screen.getByTestId('job-badge')).toHaveTextContent('ESPERANDO APROBACIÓN');
  });
});
