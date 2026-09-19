import { motion } from 'framer-motion';
import { ArrowRight, Check, HandHeart, MessageCircle, ShieldCheck } from 'lucide-react';
import { ACCENTS, BRAND, CONTACTO, Logo, MapaPresencia, usePresencia } from '../compartido.js';
import { URL_ASOCIATE, URL_PORTAL } from '../config.js';
import { BONOS, LINEAS_CREDITO, PLAN_BIENESTAR } from '../contenido.js';
import LogosEmpresas, { LOGOS_ALIADOS, LOGOS_CONVENIOS, normalizar } from './LogosEmpresas.jsx';

/* ── Piezas comunes ─────────────────────────────────────────────────────────────────────────── */

const Reveal = ({ children, delay = 0, className = '', style }) => (
  <motion.div className={className} style={style} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay }}>
    {children}
  </motion.div>
);

const Etiqueta = ({ accent = 'azul', children }) => {
  const ac = ACCENTS[accent];
  return <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ac.soft, color: ac.ink }}>{children}</span>;
};

const Seccion = ({ id, etiqueta, accent, titulo, cuerpo, fondo = '', children }) => (
  <section id={id} className={`scroll-mt-20 px-4 py-12 md:px-8 md:py-24 ${fondo}`}>
    <div className="mx-auto max-w-7xl">
      <Reveal className="mx-auto max-w-2xl text-center">
        {etiqueta && <Etiqueta accent={accent}>{etiqueta}</Etiqueta>}
        <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl">{titulo}</h2>
        {cuerpo && <p className="mt-3 text-lg leading-relaxed text-slate-600">{cuerpo}</p>}
      </Reveal>
      <div className="mt-8 md:mt-14">{children}</div>
    </div>
  </section>
);

const BotonAsociarme = ({ className = '', grande = false, fondo = BRAND.azul, texto = '#FFFFFF' }) => (
  <a href={URL_ASOCIATE} className={`inline-flex items-center justify-center gap-2.5 rounded-2xl font-extrabold shadow-lg transition hover:brightness-110 active:scale-[0.99] ${grande ? 'px-8 py-4 text-lg' : 'px-6 py-3.5 text-base'} ${className}`}
        style={{ background: fondo, color: texto, boxShadow: `0 12px 28px -10px ${fondo}99` }}>
    <HandHeart size={grande ? 22 : 20} /> Quiero asociarme <ArrowRight size={grande ? 22 : 20} />
  </a>
);

const porId = (slides, id) => slides.find((s) => s.id === id);

/* ── Portada ────────────────────────────────────────────────────────────────────────────────── */

