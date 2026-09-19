import { Clock, MessageCircle } from 'lucide-react';

const LinkExpiradoScreen = ({ datos }) => (
  <div className="min-h-screen bg-[#020617] font-mono flex flex-col items-center justify-center px-4 text-center">
    <p className="text-emerald-400/60 text-[9px] tracking-[5px] mb-6">// COOPERATIVA PROGRESEMOS</p>
    <div className="w-12 h-12 rounded-full bg-amber-900/20 border border-amber-700/40 flex items-center justify-center mb-4 mx-auto">
      <Clock size={22} className="text-amber-400" />
    </div>
    <h2 className="text-amber-400 text-lg font-bold mb-2">Link expirado</h2>
    <p className="text-slate-400 text-sm mb-1">
      {datos?.nombres ? `Hola ${datos.nombres}, este` : 'Este'} link ya no está activo.
    </p>
    <p className="text-slate-500 text-xs mb-8">
      Pídele un nuevo link a{datos?.asesor_nombre ? ` ${datos.asesor_nombre}` : ' tu asesor de Progresemos'}.
    </p>
    <a
      href={`https://wa.me/?text=${encodeURIComponent('Hola, mi link de afiliación a Cooperativa Progresemos expiró. ¿Me puedes enviar uno nuevo?')}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded transition-all"
    >
      <MessageCircle size={16} />
      Escribir a mi asesor
    </a>
  </div>
);

export default LinkExpiradoScreen;
