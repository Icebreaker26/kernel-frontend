import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import apiService from '../../../services/apiService.js';
import MarcoPublico from '../../captacion/components/publico/MarcoPublico.jsx';
import { ACCENTS, BRAND, Boton, Campo, Tarjeta, inputCls } from '../components/PortalUI.jsx';

const PortalLogin = () => {
  const { login }             = useAsociado();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ codigo: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Vista: 'login' | 'registro' | 'confirmacion'
  const [vista, setVista] = useState('login');

  // Registro en 3 pasos
  const [paso, setPaso]                       = useState(1);
  const [registro, setRegistro]               = useState({ codigo: '', fecha_nacimiento: '', email: '', emailConfirm: '' });
  const [loadingRegistro, setLoadingRegistro] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await login(form.codigo, form.password);
      navigate('/portal');
    } catch (err) {
      toast.error('Código o contraseña incorrectos');
    } finally { setLoading(false); }
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
    if (registro.email !== registro.emailConfirm) { toast.error('Los correos no coinciden'); return; }
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
    } finally { setLoadingRegistro(false); }
  };

  const resetRegistro = () => {
    setRegistro({ codigo: '', fecha_nacimiento: '', email: '', emailConfirm: '' });
    setPaso(1);
    setVista('login');
  };

  const volver = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-base font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900';
  const paso_ = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

  return (
    <MarcoPublico ancho="max-w-md" centrado>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Tarjeta className="p-6 sm:p-8">
          <span className="inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: BRAND.azul }}>Portal del asociado</span>

          <AnimatePresence mode="wait">

            {/* ── Ingreso ─────────────────────────────────────────────── */}
            {vista === 'login' && (
              <motion.form key="login" onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">Ingresa a tu cuenta</h1>
                <p className="mt-2 text-base text-slate-600">Consulta tus aportes, descuentos y bonos desde donde estés.</p>

                <div className="mt-6 space-y-4">
                  <Campo etiqueta="Número de cédula">
                    <input type="text" inputMode="numeric" autoComplete="username" placeholder="Ej: 1234567890" value={form.codigo}
                           onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} />
                  </Campo>
                  <Campo etiqueta="Contraseña">
                    <input type="password" autoComplete="current-password" placeholder="••••••••" value={form.password}
                           onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
                  </Campo>
                  <Boton type="submit" bloque loading={loading} className="mt-2">{loading ? 'Verificando…' : 'Ingresar'}</Boton>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-5 text-center">
                  <p className="text-base text-slate-600">¿Aún no tienes acceso?</p>
                  <button type="button" onClick={() => { setVista('registro'); setPaso(1); }} className="mt-1 text-base font-extrabold text-[#065B8E] hover:underline">
                    Activar mi acceso al portal
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Registro en 3 pasos ─────────────────────────────────── */}
            {vista === 'registro' && (
              <motion.div key="registro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">Activa tu acceso</h1>
                <div className="mt-3 flex items-center gap-3" aria-label={`Paso ${paso} de 3`}>
                  <div className="flex flex-1 gap-1.5">
                    {[1, 2, 3].map((n) => <span key={n} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: n <= paso ? BRAND.verde : '#e2e8f0' }} />)}
                  </div>
                  <span className="text-sm font-bold text-slate-500">Paso {paso} de 3</span>
                </div>

                <AnimatePresence mode="wait">
                  {paso === 1 && (
                    <motion.form key="p1" onSubmit={avanzarPaso1} {...paso_} className="mt-6 space-y-4">
                      <Campo etiqueta="Número de cédula">
                        <input type="text" inputMode="numeric" autoComplete="off" autoFocus placeholder="Ej: 1234567890" value={registro.codigo}
                               onChange={(e) => setRegistro({ ...registro, codigo: e.target.value })} className={inputCls} />
                      </Campo>
                      <Boton type="submit" bloque disabled={!registro.codigo.trim()}>Continuar</Boton>
                    </motion.form>
                  )}

                  {paso === 2 && (
                    <motion.form key="p2" onSubmit={avanzarPaso2} {...paso_} className="mt-6 space-y-4">
                      <Campo etiqueta="Fecha de nacimiento" ayuda="Verificamos que eres tú con los datos que tenemos registrados.">
                        <input type="date" autoComplete="off" autoFocus value={registro.fecha_nacimiento}
                               onChange={(e) => setRegistro({ ...registro, fecha_nacimiento: e.target.value })} className={inputCls} />
                      </Campo>
                      <Boton type="submit" bloque disabled={!registro.fecha_nacimiento}>Continuar</Boton>
                      <button type="button" onClick={() => setPaso(1)} className={volver}><ArrowLeft size={16} /> Volver</button>
                    </motion.form>
                  )}

                  {paso === 3 && (
                    <motion.form key="p3" onSubmit={handleRegistro} {...paso_} className="mt-6 space-y-4">
                      <Campo etiqueta="Correo electrónico" ayuda="Aquí te enviaremos tus credenciales de acceso.">
                        <input type="email" autoFocus placeholder="correo@ejemplo.com" value={registro.email}
                               onChange={(e) => setRegistro({ ...registro, email: e.target.value })} className={inputCls} />
                      </Campo>
                      <Campo etiqueta="Confirma tu correo">
                        <input type="email" placeholder="correo@ejemplo.com" value={registro.emailConfirm}
                               onChange={(e) => setRegistro({ ...registro, emailConfirm: e.target.value })} className={inputCls} />
                      </Campo>
                      <Boton type="submit" bloque loading={loadingRegistro} disabled={!registro.email || !registro.emailConfirm}>
                        {loadingRegistro ? 'Procesando…' : 'Activar mi portal'}
                      </Boton>
                      <button type="button" onClick={() => setPaso(2)} className={volver}><ArrowLeft size={16} /> Volver</button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="mt-4 border-t border-slate-200 pt-4 text-center">
                  <button type="button" onClick={resetRegistro} className={volver}><ArrowLeft size={16} /> Volver al ingreso</button>
                </div>
              </motion.div>
            )}

            {/* ── Confirmación ────────────────────────────────────────── */}
            {vista === 'confirmacion' && (
              <motion.div key="confirmacion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 text-center">
                <span className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: ACCENTS.verde.soft, color: BRAND.verde }}><CheckCircle2 size={36} /></span>
                <h1 className="mt-4 text-3xl font-extrabold text-slate-900">¡Acceso activado!</h1>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Revisa tu <strong>correo electrónico</strong>: te enviamos tu usuario y una contraseña temporal.
                </p>
                <p className="mt-2 text-base text-slate-500">Recuerda cambiarla después del primer ingreso.</p>
                <Boton bloque onClick={resetRegistro} className="mt-6">Ir al ingreso</Boton>
              </motion.div>
            )}

          </AnimatePresence>
        </Tarjeta>

        {vista === 'registro' && paso === 3 && (
          <p className="mt-4 text-center text-sm leading-relaxed text-slate-500">
            Al activar tu acceso, aceptas la{' '}
            <Link to="/portal/politica-privacidad" target="_blank" className="font-bold text-[#065B8E] underline">política de privacidad</Link>{' '}
            de la Cooperativa Progresemos.
          </p>
        )}
      </motion.div>
    </MarcoPublico>
  );
};

export default PortalLogin;
