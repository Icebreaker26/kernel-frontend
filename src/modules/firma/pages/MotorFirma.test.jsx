import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Simulaciones: aquí se prueba la orquestación del asistente, no el dibujo ni el estampado ───────────────────
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/apiService.js', () => ({ default: api }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../components/FirmaLayout.jsx', () => ({ ACCENT: '#38bdf8' }));

vi.mock('../lib/estamparPdf.js', async (original) => ({ ...(await original()), estamparPdf: vi.fn(), inspeccionarPdf: vi.fn() }));

// Visor: dos botones que colocan una caja en la página 1 o en la 2 para el firmante armado
vi.mock('../components/VisorColocacion.jsx', () => ({
  default: ({ cajas, setCajas, activo }) => (
    <div data-testid="visor">
      <span data-testid="n-cajas">{cajas.length}</span>
      {[0, 1].map((pag) => (
        <button key={pag} type="button" onClick={() => activo && setCajas((cs) => [...cs, { id: crypto.randomUUID(), firmante: activo.firmante, tipo: activo.tipo, pagina: pag, x: 0.1, y: 0.1, w: 0.3 }])}>
          {`colocar en pág ${pag + 1}`}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('../components/CapturaFirma.jsx', () => ({
  default: ({ onChange }) => (
    <div>
      <button type="button" onClick={() => onChange({ png: 'data:image/png;base64,QUJD', metodo: 'pen' })}>[firmar con lápiz]</button>
      <button type="button" onClick={() => onChange({ png: 'data:image/png;base64,QUJD', metodo: 'mouse' })}>[firmar con mouse]</button>
      <button type="button" onClick={() => onChange(null)}>[borrar firma]</button>
    </div>
  ),
}));
vi.mock('../components/CapturaHuella.jsx', () => ({
  default: ({ onChange }) => <button type="button" onClick={() => onChange({ png: 'data:image/png;base64,SFVFTExB', dispositivo: 'DigitalPersona uid-1' })}>[capturar huella]</button>,
}));
vi.mock('../components/VistaPreviaModal.jsx', () => ({
  default: ({ archivo, onClose }) => <div role="dialog" aria-label={`Vista previa de ${archivo.nombre}`}><button type="button" onClick={onClose}>cerrar previa</button></div>,
}));

import { MotorFirma } from './FirmarPage.jsx';
import FirmarPage from './FirmarPage.jsx';
import { estamparPdf, inspeccionarPdf, sha256Hex, dataUrlABytes } from '../lib/estamparPdf.js';

// ── Utilidades ────────────────────────────────────────────────────────────────
const pdf = (nombre, contenido = nombre) => new File([`%PDF-1.4 ${contenido}`], nombre, { type: 'application/pdf' });
const PNG_FIRMA = 'data:image/png;base64,QUJD';
const PNG_HUELLA = 'data:image/png;base64,SFVFTExB';
let user; let contadorFolio; let llamadas;

beforeEach(() => {
  user = userEvent.setup({ applyAccept: false });   // el <input accept> filtraría los archivos que queremos que la app rechace
  contadorFolio = 0; llamadas = { sello: [], registro: [] };
  File.prototype.arrayBuffer ??= function arrayBuffer() { return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsArrayBuffer(this); }); };
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  inspeccionarPdf.mockImplementation(async () => ({ paginas: 2, yaFirmado: false }));
  estamparPdf.mockImplementation(async ({ constancia }) => new TextEncoder().encode(`%PDF-firmado-${constancia.folio}`));
  api.post.mockImplementation(async (url, body) => {
    if (url === '/firma/sello') { llamadas.sello.push(body); return { data: { folio: `folio-${++contadorFolio}`, ts: '2026-09-24T15:00:00.000Z', token: 'tok.en', empleado: 'Luis Pérez' } }; }
    if (url === '/firma/registro') { llamadas.registro.push(body); return { data: { ok: true } }; }
    throw new Error(`POST inesperado ${url}`);
  });
});

const entradaArchivos = (c) => c.querySelector('input[type=file]');
const cargarPdfs = async (container, ...archivos) => { await user.upload(entradaArchivos(container), archivos); };
const botonTexto = (t) => screen.getByRole('button', { name: new RegExp(t, 'i') });
const llenarFirmante = async (i = 0, { nombre = 'Ana Gómez', doc = '1088000111' } = {}) => {
  await user.type(screen.getAllByLabelText('Nombre completo')[i], nombre);
  await user.type(screen.getAllByLabelText('Número de documento')[i], doc);
};
const irAUbicar = async () => { await user.click(botonTexto('CONTINUAR: UBICAR FIRMAS')); };
const colocar = async (nombreBoton, pagina = 1) => {
  await user.click(screen.getByRole('button', { name: nombreBoton }));
  await user.click(screen.getByRole('button', { name: `colocar en pág ${pagina}` }));
};
const aceptarYFirmar = async (boton = '[firmar con lápiz]') => {
  await user.click(screen.getByLabelText(/Leí y acepto la declaración anterior/));
  await user.click(screen.getByRole('button', { name: boton }));
};
// Recorre todo el asistente hasta la generación con un firmante (sin huella) y n documentos ya cargados
const flujoCompleto = async (container, nombresPdf = ['contrato.pdf']) => {
  await cargarPdfs(container, ...nombresPdf.map((n) => pdf(n)));
  await llenarFirmante();
  await irAUbicar();
  for (let d = 0; d < nombresPdf.length; d++) {
    if (d > 0) await user.click(screen.getByRole('button', { name: new RegExp(`${d + 1}\\. ${nombresPdf[d]}`) }));
    await colocar(/Firma de Ana/);
  }
  await user.click(botonTexto('PASAR A LA FIRMA'));
  await aceptarYFirmar();
  await user.click(screen.getByRole('button', { name: /CONFIRMAR Y GENERAR/ }));
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('Motor de firma — paso 1: documentos', () => {
  test('la página independiente muestra el asistente y no permite continuar sin documento ni firmantes', () => {
    render(<FirmarPage />);
    expect(screen.getByText('DOCUMENTOS Y FIRMANTES')).toBeInTheDocument();
    expect(botonTexto('CONTINUAR: UBICAR FIRMAS')).toBeDisabled();
  });

  test('carga varios PDF, muestra nombre, páginas y huella, y avisa si ya traen una firma digital', async () => {
    inspeccionarPdf.mockImplementation(async (bytes) => ({ paginas: 3, yaFirmado: new TextDecoder().decode(bytes).includes('YA_FIRMADO') }));
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'), pdf('b.pdf', 'YA_FIRMADO'));
    expect(await screen.findByText(/a\.pdf · 3 pág\./)).toBeInTheDocument();
    expect(screen.getByText(/b\.pdf · 3 pág\./)).toBeInTheDocument();
    expect(screen.getAllByText(/SHA-256 [a-f0-9]{64}/)).toHaveLength(2);
    expect(screen.getAllByText(/ya tiene una firma digital/i)).toHaveLength(1);
    expect(screen.getByText(/\(2\/10\)/)).toBeInTheDocument();
  });

  test('rechaza lo que no es PDF, lo que pesa más de 20 MB y un PDF ilegible, sin detener los demás', async () => {
    inspeccionarPdf.mockImplementation(async (bytes) => { if (new TextDecoder().decode(bytes).includes('ROTO')) throw new Error('No se pudo leer el PDF.'); return { paginas: 1, yaFirmado: false }; });
    const { container } = render(<MotorFirma />);
    const grande = pdf('grande.pdf'); Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 });
    await cargarPdfs(container, new File(['x'], 'foto.png', { type: 'image/png' }), grande, pdf('roto.pdf', 'ROTO'), pdf('bueno.pdf'));
    await screen.findByText(/bueno\.pdf · 1 pág\./);
    expect(toast.error).toHaveBeenCalledWith('"foto.png" no es un PDF.');
    expect(toast.error).toHaveBeenCalledWith('"grande.pdf" pesa más de 20 MB.');
    expect(toast.error).toHaveBeenCalledWith('roto.pdf: No se pudo leer el PDF.');
    expect(screen.queryByText(/foto\.png|grande\.pdf|roto\.pdf ·/)).toBeNull();
  });

  test('no agrega dos veces el mismo documento', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf', 'igual'), pdf('copia.pdf', 'igual'));
    await screen.findByText(/a\.pdf · 2 pág\./);
    expect(toast.error).toHaveBeenCalledWith('"copia.pdf" ya está en la tanda.');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  test('admite hasta 10 documentos por tanda', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, ...Array.from({ length: 12 }, (_, i) => pdf(`doc${i}.pdf`)));
    await screen.findByText(/doc9\.pdf/);
    expect(toast.error).toHaveBeenCalledWith('Máximo 10 documentos por tanda.');
    expect(screen.queryByText(/doc10\.pdf/)).toBeNull();
    expect(screen.getByText(/\(10\/10\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar más PDF/ })).toBeDisabled();
  });

  test('no pasa de 100 MB en total por tanda', async () => {
    const { container } = render(<MotorFirma />);
    const enorme = (n) => { const f = pdf(n); Object.defineProperty(f, 'size', { value: 18 * 1024 * 1024 }); return f; };
    await cargarPdfs(container, ...['a', 'b', 'c', 'd', 'e', 'f'].map((n) => enorme(`${n}.pdf`)));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La tanda supera los 100 MB en total.'));
  });

  test('se pueden quitar documentos y verlos en vista previa', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'), pdf('b.pdf'));
    await screen.findByText(/b\.pdf/);
    await user.click(screen.getByRole('button', { name: 'Ver vista previa de a.pdf' }));
    expect(screen.getByRole('dialog', { name: 'Vista previa de a.pdf' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'cerrar previa' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Quitar a.pdf' }));
    expect(screen.queryByText(/a\.pdf ·/)).toBeNull();
    expect(screen.getByText(/b\.pdf ·/)).toBeInTheDocument();
  });

  test('quitar un documento con su vista previa abierta la cierra', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'));
    await screen.findByText(/a\.pdf/);
    await user.click(screen.getByRole('button', { name: 'Ver vista previa de a.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Quitar a.pdf' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Motor de firma — paso 1: firmantes', () => {
  test('exige nombre y documento válidos para continuar', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'));
    await screen.findByText(/a\.pdf/);
    expect(botonTexto('CONTINUAR: UBICAR FIRMAS')).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre completo'), 'A');
    await user.type(screen.getByLabelText('Número de documento'), '12');
    expect(botonTexto('CONTINUAR: UBICAR FIRMAS')).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre completo'), 'na Gómez');
    await user.type(screen.getByLabelText('Número de documento'), '3');
    expect(botonTexto('CONTINUAR: UBICAR FIRMAS')).toBeEnabled();
  });

  test('el número de documento solo admite letras, números y guion', async () => {
    render(<MotorFirma />);
    await user.type(screen.getByLabelText('Número de documento'), '1.088 000-111 #');
    expect(screen.getByLabelText('Número de documento')).toHaveValue('1088000-111');
  });

  test('agrega y quita firmantes (mínimo 1, máximo 10)', async () => {
    render(<MotorFirma />);
    expect(screen.getByRole('button', { name: 'Quitar firmante' })).toBeDisabled();
    for (let i = 0; i < 9; i++) await user.click(screen.getByRole('button', { name: /Agregar firmante/ }));
    expect(screen.getAllByLabelText('Nombre completo')).toHaveLength(10);
    expect(screen.getByRole('button', { name: /Agregar firmante/ })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Quitar firmante' })[3]);
    expect(screen.getAllByLabelText('Nombre completo')).toHaveLength(9);
  });

  test('tipo de documento y rol tienen sus opciones', () => {
    render(<MotorFirma />);
    expect(within(screen.getByLabelText('Tipo de documento')).getAllByRole('option').map((o) => o.textContent)).toEqual(['CC', 'CE', 'TI', 'NIT', 'PA', 'OTRO']);
    expect(within(screen.getByLabelText('Rol')).getAllByRole('option').map((o) => o.textContent)).toEqual(['asociado', 'codeudor', 'representante legal', 'testigo', 'otro']);
  });
});

describe('Motor de firma — paso 2: ubicar firmas', () => {
  const hastaUbicar = async (container, { huella = false, docs = ['a.pdf'] } = {}) => {
    await cargarPdfs(container, ...docs.map((d) => pdf(d)));
    await llenarFirmante();
    if (huella) await user.click(screen.getByLabelText('Con huella'));
    await irAUbicar();
  };

  test('lista al firmante para colocar su firma y no deja pasar hasta ubicarla', async () => {
    const { container } = render(<MotorFirma />);
    await hastaUbicar(container);
    expect(screen.getByRole('button', { name: /Firma de Ana Gómez/ })).toBeInTheDocument();
    expect(screen.getByText(/Falta ubicar: firma de Ana Gómez/)).toBeInTheDocument();
    expect(botonTexto('PASAR A LA FIRMA')).toBeDisabled();
    await colocar(/Firma de Ana/);
    expect(screen.queryByText(/Falta ubicar/)).toBeNull();
    expect(botonTexto('PASAR A LA FIRMA')).toBeEnabled();
  });

  test('con huella, exige también ubicar su huella', async () => {
    const { container } = render(<MotorFirma />);
    await hastaUbicar(container, { huella: true });
    await colocar(/Firma de Ana/);
    expect(screen.getByText(/Falta ubicar: huella de Ana Gómez/)).toBeInTheDocument();
    expect(botonTexto('PASAR A LA FIRMA')).toBeDisabled();
    await colocar(/Huella de Ana/);
    expect(botonTexto('PASAR A LA FIRMA')).toBeEnabled();
  });

  test('quitar "con huella" retira las cajas de huella ya colocadas', async () => {
    const { container } = render(<MotorFirma />);
    await hastaUbicar(container, { huella: true });
    await colocar(/Huella de Ana/);
    await user.click(botonTexto('ATRÁS'));
    await user.click(screen.getByLabelText('Con huella'));
    await irAUbicar();
    expect(screen.queryByRole('button', { name: /Huella de Ana/ })).toBeNull();
  });

  test('con varios documentos, cada uno debe quedar completo y se ve su estado', async () => {
    const { container } = render(<MotorFirma />);
    await hastaUbicar(container, { docs: ['a.pdf', 'b.pdf'] });
    const lista = screen.getByRole('button', { name: /1\. a\.pdf/ });
    expect(lista).toHaveTextContent('○');
    await colocar(/Firma de Ana/);
    expect(screen.getByRole('button', { name: /1\. a\.pdf/ })).toHaveTextContent('✓');
    expect(screen.getByRole('button', { name: /2\. b\.pdf/ })).toHaveTextContent('○');
    expect(screen.getByText(/"b\.pdf": firma de Ana Gómez/)).toBeInTheDocument();
    expect(botonTexto('PASAR A LA FIRMA')).toBeDisabled();
  });

  test('"Usar esta ubicación en todos" copia las cajas a los demás documentos y omite las que caen fuera de sus páginas', async () => {
    const paginasPorDoc = { 'a.pdf': 2, 'b.pdf': 1 };
    inspeccionarPdf.mockImplementation(async (bytes) => ({ paginas: /b\.pdf/.test(new TextDecoder().decode(bytes)) ? 1 : 2, yaFirmado: false }));
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'), pdf('b.pdf'));
    await llenarFirmante(); await irAUbicar();
    await user.click(screen.getByRole('button', { name: /Firma de Ana/ }));
    await user.click(screen.getByRole('button', { name: 'colocar en pág 1' }));
    await user.click(screen.getByRole('button', { name: 'colocar en pág 2' }));   // b.pdf solo tiene 1 página: esta no se copia
    await user.click(screen.getByRole('button', { name: /Usar esta ubicación en todos/ }));
    expect(toast.success).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /2\. b\.pdf/ }));
    expect(screen.getByTestId('n-cajas')).toHaveTextContent('1');
    expect(paginasPorDoc['b.pdf']).toBe(1);
    expect(botonTexto('PASAR A LA FIRMA')).toBeEnabled();
  });

  test('"Usar esta ubicación" no aparece con un solo documento y ATRÁS vuelve al paso 1', async () => {
    const { container } = render(<MotorFirma />);
    await hastaUbicar(container);
    expect(screen.queryByRole('button', { name: /Usar esta ubicación en todos/ })).toBeNull();
    await user.click(botonTexto('ATRÁS'));
    expect(screen.getByText(/1\. DOCUMENTOS PDF/)).toBeInTheDocument();
  });
});

describe('Motor de firma — paso 3: firmar', () => {
  const hastaFirmar = async (container, opciones = {}) => {
    await cargarPdfs(container, pdf('contrato.pdf'));
    await llenarFirmante(0, { nombre: 'Ana Gómez', doc: '1088000111' });
    if (opciones.segundo) { await user.click(screen.getByRole('button', { name: /Agregar firmante/ })); await llenarFirmante(1, { nombre: 'Luis Ruiz', doc: '79111222' }); }
    if (opciones.huella) await user.click(screen.getAllByLabelText('Con huella')[0]);
    await irAUbicar();
    await colocar(/Firma de Ana/);
    if (opciones.huella) await colocar(/Huella de Ana/);
    if (opciones.segundo) await colocar(/Firma de Luis/);
    await user.click(botonTexto('PASAR A LA FIRMA'));
  };

  test('muestra la declaración con los datos del firmante y del documento, y exige aceptarla y firmar', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container);
    expect(screen.getByText('FIRMANTE 1 DE 1')).toBeInTheDocument();
    const declaracion = screen.getByText(/Yo, Ana Gómez, identificado\(a\) con CC 1088000111/);
    expect(declaracion).toHaveTextContent('"contrato.pdf"');
    expect(declaracion).toHaveTextContent(/SHA-256 [a-f0-9]{16}\.\.\./);
    expect(declaracion).toHaveTextContent('Ley 527 de 1999');
    const confirmar = botonTexto('CONFIRMAR Y GENERAR DOCUMENTO');
    expect(confirmar).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '[firmar con lápiz]' }));
    expect(confirmar).toBeDisabled();   // falta aceptar
    await user.click(screen.getByLabelText(/Leí y acepto/));
    expect(confirmar).toBeEnabled();
  });

  test('borrar la firma deshabilita otra vez el botón', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container);
    await aceptarYFirmar();
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '[borrar firma]' }));
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeDisabled();
  });

  test('con mouse advierte que quedará indicado en la constancia', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container);
    await user.click(screen.getByRole('button', { name: '[firmar con mouse]' }));
    expect(screen.getByText(/Firmada con mouse/)).toBeInTheDocument();
  });

  test('si el firmante da su huella, sin ella no puede confirmar; la declaración incluye la autorización de datos biométricos', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container, { huella: true });
    expect(screen.getByText(/dato biométrico sensible/)).toBeInTheDocument();
    expect(screen.getByText(/Esta autorización es opcional/)).toBeInTheDocument();
    await aceptarYFirmar();
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeDisabled();   // falta la huella
    await user.click(screen.getByRole('button', { name: '[capturar huella]' }));
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeEnabled();
  });

  test('sin huella, la declaración no habla de datos biométricos', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container);
    expect(screen.queryByText(/dato biométrico sensible/)).toBeNull();
    expect(screen.queryByText(/HUELLA \(LECTOR/)).toBeNull();
  });

  test('con dos firmantes pasa de uno al otro, cada uno con su declaración', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container, { segundo: true });
    expect(screen.getByText('FIRMANTE 1 DE 2')).toBeInTheDocument();
    await aceptarYFirmar();
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR Y SIGUIENTE FIRMANTE' }));
    expect(await screen.findByText('FIRMANTE 2 DE 2')).toBeInTheDocument();
    expect(screen.getByText(/Yo, Luis Ruiz, identificado\(a\) con CC 79111222/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Leí y acepto/)).not.toBeChecked();   // cada firmante acepta por su cuenta
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeDisabled();
  });

  test('cancelar vuelve a ubicar las firmas y descarta lo capturado', async () => {
    const { container } = render(<MotorFirma />);
    await hastaFirmar(container);
    await aceptarYFirmar();
    await user.click(botonTexto('CANCELAR'));
    expect(screen.getByText('UBICAR FIRMAS', { selector: 'h2' })).toBeInTheDocument();
    await user.click(botonTexto('PASAR A LA FIRMA'));
    expect(botonTexto('CONFIRMAR Y GENERAR')).toBeDisabled();
  });
});

