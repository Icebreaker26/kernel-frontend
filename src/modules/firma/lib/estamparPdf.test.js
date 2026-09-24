// @vitest-environment node
import { describe, test, expect } from 'vitest';
import zlib from 'node:zlib';
import { PDFDocument, PDFArray, decodePDFRawStream, degrees } from 'pdf-lib';
import { estamparPdf, inspeccionarPdf, sha256Hex, dataUrlABytes, dimensionesVisibles, ASPECTO_FIRMA } from './estamparPdf.js';

// ── Utilidades de prueba ──────────────────────────────────────────────────────
// PNG mínimo válido de un color, sin depender de canvas
const crc32 = (buf) => zlib.crc32(buf) >>> 0;
const chunk = (tipo, datos) => {
  const t = Buffer.from(tipo, 'latin1');
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
  return Buffer.concat([len, t, datos, crc]);
};
const png = (w, h) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const fila = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 4, 0)]);
  for (let x = 0; x < w; x++) fila.set([255, 0, 0, 255], 1 + x * 4);
  const crudo = Buffer.concat(Array.from({ length: h }, () => fila));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(crudo)), chunk('IEND', Buffer.alloc(0))]);
};
const dataUrl = (w, h) => `data:image/png;base64,${png(w, h).toString('base64')}`;

const pdfBase = async ({ paginas = 1, rotacion = 0, cropBox = null, tam = [400, 600] } = {}) => {
  const d = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) {
    const p = d.addPage(tam);
    p.setRotation(degrees(rotacion));
    if (cropBox) p.setCropBox(...cropBox);
  }
  return new Uint8Array(await d.save());
};

// PDF de una página escrito a mano: permite probar diccionarios que pdf-lib no genera (firma digital, cifrado)
const pdfCrudo = (extraObjs = [], trailerExtra = '') => {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>', ...extraObjs];
  let out = '%PDF-1.4\n'; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R ${trailerExtra} >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
};

const contenido = (doc, i) => {
  const c = doc.getPage(i).node.Contents();
  if (!c) return '';   // página sin contenido: no hay nada dibujado
  const flujos = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c];
  return flujos.map((f) => Buffer.from(decodePDFRawStream(f).decode()).toString('latin1')).join('\n');
};

// Texto de una página (las fuentes estándar de pdf-lib escriben cadenas hexadecimales en WinAnsi ≈ latin1)
const textoDe = (doc, i) => [...contenido(doc, i).matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)].map((m) => Buffer.from(m[1].replace(/\s/g, ''), 'hex').toString('latin1')).join('\n');

const mult = (A, B) => A.map((fila) => [0, 1, 2].map((j) => fila.reduce((s, v, k) => s + v * B[k][j], 0)));
const matriz = ([a, b, c, d, e, f]) => [[a, b, 0], [c, d, 0], [e, f, 1]];

// Imágenes dibujadas en una página: devuelve la posición de sus esquinas en el espacio del PDF (sin rotar)
const imagenesDibujadas = (doc, i) => {
  const out = [];
  for (const m of contenido(doc, i).matchAll(/q\s+((?:[-\d.eE+ ]+\s+cm\s+)+)\/(\S+)\s+Do\s+Q/g)) {
    const ms = [...m[1].matchAll(/([-\d.eE+ ]+?)\s+cm/g)].map((x) => matriz(x[1].trim().split(/\s+/).map(Number)));
    // PDF: CTM' = M × CTM; cada `cm` se aplica sobre lo anterior
    const total = ms.reduce((acc, M) => mult(M, acc), matriz([1, 0, 0, 1, 0, 0]));
    const pt = (x, y) => { const [X, Y] = [x * total[0][0] + y * total[1][0] + total[2][0], x * total[0][1] + y * total[1][1] + total[2][1]]; return [X, Y]; };
    out.push({ nombre: m[2], abajoIzq: pt(0, 0), abajoDer: pt(1, 0), arribaIzq: pt(0, 1) });
  }
  return out;
};

