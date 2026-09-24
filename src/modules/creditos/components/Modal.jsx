import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ titulo, onClose, children, ancho = 'max-w-lg' }) => {
  useEffect(() => {
    const alTeclado = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className={`mt-10 w-full ${ancho} rounded-sm border border-slate-700 bg-[#08101e] p-5 font-mono text-[#a0d4e0]`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold tracking-widest text-[#84cc16]">{titulo}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
