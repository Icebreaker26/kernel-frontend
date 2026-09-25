import { FileImage, FileText } from 'lucide-react';
import { fechaBogota } from '../lib/formato.js';

const TONOS = {
  ok:      'border-emerald-600/60 bg-emerald-500/10 text-emerald-300',
  alerta:  'border-amber-600/60 bg-amber-500/10 text-amber-300',
  neutro:  'border-sky-700/60 bg-sky-500/10 text-sky-300',
};

export const kb = (n) => (n == null ? '' : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const extension = (mime, nombre) => (mime === 'application/pdf'
  ? 'PDF'
  : mime?.startsWith('image/') ? (mime.split('/')[1] ?? 'IMG').replace('jpeg', 'jpg').toUpperCase() : (String(nombre ?? '').split('.').pop() || 'ARCHIVO').toUpperCase().slice(0, 4));

/**
 * Cabecera de un documento: ficha con el tipo de archivo, el nombre del documento y el archivo, cuánto pesa, cuándo y quién lo subió,
 * y sus acciones con texto (no solo un ícono). `tono` colorea la ficha según el estado del documento.
 */
/** Solo la ficha del tipo de archivo (PDF / imagen), coloreada por estado */
export const FichaArchivo = ({ mime, nombre, tono = 'neutro' }) => {
  const Icono = mime?.startsWith('image/') ? FileImage : FileText;
  return (
    <span aria-hidden className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm border ${TONOS[tono]}`}>
      <Icono size={17} />
      <span className="text-[8px] font-bold tracking-wider">{extension(mime, nombre)}</span>
    </span>
  );
};

const CabeceraDocumento = ({ titulo, nombre, mime, size, fechaSubida, autor, tono = 'neutro', acciones = [] }) => {
  const Icono = mime?.startsWith('image/') ? FileImage : FileText;
  const meta = [kb(size), fechaSubida ? fechaBogota(fechaSubida) : '', autor].filter(Boolean);
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm border ${TONOS[tono]}`}>
        <Icono size={17} />
        <span className="text-[8px] font-bold tracking-wider">{extension(mime, nombre)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#e2f3f8]">{titulo}</p>
        <p className="truncate text-[10px] text-slate-500" title={nombre}>{nombre}</p>
        {meta.length > 0 && <p className="mt-0.5 text-[10px] text-slate-600">{meta.join(' · ')}</p>}
      </div>
      {acciones.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          {acciones.map((a) => (
            <button key={a.aria} type="button" title={a.titulo} aria-label={a.aria} onClick={a.onClick}
              className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[9px] font-bold tracking-widest transition-colors ${a.peligro ? 'border-rose-800 text-rose-300 hover:bg-rose-950/40' : 'border-slate-700 text-[#a0d4e0] hover:border-[#84cc16] hover:text-[#84cc16]'}`}>
              <a.icono size={12} aria-hidden />{a.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CabeceraDocumento;