// De coordenadas del PDF sin rotar a coordenadas de lo que se VE (u a la derecha, v hacia abajo desde arriba-izquierda).
// Derivado de cómo un visor muestra una página con /Rotate: es independiente del código que se prueba.
const aVista = ({ R, cb }, [x, y]) => {
  if (R === 90)  return [y - cb.y, x - cb.x];
  if (R === 180) return [cb.x + cb.width - x, y - cb.y];
  if (R === 270) return [cb.y + cb.height - y, cb.x + cb.width - x];
  return [x - cb.x, cb.y + cb.height - y];
};
const cerca = (a, b, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

const constancia = (extra = {}) => ({
  folio: '3f6d1f0e-8a52-4c5e-9d0f-2b7d51f9c111', ts: '2026-09-24T15:00:00.000Z', token: 'eyJmIjoiMSJ9.' + 'A'.repeat(86), empleado: 'Luis Pérez',
  hOriginal: 'a'.repeat(64), nombreArchivo: 'contrato.pdf', textoConsentimiento: 'Yo, la persona firmante, declaro que leí el documento.', ...extra,
});
const firmante = (extra = {}) => ({
  nombre: 'Ana Gómez', tipo_doc: 'CC', num_doc: '1088000111', rol: 'asociado', metodo_firma: 'pen', firmaPng: dataUrl(120, 40), ...extra,
});
const caja = (extra = {}) => ({ firmante: 0, tipo: 'firma', pagina: 0, x: 0.1, y: 0.1, w: 0.3, ...extra });

// ── Utilidades ────────────────────────────────────────────────────────────────
describe('sha256Hex y dataUrlABytes', () => {
  test('sha256Hex coincide con vectores conocidos y acepta Uint8Array', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await sha256Hex(new Uint8Array(0))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(await sha256Hex(new Uint8Array(1_000_000).fill(7))).toMatch(/^[a-f0-9]{64}$/);
  });

  test('dataUrlABytes recupera los bytes exactos de un PNG', () => {
    const original = png(3, 2);
    const bytes = dataUrlABytes(`data:image/png;base64,${original.toString('base64')}`);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes).equals(original)).toBe(true);
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

// ── Inspección del PDF de entrada ─────────────────────────────────────────────
describe('inspeccionarPdf', () => {
  test('cuenta las páginas y dice que no está firmado digitalmente', async () => {
    expect(await inspeccionarPdf(await pdfBase({ paginas: 3 }))).toEqual({ paginas: 3, yaFirmado: false });
  });

  test('detecta un PDF que ya lleva una firma digital (estamparle otra invalidaría la anterior)', async () => {
    const firmado = pdfCrudo(['<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [0 100 200 300] /Contents <00> >>']);
    expect(await inspeccionarPdf(firmado)).toEqual({ paginas: 1, yaFirmado: true });
    expect((await inspeccionarPdf(pdfCrudo())).yaFirmado).toBe(false);
  });

  test('un archivo que no es un PDF da un mensaje claro', async () => {
    await expect(inspeccionarPdf(new TextEncoder().encode('esto no es un pdf'))).rejects.toThrow(/No se pudo leer el PDF/);
    await expect(inspeccionarPdf(new Uint8Array(0))).rejects.toThrow(/No se pudo leer el PDF/);
  });

  test('un PDF protegido con contraseña se rechaza con instrucciones', async () => {
    const cifrado = pdfCrudo([`<< /Filter /Standard /V 1 /R 2 /O (${'a'.repeat(32)}) /U (${'b'.repeat(32)}) /P -4 >>`],
      '/Encrypt 4 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>]');
    await expect(inspeccionarPdf(cifrado)).rejects.toThrow(/protegido con contraseña/);
  });
});

describe('dimensionesVisibles', () => {
  test.each([[0, 400, 600], [90, 600, 400], [180, 400, 600], [270, 600, 400]])('con /Rotate %i la vista mide %i × %i', async (R, W, H) => {
    const doc = await PDFDocument.load(await pdfBase({ rotacion: R }));
    expect(dimensionesVisibles(doc.getPage(0))).toMatchObject({ R, W, H });
  });

  test('respeta el CropBox y normaliza rotaciones negativas o mayores de 360', async () => {
    const doc = await PDFDocument.load(await pdfBase({ rotacion: 90, cropBox: [20, 30, 300, 500] }));
    expect(dimensionesVisibles(doc.getPage(0))).toMatchObject({ R: 90, W: 500, H: 300 });
    const d2 = await PDFDocument.create(); const p = d2.addPage([100, 200]); p.setRotation(degrees(450));
    expect(dimensionesVisibles(p).R).toBe(90);
  });
});

// ── Estampado: dónde y cómo queda la imagen ───────────────────────────────────
describe('estamparPdf — posición y orientación de la firma', () => {
  const casos = [];
  for (const R of [0, 90, 180, 270]) for (const cropBox of [null, [20, 30, 300, 500]]) casos.push([R, cropBox]);

  test.each(casos)('con /Rotate %i y CropBox %j la firma cae donde se ubicó y se ve derecha', async (R, cropBox) => {
    const bytes = await pdfBase({ rotacion: R, cropBox });
    const salida = await PDFDocument.load(await estamparPdf({ bytes, cajas: [caja({ x: 0.1, y: 0.2, w: 0.3 })], firmantes: [firmante()], constancia: constancia() }));
    const dim = dimensionesVisibles(salida.getPage(0));
    const imgs = imagenesDibujadas(salida, 0);
    expect(imgs).toHaveLength(1);

    const ancho = 0.3 * dim.W; const alto = ancho / ASPECTO_FIRMA;
    const [u0, v0] = [0.1 * dim.W, 0.2 * dim.H];
    const bl = aVista(dim, imgs[0].abajoIzq); const br = aVista(dim, imgs[0].abajoDer); const tl = aVista(dim, imgs[0].arribaIzq);
    // esquina inferior izquierda, borde inferior hacia la derecha y borde izquierdo hacia arriba
    cerca(bl[0], u0); cerca(bl[1], v0 + alto);
    cerca(br[0], u0 + ancho); cerca(br[1], v0 + alto);
    cerca(tl[0], u0); cerca(tl[1], v0);
  });

  test('la imagen se ajusta a la caja sin deformarse y queda centrada (firma con otra proporción)', async () => {
    const bytes = await pdfBase();
    // Caja 3:1 de 120 × 40 pt; la imagen es casi cuadrada (35 × 39): debe ocupar el alto y centrarse
    const salida = await PDFDocument.load(await estamparPdf({ bytes, cajas: [caja({ x: 0.1, y: 0.1, w: 0.3 })], firmantes: [firmante({ firmaPng: dataUrl(35, 39) })], constancia: constancia() }));
    const dim = dimensionesVisibles(salida.getPage(0));
    const [img] = imagenesDibujadas(salida, 0);
    const bl = aVista(dim, img.abajoIzq); const br = aVista(dim, img.abajoDer); const tl = aVista(dim, img.arribaIzq);
    const ancho = br[0] - bl[0]; const alto = bl[1] - tl[1];
    cerca(alto, 40); cerca(ancho / alto, 35 / 39, 0.001);   // conserva su proporción
    const cx = 0.1 * dim.W + 60;   // centro de la caja
    cerca(bl[0] + ancho / 2, cx);
  });

  test('una imagen más ancha que la caja se ajusta al ancho', async () => {
    const salida = await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja({ w: 0.3 })], firmantes: [firmante({ firmaPng: dataUrl(300, 40) })], constancia: constancia() }));
    const dim = dimensionesVisibles(salida.getPage(0));
    const [img] = imagenesDibujadas(salida, 0);
    const bl = aVista(dim, img.abajoIzq); const br = aVista(dim, img.abajoDer);
    cerca(br[0] - bl[0], 120);
  });

  test('la caja de huella es cuadrada y usa la imagen de la huella', async () => {
    const salida = await PDFDocument.load(await estamparPdf({
      bytes: await pdfBase(), cajas: [caja({ tipo: 'huella', x: 0.5, y: 0.5, w: 0.2 })], firmantes: [firmante({ huellaPng: dataUrl(35, 39) })], constancia: constancia(),
    }));
    const dim = dimensionesVisibles(salida.getPage(0));
    const [img] = imagenesDibujadas(salida, 0);
    const bl = aVista(dim, img.abajoIzq); const br = aVista(dim, img.abajoDer); const tl = aVista(dim, img.arribaIzq);
    const alto = bl[1] - tl[1];
    cerca(alto, 80);   // 0.2 × 400 pt, cuadrada: la imagen (35×39) ocupa el alto de la caja
    cerca(br[0] - bl[0], 80 * (35 / 39), 0.01);
  });

  test('firma y huella del mismo firmante se estampan las dos, cada una en su caja y página', async () => {
    const bytes = await pdfBase({ paginas: 2 });
    const salida = await PDFDocument.load(await estamparPdf({
      bytes, cajas: [caja({ pagina: 0 }), caja({ tipo: 'huella', pagina: 1, x: 0.6, y: 0.7, w: 0.15 }), caja({ pagina: 1, x: 0.1, y: 0.8 })],
      firmantes: [firmante({ huellaPng: dataUrl(35, 39) })], constancia: constancia(),
    }));
    expect(imagenesDibujadas(salida, 0)).toHaveLength(1);
    expect(imagenesDibujadas(salida, 1)).toHaveLength(2);
  });

  test('varios firmantes: cada caja usa la firma de su firmante', async () => {
    const bytes = await pdfBase();
    const salida = await PDFDocument.load(await estamparPdf({
      bytes, cajas: [caja({ firmante: 0, x: 0.1, y: 0.1 }), caja({ firmante: 1, x: 0.1, y: 0.5 })],
      firmantes: [firmante({ nombre: 'Ana', firmaPng: dataUrl(120, 40) }), firmante({ nombre: 'Luis', firmaPng: dataUrl(60, 20) })], constancia: constancia(),
    }));
    const imgs = imagenesDibujadas(salida, 0);
    expect(imgs).toHaveLength(2);
    expect(new Set(imgs.map((i) => i.nombre)).size).toBe(2);   // dos imágenes distintas incrustadas
  });

  test('una caja de huella sin imagen de huella se ignora sin fallar', async () => {
    const salida = await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja({ tipo: 'huella' })], firmantes: [firmante()], constancia: constancia() }));
    expect(imagenesDibujadas(salida, 0)).toHaveLength(0);
  });
});