describe('Motor de firma — paso 4: generar', () => {
  test('un documento: sello, estampado, registro del hash final y descarga con su nombre', async () => {
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container);
    expect(await screen.findByText('Documento firmado')).toBeInTheDocument();

    // Sello: solo hashes y datos de identificación, nunca las imágenes
    expect(llamadas.sello).toHaveLength(1);
    const cuerpo = llamadas.sello[0];
    expect(cuerpo).toMatchObject({ nombre_archivo: 'contrato.pdf', paginas: 2 });
    expect(cuerpo.lote).toBeUndefined();   // un solo documento: sin lote
    expect(cuerpo.h_original).toMatch(/^[a-f0-9]{64}$/);
    expect(cuerpo.firmantes).toEqual([{
      nombre: 'Ana Gómez', tipo_doc: 'CC', num_doc: '1088000111', rol: 'asociado', metodo_firma: 'pen', con_huella: false,
      h_firma_png: await sha256Hex(dataUrlABytes(PNG_FIRMA)),
    }]);
    expect(JSON.stringify(cuerpo)).not.toContain('base64');

    // Estampado con lo capturado y las cajas de ese documento
    const args = estamparPdf.mock.calls[0][0];
    expect(args.firmantes[0]).toMatchObject({ firmaPng: PNG_FIRMA, nombre: 'Ana Gómez' });
    expect(args.cajas).toHaveLength(1);
    expect(args.constancia).toMatchObject({ folio: 'folio-1', token: 'tok.en', empleado: 'Luis Pérez', nombreArchivo: 'contrato.pdf', hOriginal: cuerpo.h_original });
    expect(args.constancia.textoConsentimiento).toMatch(/\[firma-v1\.2\]$/);
    expect(args.constancia.lote).toBeUndefined();

    // Registro del hash del PDF final
    expect(llamadas.registro).toEqual([{ folio: 'folio-1', h_final: await sha256Hex(new TextEncoder().encode('%PDF-firmado-folio-1')) }]);
    const descarga = screen.getByRole('link', { name: /PDF/ });
    expect(descarga).toHaveAttribute('download', 'contrato_firmado.pdf');
    expect(screen.getByText('Folio folio-1')).toBeInTheDocument();
  });

  test('con huella el sello lleva el hash de la huella y el dispositivo, y el estampado recibe la imagen', async () => {
    const { container } = render(<MotorFirma />);
    await cargarPdfs(container, pdf('a.pdf'));
    await llenarFirmante(); await user.click(screen.getByLabelText('Con huella'));
    await irAUbicar(); await colocar(/Firma de Ana/); await colocar(/Huella de Ana/);
    await user.click(botonTexto('PASAR A LA FIRMA'));
    await aceptarYFirmar(); await user.click(screen.getByRole('button', { name: '[capturar huella]' }));
    await user.click(botonTexto('CONFIRMAR Y GENERAR'));
    await screen.findByText('Documento firmado');
    expect(llamadas.sello[0].firmantes[0]).toMatchObject({
      con_huella: true, h_huella_png: await sha256Hex(dataUrlABytes(PNG_HUELLA)), huella_dispositivo: 'DigitalPersona uid-1',
    });
    expect(estamparPdf.mock.calls[0][0].firmantes[0]).toMatchObject({ huellaPng: PNG_HUELLA, huellaDispositivo: 'DigitalPersona uid-1' });
    expect(estamparPdf.mock.calls[0][0].constancia.textoConsentimiento).toMatch(/dato biométrico sensible/);
  });

  test('una tanda: un sello por documento, todos con el mismo lote (id, posición y total) y las cajas de cada uno', async () => {
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container, ['a.pdf', 'b.pdf', 'c.pdf']);
    expect(await screen.findByText('3 documentos firmados')).toBeInTheDocument();
    expect(llamadas.sello).toHaveLength(3);
    const lotes = llamadas.sello.map((s) => s.lote);
    expect(new Set(lotes.map((l) => l.id)).size).toBe(1);
    expect(lotes[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lotes.map((l) => [l.pos, l.total])).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(llamadas.sello.map((s) => s.nombre_archivo)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    expect(new Set(llamadas.sello.map((s) => s.h_original)).size).toBe(3);   // cada documento con su propio hash
    expect(new Set(llamadas.sello.flatMap((s) => s.firmantes.map((f) => f.h_firma_png))).size).toBe(1);   // la misma firma para todos
    expect(estamparPdf.mock.calls.map(([a]) => a.constancia.lote.pos)).toEqual([1, 2, 3]);
    expect(estamparPdf.mock.calls.every(([a]) => a.cajas.length === 1)).toBe(true);
    expect(llamadas.registro).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: /PDF/ })).toHaveLength(3);
  });

  test('con varios documentos ofrece descargarlos todos en un ZIP', async () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container, ['a.pdf', 'b.pdf']);
    await screen.findByText('2 documentos firmados');
    await user.click(screen.getByRole('button', { name: /DESCARGAR TODOS \(ZIP\)/ }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    const blob = URL.createObjectURL.mock.calls.map(([b]) => b).find((b) => b.type === 'application/zip');
    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(50);
    clic.mockRestore();
  });

  test('con un solo documento no aparece el ZIP', async () => {
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container);
    await screen.findByText('Documento firmado');
    expect(screen.queryByRole('button', { name: /ZIP/ })).toBeNull();
  });

  test('si falla un documento, los demás quedan listos y se reintenta solo el que falló, sin volver a firmar', async () => {
    let falloUnaVez = true;
    const original = api.post.getMockImplementation();
    api.post.mockImplementation(async (url, body) => {
      if (url === '/firma/sello' && body.nombre_archivo === 'b.pdf' && falloUnaVez) { falloUnaVez = false; const e = new Error('x'); e.response = { data: { error: 'Servidor ocupado' } }; throw e; }
      return original(url, body);
    });
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container, ['a.pdf', 'b.pdf', 'c.pdf']);
    expect(await screen.findByText('2 de 3 listos, 1 con error')).toBeInTheDocument();
    expect(screen.getByText('Servidor ocupado')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /PDF/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /DESCARGAR TODOS/ })).toBeInTheDocument();
    expect(screen.getByText(/tendrá que volver a firmar los que fallaron/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /REINTENTAR LOS QUE FALLARON/ }));
    expect(await screen.findByText('3 documentos firmados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /REINTENTAR/ })).toBeNull();
    const selloB = llamadas.sello.filter((s) => s.nombre_archivo === 'b.pdf');
    expect(selloB).toHaveLength(1);   // el primer intento falló antes de registrarse; el reintento sí
    expect(selloB[0].lote).toMatchObject({ pos: 2, total: 3 });   // mismo lote y misma posición en el reintento
    expect(new Set(llamadas.sello.map((s) => s.lote.id)).size).toBe(1);
    expect(llamadas.sello.filter((s) => s.nombre_archivo === 'a.pdf')).toHaveLength(1);   // los demás no se vuelven a sellar
  });

  test('si el estampado falla, ese documento queda con error y se puede reintentar', async () => {
    estamparPdf.mockRejectedValueOnce(new Error('PDF con formulario no soportado'));
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container);
    expect(await screen.findByText('0 de 1 listos, 1 con error')).toBeInTheDocument();
    expect(screen.getByText('PDF con formulario no soportado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /REINTENTAR/ }));
    expect(await screen.findByText('Documento firmado')).toBeInTheDocument();
  });

  test('si no se puede registrar el hash final, se entrega el PDF con una advertencia', async () => {
    const original = api.post.getMockImplementation();
    api.post.mockImplementation(async (url, body) => { if (url === '/firma/registro') throw new Error('sin red'); return original(url, body); });
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container);
    expect(await screen.findByText('Documento firmado')).toBeInTheDocument();
    expect(screen.getByText(/No se pudo registrar el hash de este documento/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /PDF/ })).toBeInTheDocument();
  });

  test('"Firmar otra tanda" reinicia el asistente y libera los archivos', async () => {
    const { container } = render(<MotorFirma />);
    await flujoCompleto(container);
    await screen.findByText('Documento firmado');
    await user.click(screen.getByRole('button', { name: /FIRMAR OTRA TANDA/ }));
    expect(screen.getByText(/1\. DOCUMENTOS PDF/)).toBeInTheDocument();
    expect(screen.queryByText(/contrato\.pdf ·/)).toBeNull();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
  });
});

