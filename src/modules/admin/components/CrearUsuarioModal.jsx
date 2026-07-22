import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ROLES = ['usuario', 'comercial', 'financiero', 'control_interno', 'admin'];

const CrearUsuarioModal = ({ onClose, onCreado }) => {
  const [form, setForm]       = useState({ nombre: '', email: '', password: '', rol: 'usuario' });
  const [guardando, setGuardando] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const submit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await apiService.post('/admin/usuarios', form);
      toast.success(`Usuario ${form.nombre} creado`);
      onCreado();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al crear usuario');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus size={15} className="text-violet-400" />
            <h2 className="text-white font-bold text-sm">Nuevo usuario</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">Nombre completo</label>
            <input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Juan Pérez"
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="usuario@correo.com"
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">Rol</label>
            <select
              value={form.rol}
              onChange={(e) => set('rol', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {guardando && <Loader2 size={12} className="animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearUsuarioModal;
