import { useEffect } from 'react';
import { X } from 'lucide-react';

/** Ventana modal simple: Escape o clic fuera la cierran. */
const Modal = ({ titulo, onClose, children, ancho = 'max-w-lg' }) => {
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`max-h-[90vh] w-full ${ancho} overflow-y-auto rounded border border-slate-700 bg-[#0b1220] p-5 font-mono`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold tracking-wide text-slate-200">{titulo}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;

export const mensajeError = (err, defecto) => err?.response?.data?.error || defecto;
