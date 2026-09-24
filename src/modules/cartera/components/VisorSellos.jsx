import { useEffect, useRef, useState } from 'react';

// Los sellos tienen el mismo tamaño fijo que en el PDF final (fracción del ancho de la página): lo que se ve aquí es lo que se estampa
export const SELLO_ANCHO = 0.30;
export const SELLO_ASPECTO = 3.2;
const ANCHO_PX = 720;

export const ROTULO_SELLO = { aval: 'AVAL FONDO REGIONAL', firma: 'FIRMA ELECTRONICA', desembolso: 'DESEMBOLSO' };

/**
 * Muestra el comprobante con pdf.js y deja arrastrar cada sello a donde Cartera quiera, en cualquier página.
 * `sellos` = { clave: { pagina, x, y } } con x, y como fracciones desde la esquina superior izquierda de la página.
 */
const VisorSellos = ({ bytes, sellos, onChange, textos }) => {
  const [paginas, setPaginas] = useState([]);   // [{ ratio }] alto / ancho de cada página
  const [error, setError] = useState('');
  const canvases = useRef([]);

  useEffect(() => {
    let cancelado = false;
    let pdf;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const infos = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          infos.push({ ratio: base.height / base.width });
        }
        if (cancelado) return;
        setPaginas(infos);
        await new Promise((r) => requestAnimationFrame(r));
        const dpr = window.devicePixelRatio || 1;
        for (let n = 1; n <= pdf.numPages && !cancelado; n++) {
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (ANCHO_PX / base.width) * dpr });
          const c = canvases.current[n - 1];
          if (!c) continue;
          c.width = vp.width;
          c.height = vp.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        }
      } catch {
        if (!cancelado) setError('No se pudo mostrar el PDF.');
      }
    })();
    return () => { cancelado = true; pdf?.destroy(); };
  }, [bytes]);

  // Altura del sello como fracción de la altura de la página (depende de la proporción de esa página)
  const altoFrac = (ratio) => (SELLO_ANCHO / SELLO_ASPECTO) / ratio;

  const arrastrar = (e, clave) => {
    e.preventDefault();
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* el arrastre funciona igual sin captura */ }
    const pos = sellos[clave];
    const pagEl = el.closest('[data-pagina]');
    const caja = pagEl.getBoundingClientRect();
    const dx0 = e.clientX - (caja.left + pos.x * caja.width);   // dónde agarró el sello, para que no salte
    const dy0 = e.clientY - (caja.top + pos.y * caja.height);
    const mover = (ev) => {
      // La página bajo el puntero (permite pasar un sello de una hoja a otra)
      const bajo = document.elementsFromPoint?.(ev.clientX, ev.clientY)?.map((n) => n.closest?.('[data-pagina]')).find(Boolean) ?? pagEl;
      const r = bajo.getBoundingClientRect();
      const n = Number(bajo.dataset.pagina);
      const alto = altoFrac(paginas[n].ratio);
      const x = Math.min(Math.max((ev.clientX - dx0 - r.left) / r.width, 0), 1 - SELLO_ANCHO);
      const y = Math.min(Math.max((ev.clientY - dy0 - r.top) / r.height, 0), 1 - alto);
      onChange({ ...sellos, [clave]: { pagina: n, x, y } });
    };
    const fin = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin); };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
  };

  // Teclado: las flechas mueven el sello un poco (accesibilidad y ajuste fino)
  const teclas = (e, clave) => {
    const paso = e.shiftKey ? 0.05 : 0.01;
    const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!d) return;
    e.preventDefault();
    const pos = sellos[clave];
    const alto = altoFrac(paginas[pos.pagina].ratio);
    onChange({ ...sellos, [clave]: { ...pos, x: Math.min(Math.max(pos.x + d[0], 0), 1 - SELLO_ANCHO), y: Math.min(Math.max(pos.y + d[1], 0), 1 - alto) } });
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="flex flex-col items-center gap-6">
      {paginas.map((p, i) => (
        <div key={i} className="max-w-full">
          <p className="mb-1 text-[10px] tracking-widest text-[#6aacbc]">PÁGINA {i + 1} DE {paginas.length}</p>
          <div data-pagina={i} className="relative bg-white shadow-lg" style={{ width: ANCHO_PX, maxWidth: '100%', aspectRatio: `1 / ${p.ratio}`, containerType: 'inline-size' }}>
            <canvas ref={(el) => { canvases.current[i] = el; }} className="pointer-events-none absolute inset-0 h-full w-full" />
            {Object.entries(sellos).filter(([clave, pos]) => pos.pagina === i && textos[clave]).map(([clave, pos]) => {
              const t = textos[clave];
              return (
                <div
                  key={clave}
                  role="button"
                  tabIndex={0}
                  aria-label={`Sello ${ROTULO_SELLO[clave]}: arrastra para moverlo`}
                  data-sello={clave}
                  onPointerDown={(e) => arrastrar(e, clave)}
                  onKeyDown={(e) => teclas(e, clave)}
                  className="absolute flex cursor-move select-none flex-col items-center justify-center border-2 border-[#0d3880] bg-white/90 text-center font-bold leading-tight text-[#0d3880] focus:outline focus:outline-2 focus:outline-[#fbbf24]"
                  style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: `${SELLO_ANCHO * 100}%`, aspectRatio: `${SELLO_ASPECTO}`, touchAction: 'none' }}
                >
                  <span className="pointer-events-none" style={{ fontSize: '2.5cqw' }}>{t.titulo}</span>
                  <span className="pointer-events-none" style={{ fontSize: '3.4cqw' }}>{t.detalle}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisorSellos;
