import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserCircle, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const MODULOS = [
  { ruta: '/admin',   nombre: 'Administración', descripcion: 'Usuarios y permisos',        icon: Shield, color: 'text-violet-400' },
  { ruta: '/sorteos', nombre: 'Sorteos',         descripcion: 'Bonos y gestión de números', icon: Ticket, color: 'text-emerald-400' },
];

const Selector = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] font-mono px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">kernel</h1>
            <p className="text-slate-500 text-xs mt-0.5">Bienvenido, {user?.nombre}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <UserCircle size={14} /> Mi perfil
            </button>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-white transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {MODULOS.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.ruta}
                onClick={() => navigate(mod.ruta)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-left p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors"
              >
                <Icon size={18} className={`${mod.color} mb-3`} />
                <p className="text-white font-medium text-sm">{mod.nombre}</p>
                <p className="text-slate-500 text-xs mt-1">{mod.descripcion}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Selector;
