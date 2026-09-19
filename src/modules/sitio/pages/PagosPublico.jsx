import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, MessageCircle, PlayCircle } from 'lucide-react';
import { ACCENTS, BRAND, CONTACTO } from '../compartido.js';
import { TUTORIALES_PAGO, URL_PASARELA_PAGOS } from '../config.js';
import LayoutSitio from '../components/LayoutSitio.jsx';

const WHATSAPP = `https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda con un pago en línea')}`;

const PagosPublico = () => (
  <LayoutSitio titulo="Pagos en línea" descripcion="Paga tus obligaciones con la Cooperativa Progresemos en línea, con Mi Pago Amigo. Mira los tutoriales paso a paso.">
    <section className="px-4 pb-8 pt-12 md:px-8 md:pb-12 md:pt-20">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.verde.soft, color: ACCENTS.verde.ink }}><CreditCard size={16} /> Pagos en línea</span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">Paga desde donde estés</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
          Haces tu pago en la plataforma <strong>Mi Pago Amigo</strong>, por su página web o por su aplicación. La cooperativa ya está registrada allí.
        </p>
        <a href={URL_PASARELA_PAGOS} target="_blank" rel="noopener noreferrer"
           className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-lg font-extrabold text-white shadow-md transition hover:brightness-110" style={{ background: BRAND.verde }}>
          <CreditCard size={22} /> Ir a pagar en línea <ExternalLink size={18} />
        </a>
        <p className="mt-3 text-sm text-slate-500">Se abre Mi Pago Amigo en una pestaña nueva.</p>
      </motion.div>
    </section>

    <section className="px-4 pb-16 md:px-8 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">¿Tienes dudas? Mira cómo se hace</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-base text-slate-600">Tres videos cortos para pagar sin complicaciones.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TUTORIALES_PAGO.map((v) => (
            <figure key={v.titulo} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {/* preload="none": no se descarga nada hasta que la persona le da play */}
              <video controls preload="none" playsInline className="aspect-video w-full bg-slate-900" aria-label={v.titulo}>
                <source src={v.url} type="video/mp4" />
                Tu navegador no puede reproducir este video.
              </video>
              <figcaption className="flex items-start gap-2.5 p-5 text-base font-bold text-slate-800"><PlayCircle size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.azul }} />{v.titulo}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-lg font-bold text-slate-800">¿Algo no salió bien con tu pago?</p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-3 text-base font-bold text-slate-700 transition hover:border-slate-300">
            <MessageCircle size={18} style={{ color: BRAND.verde }} /> Escríbenos al {CONTACTO.telefono}
          </a>
        </div>
      </div>
    </section>
  </LayoutSitio>
);

export default PagosPublico;
