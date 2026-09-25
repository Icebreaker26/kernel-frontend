import { useState } from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import TablaCreditos from './TablaCreditos.jsx';
import KanbanCreditos from './KanbanCreditos.jsx';
import FiltrosLista from './FiltrosLista.jsx';

const fila = (extra = {}) => ({
  id: 's1', radicado: 'CR-2026-000001', asociado_codigo: '1088000111', asociado_nombre: 'ANA GÓMEZ', empresa_nombre: 'Empresa Uno SA', categoria: 'Libre inversión',
  valor_solicitado: '5000000', monto_desembolso: null, forma_desembolso: 'transferencia', modalidad_firma: 'externa', estado: 'en_tramite', created_at: '2026-09-20T10:00:00Z',
  entregada_at: null, asesor_nombre: 'Luis Pérez', dias: 2, a_firmar: 5, firmados: 2, firma_completa: false, autorizacion_requerida: true, autorizacion_estado: null, autorizacion_ok: false,
  documentos_ok: false, expediente_completo: false, ...extra,
});
const enRuta = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
let user;
beforeEach(() => { user = userEvent.setup(); });

describe('Tabla de créditos', () => {
  test('separa valor solicitado y desembolso; el desembolso vacío dice que lo calcula Cartera', () => {
    enRuta(<TablaCreditos filas={[fila(), fila({ id: 's2', radicado: 'CR-2', estado: 'pagada', monto_desembolso: '4485000', valor_solicitado: '5000000' })]} onOrden={() => {}} />);
    const f1 = screen.getByRole('link', { name: 'CR-2026-000001' }).closest('tr');
    expect(f1).toHaveTextContent('$5.000.000');
    expect(within(f1).getByTitle('Lo calcula Cartera al cerrar el crédito')).toHaveTextContent('—');
    expect(screen.getByRole('link', { name: 'CR-2' }).closest('tr')).toHaveTextContent('$4.485.000');
  });

  test('el pie suma el valor solicitado y cuenta las solicitudes', () => {
    enRuta(<TablaCreditos filas={[fila(), fila({ id: 's2', radicado: 'CR-2', valor_solicitado: '3000000' })]} onOrden={() => {}} />);
    expect(screen.getByTestId('total-valor')).toHaveTextContent('$8.000.000');
    expect(screen.getByText('2 solicitudes')).toBeInTheDocument();
  });

  test('sin filas muestra el mensaje y no hay pie', () => {
    enRuta(<TablaCreditos filas={[]} onOrden={() => {}} vacio="Nada por aquí" />);
    expect(screen.getByText('Nada por aquí')).toBeInTheDocument();
    expect(screen.queryByTestId('total-valor')).toBeNull();
  });

  test('los encabezados ordenables avisan y marcan la dirección activa', async () => {
    const onOrden = vi.fn();
    enRuta(<TablaCreditos filas={[fila()]} orden="valor" dir="asc" onOrden={onOrden} />);
    expect(screen.getByRole('columnheader', { name: /VALOR SOLICITADO/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /RADICADO/ })).toHaveAttribute('aria-sort', 'none');
    await user.click(screen.getByRole('button', { name: /DÍAS/ }));
    expect(onOrden).toHaveBeenCalledWith('dias');
    await user.click(screen.getByRole('button', { name: /ESTADO/ }));
    expect(onOrden).toHaveBeenCalledWith('estado');
  });

  test('las columnas que no se ordenan no son botones', () => {
    enRuta(<TablaCreditos filas={[]} onOrden={() => {}} />);
    expect(screen.queryByRole('button', { name: /EMPRESA/ })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'EMPRESA' })).toBeInTheDocument();
  });

  test('la columna del asesor solo aparece cuando se ven las de todos', () => {
    const { rerender } = enRuta(<TablaCreditos filas={[fila()]} onOrden={() => {}} />);
    expect(screen.queryByRole('columnheader', { name: 'ASESOR' })).toBeNull();
    rerender(<MemoryRouter><TablaCreditos filas={[fila()]} mostrarAsesor onOrden={() => {}} /></MemoryRouter>);
    expect(screen.getByRole('columnheader', { name: 'ASESOR' })).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  test('los días de un crédito abierto se colorean según su antigüedad; los de uno cerrado no', () => {
    enRuta(<TablaCreditos filas={[fila({ id: 'a', radicado: 'CR-A', dias: 20 }), fila({ id: 'b', radicado: 'CR-B', dias: 9 }), fila({ id: 'c', radicado: 'CR-C', dias: 60, estado: 'pagada' })]} onOrden={() => {}} />);
    const celda = (r) => screen.getByRole('link', { name: r }).closest('tr').querySelectorAll('td')[9];
    expect(celda('CR-A')).toHaveClass('text-rose-300');
    expect(celda('CR-B')).toHaveClass('text-amber-300');
    expect(celda('CR-C')).toHaveClass('text-slate-600');
  });
});

