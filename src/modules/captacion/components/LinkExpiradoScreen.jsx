import { Clock, MessageCircle, Phone } from 'lucide-react';
import { CONTACTO } from '../data/marca.js';
import MarcoPublico from './publico/MarcoPublico.jsx';
import { BotonSecundario } from './publico/ui.jsx';

const LinkExpiradoScreen = ({ datos }) => (
  <MarcoPublico centrado>
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Clock size={32} /></span>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Este enlace ya no está activo</h1>
      <p className="mt-2 text-lg text-slate-600">
        {datos?.nombres ? `${datos.nombres}, tu` : 'Tu'} enlace venció. Pídele uno nuevo a{datos?.asesor_nombre ? ` ${datos.asesor_nombre}` : ' tu asesor de Progresemos'}.
      </p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={`https://wa.me/?text=${encodeURIComponent('Hola, mi enlace de asociación a Cooperativa Progresemos venció. ¿Me puedes enviar uno nuevo?')}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B9C3C] px-5 py-3.5 text-base font-bold text-white hover:brightness-95"
        >
          <MessageCircle size={18} /> Escribir por WhatsApp
        </a>
        <a href={`tel:${CONTACTO.telefonoLink}`}>
          <BotonSecundario className="w-full"><Phone size={18} /> Llamar {CONTACTO.telefono}</BotonSecundario>
        </a>
      </div>
    </div>
  </MarcoPublico>
);

export default LinkExpiradoScreen;
