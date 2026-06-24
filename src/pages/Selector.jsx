import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const modulos = [
  // Agregar módulos del sistema aquí
];

const Selector = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#020617] font-mono px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">kernel</h1>
            <p className="text-slate-500 text-xs mt-0.5">Bienvenido, {user?.nombre}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {modulos.length === 0 ? (
          <p className="text-slate-600 text-sm">No hay módulos configurados aún.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {modulos.map((mod, i) => (
              <motion.a
                key={mod.ruta}
                href={mod.ruta}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="block p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors"
              >
                <p className="text-white font-medium text-sm">{mod.nombre}</p>
                <p className="text-slate-500 text-xs mt-1">{mod.descripcion}</p>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Selector;
