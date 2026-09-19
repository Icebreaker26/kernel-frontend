import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { Aviso, BotonPrimario } from './publico/ui.jsx';

const StepUpModal = ({ token, onVerificado, onCancelar }) => {
  const [digitos, setDigitos] = useState(['', '', '', '']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    const cerrar = (e) => { if (e.key === 'Escape' && onCancelar) onCancelar(); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onCancelar]);

  const escribir = (i, val) => {
    const limpio = val.replace(/\D/g, '');
    if (!limpio) { setDigitos(d => d.map((x, idx) => (idx === i ? '' : x))); return; }
    // Pegar "1234" o autocompletar del teclado reparte los dígitos entre las casillas
    const nuevos = [...digitos];
    limpio.slice(0, 4 - i).split('').forEach((c, k) => { nuevos[i + k] = c; });
    setDigitos(nuevos);
    setError('');
    refs.current[Math.min(i + limpio.length, 3)]?.focus();
  };

  const retroceso = (i, e) => {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const completo = digitos.every(Boolean);

  const verificar = async (e) => {
    e?.preventDefault();
    if (!completo) return setError('Escribe los 4 dígitos.');
    setLoading(true);
    try {
      const { data } = await pub.post(`/captacion/pub/${token}/step-up`, { digitos: digitos.join('') });
      onVerificado(data.stepup_token);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'No coinciden. Revisa los últimos 4 dígitos de tu documento.'
        : err.response?.status === 429
          ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
          : 'No pudimos verificar. Revisa tu conexión e inténtalo de nuevo.');
      setDigitos(['', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="stepup-titulo">
      <motion.form
        onSubmit={verificar}
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 font-sans shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F1F7] text-[#065B8E]"><ShieldCheck size={24} /></span>
          {onCancelar && (
            <button type="button" onClick={onCancelar} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          )}
        </div>
        <h2 id="stepup-titulo" className="text-xl font-extrabold text-slate-900">Confirma que eres tú</h2>
        <p className="mt-1 text-base text-slate-600">
          Escribe los <strong>últimos 4 dígitos</strong> de tu documento para poder firmar.
        </p>

        <div className="my-5 flex justify-center gap-3">
          {digitos.map((d, i) => (
            <input
              key={i} ref={el => (refs.current[i] = el)}
              type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4}
              aria-label={`Dígito ${i + 1}`} value={d}
              onChange={e => escribir(i, e.target.value)} onKeyDown={e => retroceso(i, e)}
              className="h-16 w-14 rounded-xl border-2 border-slate-300 text-center text-2xl font-extrabold text-slate-900 focus:border-[#065B8E] focus:outline-none focus:ring-4 focus:ring-[#065B8E]/15"
            />
          ))}
        </div>

        {error && <Aviso tono="error" className="mb-4">{error}</Aviso>}

        <BotonPrimario type="submit" cargando={loading} disabled={!completo} className="w-full">Verificar</BotonPrimario>
        <p className="mt-3 text-center text-sm text-slate-500">Es un requisito de seguridad y solo se pide una vez.</p>
      </motion.form>
    </div>
  );
};

export default StepUpModal;