describe('Motor de firma — modo embebido (Créditos)', () => {
  const docs = () => [{ id: 'doc-pagare', nombre: 'pagare.pdf', bytes: new TextEncoder().encode('%PDF-1.4 pagare') }, { id: 'doc-carta', nombre: 'carta.pdf', bytes: new TextEncoder().encode('%PDF-1.4 carta') }];
  const firmantes = () => [{ nombre: 'Ana Gómez', tipo_doc: 'CC', num_doc: '1088000111', rol: 'asociado' }];
  const montar = (extra = {}) => {
    const props = { documentosIniciales: docs(), firmantesIniciales: firmantes(), onFirmados: vi.fn(), onCancelar: vi.fn(), textoExtra: 'Autorizo que la cooperativa conserve estos documentos.', versionTexto: 'firma-credito-v1', ...extra };
    return { props, ...render(<MotorFirma {...props} />) };
  };

  test('carga los documentos recibidos sin permitir agregar ni quitar, y bloquea los datos del firmante', async () => {
    const { container } = montar();
    expect(await screen.findByText(/pagare\.pdf · 2 pág\./)).toBeInTheDocument();
    expect(screen.getByText(/carta\.pdf · 2 pág\./)).toBeInTheDocument();
    // Ocultos con estilo: su nombre por contenido queda vacío, así que se buscan por texto (o por aria-label, que sí cuenta)
    expect(screen.getByText(/Cargar PDF|Agregar más PDF/).closest('button')).not.toBeVisible();
    expect(container.querySelector('button[aria-label="Quitar pagare.pdf"]')).not.toBeVisible();
    expect(container.querySelector('button[aria-label="Quitar carta.pdf"]')).not.toBeVisible();
    expect(screen.getByLabelText('Nombre completo')).toBeDisabled();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Gómez');
    expect(screen.getByLabelText('Tipo de documento')).toBeDisabled();
    expect(screen.getByLabelText('Número de documento')).toHaveValue('1088000111');
    expect(screen.getByLabelText('Número de documento')).toBeDisabled();
    expect(screen.getByLabelText('Rol')).toBeDisabled();
    expect(container.querySelector('button[aria-label="Quitar firmante"]')).not.toBeVisible();
    expect(screen.getByText(/Agregar firmante/).closest('button')).not.toBeVisible();
    expect(screen.getByLabelText('Con huella')).toBeEnabled();   // lo único que se decide: si da huella
    expect(screen.getByText(/se guardan en el expediente del crédito/)).toBeInTheDocument();
  });

  test('puede continuar apenas los documentos están cargados', async () => {
    montar();
    await screen.findByText(/pagare\.pdf/);
    expect(botonTexto('CONTINUAR: UBICAR FIRMAS')).toBeEnabled();
  });

  const firmarTodo = async () => {
    await screen.findByText(/pagare\.pdf/);
    await irAUbicar();
    await colocar(/Firma de Ana/);
    await user.click(screen.getByRole('button', { name: /2\. carta\.pdf/ }));
    await colocar(/Firma de Ana/);
    await user.click(botonTexto('PASAR A LA FIRMA'));
    expect(screen.getByText(/conserve estos documentos/)).toBeInTheDocument();   // el consentimiento adicional se muestra
    await aceptarYFirmar();
    await user.click(screen.getByRole('button', { name: /CONFIRMAR Y GENERAR 2 DOCUMENTOS/ }));
  };

  test('al terminar entrega los documentos firmados con el id de cada uno, una sola vez', async () => {
    const { props } = montar();
    await firmarTodo();
    await waitFor(() => expect(props.onFirmados).toHaveBeenCalledTimes(1));
    const [resultados] = props.onFirmados.mock.calls[0];
    expect(resultados.map((r) => r.id)).toEqual(['doc-pagare', 'doc-carta']);
    expect(resultados.map((r) => r.folio)).toEqual(['folio-1', 'folio-2']);
    expect(resultados.map((r) => r.nombre)).toEqual(['pagare_firmado.pdf', 'carta_firmado.pdf']);
    expect(resultados.every((r) => ArrayBuffer.isView(r.bytes) && r.registrado === true)).toBe(true);
    expect(new TextDecoder().decode(resultados[0].bytes)).toBe('%PDF-firmado-folio-1');
    await new Promise((r) => setTimeout(r, 30));
    expect(props.onFirmados).toHaveBeenCalledTimes(1);   // no se repite
  });

  test('la constancia lleva la versión del consentimiento y el texto adicional', async () => {
    montar();
    await firmarTodo();
    await waitFor(() => expect(estamparPdf).toHaveBeenCalledTimes(2));
    const texto = estamparPdf.mock.calls[0][0].constancia.textoConsentimiento;
    expect(texto).toContain('Autorizo que la cooperativa conserve estos documentos.');
    expect(texto).toMatch(/\[firma-credito-v1\]$/);
    expect(texto).toMatch(/los 2 documentos siguientes/);
    expect(estamparPdf.mock.calls[0][0].constancia.lote).toMatchObject({ pos: 1, total: 2 });
  });

  test('si un documento falla no avisa de que terminó; avisa cuando el reintento lo completa', async () => {
    let falla = true;
    const original = api.post.getMockImplementation();
    api.post.mockImplementation(async (url, body) => { if (url === '/firma/sello' && body.nombre_archivo === 'carta.pdf' && falla) { falla = false; throw new Error('caída'); } return original(url, body); });
    const { props } = montar();
    await firmarTodo();
    await screen.findByText('1 de 2 listos, 1 con error');
    expect(props.onFirmados).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /REINTENTAR/ }));
    await waitFor(() => expect(props.onFirmados).toHaveBeenCalledTimes(1));
    expect(props.onFirmados.mock.calls[0][0].map((r) => r.id).sort()).toEqual(['doc-carta', 'doc-pagare']);
  });

  test('el botón de cerrar del resultado usa onCancelar y no reinicia', async () => {
    const { props } = montar();
    await firmarTodo();
    await waitFor(() => expect(props.onFirmados).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /CERRAR/ }));
    expect(props.onCancelar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/FIRMAR OTRA TANDA/)).toBeNull();
  });

  test('un documento que no se puede leer avisa con un mensaje', async () => {
    inspeccionarPdf.mockRejectedValueOnce(new Error('PDF dañado'));
    montar();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('PDF dañado'));
  });
});
