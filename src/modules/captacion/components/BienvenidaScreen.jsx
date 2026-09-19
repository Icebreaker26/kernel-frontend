import { motion } from 'framer-motion';
import { Heart, TrendingUp, Shield, Gift, ChevronRight, ArrowRight } from 'lucide-react';

const beneficios = [
  { icon: TrendingUp, titulo: 'Créditos de libre inversión', desc: 'Tasas preferenciales con descuento por nómina' },
  { icon: Shield,     titulo: 'Seguros colectivos',          desc: 'Vida, accidente y más para ti y tu familia' },
  { icon: Gift,       titulo: 'Sorteos mensuales',           desc: 'Exclusivo para asociados activos' },
  { icon: Heart,      titulo: 'Ahorro programado',           desc: 'Aportes que generan rendimientos' },
];

const BienvenidaScreen = ({ prospecto, token, isStand, onComenzar }) => {
  const linkStand = `${window.location.origin}/conocenos/${token}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkStand).then(() => {
      alert('Link copiado. Pégalo en WhatsApp al empleado.');
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] font-mono px-4 py-8 flex flex-col items-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center mb-8"
      >
        <p className="text-emerald-400/60 text-[9px] tracking-[5px] mb-2">// COOPERATIVA PROGRESEMOS</p>
        <h1 className="text-2xl font-bold text-emerald-400 tracking-wide mb-1"
            style={{ textShadow: '0 0 24px #10b98155' }}>
          Hola, {prospecto?.nombres}
        </h1>
        <p className="text-slate-400 text-xs leading-relaxed">
          Tu empresa tiene convenio con nosotros.<br />
          Afiliarte toma menos de 10 minutos.
        </p>

        {/* Asesor flotante */}
        {prospecto?.asesor?.nombre && (
          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/40 rounded px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] text-white font-bold">
              {prospecto.asesor.nombre[0]}
            </div>
            <span className="text-emerald-300/80 text-[10px]">{prospecto.asesor.nombre}</span>
            <span className="text-slate-500 text-[9px]">· tu asesor</span>
          </div>
        )}
      </motion.div>

      {/* Beneficios */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md grid grid-cols-2 gap-3 mb-8"
      >
        {beneficios.map(({ icon: Icon, titulo, desc }) => (
          <div key={titulo} className="bg-[#041a12] border border-emerald-900/40 rounded p-3">
            <Icon size={16} className="text-emerald-400 mb-1.5" />
            <p className="text-emerald-300 text-[10px] font-bold mb-0.5">{titulo}</p>
            <p className="text-slate-500 text-[9px] leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>

      {/* CTA principal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md"
      >
        <button
          onClick={onComenzar}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: '0 0 24px #10b98133' }}
        >
          Comenzar mi afiliación <ArrowRight size={18} />
        </button>
        <p className="text-center text-slate-600 text-[9px] mt-3">
          Tu información está protegida · Ley 1581
        </p>
      </motion.div>

      {/* Modo stand: botón para enviar link por WhatsApp */}
      {isStand && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md mt-6 p-4 bg-slate-900/40 border border-slate-700/40 rounded"
        >
          <p className="text-slate-500 text-[9px] tracking-[2px] mb-3">// MODO ASISTIDO — STAND</p>
          <p className="text-slate-400 text-xs mb-3">
            ¿El empleado quiere terminar desde su celular? Copia el link:
          </p>
          <div className="flex gap-2">
            <code className="flex-1 text-[9px] text-emerald-400/70 bg-[#041a12] border border-emerald-900/30 rounded px-2 py-1.5 truncate">
              {linkStand}
            </code>
            <button
              onClick={copiarLink}
              className="px-3 py-1.5 border border-emerald-800/60 hover:border-emerald-600 text-emerald-400 text-[9px] tracking-[2px] rounded transition-all"
            >
              COPIAR
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BienvenidaScreen;
