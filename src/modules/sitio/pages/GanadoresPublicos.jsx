import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trophy } from 'lucide-react';
import api from '../api.js';
import { ACCENTS, BRAND } from '../compartido.js';
import LayoutSitio from '../components/LayoutSitio.jsx';

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

const GanadoresPublicos = () => {
  const [ganadores, setGanadores] = useState(null);   // null = cargando

  useEffect(() => {
    let vivo = true;
    api.get('/public/ganadores')
      .then(({ data }) => vivo && setGanadores(Array.isArray(data) ? data : []))
      .catch(() => vivo && setGanadores([]));
    return () => { vivo = false; };
  }, []);

  return (
    <LayoutSitio titulo="Ganadores de los bonos" descripcion="Números ganadores de los bonos de la Cooperativa Progresemos.">
      <section className="px-4 pb-8 pt-12 md:px-8 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}><Trophy size={16} /> Bonos</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">Ganadores</h1>
          <p className="mt-4 text-lg text-slate-600">Los números que ya recibieron su premio.</p>
        </motion.div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-2xl">
          {ganadores === null && <p className="flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="animate-spin" size={20} /> Cargando…</p>}

          {ganadores?.length === 0 && <p className="py-12 text-center text-lg text-slate-500">Aún no hay ganadores registrados.</p>}

          {ganadores?.length > 0 && (
            <ul className="grid gap-3">
              {ganadores.map((g, i) => (
                <li key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <span className="flex h-14 min-w-[4.5rem] shrink-0 items-center justify-center rounded-xl px-2 font-mono text-2xl font-extrabold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>
                    #{String(g.numero).padStart(3, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base font-extrabold text-slate-900">{g.sorteo_nombre}</span>
                    {g.empresa && <span className="block break-words text-base text-slate-600">{g.empresa}</span>}
                    <span className="block text-sm font-bold capitalize" style={{ color: ACCENTS.verde.ink }}>{formatMes(g.mes_premiacion)}</span>
                  </span>
                  <Trophy size={22} className="hidden shrink-0 sm:block" style={{ color: BRAND.dorado }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </LayoutSitio>
  );
};

export default GanadoresPublicos;
