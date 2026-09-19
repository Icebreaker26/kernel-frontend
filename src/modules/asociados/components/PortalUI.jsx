import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { ACCENTS, BRAND } from '../../captacion/data/marca.js';

/**
 * Kit visual del Portal del Asociado. El portal lo usan personas de FUERA de la cooperativa, así que sigue la estética
 * pública (fondo claro, paleta del logo, texto grande, esquinas redondeadas) y no la de los módulos internos de Kernel.
 */

export const inputCls =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#065B8E] focus:ring-4 focus:ring-[#065B8E]/15';

// "JUAN CARLOS" → "Juan Carlos" (los nombres llegan en mayúsculas del padrón)
export const nombrePropio = (s) => String(s ?? '')
  .toLowerCase()
  .replace(/(^|\s|-)(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());

export const Tarjeta = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

export const Campo = ({ etiqueta, ayuda, children }) => (
  <label className="block">
    <span className="block text-sm font-bold text-slate-700">{etiqueta}</span>
    {ayuda && <span className="mt-0.5 block text-sm text-slate-500">{ayuda}</span>}
    {children}
  </label>
);

const BOTONES = {
  primario:   'text-white shadow-sm hover:brightness-110',
  secundario: 'border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300',
  peligro:    'bg-red-600 text-white shadow-sm hover:bg-red-700',
  suave:      'text-slate-600 hover:bg-slate-100',
};

export const Boton = ({ children, onClick, loading, icon, variante = 'primario', type = 'button', disabled, bloque = false, className = '' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={!!loading || disabled}
    style={variante === 'primario' ? { background: BRAND.azul } : undefined}
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-extrabold transition disabled:opacity-50 ${BOTONES[variante]} ${bloque ? 'w-full' : ''} ${className}`}
  >
    {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
    {children}
  </button>
);

export const Cargando = ({ texto }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
    <Loader2 size={20} className="animate-spin" /> {texto}
  </div>
);

export const Vacio = ({ icon: Icon, texto }) => (
  <div className="py-8 text-center">
    {Icon && <Icon size={34} className="mx-auto mb-3 text-slate-300" />}
    <p className="mx-auto max-w-sm text-base text-slate-500">{texto}</p>
  </div>
);

export const Modal = ({ titulo, onClose, children }) => {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} role="dialog" aria-modal="true"
                  className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-extrabold text-slate-900">{titulo}</h3>
          {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={20} /></button>}
        </div>
        {children}
      </motion.div>
    </div>
  );
};

// Sección que se abre y se cierra. `accent` = azul | verde | dorado | bosque
export const SeccionColapsable = ({ titulo, icon: Icon, accent = 'azul', defaultOpen = false, badge, children }) => {
  const [abierta, setAbierta] = useState(defaultOpen);
  const ac = ACCENTS[accent];
  return (
    <Tarjeta className="overflow-hidden">
      <button type="button" onClick={() => setAbierta((o) => !o)} aria-expanded={abierta}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: ac.soft, color: ac.ink }}><Icon size={20} /></span>
          <span className="text-base font-extrabold leading-snug text-slate-900 sm:text-lg">{titulo}</span>
        </span>
        <span className="flex items-center gap-3">
          {badge != null && <span className="text-base font-extrabold" style={{ color: ac.ink }}>{badge}</span>}
          <ChevronDown size={20} className="text-slate-400 transition-transform duration-200" style={{ transform: abierta ? 'rotate(180deg)' : 'none' }} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div key="contenido" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Tarjeta>
  );
};

export { ACCENTS, BRAND };