describe('Tablero de créditos', () => {
  const filas = [
    fila(), fila({ id: 's2', radicado: 'CR-2', estado: 'devuelta', dias: 20 }), fila({ id: 's3', radicado: 'CR-3', estado: 'entregada' }),
    fila({ id: 's4', radicado: 'CR-4', estado: 'pagada', monto_desembolso: '4485000', dias: 50 }), fila({ id: 's5', radicado: 'CR-5', estado: 'desistida' }),
  ];
  const columna = (t) => within(screen.getByRole('region', { name: `Columna ${t}` }));

  test('una columna por estado del flujo, en orden, sin las cerradas por defecto', () => {
    enRuta(<KanbanCreditos filas={filas} />);
    const cols = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(cols).toEqual(['Columna EN TRÁMITE', 'Columna DEVUELTA', 'Columna ENTREGADA A CARTERA', 'Columna RECIBIDA POR CARTERA', 'Columna COMPLETADA · EN CONTROL INTERNO', 'Columna APROBADA · EN TESORERÍA', 'Columna PAGADA']);
    expect(screen.queryByText('CR-5')).toBeNull();
  });

  test('con las cerradas activadas aparecen rechazadas y desistidas', () => {
    enRuta(<KanbanCreditos filas={filas} conCerradas />);
    expect(columna('DESISTIDA').getByText('CR-5')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Columna RECHAZADA' })).toBeInTheDocument();
  });

  test('cada tarjeta va en la columna de su estado y enlaza al expediente', () => {
    enRuta(<KanbanCreditos filas={filas} base="/creditos" />);
    expect(columna('EN TRÁMITE').getByRole('link', { name: 'CR-2026-000001' })).toHaveAttribute('href', '/creditos/s1');
    expect(columna('DEVUELTA').getByRole('link', { name: 'CR-2' })).toBeInTheDocument();
    expect(columna('EN TRÁMITE').queryByText('CR-2')).toBeNull();
  });

  test('la tarjeta muestra asociado, cédula, empresa, valor, forma y días; el desembolso solo si existe', () => {
    enRuta(<KanbanCreditos filas={filas} />);
    const t = within(screen.getByRole('link', { name: 'CR-2026-000001' }).closest('li'));
    expect(t.getByText('ANA GÓMEZ')).toBeInTheDocument();
    expect(t.getByText('C.C. 1088000111')).toBeInTheDocument();
    expect(t.getByText(/Empresa Uno SA · Libre inversión/)).toBeInTheDocument();
    expect(t.getByText('$5.000.000')).toBeInTheDocument();
    expect(t.getByText('TRANSFERENCIA')).toBeInTheDocument();
    expect(t.getByTitle('Días desde la radicación')).toHaveTextContent('2 d');
    expect(t.queryByText(/Desembolso/)).toBeNull();
    expect(within(screen.getByRole('link', { name: 'CR-4' }).closest('li')).getByText('Desembolso $4.485.000')).toBeInTheDocument();
  });

  test('las de trámite muestran el semáforo del expediente; las devueltas piden acción', () => {
    enRuta(<KanbanCreditos filas={filas} />);
    expect(within(screen.getByRole('link', { name: 'CR-2026-000001' }).closest('li')).getByText('Firma 2/5')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'CR-2' }).closest('li')).getByText(/requiere tu acción/)).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'CR-3' }).closest('li')).queryByText(/Firma/)).toBeNull();
  });

  test('las cerradas y pagadas no muestran días de antigüedad', () => {
    enRuta(<KanbanCreditos filas={filas} conCerradas />);
    expect(within(screen.getByRole('link', { name: 'CR-4' }).closest('li')).queryByTitle('Días desde la radicación')).toBeNull();
  });

  test('la cabecera usa el total real del resumen (no solo lo cargado) y su valor', () => {
    enRuta(<KanbanCreditos filas={filas} resumen={{ estados: [{ estado: 'en_tramite', n: 137, valor: 250000000 }] }} />);
    const c = columna('EN TRÁMITE');
    expect(c.getByLabelText('137 solicitudes')).toHaveTextContent('137');
    expect(c.getByText('$250.000.000 solicitado')).toBeInTheDocument();
  });

  test('sin resumen calcula la cabecera con lo que hay', () => {
    enRuta(<KanbanCreditos filas={filas} />);
    expect(columna('EN TRÁMITE').getByLabelText('1 solicitudes')).toBeInTheDocument();
  });

  test('las columnas vacías lo dicen', () => {
    enRuta(<KanbanCreditos filas={[fila()]} />);
    expect(columna('PAGADA').getByText('Sin solicitudes')).toBeInTheDocument();
  });

  test('limita las tarjetas por columna y manda a la tabla por el resto', () => {
    const muchas = Array.from({ length: 45 }, (_, i) => fila({ id: `m${i}`, radicado: `CR-M${i}` }));
    enRuta(<KanbanCreditos filas={muchas} />);
    expect(columna('EN TRÁMITE').getAllByRole('link')).toHaveLength(40);
    expect(columna('EN TRÁMITE').getByText(/y 5 más: usa la vista de tabla/)).toBeInTheDocument();
  });

  test('el asesor solo se muestra cuando se ven las de todos', () => {
    const { rerender } = enRuta(<KanbanCreditos filas={[fila()]} />);
    expect(screen.queryByText('Luis Pérez')).toBeNull();
    rerender(<MemoryRouter><KanbanCreditos filas={[fila()]} mostrarAsesor /></MemoryRouter>);
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  test('es de solo lectura: las tarjetas no se pueden arrastrar', () => {
    enRuta(<KanbanCreditos filas={[fila()]} />);
    expect(screen.getByRole('link', { name: 'CR-2026-000001' }).closest('li')).not.toHaveAttribute('draggable', 'true');
  });
});