// ── Estampado: constancia y metadatos ─────────────────────────────────────────
describe('estamparPdf — hoja de constancia', () => {
  test('agrega una hoja al final y deja intactas las páginas originales', async () => {
    const bytes = await pdfBase({ paginas: 2, tam: [300, 500] });
    const salida = await PDFDocument.load(await estamparPdf({ bytes, cajas: [caja()], firmantes: [firmante()], constancia: constancia() }));
    expect(salida.getPageCount()).toBe(3);
    expect(salida.getPage(0).getSize()).toEqual({ width: 300, height: 500 });
    expect(salida.getPage(2).getSize().width).toBeCloseTo(595.28, 1);   // la constancia es A4
  });

  test('la constancia trae folio, hash original, fecha de Colombia, funcionario y firmante', async () => {
    const salida = await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: constancia() }));
    const t = textoDe(salida, 1);
    expect(t).toContain('Constancia de firma electrónica');
    expect(t).toContain('3f6d1f0e-8a52-4c5e-9d0f-2b7d51f9c111');
    expect(t).toContain('a'.repeat(64));
    expect(t).toContain('contrato.pdf');
    expect(t).toContain('Luis Pérez');
    expect(t).toContain('Ana Gómez');
    expect(t).toContain('CC 1088000111');
    expect(t).toMatch(/24 de septiembre de 2026/);   // fecha del servidor, en hora de Colombia
    expect(t).toMatch(/hora de Colombia/);
    expect(t).toContain('lápiz de tableta gráfica');
    expect(t).toContain('Sin huella');
  });

  test('indica con qué se firmó y si hubo huella y con qué lector', async () => {
    const t = async (f) => textoDe(await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [f], constancia: constancia() })), 1);
    expect(await t(firmante({ metodo_firma: 'mouse' }))).toContain('mouse (menor valor probatorio)');
    expect(await t(firmante({ metodo_firma: 'touch' }))).toContain('pantalla táctil');
    const conHuella = await t(firmante({ huellaPng: dataUrl(35, 39), huellaDispositivo: 'DigitalPersona {abc}' }));
    expect(conHuella).toContain('Huella capturada con DigitalPersona {abc}');
    expect(await t(firmante({ huellaPng: dataUrl(35, 39) }))).toContain('lector de huellas');
  });

  test('el sello del servidor y las instrucciones de verificación van en la constancia', async () => {
    const c = constancia();
    const t = textoDe(await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: c })), 1);
    expect(t).toContain('Sello del servidor (Ed25519)');
    expect(t.replace(/\n/g, '')).toContain(c.token);   // el token, partido en líneas de 92 caracteres
    expect(t).toMatch(/cargue este archivo tal como fue descargado/);
  });

  test('en una tanda cada constancia dice qué documento es (n de N)', async () => {
    const salida = await PDFDocument.load(await estamparPdf({
      bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: constancia({ lote: { id: '9b0e4a52-1111-4222-8333-944455556666', pos: 2, total: 3 } }),
    }));
    expect(textoDe(salida, 1)).toMatch(/Tanda de firma 9b0e4a52-1111-4222-8333-944455556666: documento 2 de 3/);
    const sinLote = textoDe(await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: constancia() })), 1);
    expect(sinLote).not.toMatch(/Tanda de firma/);
  });

  test('el texto de consentimiento largo se parte en líneas y se conserva completo', async () => {
    const largo = 'Yo, Ana, declaro que leí el documento y lo firmo. '.repeat(30).trim();
    const t = textoDe(await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: constancia({ textoConsentimiento: largo }) })), 1);
    expect(t.replace(/\s+/g, ' ')).toContain(largo);
  });

  test('con muchos firmantes la constancia continúa en otra hoja', async () => {
    const firmantes = Array.from({ length: 10 }, (_, i) => firmante({ nombre: `Firmante ${i + 1}`, num_doc: String(1000 + i), huellaPng: dataUrl(35, 39) }));
    const salida = await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: firmantes.map((_, i) => caja({ firmante: i, y: 0.05 + i * 0.05 })), firmantes, constancia: constancia() }));
    expect(salida.getPageCount()).toBeGreaterThan(2);
    const todo = Array.from({ length: salida.getPageCount() - 1 }, (_, i) => textoDe(salida, i + 1)).join('\n');
    for (let i = 1; i <= 10; i++) expect(todo).toContain(`Firmante ${i}`);
  });

  test('caracteres que las fuentes del PDF no codifican se sustituyen sin romper el documento', async () => {
    const f = firmante({ nombre: 'José Ñandú — “Prueba” 😀 中文' });
    const bytes = await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [f], constancia: constancia({ nombreArchivo: 'contrato — final 😀.pdf' }) });
    const t = textoDe(await PDFDocument.load(bytes), 1);
    expect(t).toContain('José Ñandú - "Prueba" ? ??');   // rayas y comillas tipográficas se normalizan; el resto pasa a '?'
    expect(t).toContain('contrato - final ?.pdf');
  });

  test('metadatos: productor y palabras clave con el folio', async () => {
    // updateMetadata:false — por defecto pdf-lib reescribe el productor al cargar
    const salida = await PDFDocument.load(await estamparPdf({ bytes: await pdfBase(), cajas: [caja()], firmantes: [firmante()], constancia: constancia() }), { updateMetadata: false });
    expect(salida.getProducer()).toBe('Kernel · Firma electrónica');
    expect(salida.getKeywords()).toContain('kernel-firma');
    expect(salida.getKeywords()).toContain('3f6d1f0e-8a52-4c5e-9d0f-2b7d51f9c111');
  });

  test('el PDF resultante es válido, se puede volver a cargar y cambia el hash del original', async () => {
    const bytes = await pdfBase();
    const salida = await estamparPdf({ bytes, cajas: [caja()], firmantes: [firmante()], constancia: constancia() });
    expect(new TextDecoder('latin1').decode(salida.slice(0, 5))).toBe('%PDF-');
    expect(await sha256Hex(salida)).not.toBe(await sha256Hex(bytes));
    await expect(PDFDocument.load(salida)).resolves.toBeTruthy();
  });

  test('no modifica el PDF de entrada', async () => {
    const bytes = await pdfBase();
    const copia = bytes.slice();
    await estamparPdf({ bytes, cajas: [caja()], firmantes: [firmante()], constancia: constancia() });
    expect(Buffer.from(bytes).equals(Buffer.from(copia))).toBe(true);
  });
});
