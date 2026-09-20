import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trophy } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import MarcoPublico from '../../captacion/components/publico/MarcoPublico.jsx';
import { ACCENTS, BRAND, Tarjeta } from '../components/PortalUI.jsx';
import PieAsociado from '../components/PieAsociado.jsx';

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

// Lista pública de ganadores de los bonos (sin sesión). Vive en Kernel, junto al portal.
const GanadoresPublicos = () => {
  const [ganadores, setGanadores] = useState(null);   // null = cargando

  useEffect(() => {
    document.title = 'Ganadores de los bonos · Cooperativa Progresemos';
    apiService.get('/public/ganadores')
      .then(({ data }) => setGanadores(Array.isArray(data) ? data : []))
      .catch(() => setGanadores([]));
  }, []);

  return (
    <MarcoPublico ancho="max-w-2xl" fondoAnimado pie={<PieAsociado seguridad={false} />}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="pb-6 pt-8 text-center md:pt-12">
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}><Trophy size={16} /> Bonos</span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">Ganadores</h1>
        <p className="mt-4 text-lg text-slate-600">Los números que ya recibieron su premio.</p>
      </motion.div>

      {ganadores === null && <p className="flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="animate-spin" size={20} /> Cargando…</p>}
      {ganadores?.length === 0 && <p className="py-12 text-center text-lg text-slate-500">Aún no hay ganadores registrados.</p>}

      {ganadores?.length > 0 && (
        <ul className="grid gap-3">
          {ganadores.map((g, i) => (
            <Tarjeta key={i} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="flex h-14 min-w-[4.5rem] shrink-0 items-center justify-center rounded-xl px-2 font-mono text-2xl font-extrabold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>
                #{String(g.numero).padStart(3, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-base font-extrabold text-slate-900">{g.sorteo_nombre}</span>
                {g.empresa && <span className="block break-words text-base text-slate-600">{g.empresa}</span>}
                <span className="block text-sm font-bold capitalize" style={{ color: ACCENTS.verde.ink }}>{formatMes(g.mes_premiacion)}</span>
              </span>
              <Trophy size={22} className="hidden shrink-0 sm:block" style={{ color: BRAND.dorado }} />
            </Tarjeta>
          ))}
        </ul>
      )}
    </MarcoPublico>
  );
};

export default GanadoresPublicos;
