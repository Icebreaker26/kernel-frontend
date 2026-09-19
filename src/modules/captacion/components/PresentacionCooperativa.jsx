import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SLIDES } from '../data/standSlides.js';
import { ACCENTS } from '../data/marca.js';
import StandSlideBody from './StandSlideBody.jsx';

const SLIDE_MS = 8000;

/**
 * La presentación de la cooperativa (historia, convenios, servicios, incentivos, alianzas, valor de
 * la asociación). La comparten el kiosco de stand, el enlace público para grupos y el enlace personal
 * de cada prospecto ("Conoce la cooperativa").
 *  - `autoAvance`: pasa sola cada 8 s (kiosco en pantalla grande). En celular la persona la recorre a su ritmo.
 * Se dibuja como fragmento: quien la usa pone el marco, el encabezado y el botón de acción.
 */
const PresentacionCooperativa = ({ autoAvance = false }) => {
  const [slide, setSlide]   = useState(0);
  const [paused, setPaused] = useState(false);
  const detenido = paused || !autoAvance;

  // `slide` en las deps reinicia el temporizador (y la barra de progreso) en cada cambio
  useEffect(() => {
    if (detenido) return undefined;
    const id = setTimeout(() => setSlide(p => (p + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [detenido, slide]);

  const ir = (i) => { setPaused(true); setSlide((i + SLIDES.length) % SLIDES.length); };

  const s  = SLIDES[slide];
  const ac = ACCENTS[s.accent];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="flex-1 grid md:grid-cols-[0.8fr_1.2fr] gap-4 md:gap-8 md:min-h-0 md:items-center py-3 md:py-0"
        >
          {/* Título */}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold mb-4"
                  style={{ background: ac.soft, color: ac.ink }}>
              <s.Icono size={16} /> {s.eyebrow}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
              {s.titulo}
            </h1>
            <p className="text-base lg:text-lg text-slate-600 leading-relaxed mt-3 max-w-md">{s.cuerpo}</p>
          </div>

          {/* Contenido de la diapositiva */}
          <div className="min-w-0 md:max-h-full md:overflow-hidden">
            <StandSlideBody slide={s} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navegación */}
      <div className="flex items-center justify-center gap-3 my-2 shrink-0">
        <button onClick={() => ir(slide - 1)} aria-label="Anterior"
          className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95 transition">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          {SLIDES.map((sl, i) => (
            <button key={sl.id} onClick={() => ir(i)} aria-label={sl.eyebrow}
              className="h-2.5 rounded-full overflow-hidden transition-all bg-slate-300"
              style={{ width: i === slide ? 40 : 10 }}>
              {i === slide && (
                <motion.span
                  key={`${slide}-${detenido}`}
                  className="block h-full"
                  style={{ background: ACCENTS[sl.accent].main }}
                  initial={{ width: detenido ? '100%' : '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: detenido ? 0 : SLIDE_MS / 1000, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
        <button onClick={() => ir(slide + 1)} aria-label="Siguiente"
          className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95 transition">
          <ChevronRight size={22} />
        </button>
      </div>
    </>
  );
};

export default PresentacionCooperativa;
