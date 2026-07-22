import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';
import apiService from '../../../services/apiService.js';

const PortalLogin = () => {
  const { login }             = useAsociado();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ codigo: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Vista activa: 'login' | 'solicitud' | 'confirmacion'
  const [vista, setVista]           = useState('login');
  const [codigoSolicitud, setCodigoSolicitud] = useState('');
  const [loadingSolicitud, setLoadingSolicitud] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.codigo, form.password);
      navigate('/portal');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Código o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!codigoSolicitud.trim()) return;
    setLoadingSolicitud(true);
    try {
      await apiService.post('/asociados/solicitar-portal', { codigo: codigoSolicitud.trim() });
      setVista('confirmacion');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo enviar la solicitud');
    } finally {
      setLoadingSolicitud(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center font-mono px-4 relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
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
          <h1
            className="text-2xl font-bold text-[#00e5ff] tracking-[5px]"
            style={{ textShadow: '0 0 22px #00e5ff55' }}
          >
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

          <div>

              {/* ── Login ─────────────────────────────────────────────────── */}
              {vista === 'login' && (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">
                        Número de cédula
                      </label>
                      <input
                        type="text"
                        value={form.codigo}
                        onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                        placeholder="Ej: 1234567890"
                        required
                        className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] disabled:opacity-40 text-[#00e5ff] text-[10px] tracking-[3px] rounded-sm transition-all flex items-center justify-center gap-2 mt-2"
                      style={{ textShadow: '0 0 8px #00e5ff44' }}
                    >
                      {loading && <Loader2 size={12} className="animate-spin" />}
                      {loading ? 'VERIFICANDO...' : 'INGRESAR'}
                    </button>
                  </form>

                  <div className="mt-5 pt-4 border-t border-[#00e5ff0d] text-center">
                    <p className="text-[#6aacbc] text-[9px] tracking-wider mb-2">¿Aún no tienes acceso?</p>
                    <button
                      onClick={() => setVista('solicitud')}
                      className="text-[#00e5ff88] hover:text-[#00e5ff] text-[9px] tracking-widest transition-colors"
                    >
                      SOLICITAR ACCESO AL PORTAL
                    </button>
                  </div>
                </>
              )}

              {/* ── Formulario de solicitud ─────────────────────────────────── */}
              {vista === 'solicitud' && (
                <>
                  <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-4">// SOLICITAR ACCESO</p>
                  <form onSubmit={handleSolicitar} className="space-y-5">
                    <div>
                      <label className="block text-[#6aacbc] text-[9px] tracking-[2px] uppercase mb-2">
                        Número de cédula
                      </label>
                      <input
                        type="text"
                        value={codigoSolicitud}
                        onChange={(e) => setCodigoSolicitud(e.target.value)}
                        placeholder="Ej: 1234567890"
                        required
                        autoFocus
                        className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
                      />
                    </div>

                    <div className="bg-[#0a1520] border border-[#00e5ff22] rounded-sm px-4 py-4 space-y-3">
                      <p className="text-[#c8e8f0] text-sm leading-relaxed">
                        Te avisaremos por <span className="text-[#00e5ff] font-bold">WhatsApp</span> al número que tenemos registrado con tus datos de ingreso.
                      </p>
                      <p className="text-[#6aacbc] text-xs leading-relaxed border-t border-[#00e5ff11] pt-3">
                        Si tu número cambió, comunícate con la cooperativa <span className="text-[#a0d4e0]">antes</span> de enviar esta solicitud.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingSolicitud || !codigoSolicitud.trim()}
                      className="w-full py-2.5 border border-[#00e5ff44] hover:border-[#00e5ff88] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] disabled:opacity-40 text-[#00e5ff] text-[10px] tracking-[3px] rounded-sm transition-all flex items-center justify-center gap-2"
                      style={{ textShadow: '0 0 8px #00e5ff44' }}
                    >
                      {loadingSolicitud && <Loader2 size={12} className="animate-spin" />}
                      {loadingSolicitud ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setVista('login')}
                      className="text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-widest transition-colors"
                    >
                      ← VOLVER
                    </button>
                  </div>
                </>
              )}

              {/* ── Confirmación ───────────────────────────────────────────── */}
              {vista === 'confirmacion' && (
                <div className="text-center py-2">
                  <CheckCircle2 size={32} className="mx-auto mb-4" style={{ color: '#00e5ff', filter: 'drop-shadow(0 0 8px #00e5ff55)' }} />
                  <p className="text-[#a0d4e0] text-[11px] tracking-wider mb-2">SOLICITUD ENVIADA</p>
                  <p className="text-[#c8e8f0] text-sm leading-relaxed mb-2">
                    Te avisaremos por <span className="text-[#00e5ff] font-bold">WhatsApp</span> al número que tenemos registrado.
                  </p>
                  <p className="text-[#6aacbc] text-xs leading-relaxed mb-6">
                    Si tu número cambió, comunícate con la cooperativa para actualizarlo.
                  </p>
                  <button
                    onClick={() => { setVista('login'); setCodigoSolicitud(''); }}
                    className="text-[#00e5ff88] hover:text-[#00e5ff] text-[9px] tracking-widest transition-colors"
                  >
                    VOLVER AL LOGIN
                  </button>
                </div>
              )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PortalLogin;
