import { Link } from 'react-router-dom';
import { Facebook, Globe, Instagram, MessageCircle, Phone } from 'lucide-react';
import { BRAND, CONTACTO, Logo } from '../compartido.js';
import { RUTAS, URL_ASOCIATE, URL_PAGOS, URL_POLITICA_PRIVACIDAD, URL_PORTAL, URL_TERMINOS } from '../config.js';

// Solo canales generales de la cooperativa. No se publican nombres ni teléfonos personales del equipo.
const WHATSAPP = `https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información para asociarme a la Cooperativa Progresemos')}`;
const WHATSAPP_PQRS = 'https://wa.me/573216994435';

const Pie = () => (
  <footer id="contacto" className="border-t border-slate-200 bg-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
      <div>
        <Logo className="h-14" />
        <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
          La solidaridad es el corazón de nuestra cooperativa. Más de 50 años acompañando a trabajadores y a sus familias.
        </p>
        <div className="mt-4 flex gap-2">
          <a href="https://www.facebook.com/cooperativaprogresemos" target="_blank" rel="noopener noreferrer" aria-label="Facebook de la cooperativa"
             className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-[#065B8E]"><Facebook size={20} /></a>
          <a href="https://www.instagram.com/cooprogresemos/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de la cooperativa"
             className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-[#065B8E]"><Instagram size={20} /></a>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Escríbenos</h2>
        <ul className="mt-4 grid gap-3 text-base text-slate-700">
          <li>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-[#065B8E]">
              <MessageCircle size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.verde }} />
              <span><strong className="block">{CONTACTO.telefono}</strong><span className="text-sm text-slate-500">Afiliaciones, créditos y estados de cuenta</span></span>
            </a>
          </li>
          <li>
            <a href={WHATSAPP_PQRS} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-[#065B8E]">
              <Phone size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.verde }} />
              <span><strong className="block">(321) 699 4435</strong><span className="text-sm text-slate-500">Peticiones, quejas y reclamos (PQRS)</span></span>
            </a>
          </li>
          <li className="flex items-center gap-2.5"><Globe size={20} className="shrink-0" style={{ color: BRAND.verde }} /> {CONTACTO.web}</li>
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Para asociados</h2>
        <ul className="mt-4 grid gap-2.5 text-base text-slate-700">
          <li><a href={URL_PORTAL} className="hover:text-[#065B8E]">Portal de asociados</a></li>
          <li><a href={URL_PAGOS} className="hover:text-[#065B8E]">Pagos en línea</a></li>
          <li><a href={URL_ASOCIATE} className="hover:text-[#065B8E]">Asociarme</a></li>
          <li><Link to={RUTAS.nosotros} className="hover:text-[#065B8E]">Sobre nosotros</Link></li>
          <li><Link to={RUTAS.transparencia} className="hover:text-[#065B8E]">Transparencia</Link></li>
          <li><Link to={RUTAS.pqrs} className="hover:text-[#065B8E]">PQRS: peticiones, quejas y reclamos</Link></li>
          <li><a href={URL_POLITICA_PRIVACIDAD} className="hover:text-[#065B8E]">Política de privacidad</a></li>
          <li><a href={URL_TERMINOS} className="hover:text-[#065B8E]">Términos y condiciones</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-200 bg-[#F6F8FA] px-4 py-4 text-center text-sm text-slate-500">
      © {new Date().getFullYear()} Cooperativa Progresemos · Vigilada por la Superintendencia de Economía Solidaria
    </div>
  </footer>
);

export default Pie;
