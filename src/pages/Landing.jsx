import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-mono px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">kernel</h1>
        <p className="text-slate-400 text-sm mb-8">Sistema de gestión — Cooperativa Progresemos</p>

        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          Iniciar sesión
        </button>
      </motion.div>
    </div>
  );
};

export default Landing;
