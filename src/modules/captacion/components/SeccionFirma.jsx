import { useRef, useState, useEffect } from 'react';
import { Loader2, RotateCcw, PenTool } from 'lucide-react';

const SeccionFirma = ({ prospecto, onSave, saving, stepupToken }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing]   = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [trazos, setTrazos]     = useState([]);
  const currentPath             = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top, t: Date.now() };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    currentPath.current = [pos];
    setDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    currentPath.current.push(pos);
  };

  const endDraw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    setDrawing(false);
    if (currentPath.current.length > 1) {
      setTrazos(prev => [...prev, [...currentPath.current]]);
    }
    currentPath.current = [];
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTrazos([]);
    setHasStrokes(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasStrokes) return;
    const canvas = canvasRef.current;
    const firma_png = canvas.toDataURL('image/png');
    onSave({ firma_png, trazos, stepup_token: stepupToken });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-900/40 border border-slate-700/40 rounded p-3">
        <p className="text-emerald-400/60 text-[9px] tracking-[2px] mb-1">// DECLARACIÓN</p>
        <p className="text-slate-400 text-[10px] leading-relaxed">
          Declaro que la información suministrada es verídica y autorizo a Cooperativa Progresemos para verificarla.
          Acepto los estatutos y reglamentos de la cooperativa.
        </p>
      </div>

      {prospecto && (
        <div className="flex items-center gap-3 border border-emerald-900/20 rounded p-3">
          <div className="w-8 h-8 bg-emerald-900/30 rounded flex items-center justify-center shrink-0">
            <PenTool size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-300 text-xs font-bold">{prospecto.nombres} {prospecto.apellidos}</p>
            <p className="text-slate-500 text-[10px]">CC {prospecto.cedula}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-slate-400 text-[9px] tracking-[2px] uppercase">Firma</label>
          {hasStrokes && (
            <button type="button" onClick={limpiar}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-[10px] transition-colors">
              <RotateCcw size={10} /> Limpiar
            </button>
          )}
        </div>
        <div className="border border-emerald-900/40 rounded overflow-hidden relative"
          style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={400} height={160}
            className="w-full h-40 bg-[#041a12] cursor-crosshair block"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-700 text-xs">Firma aquí</p>
            </div>
          )}
        </div>
        <p className="text-slate-600 text-[9px] mt-1 text-center">
          Firma con el dedo o el mouse · Se guarda como imagen
        </p>
      </div>

      <button type="submit" disabled={saving || !hasStrokes}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        Enviar solicitud de vinculación
      </button>
    </form>
  );
};

export default SeccionFirma;
