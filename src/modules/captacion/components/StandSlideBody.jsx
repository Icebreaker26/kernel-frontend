import { motion } from 'framer-motion';
import { Check, Building2 } from 'lucide-react';
import { ACCENTS } from '../data/marca.js';

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm';

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 + i * 0.05, duration: 0.3 },
});

const Timeline = ({ slide }) => {
  const ac = ACCENTS[slide.accent];
  return (
    <ol className="relative grid gap-3">
      <span className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-slate-200" aria-hidden />
      {slide.hitos.map((h, i) => {
        const ultimo = i === slide.hitos.length - 1;
        return (
          <motion.li key={h.anio} {...fade(i)} className="relative flex items-center gap-4">
            <span className="relative z-10 w-20 shrink-0 rounded-xl py-2 text-center text-xl font-extrabold text-white"
                  style={{ background: ultimo ? ACCENTS.verde.main : ac.main }}>
              {h.anio}
            </span>
            <div className={`${card} flex-1 px-4 py-2.5`}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ac.ink }}>{h.fecha}</p>
              <p className="text-base text-slate-700 leading-snug">{h.texto}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
};

const Nombres = ({ slide }) => {
  const ac = ACCENTS[slide.accent];
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
      {slide.nombres.map((n, i) => (
        <motion.li key={n} {...fade(i * 0.5)} className={`${card} flex items-center gap-3 px-3 py-2.5`}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                style={{ background: ac.soft, color: ac.ink }}>
            <Building2 size={18} />
          </span>
          <span className="text-base font-semibold text-slate-800 leading-tight">{n}</span>
        </motion.li>
      ))}
    </ul>
  );
};

const Columnas = ({ slide }) => (
  <div className="grid gap-3">
    {slide.bloques.map((b, i) => {
      const ac = ACCENTS[b.accent];
      return (
        <motion.section key={b.titulo} {...fade(i)} className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-2.5 px-4 py-2"
               style={{ background: ac.main, color: b.accent === 'dorado' ? '#3B2A00' : '#fff' }}>
            <b.Ic size={20} />
            <h3 className="text-lg font-extrabold">{b.titulo}</h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 px-4 py-3">
            {b.puntos.map(p => (
              <li key={p.t} className="flex gap-2 min-w-0">
                <Check size={16} className="mt-1 shrink-0" style={{ color: ac.ink }} />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-slate-800 leading-snug">{p.t}</p>
                  {p.d && <p className="text-sm text-slate-500 leading-snug">{p.d}</p>}
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      );
    })}
  </div>
);

const Grupos = ({ slide }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
    {slide.grupos.map((g, i) => {
      const ac = ACCENTS[g.accent];
      return (
        <motion.section key={g.titulo} {...fade(i)} className={`${card} p-3 border-t-4`} style={{ borderTopColor: ac.main }}>
          <h3 className="text-base font-extrabold mb-1.5" style={{ color: ac.ink }}>{g.titulo}</h3>
          <ul className="grid gap-1">
            {g.puntos.map(p => (
              <li key={p} className="flex gap-2 text-sm text-slate-700 leading-snug">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ac.main }} />
                {p}
              </li>
            ))}
          </ul>
        </motion.section>
      );
    })}
  </div>
);

const Categorias = ({ slide }) => (
  <div className="grid gap-2.5">
    {slide.categorias.map((c, i) => {
      const ac = ACCENTS[c.accent];
      return (
        <motion.div key={c.titulo} {...fade(i)} className={`${card} flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 px-4 py-2.5`}>
          <p className="sm:w-32 shrink-0 sm:pt-1 text-sm font-extrabold leading-tight" style={{ color: ac.ink }}>{c.titulo}</p>
          <ul className="flex flex-wrap gap-1.5">
            {c.nombres.map(n => (
              <li key={n} className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ background: ac.soft, color: '#1e293b' }}>{n}</li>
            ))}
          </ul>
        </motion.div>
      );
    })}
  </div>
);

const Precios = ({ slide }) => {
  const ac = ACCENTS[slide.accent];
  return (
    <div className="grid grid-cols-2 gap-3">
      {slide.items.map(({ Ic, label, val }, i) => (
        <motion.div key={label} {...fade(i)} className={`${card} p-5`}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: ac.soft, color: ac.ink }}>
            <Ic size={22} />
          </span>
          <p className="text-3xl font-extrabold" style={{ color: ac.ink }}>{val}</p>
          <p className="text-base text-slate-600 mt-1">{label}</p>
        </motion.div>
      ))}
    </div>
  );
};

const CUERPOS = { timeline: Timeline, nombres: Nombres, columnas: Columnas, grupos: Grupos, categorias: Categorias, precios: Precios };

const StandSlideBody = ({ slide }) => {
  const Cuerpo = CUERPOS[slide.tipo];
  return Cuerpo ? <Cuerpo slide={slide} /> : null;
};

export default StandSlideBody;
