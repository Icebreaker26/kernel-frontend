import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, HeartHandshake, Scale, Sprout, Target, TrendingUp, Users } from 'lucide-react';
import { ACCENTS, BRAND, crearSlides } from '../compartido.js';
import LayoutSitio from '../components/LayoutSitio.jsx';
import Organigrama from '../components/Organigrama.jsx';
import { Cierre, Historia } from '../components/Secciones.jsx';

// Textos oficiales de la cooperativa (los mismos del sitio actual)
const MISION = 'Somos una Cooperativa que contribuye al mejoramiento de la calidad de vida de los Asociados y sus familias, mediante la prestación de servicios integrales, caracterizados por su calidad y oportunidad, incentivando y fortaleciendo la cultura del ahorro y la solidaridad.';
const VISION = 'En el 2028 ser una Cooperativa innovadora que crece de forma articulada con el desarrollo sostenible de los Asociados y sus familias, mediante su oferta de servicios siendo reconocida y preferida por la confianza, transparencia y solidaridad.';
const VALORES = [
  { t: 'Transparencia',              Ic: Scale,          accent: 'azul' },
  { t: 'Sentido de pertenencia',     Ic: HeartHandshake, accent: 'verde' },
  { t: 'Respeto',                    Ic: Users,          accent: 'dorado' },
  { t: 'Supervisión y mejoramiento', Ic: TrendingUp,     accent: 'bosque' },
];

const Reveal = ({ children, delay = 0, className = '' }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay }}>
    {children}
  </motion.div>
);

const Encabezado = ({ etiqueta, titulo }) => (
  <Reveal className="mx-auto max-w-2xl text-center">
    <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>{etiqueta}</span>
    <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl">{titulo}</h2>
  </Reveal>
);

const NosotrosPublico = () => {
  const slides = useMemo(() => crearSlides(), []);
  return (
    <LayoutSitio titulo="Sobre nosotros" descripcion="Misión, visión, valores, historia y organigrama de la Cooperativa Progresemos: más de 50 años acompañando a trabajadores y a sus familias.">
      <section className="px-4 pb-10 pt-12 md:px-8 md:pb-16 md:pt-20">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.verde.soft, color: ACCENTS.verde.ink }}><Sprout size={16} /> Sobre nosotros</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
            La solidaridad es el <span style={{ color: BRAND.azul }}>corazón</span> de nuestra cooperativa
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
            Nacimos como fondo de empleados del Ingenio Risaralda y hoy acompañamos a asociados y a sus familias con ahorro, crédito y bienestar.
          </p>
        </Reveal>
      </section>

      <section className="px-4 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {[['Nuestra misión', Target, MISION, 'azul'], ['Nuestra visión', Eye, VISION, 'verde']].map(([t, Ic, texto, accent], i) => {
            const ac = ACCENTS[accent];
            return (
              <Reveal key={t} delay={i * 0.08} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: ac.main }}><Ic size={28} /></span>
                <h2 className="text-2xl font-extrabold text-slate-900">{t}</h2>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">{texto}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Encabezado etiqueta="Valores corporativos" titulo="Lo que nos guía cada día" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALORES.map(({ t, Ic, accent }, i) => {
              const ac = ACCENTS[accent];
              return (
                <Reveal key={t} delay={i * 0.06} className="rounded-3xl border border-slate-200 p-6 text-center" >
                  <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: ac.soft, color: ac.ink }}><Ic size={28} /></span>
                  <h3 className="text-lg font-extrabold text-slate-900">{t}</h3>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Historia slides={slides} />

      <section className="bg-white px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <Encabezado etiqueta="Organigrama" titulo="Cómo estamos organizados" />
          <div className="mt-10"><Organigrama /></div>
        </div>
      </section>

      <div className="pt-14 md:pt-20"><Cierre /></div>
    </LayoutSitio>
  );
};

export default NosotrosPublico;