describe('Panel de filtros', () => {
  const OPC = { categorias: [{ id: 'c1', nombre: 'Vivienda' }], empresas: [{ codigo: 'E1', nombre: 'Empresa Uno' }], asesores: [{ id: 'u1', nombre: 'Luis' }] };
  const Contenedor = ({ inicial = {}, soloTabla = false, espia }) => {
    const [f, setF] = useState(inicial);
    const [abierto, setAbierto] = useState(true);
    return <FiltrosLista filtros={f} opciones={OPC} abierto={abierto} onAbrir={setAbierto} soloTabla={soloTabla}
      onCambiar={(k, v) => { espia?.(k, v); setF((p) => { const n = { ...p }; if (v) n[k] = v; else delete n[k]; return n; }); }} onLimpiar={() => setF({})} />;
  };

  test('ofrece las opciones de cada catálogo', () => {
    render(<Contenedor />);
    expect(within(screen.getByLabelText('CATEGORÍA')).getByRole('option', { name: 'Vivienda' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('EMPRESA')).getByRole('option', { name: 'Empresa Uno' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('FORMA DE DESEMBOLSO')).getAllByRole('option')).toHaveLength(4);
    expect(within(screen.getByLabelText('TIPO DE FIRMA')).getAllByRole('option')).toHaveLength(3);
  });

  test('el filtro de asesor solo aparece viendo las de todos', () => {
    const { unmount } = render(<Contenedor />);
    expect(screen.queryByLabelText('ASESOR')).toBeNull();
    unmount();
    render(<Contenedor inicial={{ todas: '1' }} />);
    expect(within(screen.getByLabelText('ASESOR')).getByRole('option', { name: 'Luis' })).toBeInTheDocument();
  });

  test('cada control avisa su cambio con su parámetro', async () => {
    const espia = vi.fn();
    render(<Contenedor espia={espia} />);
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'c1');
    await user.selectOptions(screen.getByLabelText('FORMA DE DESEMBOLSO'), 'cheque');
    await user.type(screen.getByLabelText('VALOR MÍNIMO'), '2500');
    await user.type(screen.getByLabelText('ANTIGÜEDAD MÍNIMA (DÍAS)'), '15');
    await user.click(screen.getByRole('button', { name: /REQUIEREN MI ACCIÓN/ }));
    expect(espia).toHaveBeenCalledWith('categoria', 'c1');
    expect(espia).toHaveBeenCalledWith('forma', 'cheque');
    expect(espia).toHaveBeenLastCalledWith('accion', '1');
    expect(screen.getByLabelText('VALOR MÍNIMO')).toHaveValue('2500');
    expect(screen.getByLabelText('ANTIGÜEDAD MÍNIMA (DÍAS)')).toHaveValue('15');
  });

  test('los campos numéricos solo admiten dígitos', async () => {
    render(<Contenedor />);
    await user.type(screen.getByLabelText('VALOR MÁXIMO'), '1a2.b3');
    expect(screen.getByLabelText('VALOR MÁXIMO')).toHaveValue('123');
  });

  test('las fechas se limitan entre sí (no se puede cruzar el rango)', () => {
    render(<Contenedor inicial={{ desde: '2026-01-01', hasta: '2026-02-01' }} />);
    expect(screen.getByLabelText('RADICADAS DESDE')).toHaveAttribute('max', '2026-02-01');
    expect(screen.getByLabelText('RADICADAS HASTA')).toHaveAttribute('min', '2026-01-01');
  });

  test('el botón cuenta los filtros y cada ficha se puede quitar sola', async () => {
    render(<Contenedor inicial={{ forma: 'cheque', dias: '15' }} />);
    expect(screen.getByRole('button', { name: /FILTROS \(2\)/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Desembolso: Cheque' }));
    expect(screen.getByRole('button', { name: /FILTROS \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Desembolso: Cheque')).toBeNull();
  });

  test('"limpiar todo" aparece con filtros y los quita', async () => {
    render(<Contenedor inicial={{ forma: 'cheque' }} />);
    await user.click(screen.getByRole('button', { name: 'LIMPIAR TODO' }));
    expect(screen.queryByRole('button', { name: 'LIMPIAR TODO' })).toBeNull();
    expect(screen.getByRole('button', { name: 'FILTROS' })).toBeInTheDocument();
  });

  test('el botón abre y cierra el panel y lo declara para lectores de pantalla', async () => {
    render(<Contenedor />);
    const b = screen.getByRole('button', { name: /FILTROS/ });
    expect(b).toHaveAttribute('aria-expanded', 'true');
    await user.click(b);
    expect(screen.queryByRole('region', { name: 'Filtros' })).toBeNull();
    expect(b).toHaveAttribute('aria-expanded', 'false');
  });

  test('en el tablero no se ofrece el filtro de estado (ya se ven todos)', () => {
    render(<Contenedor soloTabla inicial={{ estado: 'pagada' }} />);
    expect(screen.queryByLabelText('ESTADO')).toBeNull();
    expect(screen.queryByText(/Estado: PAGADA/)).toBeNull();
    expect(screen.getByRole('button', { name: 'FILTROS' })).toBeInTheDocument();   // el estado guardado no cuenta
  });
});