export const Hero = ({ sitio }) => {
  const masDe = sitio?.asociados ? Math.floor(sitio.asociados / 100) * 100 : 0;
  return (
    <section id="inicio" className="relative overflow-hidden px-4 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Reveal>
            <Etiqueta accent="verde"><ShieldCheck size={16} /> Más de 50 años · Vigilada por la Superintendencia de Economía Solidaria</Etiqueta>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl">
              Tu ahorro, tu crédito y tu bienestar, en <span style={{ color: BRAND.azul }}>una sola cooperativa</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
              Créditos por libranza con descuento directo de nómina, aportes que son tuyos y beneficios todo el año para ti y tu familia.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BotonAsociarme grande />
            <a href="#beneficios" className="inline-flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-700 transition hover:border-slate-300">
              Conoce los beneficios
            </a>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="mt-8 grid gap-2.5 text-base text-slate-700">
              {['Descuento por nómina en tu empresa', 'Te asocias desde tu celular en unos 10 minutos', 'Al retirarte, recuperas el 100% de tus aportes'].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: BRAND.verde }}><Check size={13} strokeWidth={3} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <span className="absolute -right-4 -top-6 h-36 w-36 rounded-full opacity-30" style={{ background: BRAND.dorado }} aria-hidden />
          <span className="absolute -bottom-8 -left-6 h-44 w-44 rounded-full opacity-25" style={{ background: BRAND.verde }} aria-hidden />
          <div className="relative rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 md:p-12">
            <Logo className="mx-auto h-48 md:h-64" />
          </div>
          {masDe > 0 && (
            <div className="absolute -left-3 top-8 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200 md:-left-8">
              <p className="text-3xl font-extrabold leading-none" style={{ color: BRAND.azul }}>+{masDe.toLocaleString('es-CO')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">asociados</p>
            </div>
          )}
          {sitio?.empresas > 0 && (
            <div className="absolute -bottom-6 right-4 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200 md:-right-4">
              <p className="text-3xl font-extrabold leading-none" style={{ color: ACCENTS.verde.ink }}>{sitio.empresas}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">empresas con convenio</p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
};

/* ── Servicios y créditos esenciales ────────────────────────────────────────────────────────── */

export const Servicios = ({ slides }) => {
  const s = porId(slides, 'servicios');
  const creditos = s.bloques.find((b) => b.titulo === 'Créditos').puntos.slice(0, 2);
  return (
    <Seccion id="servicios" etiqueta="Servicios" accent="azul" titulo={s.titulo} cuerpo={s.cuerpo} fondo="bg-white">
      <div className="grid gap-5 md:grid-cols-3">
        {s.bloques.map(({ titulo, Ic, accent, puntos }, i) => {
          const ac = ACCENTS[accent];
          return (
            <Reveal key={titulo} delay={i * 0.08} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-6 py-5 text-white" style={{ background: ac.main }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20"><Ic size={24} /></span>
                <h3 className="text-2xl font-extrabold">{titulo}</h3>
              </div>
              <ul className="grid gap-3.5 p-6">
                {puntos.map((p) => (
                  <li key={p.t} className="flex items-start gap-2.5">
                    <Check size={18} className="mt-1 shrink-0" style={{ color: ac.ink }} strokeWidth={3} />
                    <span><span className="block text-base font-bold text-slate-800">{p.t}</span>{p.d && <span className="text-sm text-slate-500">{p.d}</span>}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-10">
        <p className="mb-4 text-center text-sm font-extrabold uppercase tracking-wider text-slate-500">Nuestros créditos esenciales</p>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {creditos.map((c) => {
            const [nombre, monto] = c.t.split(': ');
            return (
              <div key={c.t} className="rounded-3xl p-6 text-center" style={{ background: ACCENTS.verde.soft }}>
                <p className="text-base font-bold text-slate-700">{nombre}</p>
                <p className="mt-1 text-4xl font-extrabold" style={{ color: ACCENTS.verde.ink }}>{monto}</p>
                <p className="mt-1 text-sm text-slate-600">{c.d}</p>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <h3 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">Líneas de crédito</h3>
        <p className="mx-auto mt-2 max-w-xl text-center text-base text-slate-600">Descuento directo de nómina. Las condiciones de cada línea te las confirmamos al asociarte.</p>
        <ul className="mx-auto mt-6 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINEAS_CREDITO.map((l) => (
            <li key={l.t} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#F6F8FA] p-4">
              <Check size={18} className="mt-1 shrink-0" style={{ color: ACCENTS.verde.ink }} strokeWidth={3} />
              <span><span className="block text-base font-bold text-slate-800">{l.t}</span>{l.d && <span className="text-sm text-slate-500">{l.d}</span>}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </Seccion>
  );
};

/* ── Beneficios y alianzas ──────────────────────────────────────────────────────────────────── */

export const Beneficios = ({ slides }) => {
  const inc = porId(slides, 'incentivos');
  const ali = porId(slides, 'alianzas');
  return (
    <Seccion id="beneficios" etiqueta="Beneficios" accent="dorado" titulo={inc.titulo} cuerpo={inc.cuerpo}>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {inc.grupos.map((g, i) => {
          const ac = ACCENTS[g.accent];
          return (
            <Reveal key={g.titulo} delay={(i % 3) * 0.08} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-lg font-extrabold" style={{ color: ac.ink }}>{g.titulo}</h3>
              <ul className="grid gap-2 text-[15px] text-slate-700">
                {g.puntos.map((p) => (
                  <li key={p} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ac.main }} />{p}</li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-16">
        <h3 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">{PLAN_BIENESTAR.titulo}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base text-slate-600">{PLAN_BIENESTAR.cuerpo}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_BIENESTAR.lineas.map((l) => {
            const ac = ACCENTS[l.accent];
            return (
              <div key={l.t} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <p className="px-5 py-3 text-lg font-extrabold text-white" style={{ background: ac.main }}>{l.t}</p>
                <ul className="grid gap-2 p-5 text-[15px] text-slate-700">
                  {l.items.map((i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ac.main }} />{i}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal className="mt-16 rounded-[2rem] p-6 md:p-10" style={{ background: ACCENTS.dorado.soft }}>
        <h3 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">{BONOS.titulo}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base text-slate-700">{BONOS.cuerpo}</p>
        <ol className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
          {BONOS.pasos.map((p, i) => (
            <li key={p} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: BRAND.dorado }}>{i + 1}</span>
              <span className="text-base text-slate-700">{p}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center"><a href={URL_PORTAL} className="inline-flex rounded-xl px-6 py-3 text-base font-extrabold text-white shadow-sm hover:brightness-110" style={{ background: BRAND.azul }}>Ir al portal de asociados</a></p>
      </Reveal>

      <Reveal className="mt-16 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10">
        <h3 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">{ali.titulo}</h3>
        <p className="mx-auto mt-2 max-w-xl text-center text-base text-slate-600">{ali.cuerpo}</p>
        {LOGOS_ALIADOS.length > 0 && <div className="mt-6"><LogosEmpresas logos={LOGOS_ALIADOS} etiqueta="Aliados comerciales" /></div>}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ali.categorias.map((c) => {
            const ac = ACCENTS[c.accent];
            return (
              <div key={c.titulo}>
                <p className="mb-2 text-sm font-extrabold uppercase tracking-wider" style={{ color: ac.ink }}>{c.titulo}</p>
                <div className="flex flex-wrap gap-2">
                  {c.nombres.map((n) => <span key={n} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: ac.soft, color: ac.ink }}>{n}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Seccion>
  );
};

/* ── Presencia: cifras y mapa ───────────────────────────────────────────────────────────────── */

const Cifra = ({ valor, etiqueta, color }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" style={{ borderTop: `4px solid ${color}` }}>
    <p className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl" style={{ color }}>{valor}</p>
    <p className="mt-2 text-sm font-semibold text-slate-600">{etiqueta}</p>
  </div>
);

export const Presencia = ({ sitio }) => {
  const presencia = usePresencia();
  const municipios = presencia?.ciudades.length || 0;
  const departamentos = presencia?.departamentos.size || 0;
  return (
    <Seccion id="presencia" etiqueta="Presencia" accent="verde" titulo="Estamos en todo el país"
             cuerpo="Personas de todo Colombia ya hacen parte de la cooperativa: trabajan en empresas con convenio y viven en municipios de todas las regiones."
             fondo="bg-white">
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="grid grid-cols-2 gap-4">
          {sitio?.asociados > 0 && <Cifra valor={`+${(Math.floor(sitio.asociados / 100) * 100).toLocaleString('es-CO')}`} etiqueta="asociados" color={BRAND.azul} />}
          {sitio?.empresas > 0 && <Cifra valor={sitio.empresas} etiqueta="empresas con convenio" color={ACCENTS.verde.ink} />}
          {municipios > 0 && <Cifra valor={municipios} etiqueta="municipios con asociados" color={ACCENTS.dorado.ink} />}
          {departamentos > 0 && <Cifra valor={departamentos} etiqueta="departamentos" color={BRAND.bosque} />}
        </Reveal>
        <Reveal delay={0.1}><MapaPresencia /></Reveal>
      </div>
    </Seccion>
  );
};

/* ── Cómo asociarte y valor de la asociación ────────────────────────────────────────────────── */

export const Pasos = ({ slides }) => {
  const s = porId(slides, 'pasos');
  const v = porId(slides, 'asociacion');
  const ac = ACCENTS.azul;
  return (
    <Seccion id="como" etiqueta="Cómo asociarte" accent="azul" titulo={s.titulo} cuerpo={s.cuerpo}>
      <div className="grid gap-5 md:grid-cols-3">
        {s.pasos.map(({ Ic, t, d }, i) => (
          <Reveal key={t} delay={i * 0.08} className="relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <span className="absolute -top-4 left-7 flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold text-white shadow" style={{ background: ac.main }}>{i + 1}</span>
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: ac.soft, color: ac.ink }}><Ic size={28} /></span>
            <h3 className="text-xl font-extrabold text-slate-900">{t}</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600">{d}</p>
          </Reveal>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-base text-slate-500">{s.cierre}</p>

      <Reveal className="mx-auto mt-14 max-w-4xl">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
          <div className="text-center">
            <Etiqueta accent="dorado">{v.eyebrow}</Etiqueta>
            <h3 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">{v.titulo}</h3>
            <p className="mx-auto mt-2 max-w-xl text-base text-slate-600">{v.cuerpo}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {v.items.map(({ Ic, label, val }) => (
              <div key={label} className="rounded-2xl bg-[#F6F8FA] p-4 text-center">
                <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}><Ic size={20} /></span>
                <p className="text-2xl font-extrabold" style={{ color: BRAND.azul }}>{val}</p>
                <p className="mt-1 text-sm leading-snug text-slate-600">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center"><BotonAsociarme grande /></div>
        </div>
      </Reveal>
    </Seccion>
  );
};

/* ── Convenios e historia ───────────────────────────────────────────────────────────────────── */

export const Convenios = ({ slides }) => {
  const c = porId(slides, 'convenios');
  // Con logos: el deslizador, y solo se listan por nombre las empresas que aún no tienen logo
  const conLogo = new Set(LOGOS_CONVENIOS.map((l) => normalizar(l.nombre)));
  const sinLogo = c.nombres.filter((n) => !conLogo.has(normalizar(n)));
  return (
    <Seccion id="convenios" etiqueta="Convenios de libranza" accent="verde" titulo={c.titulo} cuerpo={c.cuerpo} fondo="bg-white">
      <Reveal>
        <LogosEmpresas logos={LOGOS_CONVENIOS} etiqueta="Empresas con convenio de libranza" />
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2.5">
          {sinLogo.map((n) => <span key={n} className="rounded-full border border-slate-200 bg-[#F6F8FA] px-4 py-2 text-[15px] font-semibold text-slate-700">{n}</span>)}
          <span className="rounded-full px-4 py-2 text-[15px] font-bold" style={{ background: ACCENTS.verde.soft, color: ACCENTS.verde.ink }}>y muchas más</span>
        </div>
      </Reveal>
    </Seccion>
  );
};

export const Historia = ({ slides }) => {
  const h = porId(slides, 'historia');
  return (
    <Seccion id="historia" etiqueta="Nuestra historia" accent="azul" titulo={h.titulo}>
      {/* En celular se desliza de lado para no alargar la página */}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {h.hitos.map((x, i) => (
          <Reveal key={x.anio} delay={i * 0.06} className="w-64 shrink-0 snap-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:w-auto">
            <p className="text-3xl font-extrabold" style={{ color: BRAND.azul }}>{x.anio}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{x.fecha}</p>
            <p className="mt-2 text-[15px] leading-snug text-slate-700">{x.texto}</p>
          </Reveal>
        ))}
      </div>
    </Seccion>
  );
};

/* ── Cierre ─────────────────────────────────────────────────────────────────────────────────── */

export const Cierre = () => (
  <section className="px-4 pb-16 md:px-8 md:pb-24">
    <Reveal className="mx-auto max-w-5xl">
      <div className="rounded-[2rem] px-6 py-12 text-center text-white md:px-12 md:py-14" style={{ background: `linear-gradient(135deg, ${BRAND.azul}, #0A4A72)` }}>
        <h2 className="text-3xl font-extrabold leading-tight md:text-5xl">¿Listo para asociarte?</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">Toma unos 10 minutos desde tu celular y un asesor te acompaña después.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BotonAsociarme grande fondo={BRAND.dorado} texto="#1E293B" />
          <a href={`https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información para asociarme a la Cooperativa Progresemos')}`}
             target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/60 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10">
            <MessageCircle size={22} /> Hablar con un asesor
          </a>
        </div>
      </div>
    </Reveal>
  </section>
);

export { BotonAsociarme };
