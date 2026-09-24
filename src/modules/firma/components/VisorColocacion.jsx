import { useEffect, useRef, useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { ASPECTO_FIRMA } from '../lib/estamparPdf.js';

const ANCHO_PX = 720;
const W_DEFECTO = 0.28;   // ancho de la caja como fracción del ancho de la página
const W_DEFECTO_HUELLA = 0.13;
const wMin = (tipo) => (tipo === 'firma' ? 0.1 : 0.06);
const W_MAX = 0.6;

// Muestra el PDF con pdf.js y permite colocar, mover y redimensionar las cajas de firma sobre cada página.
// Las cajas se guardan como fracciones del tamaño visible de la página (independiente del zoom).
const VisorColocacion = ({ bytes, firmantes, cajas, setCajas, activo }) => {
  const [paginas, setPaginas] = useState([]);   // [{ ratio }] alto/ancho de cada página
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);   // caja seleccionada: muestra sus botones sin depender del hover (tableta, pantalla táctil)
  const canvases = useRef([]);

  useEffect(() => {
    let cancelado = false;
    let pdf;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        // pdf.js toma posesión del buffer: se le pasa una copia
        pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const infos = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          infos.push({ ratio: base.height / base.width });
        }
        if (cancelado) return;
        setPaginas(infos);
        // Espera a que React pinte los canvas
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

  const colocar = (e, pagina) => {
    if (e.target !== e.currentTarget) return;   // solo clics sobre la página, no sobre una caja
    setSel(null);
    if (activo == null) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = paginas[pagina].ratio;
    const tipo = activo.tipo;
    const w = tipo === 'firma' ? W_DEFECTO : W_DEFECTO_HUELLA;
    const hFrac = (tipo === 'firma' ? w / ASPECTO_FIRMA : w) / ratio;
    const x = Math.min(Math.max((e.clientX - r.left) / r.width - w / 2, 0), 1 - w);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height - hFrac / 2, 0), 1 - hFrac);
    setCajas((cs) => [...cs, { id: crypto.randomUUID(), firmante: activo.firmante, tipo, pagina, x, y, w }]);
  };

  const actualizar = (id, cambios) => setCajas((cs) => cs.map((c) => (c.id === id ? { ...c, ...cambios } : c)));

  const arrastrar = (e, caja, ratio, modo) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* el arrastre igual funciona sin captura */ }
    const pagina = el.closest('[data-pagina]').getBoundingClientRect();
    const ini = { px: e.clientX, py: e.clientY, x: caja.x, y: caja.y, w: caja.w };
    const alto = (w) => (caja.tipo === 'firma' ? w / ASPECTO_FIRMA : w) / ratio;
    const mover = (ev) => {
      const dx = (ev.clientX - ini.px) / pagina.width;
      const dy = (ev.clientY - ini.py) / pagina.height;
      if (modo === 'mover') {
        actualizar(caja.id, {
          x: Math.min(Math.max(ini.x + dx, 0), 1 - ini.w),
          y: Math.min(Math.max(ini.y + dy, 0), 1 - alto(ini.w)),
        });
      } else {
        const w = Math.min(Math.max(ini.w + dx, wMin(caja.tipo)), W_MAX, 1 - ini.x, (1 - ini.y) / (alto(1)));
        actualizar(caja.id, { w });
      }
    };
    const fin = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin); };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
  };

  const enTodas = (caja) => setCajas((cs) => {
    const ya = new Set(cs.filter((c) => c.firmante === caja.firmante && c.tipo === caja.tipo).map((c) => c.pagina));
    const nuevas = paginas.map((_, i) => i).filter((i) => !ya.has(i))
      .map((i) => ({ ...caja, id: crypto.randomUUID(), pagina: i }));
    return [...cs, ...nuevas];
  });

  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="flex flex-col items-center gap-6">
      {paginas.map((p, i) => (
        <div key={i} className="max-w-full">
          <p className="mb-1 text-[10px] tracking-widest text-[#6aacbc]">PÁGINA {i + 1} DE {paginas.length}</p>
          <div
            data-pagina={i}
            onClick={(e) => colocar(e, i)}
            className="relative bg-white shadow-lg"
            style={{ width: ANCHO_PX, maxWidth: '100%', aspectRatio: `1 / ${p.ratio}`, cursor: activo ? 'copy' : 'default' }}
          >
            <canvas ref={(el) => { canvases.current[i] = el; }} className="pointer-events-none absolute inset-0 h-full w-full" />
            {cajas.filter((c) => c.pagina === i).map((c) => {
              const f = firmantes[c.firmante];
              const alto = (c.tipo === 'firma' ? c.w / ASPECTO_FIRMA : c.w) / p.ratio;
              return (
                <div
                  key={c.id}
                  onPointerDown={(e) => { setSel(c.id); arrastrar(e, c, p.ratio, 'mover'); }}
                  className="group absolute cursor-move select-none border-2 border-[#00e5ff] bg-[#00e5ff22] text-[10px] font-bold text-[#0b3b47]"
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${alto * 100}%`, touchAction: 'none' }}
                >
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-1">
                    {c.tipo === 'firma' ? 'Firma' : 'Huella'} · {f?.nombre || `Firmante ${c.firmante + 1}`}
                  </span>
                  {/* Los botones van pegados a la caja (el relleno transparente cubre el hueco, así el hover no se pierde al llegar a ellos)
                      y se quedan visibles mientras la caja esté seleccionada. Si la caja está arriba del todo, salen por debajo. */}
                  <span className={`absolute right-0 gap-1 ${c.y < 0.07 ? 'top-full pt-2' : 'bottom-full pb-2'} ${sel === c.id ? 'flex' : 'hidden group-hover:flex'}`}
                    onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" title="Repetir en todas las páginas" aria-label="Repetir en todas las páginas" onClick={() => enTodas(c)}
                      className="rounded-sm border border-[#00e5ff] bg-[#08101e] p-2 text-[#00e5ff] hover:bg-[#0d1829]"><Copy size={14} /></button>
                    <button type="button" title="Quitar" aria-label="Quitar esta caja" onClick={() => setCajas((cs) => cs.filter((x) => x.id !== c.id))}
                      className="rounded-sm border border-red-500 bg-[#08101e] p-2 text-red-400 hover:bg-[#1a0d12]"><Trash2 size={14} /></button>
                  </span>
                  <span
                    onPointerDown={(e) => arrastrar(e, c, p.ratio, 'redimensionar')}
                    className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm bg-[#00e5ff]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisorColocacion;
