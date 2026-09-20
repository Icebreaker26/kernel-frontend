import { Link } from 'react-router-dom';
import { CreditCard, Facebook, Instagram, KeyRound, Lock, MessageCircle, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { BRAND, CONTACTO } from '../../captacion/data/marca.js';
import { Logo } from '../../captacion/components/publico/MarcoPublico.jsx';

// El sitio público puede vivir en otro dominio (VITE_URL_SITIO); vacío = mismo dominio
const SITIO = (import.meta.env.VITE_URL_SITIO || '').replace(/\/$/, '');
const WHATSAPP = `https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda con el portal del asociado')}`;

const Enlace = ({ href, icon: Icon, titulo, detalle, externo = false }) => (
  <a href={href} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
     className="group flex items-start gap-3 rounded-xl p-2 -m-2 transition hover:bg-white/70">
    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#065B8E] shadow-sm ring-1 ring-slate-200 transition group-hover:ring-[#065B8E]/40"><Icon size={20} /></span>
    <span className="min-w-0">
      <span className="block text-base font-extrabold text-slate-900">{titulo}</span>
      <span className="block text-sm text-slate-500">{detalle}</span>
    </span>
  </a>
);

/**
 * Pie de todas las pantallas del Portal del Asociado: ayuda a un toque, consejos de seguridad y los textos legales.
 */
const PieAsociado = ({ seguridad = true }) => (
  <footer className="mt-8">
    <div className="flex h-1.5" aria-hidden>
      <span className="flex-1" style={{ background: BRAND.azul }} />
      <span className="flex-1" style={{ background: BRAND.verde }} />
      <span className="flex-1" style={{ background: BRAND.dorado }} />
    </div>

    <div className="bg-gradient-to-b from-[#E8F1F7] to-[#F6F8FA]">
      <div className={`mx-auto grid max-w-5xl gap-8 px-4 py-10 ${seguridad ? 'md:grid-cols-[1.1fr_1fr_1fr]' : 'md:grid-cols-[1.1fr_1fr]'} md:px-8`}>

        <div>
          <Logo className="h-14" />
          <p className="mt-4 max-w-xs text-lg font-extrabold leading-snug text-slate-900">
            La solidaridad es el <span style={{ color: BRAND.verde }}>corazón</span> de nuestra cooperativa.
          </p>
          <p className="mt-2 text-base text-slate-600">Más de 50 años acompañando a trabajadores y a sus familias.</p>
          <div className="mt-4 flex gap-2">
            <a href="https://www.facebook.com/cooperativaprogresemos" target="_blank" rel="noopener noreferrer" aria-label="Facebook de la cooperativa"
               className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-[#065B8E]"><Facebook size={20} /></a>
            <a href="https://www.instagram.com/cooprogresemos/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de la cooperativa"
               className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-[#065B8E]"><Instagram size={20} /></a>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">¿Necesitas ayuda?</h2>
          <div className="mt-4 grid gap-4">
            <Enlace href={WHATSAPP} externo icon={MessageCircle} titulo={CONTACTO.telefono} detalle="Escríbenos por WhatsApp" />
            <Enlace href={`${SITIO}/pqrs`} icon={MessageSquareWarning} titulo="Peticiones, quejas y reclamos" detalle="Radica tu solicitud y consulta su estado" />
            <Enlace href={`${SITIO}/pagos`} icon={CreditCard} titulo="Pagos en línea" detalle="Paga desde tu celular" />
          </div>
        </div>

        {seguridad && (
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Tu cuenta, segura</h2>
          <ul className="mt-4 grid gap-3 text-base text-slate-700">
            <li className="flex items-start gap-2.5"><KeyRound size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.verde }} /> Tu contraseña es personal: no la compartas con nadie.</li>
            <li className="flex items-start gap-2.5"><Lock size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.verde }} /> <span>Al terminar, pulsa <strong>Salir</strong>, sobre todo si usas un equipo compartido.</span></li>
            <li className="flex items-start gap-2.5"><ShieldCheck size={20} className="mt-0.5 shrink-0" style={{ color: BRAND.verde }} /> Tus datos están protegidos · Ley 1581 de 2012.</li>
          </ul>
        </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white/70 px-4 py-4 text-center text-sm text-slate-500">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/portal/politica-privacidad" className="font-bold hover:text-[#065B8E] hover:underline">Política de privacidad</Link>
          <span aria-hidden>·</span>
          <Link to="/portal/terminos-condiciones" className="font-bold hover:text-[#065B8E] hover:underline">Términos y condiciones</Link>
        </p>
        <p className="mt-1.5">© {new Date().getFullYear()} Cooperativa Progresemos · Vigilada por la Superintendencia de Economía Solidaria</p>
      </div>
    </div>
  </footer>
);

export default PieAsociado;
