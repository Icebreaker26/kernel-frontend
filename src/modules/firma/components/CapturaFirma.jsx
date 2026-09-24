import { useEffect, useRef, useState } from 'react';
import { PenLine, RotateCcw } from 'lucide-react';

const MIN_LONGITUD = 60;   // px de trazo acumulado: evita que un toque suelto cuente como firma

// Lienzo de firma con Pointer Events: sirve con tabletas de lápiz (Wacom, Huion, XP-Pen), pantallas táctiles y mouse.
// Con lápiz el grosor sigue la presión. Devuelve un PNG transparente y con qué se firmó ('pen' | 'touch' | 'mouse').
// Interfaz pensada para poder cambiar el capturador (p. ej. un pad con pantalla y SDK propio) sin tocar el asistente.
const CapturaFirma = ({ onChange, alto = 220 }) => {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const ultimo = useRef(null);
  const longitud = useRef(0);
  const tipos = useRef(new Set());
  const [tinta, setTinta] = useState(false);

  const preparar = () => {
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  };
  useEffect(preparar, []);

  const metodo = () => (tipos.current.has('mouse') || tipos.current.size === 0 ? 'mouse' : tipos.current.has('touch') ? 'touch' : 'pen');

  const emitir = () => {
    if (longitud.current < MIN_LONGITUD) return onChange(null);
    onChange({ png: canvasRef.current.toDataURL('image/png'), metodo: metodo() });
  };

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5 };
  };

  const trazo = (a, b) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 1.2 + 3.2 * b.p;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const iniciar = (e) => {
    e.preventDefault();
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* sin captura el trazo igual funciona dentro del lienzo */ }
    tipos.current.add(e.pointerType);
    dibujando.current = true;
    const p = pos(e);
    ultimo.current = p;
    trazo(p, { ...p, x: p.x + 0.01, y: p.y + 0.01 });
    setTinta(true);
  };

  const mover = (e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    // Los eventos coalescidos dan un trazo suave cuando el lápiz reporta más rápido que el cuadro de pantalla
    const coalescidos = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const eventos = coalescidos.length ? coalescidos : [e.nativeEvent];
    for (const ev of eventos) {
      const p = pos(ev);
      trazo(ultimo.current, p);
      longitud.current += Math.hypot(p.x - ultimo.current.x, p.y - ultimo.current.y);
      ultimo.current = p;
    }
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    emitir();
  };

  const borrar = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    longitud.current = 0;
    tipos.current = new Set();
    setTinta(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-sm border-2 border-dashed border-slate-500 bg-white">
        <canvas
          ref={canvasRef}
          aria-label="Área de firma"
          className="block w-full cursor-crosshair"
          style={{ height: alto, touchAction: 'none' }}
          onPointerDown={iniciar} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar}
        />
        {!tinta && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
            <PenLine size={28} />
            <p className="text-sm">Firme aquí con el lápiz de la tableta</p>
          </div>
        )}
        <span className="pointer-events-none absolute bottom-10 left-6 right-6 border-b border-slate-300" />
      </div>
      <button type="button" onClick={borrar} disabled={!tinta}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#6aacbc] hover:text-[#00e5ff] disabled:opacity-40">
        <RotateCcw size={13} /> Borrar y firmar de nuevo
      </button>
    </div>
  );
};

export default CapturaFirma;
