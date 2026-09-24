// Estampado de firmas en un PDF, 100 % en el navegador: ni el PDF ni las imágenes de la firma o la huella salen del equipo.
// pdf-lib se carga bajo demanda para no engordar el bundle principal.

export const ASPECTO_FIRMA = 3;   // ancho / alto de la caja de firma

export const sha256Hex = async (bytes) => {
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const dataUrlABytes = (dataUrl) => {
  const bin = atob(dataUrl.split(',')[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// Detecta lo que estampar dañaría o no podría hacer
export const inspeccionarPdf = async (bytes) => {
  const { PDFDocument } = await import('pdf-lib');
  let doc;
  try {
    doc = await PDFDocument.load(bytes);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/encrypt/i.test(msg)) throw new Error('El PDF está protegido con contraseña. Quítale la protección y vuelve a cargarlo.');
    throw new Error('No se pudo leer el PDF. Verifica que no esté dañado.');
  }
  // Un PDF ya firmado digitalmente pierde la validez de esa firma al modificarlo
  const yaFirmado = /\/ByteRange\s*\[/.test(new TextDecoder('latin1').decode(bytes));
  return { paginas: doc.getPageCount(), yaFirmado };
};

// Dimensiones de la página tal como se ve (con CropBox y rotación aplicados), en puntos
export const dimensionesVisibles = (page) => {
  const cb = page.getCropBox();
  const R = ((page.getRotation().angle % 360) + 360) % 360;
  const rotada = R === 90 || R === 270;
  return { R, cb, W: rotada ? cb.height : cb.width, H: rotada ? cb.width : cb.height };
};

// Convierte un punto de la vista (u a la derecha, v hacia abajo, desde la esquina superior izquierda) a coordenadas del PDF sin rotar
const aPdf = ({ R, cb }, u, v) => {
  const w = cb.width;
  const h = cb.height;
  if (R === 90)  return { x: cb.x + v,     y: cb.y + u };
  if (R === 180) return { x: cb.x + w - u, y: cb.y + v };
  if (R === 270) return { x: cb.x + w - v, y: cb.y + h - u };
  return { x: cb.x + u, y: cb.y + h - v };
};

// Las fuentes estándar del PDF solo codifican Latin-1: se normalizan los signos tipográficos y lo demás pasa a '?'
const seguro = (s) => String(s ?? '')
  .replace(/[—–]/g, '-').replace(/›/g, '>').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/[^\x20-\x7E\xA0-\xFF]/gu, '?');

const fechaBogota = (iso) => new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'medium',
}).format(new Date(iso));

const envolver = (font, texto, size, ancho) => {
  const lineas = [];
  let actual = '';
  for (const palabra of seguro(texto).split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) > ancho && actual) { lineas.push(actual); actual = palabra; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
};

/**
 * @param bytes      PDF original (Uint8Array)
 * @param cajas      [{ firmante: idx, tipo: 'firma'|'huella', pagina (0-based), x, y, w }] con x, y, w como fracción del ancho/alto visible de la página
 * @param firmantes  [{ nombre, tipo_doc, num_doc, rol, metodo_firma, firmaPng: dataURL, huellaPng?: dataURL }]
 * @param constancia { folio, ts, token, empleado, hOriginal, nombreArchivo, textoConsentimiento }
 */
export const estamparPdf = async ({ bytes, cajas, firmantes, constancia }) => {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  const paginas = doc.getPages();

  const imagenes = [];
  for (const f of firmantes) {
    imagenes.push({
      firma: await doc.embedPng(dataUrlABytes(f.firmaPng)),
      huella: f.huellaPng ? await doc.embedPng(dataUrlABytes(f.huellaPng)) : null,
    });
  }

  for (const c of cajas) {
    const page = paginas[c.pagina];
    const dim = dimensionesVisibles(page);
    const img = imagenes[c.firmante][c.tipo];
    if (!img) continue;
    const ancho = c.w * dim.W;
    // La caja de firma es 3:1; la de huella, cuadrada
    const alto = c.tipo === 'firma' ? ancho / ASPECTO_FIRMA : ancho;
    // La imagen se ajusta dentro de la caja sin deformarse (la firma capturada y la huella no tienen la proporción exacta de la caja)
    const k = Math.min(ancho / img.width, alto / img.height);
    const dw = img.width * k;
    const dh = img.height * k;
    const u = c.x * dim.W + (ancho - dw) / 2;
    const v = c.y * dim.H + (alto - dh) / 2;
    const { x, y } = aPdf(dim, u, v + dh);   // esquina inferior izquierda de la imagen en la vista
    page.drawImage(img, { x, y, width: dw, height: dh, rotate: degrees(dim.R) });
  }

  // ── Hoja de constancia ─────────────────────────────────────────────────────
  let page = doc.addPage([595.28, 841.89]);
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const M = 48;
  const ancho = 595.28 - 2 * M;
  const gris = rgb(0.35, 0.35, 0.35);
  let y = 841.89 - M;

  // Si lo que sigue no cabe, continúa en otra hoja (listas largas de firmantes)
  const asegurar = (alto) => {
    if (y - alto < M) { page = doc.addPage([595.28, 841.89]); y = 841.89 - M; }
  };

  const linea = (texto, { f = fuente, size = 10, color = rgb(0.1, 0.1, 0.1), sangria = 0 } = {}) => {
    for (const l of envolver(f, texto, size, ancho - sangria)) {
      asegurar(size + 4);
      page.drawText(l, { x: M + sangria, y, size, font: f, color });
      y -= size + 4;
    }
  };

  linea('Constancia de firma electrónica', { f: negrita, size: 16 });
  linea('Cooperativa Progresemos · Kernel', { size: 9, color: gris });
  y -= 8;
  linea(`Folio: ${constancia.folio}`, { f: negrita });
  linea(`Fecha y hora del servidor: ${fechaBogota(constancia.ts)} (hora de Colombia)`);
  linea(`Documento: ${constancia.nombreArchivo}`);
  if (constancia.lote) linea(`Tanda de firma ${constancia.lote.id}: documento ${constancia.lote.pos} de ${constancia.lote.total}`, { size: 9, color: gris });
  linea('SHA-256 del documento original (antes de firmar):', { size: 9, color: gris });
  linea(constancia.hOriginal, { f: mono, size: 8.5 });
  linea(`Funcionario que asistió la firma: ${constancia.empleado ?? '—'}`);
  y -= 8;

  linea('Firmantes', { f: negrita, size: 12 });
  firmantes.forEach((f, i) => {
    y -= 4;
    asegurar(100);
    linea(`${i + 1}. ${f.nombre} — ${f.tipo_doc} ${f.num_doc} — ${f.rol}`, { f: negrita });
    linea(`Firma capturada con: ${{ pen: 'lápiz de tableta gráfica', touch: 'pantalla táctil', mouse: 'mouse (menor valor probatorio)' }[f.metodo_firma]}`
      + (f.huellaPng ? `. Huella capturada con ${f.huellaDispositivo ?? 'lector de huellas'}.` : '. Sin huella.'), { size: 9, color: gris });
    const { firma, huella } = imagenes[i];
    const h = 44;
    const w = Math.min(150, (firma.width / firma.height) * h);
    page.drawRectangle({ x: M, y: y - h - 4, width: 160, height: h + 8, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
    page.drawImage(firma, { x: M + 4, y: y - h, width: w, height: h });
    if (huella) {
      page.drawRectangle({ x: M + 172, y: y - h - 4, width: h + 8, height: h + 8, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
      const kh = Math.min(h / huella.width, h / huella.height);
      page.drawImage(huella, { x: M + 176, y: y - h, width: huella.width * kh, height: huella.height * kh });
    }
    y -= h + 14;
  });

  y -= 6;
  linea('Declaración aceptada por los firmantes', { f: negrita, size: 12 });
  linea(constancia.textoConsentimiento, { size: 9 });
  y -= 8;
  linea('Sello del servidor (Ed25519). Sirve para comprobar que Kernel emitió esta constancia para el documento indicado:', { size: 8.5, color: gris });
  for (let i = 0; i < constancia.token.length; i += 92) linea(constancia.token.slice(i, i + 92), { f: mono, size: 6.5 });
  y -= 6;
  linea('Verificación: en Kernel › Firma electrónica › Verificar, cargue este archivo tal como fue descargado. Si se abre y se vuelve a guardar en otro programa, dejará de coincidir.', { size: 8.5, color: gris });

  doc.setProducer('Kernel · Firma electrónica');
  doc.setKeywords(['kernel-firma', constancia.folio]);

  return doc.save();
};
