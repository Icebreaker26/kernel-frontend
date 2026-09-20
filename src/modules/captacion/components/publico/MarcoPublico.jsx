import { Phone, ShieldCheck } from 'lucide-react';
import { BRAND, CONTACTO } from '../../data/marca.js';
import FondoSuave from './FondoSuave.jsx';

export const Logo = ({ className = 'h-12' }) => (
  <img src="/logo-progresemos.png" alt="Cooperativa Progresemos" draggable={false} className={`${className} w-auto`} />
);

/**
 * Carcasa común de todas las pantallas públicas de captación:
 * franja de marca, logo, contenido centrado y pie de ayuda.
 */
// `pie`: reemplaza el pie de ayuda por defecto · `fondoAnimado`: manchas de color muy suaves detrás (Portal del Asociado)
const MarcoPublico = ({ children, ancho = 'max-w-2xl', derecha = null, centrado = false, pie = null, fondoAnimado = false }) => (
  <div className="relative isolate flex min-h-[100dvh] flex-col bg-[#F6F8FA] font-sans text-slate-800">
    {fondoAnimado && <FondoSuave />}
    <div className="flex h-1.5 shrink-0">
      <span className="flex-1" style={{ background: BRAND.azul }} />
      <span className="flex-1" style={{ background: BRAND.verde }} />
      <span className="flex-1" style={{ background: BRAND.dorado }} />
    </div>

    <header className={`mx-auto flex w-full ${ancho} items-center justify-between gap-3 px-4 py-3`}>
      <Logo />
      {derecha}
    </header>

    <main className={`mx-auto flex w-full ${ancho} flex-1 flex-col px-4 pb-6 ${centrado ? 'justify-center' : ''}`}>
      {children}
    </main>

    {pie ?? (
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={15} style={{ color: BRAND.verde }} /> Tus datos están protegidos · Ley 1581 de 2012
          </span>
          <a href={`tel:${CONTACTO.telefonoLink}`} className="inline-flex items-center gap-1.5 hover:text-slate-700">
            <Phone size={14} style={{ color: BRAND.verde }} /> {CONTACTO.telefono}
          </a>
        </p>
      </footer>
    )}
  </div>
);

export default MarcoPublico;
