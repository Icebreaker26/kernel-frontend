import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';
import apiService from '../../../services/apiService.js';

const inputClass =
  'w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono';

const btnClass =
  'w-full py-2.5 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] disabled:opacity-40 text-[#00e5ff] text-[10px] tracking-[3px] rounded-sm transition-all flex items-center justify-center gap-2';

const PortalLogin = () => {
  const { login }             = useAsociado();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ codigo: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Vista: 'login' | 'registro' | 'confirmacion'
  const [vista, setVista] = useState('login');

  // Registro en 3 pasos
  const [paso, setPaso]                     = useState(1);
  const [registro, setRegistro]             = useState({ codigo: '', fecha_nacimiento: '', email: '', emailConfirm: '' });
  const [loadingRegistro, setLoadingRegistro] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await login(form.codigo, form.password);
      navigate('/portal');
    } catch (err) {
      toast.error('Código o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const avanzarPaso1 = (e) => {
    e?.preventDefault();
    if (!registro.codigo.trim()) return;
    setPaso(2);
  };

  const avanzarPaso2 = (e) => {
    e?.preventDefault();
    if (!registro.fecha_nacimiento) return;
    setPaso(3);
  };

  const handleRegistro = async (e) => {
    e?.preventDefault();
    if (!registro.email || !registro.emailConfirm) return;
    if (registro.email !== registro.emailConfirm) {
      toast.error('Los correos no coinciden');
      return;
    }
    setLoadingRegistro(true);
    try {
      await apiService.post('/asociados/registro-portal', {
        codigo:           registro.codigo.trim(),
        fecha_nacimiento: registro.fecha_nacimiento,
        email:            registro.email.trim().toLowerCase(),
      });
      setVista('confirmacion');
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Los datos de verificación no coinciden. Revisa tu fecha de nacimiento.');
        setPaso(2);
      } else if (err.response?.status === 409) {
        toast.error('Esta cédula ya tiene acceso al portal. Usa el formulario de ingreso.');
      } else if (err.response?.status === 429) {
        toast.error('Demasiados intentos. Intenta nuevamente en una hora.');
      } else {
        toast.error('No se pudo completar el registro. Inténtalo más tarde.');
      }
    } finally {
      setLoadingRegistro(false);
    }
  };

  const resetRegistro = () => {
    setRegistro({ codigo: '', fecha_nacimiento: '', email: '', emailConfirm: '' });
    setPaso(1);
    setVista('login');
  };

  return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center font-mono px-4 relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-[2]"
      >
        <div className="mb-8">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// COOPERATIVA PROGRESEMOS</p>
          <h1 className="text-2xl font-bold text-[#00e5ff] tracking-[5px]" style={{ textShadow: '0 0 22px #00e5ff55' }}>
            KERNEL
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-widest mt-1">PORTAL DEL ASOCIADO</p>
        </div>

        <div
          className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-6 relative"
          style={{ boxShadow: '0 0 40px #00e5ff08' }}
        >
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff55]" />

          <AnimatePresence mode="wait">

            {/* ── Login ─────────────────────────────────────────────────── */}
            {vista === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Número de cédula</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Ej: 1234567890"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Contraseña</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`${btnClass} mt-2`}
                    style={{ textShadow: '0 0 8px #00e5ff44' }}
                  >
                    {loading && <Loader2 size={12} className="animate-spin" />}
                    {loading ? 'VERIFICANDO...' : 'INGRESAR'}
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-[#00e5ff0d] text-center">
                  <p className="text-[#6aacbc] text-[9px] tracking-wider mb-2">¿Aún no tienes acceso?</p>
                  <button
                    onClick={() => { setVista('registro'); setPaso(1); }}
                    className="text-[#00e5ff88] hover:text-[#00e5ff] text-[9px] tracking-widest transition-colors"
                  >
                    ACTIVAR ACCESO AL PORTAL
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Registro: flujo 3 pasos ────────────────────────────────── */}
            {vista === 'registro' && (
              <motion.div key="registro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[#6aacbc] text-[8px] tracking-[3px]">// ACTIVAR ACCESO</p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`w-5 h-1 rounded-full transition-colors ${n <= paso ? 'bg-[#00e5ff]' : 'bg-[#00e5ff22]'}`}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">

                  {/* Paso 1: cédula */}
                  {paso === 1 && (
                    <motion.div key="p1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                      <div>
                        <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Número de cédula</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={registro.codigo}
                          onChange={(e) => setRegistro({ ...registro, codigo: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && avanzarPaso1()}
                          placeholder="Ej: 1234567890"
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={avanzarPaso1}
                        disabled={!registro.codigo.trim()}
                        className={btnClass}
                        style={{ textShadow: '0 0 8px #00e5ff44' }}
                      >
                        CONTINUAR
                      </button>
                    </motion.div>
                  )}

                  {/* Paso 2: fecha de nacimiento */}
                  {paso === 2 && (
                    <motion.div key="p2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                      <div>
                        <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-1">Fecha de nacimiento</label>
                        <p className="text-[#6aacbc] text-[8px] mb-2">Verificamos que eres tú con los datos que tenemos registrados.</p>
                        <input
                          type="date"
                          autoComplete="off"
                          value={registro.fecha_nacimiento}
                          onChange={(e) => setRegistro({ ...registro, fecha_nacimiento: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && avanzarPaso2()}
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={avanzarPaso2}
                        disabled={!registro.fecha_nacimiento}
                        className={btnClass}
                        style={{ textShadow: '0 0 8px #00e5ff44' }}
                      >
                        CONTINUAR
                      </button>
                      <button onClick={() => setPaso(1)} className="w-full text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest transition-colors">
                        ← VOLVER
                      </button>
                    </motion.div>
                  )}

                  {/* Paso 3: email */}
                  {paso === 3 && (
                    <motion.div key="p3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      <div>
                        <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-1">Correo electrónico</label>
                        <p className="text-[#6aacbc] text-[8px] mb-2">Te enviaremos tus credenciales de acceso aquí.</p>
                        <input
                          type="email"
                          value={registro.email}
                          onChange={(e) => setRegistro({ ...registro, email: e.target.value })}
                          placeholder="correo@ejemplo.com"
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">Confirmar correo</label>
                        <input
                          type="email"
                          value={registro.emailConfirm}
                          onChange={(e) => setRegistro({ ...registro, emailConfirm: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleRegistro()}
                          placeholder="correo@ejemplo.com"
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRegistro}
                        disabled={loadingRegistro || !registro.email || !registro.emailConfirm}
                        className={btnClass}
                        style={{ textShadow: '0 0 8px #00e5ff44' }}
                      >
                        {loadingRegistro && <Loader2 size={12} className="animate-spin" />}
                        {loadingRegistro ? 'PROCESANDO...' : 'ACTIVAR PORTAL'}
                      </button>
                      <button onClick={() => setPaso(2)} className="w-full text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest transition-colors">
                        ← VOLVER
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>

                <div className="mt-4 text-center">
                  <button onClick={resetRegistro} className="text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest transition-colors">
                    ← VOLVER AL LOGIN
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Confirmación ───────────────────────────────────────────── */}
            {vista === 'confirmacion' && (
              <motion.div key="confirmacion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
                <CheckCircle2 size={32} className="mx-auto mb-4" style={{ color: '#00e5ff', filter: 'drop-shadow(0 0 8px #00e5ff55)' }} />
                <p className="text-[#a0d4e0] text-[11px] tracking-wider mb-2">¡ACCESO ACTIVADO!</p>
                <p className="text-[#c8e8f0] text-sm leading-relaxed mb-2">
                  Revisa tu <span className="text-[#00e5ff] font-bold">correo electrónico</span>. Te enviamos tu usuario y contraseña temporal.
                </p>
                <p className="text-[#6aacbc] text-xs leading-relaxed mb-6">
                  Recuerda cambiar tu contraseña después del primer ingreso.
                </p>
                <button
                  onClick={resetRegistro}
                  className="text-[#00e5ff88] hover:text-[#00e5ff] text-[9px] tracking-widest transition-colors"
                >
                  IR AL LOGIN
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {vista === 'registro' && paso === 3 && (
          <p className="text-[#6aacbc] text-[8px] leading-relaxed text-center mt-3">
            Al activar tu acceso, aceptas la{' '}
            <Link to="/portal/politica-privacidad" target="_blank" className="text-[#00e5ff88] hover:text-[#00e5ff] transition-colors">
              Política de Privacidad
            </Link>{' '}
            de la Cooperativa Progresemos.
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default PortalLogin;
