import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEmpresa } from '../../../context/EmpresaContext.jsx';

export default function EmpresaPortalLogin() {
  const { login }    = useEmpresa();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.primer_login) {
        toast('Bienvenido. Por favor cambia tu contraseña.', { icon: '🔑' });
        navigate('/portal-empresa/cambiar-password');
      } else {
        navigate('/portal-empresa');
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm bg-[#08101e] border border-[#f59e0b22] rounded-sm p-8 relative"
        style={{ boxShadow: '0 0 60px #f59e0b08' }}
      >
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#f59e0b]" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#f59e0b]" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#f59e0b44]" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#f59e0b44]" />

        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[#0d1829] border border-[#f59e0b22] rounded-sm mb-4">
            <Building2 size={24} className="text-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 8px #f59e0b66)' }} />
          </div>
          <p className="text-[#f59e0b] font-bold text-lg tracking-[4px]" style={{ textShadow: '0 0 16px #f59e0b44' }}>
            KERNEL
          </p>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-1">// PORTAL EMPRESAS</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">CORREO ELECTRÓNICO</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2.5 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">CONTRASEÑA</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2.5 pr-10 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6aacbc] hover:text-[#a0d4e0]"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-3 rounded-sm transition-all tracking-[3px]"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            INGRESAR
          </button>
        </form>

        <p className="text-center text-[#6aacbc] text-[9px] tracking-widest mt-6">
          Cooperativa Progresemos — Sistema Interno
        </p>
      </div>
    </div>
  );
}
