import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TemaContext } from '../publico/tema.js';

/**
 * Panel lateral del módulo del asesor (tema oscuro/esmeralda). Contiene formularios hechos con los
 * mismos componentes que el formulario del asociado (ui.jsx), pero con el tema "panel": así el asesor
 * siempre distingue sus pantallas de las del asociado.
 * `subtitulo` y `titulo` van en el encabezado; los hijos son el formulario (con su barra de acciones).
 */
const PanelLateral = ({ eyebrow = '// CAPTACIÓN', titulo, subtitulo, onClose, ocupado = false, ancho = 'sm:max-w-xl', children }) => {
  useEffect(() => {
    const cerrar = (e) => { if (e.key === 'Escape' && !ocupado) onClose(); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onClose, ocupado]);

  // Portal al <body>: dentro del layout quedaría por debajo de la barra superior (otro contexto de apilamiento)
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50" role="dialog" aria-modal="true" aria-label={titulo}
         onMouseDown={(e) => e.target === e.currentTarget && !ocupado && onClose()}>
      <div className={`flex h-full w-full flex-col overflow-y-auto border-l-4 border-emerald-600 bg-[#F2FAF5] font-sans text-slate-800 shadow-2xl ${ancho}`}>
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-emerald-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[2px] text-emerald-700">{eyebrow}</p>
            <h2 className="text-lg font-extrabold text-slate-900">{titulo}</h2>
            {subtitulo && <p className="truncate text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <button onClick={onClose} disabled={ocupado} aria-label="Cerrar"
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-slate-800 disabled:opacity-40"><X size={18} /></button>
        </header>
        <div className="flex-1 px-4 pt-4 sm:px-5">
          <TemaContext.Provider value="panel">{children}</TemaContext.Provider>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PanelLateral;
