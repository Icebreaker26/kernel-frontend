import { useEffect } from 'react';
import { X } from 'lucide-react';
import VisorColocacion from './VisorColocacion.jsx';

const SIN_CAJAS = [];
const SIN_FIRMANTES = [];
const noop = () => {};

// Vista previa de solo lectura de un PDF cargado, para que la persona confirme que subió el archivo correcto
const VistaPreviaModal = ({ archivo, onClose }) => {
  useEffect(() => {
    const alTeclado = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Vista previa de ${archivo.nombre}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#020617]/95" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#08101e] px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#a0d4e0]">{archivo.nombre}</p>
          <p className="text-[10px] text-slate-500">{archivo.paginas} pág. · vista previa</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar vista previa"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-slate-700 px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#a0d4e0] hover:border-[#38bdf8]">
          <X size={14} /> CERRAR
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        <VisorColocacion bytes={archivo.bytes} firmantes={SIN_FIRMANTES} cajas={SIN_CAJAS} setCajas={noop} activo={null} />
      </div>
    </div>
  );
};

export default VistaPreviaModal;
