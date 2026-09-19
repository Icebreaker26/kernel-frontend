import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { Aviso, BotonPrimario } from './publico/ui.jsx';

const LARGO = 6;

// Verificación de identidad para firmar: código de 6 dígitos que enviamos al correo del asociado.
const StepUpModal = ({ token, onVerificado, onCancelar }) => {
  const [digitos, setDigitos] = useState(Array(LARGO).fill(''));
  const [correo, setCorreo]   = useState('');
  const [enviando, setEnviando] = useState(true);
  const [espera, setEspera]   = useState(0);          // segundos hasta poder reenviar
  const [error, setError]     = useState('');
  const [sinCorreo, setSinCorreo] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const pedirCodigo = useCallback(async () => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await pub.post(`/captacion/pub/${token}/otp`);
      setCorreo(data.correo);
      setEspera(data.espera);
      setDigitos(Array(LARGO).fill(''));
      refs.current[0]?.focus();
    } catch (err) {
      const d = err.response?.data;
      if (d?.code === 'CORREO_REQUERIDO' || d?.code === 'CORREO_INVALIDO') setSinCorreo(true);
      if (err.response?.status === 429 && d?.espera) setEspera(d.espera);
      setError(d?.error || 'No pudimos enviar el código. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }, [token]);

  // Un solo envío al abrir (React StrictMode monta dos veces en desarrollo)
  const yaPedido = useRef(false);
  useEffect(() => { if (!yaPedido.current) { yaPedido.current = true; pedirCodigo(); } }, [pedirCodigo]);
  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);
  useEffect(() => {
    const cerrar = (e) => { if (e.key === 'Escape' && onCancelar) onCancelar(); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onCancelar]);

  const escribir = (i, val) => {
    const limpio = val.replace(/\D/g, '');
    if (!limpio) { setDigitos((d) => d.map((x, idx) => (idx === i ? '' : x))); return; }
    // Pegar "123456" o autocompletar del teclado reparte los dígitos entre las casillas
    const nuevos = [...digitos];
    limpio.slice(0, LARGO - i).split('').forEach((c, k) => { nuevos[i + k] = c; });
    setDigitos(nuevos);
    setError('');
    refs.current[Math.min(i + limpio.length, LARGO - 1)]?.focus();
  };

  const retroceso = (i, e) => {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const completo = digitos.every(Boolean);

  const verificar = async (e) => {
    e?.preventDefault();
    if (!completo) return setError(`Escribe los ${LARGO} dígitos.`);
    setLoading(true);
    try {
      const { data } = await pub.post(`/captacion/pub/${token}/step-up`, { codigo: digitos.join('') });
      onVerificado(data.stepup_token);
    } catch (err) {
      const status = err.response?.status;
      setError(status === 403 || status === 400
        ? (err.response?.data?.error || 'Código incorrecto.')
        : status === 429
          ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
          : 'No pudimos verificar. Revisa tu conexión e inténtalo de nuevo.');
      setDigitos(Array(LARGO).fill(''));
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
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F1F7] text-[#065B8E]"><Mail size={24} /></span>
          {onCancelar && (
            <button type="button" onClick={onCancelar} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          )}
        </div>
        <h2 id="stepup-titulo" className="text-xl font-extrabold text-slate-900">Confirma que eres tú</h2>
        <p className="mt-1 text-base text-slate-600">
          {sinCorreo
            ? 'Necesitamos tu correo para enviarte un código de verificación.'
            : enviando && !correo
              ? 'Enviándote un código por correo…'
              : <>Te enviamos un código de 6 dígitos a <strong className="break-all">{correo}</strong>. Escríbelo para poder firmar.</>}
        </p>

        {!sinCorreo && (
          <div className="my-5 flex justify-center gap-2">
            {digitos.map((d, i) => (
              <input
                key={i} ref={(el) => (refs.current[i] = el)}
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={LARGO}
                aria-label={`Dígito ${i + 1}`} value={d}
                onChange={(e) => escribir(i, e.target.value)} onKeyDown={(e) => retroceso(i, e)}
                className="h-14 w-11 rounded-xl border-2 border-slate-300 text-center text-2xl font-extrabold text-slate-900 focus:border-[#065B8E] focus:outline-none focus:ring-4 focus:ring-[#065B8E]/15"
              />
            ))}
          </div>
        )}

        {error && <Aviso tono="error" className="mb-4">{error}</Aviso>}

        {sinCorreo ? (
          <BotonPrimario type="button" onClick={onCancelar} className="w-full">Volver a mis datos</BotonPrimario>
        ) : (
          <>
            <BotonPrimario type="submit" cargando={loading} disabled={!completo} className="w-full">Verificar</BotonPrimario>
            <button type="button" onClick={pedirCodigo} disabled={enviando || espera > 0}
              className="mt-3 w-full rounded-lg py-2 text-center text-sm font-semibold text-[#065B8E] hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent">
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
            </button>
            <p className="mt-1 text-center text-sm text-slate-500">El código vence en 10 minutos. Revisa también la carpeta de spam.</p>
          </>
        )}
      </motion.form>
    </div>
  );
};

export default StepUpModal;
