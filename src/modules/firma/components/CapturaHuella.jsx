import { useEffect } from 'react';
import { Fingerprint, RotateCcw } from 'lucide-react';
import { useHuellero } from '../hooks/useHuellero.js';

const AYUDA = {
  sin_servicio: 'No se pudo comunicar con el lector. Verifique que el programa "HID Authentication Device Client" esté instalado y en ejecución en este equipo y que el navegador tenga permitido el acceso a dispositivos de la red local para este sitio.',
  sin_lector: 'No se detecta el lector. Conéctelo por USB; se activará solo.',
};

// Captura de una huella con el lector U.are.U 4500. onChange recibe { png, dispositivo } o null.
const CapturaHuella = ({ onChange }) => {
  const { estado, mensaje, muestra, dispositivo, iniciar, descartar } = useHuellero();

  useEffect(() => { iniciar(); }, [iniciar]);
  useEffect(() => { onChange(muestra ? { png: muestra, dispositivo } : null); }, [muestra, dispositivo, onChange]);

  return (
    <div className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-slate-700 bg-white">
          {muestra
            ? <img src={muestra} alt="Huella capturada" className="h-full w-full object-contain" />
            : <Fingerprint size={40} className={estado === 'listo' ? 'animate-pulse text-sky-500' : 'text-slate-300'} />}
        </div>
        <div className="text-xs">
          {estado === 'buscando' && <p className="text-slate-400">Buscando el lector…</p>}
          {estado === 'listo' && <p className="font-bold text-sky-300">Lector listo: apoye el dedo índice sobre el lector.</p>}
          {estado === 'capturada' && <p className="font-bold text-emerald-300">Huella capturada.</p>}
          {AYUDA[estado] && <p className="text-amber-300">{AYUDA[estado]}</p>}
          {mensaje && <p className="mt-1 text-amber-200">{mensaje}</p>}
          <div className="mt-2 flex gap-3">
            {(estado === 'capturada') && (
              <button type="button" onClick={descartar} className="inline-flex items-center gap-1.5 text-[11px] text-[#6aacbc] hover:text-[#00e5ff]">
                <RotateCcw size={12} /> Repetir la captura
              </button>
            )}
            {(estado === 'sin_servicio' || estado === 'sin_lector') && (
              <button type="button" onClick={iniciar} className="inline-flex items-center gap-1.5 text-[11px] text-[#6aacbc] hover:text-[#00e5ff]">
                <RotateCcw size={12} /> Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapturaHuella;
