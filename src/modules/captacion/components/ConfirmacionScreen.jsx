import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';

const ConfirmacionScreen = ({ prospecto }) => (
  <div className="min-h-screen bg-[#020617] font-mono flex flex-col items-center justify-center px-4 text-center">
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <div className="w-16 h-16 rounded-full bg-emerald-900/30 border border-emerald-600/40 flex items-center justify-center mb-6 mx-auto"
           style={{ boxShadow: '0 0 32px #10b98122' }}>
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <p className="text-emerald-400/60 text-[9px] tracking-[5px] mb-3">// COOPERATIVA PROGRESEMOS</p>
      <h2 className="text-emerald-400 text-xl font-bold mb-3"
          style={{ textShadow: '0 0 20px #10b98144' }}>
        ¡Solicitud enviada!
      </h2>
      <p className="text-slate-300 text-sm mb-2">
        {prospecto?.nombres ? `${prospecto.nombres}, tu` : 'Tu'} solicitud de vinculación está completa.
      </p>
      <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed mb-8">
        {prospecto?.asesor?.nombre
          ? `${prospecto.asesor.nombre} recibirá un aviso ahora mismo y te contactará para los siguientes pasos.`
          : 'Tu asesor recibirá un aviso ahora mismo y te contactará para los siguientes pasos.'}
      </p>
      <div className="bg-[#041a12] border border-emerald-900/30 rounded p-4 max-w-xs mx-auto text-left">
        <p className="text-emerald-400/70 text-[9px] tracking-[2px] mb-2">// PRÓXIMOS PASOS</p>
        {['Tu asesor valida la información', 'Firma del convenio y primer aporte', '¡Bienvenido a Progresemos!'].map((s, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-800/60 text-emerald-300 text-[8px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
            <span className="text-slate-400 text-xs">{s}</span>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
);

export default ConfirmacionScreen;
