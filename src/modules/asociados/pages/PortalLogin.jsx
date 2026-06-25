import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAsociado } from '../../../context/AsociadoContext.jsx';

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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <p className="text-xs text-emerald-500 mb-2 tracking-widest uppercase">Portal Asociado</p>
          <h1 className="text-2xl font-bold text-white">Cooperativa Progresemos</h1>
          <p className="text-slate-500 text-sm mt-1">Consulta tu información como asociado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Número de cédula</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="Ej: 1234567890"
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Tu número de cédula"
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-slate-600 text-xs mt-6 text-center">
          ¿Eres empleado?{' '}
          <a href="/login" className="text-slate-400 hover:text-white transition-colors">
            Acceso al sistema
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default PortalLogin;
