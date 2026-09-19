import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, X } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';

const StepUpModal = ({ token, onVerificado, onCancelar }) => {
  const [digitos, setDigitos] = useState(['', '', '', '']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digitos];
    next[i] = val;
    setDigitos(next);
    setError('');
    if (val && i < 3) refs[i + 1].current?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs[i - 1].current?.focus();
  };

  const verificar = async () => {
    if (digitos.some(d => d === '')) return setError('Ingresa los 4 dígitos');
    setLoading(true);
    try {
      const { data } = await pub.post(`/captacion/pub/${token}/step-up`, {
        digitos: digitos.join(''),
      });
      onVerificado(data.stepup_token);
    } catch {
      setError('Verificación incorrecta. Revisa los últimos 4 dígitos de tu cédula.');
      setDigitos(['', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm bg-[#020f08] border border-emerald-900/50 rounded-lg p-6 font-mono"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span className="text-emerald-300 text-sm font-bold">Confirma que eres tú</span>
            </div>
            {onCancelar && (
              <button onClick={onCancelar} className="text-slate-600 hover:text-slate-400">
                <X size={16} />
              </button>
            )}
          </div>

          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            Ingresa los <strong className="text-emerald-400">últimos 4 dígitos</strong> de tu número de cédula para continuar.
          </p>

          <div className="flex justify-center gap-3 mb-4">
            {digitos.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                className="w-12 h-14 text-center text-xl text-emerald-300 bg-[#041a12] border border-emerald-800/60 rounded focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <p className="text-red-400 text-[10px] text-center mb-4">{error}</p>}

          <button
            onClick={verificar}
            disabled={loading || digitos.some(d => d === '')}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Verificar identidad
          </button>

          <p className="text-center text-slate-600 text-[9px] mt-3">
            Requerido por normativa SARLAFT · solo se usa una vez
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StepUpModal;
