import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const PortalLogin = () => {
  const { login }             = useAsociado();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ codigo: '', password: '' });
  const [loading, setLoading] = useState(false);

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
          <p className="text-[#1a4a55] text-[8px] tracking-[4px] mb-1">// COOPERATIVA PROGRESEMOS</p>
          <h1
            className="text-2xl font-bold text-[#00e5ff] tracking-[5px]"
            style={{ textShadow: '0 0 22px #00e5ff55' }}
          >
            KERNEL
          </h1>
          <p className="text-[#1a4a55] text-[9px] tracking-widest mt-1">PORTAL DEL ASOCIADO</p>
        </div>

        <div
          className="bg-[#08101e] border border-[#00e5ff22] rounded-sm p-6 relative"
          style={{ boxShadow: '0 0 40px #00e5ff08' }}
        >
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff55]" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff55]" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[#1a4a55] text-[9px] tracking-[2px] uppercase mb-2">
                Número de cédula
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ej: 1234567890"
                required
                className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#1a4a55] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-[#1a4a55] text-[9px] tracking-[2px] uppercase mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2.5 text-[11px] text-[#a0d4e0] placeholder-[#1a4a55] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
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
        </div>

      </motion.div>
    </div>
  );
};

export default PortalLogin;
