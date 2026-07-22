import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GeometricBackground from '../components/GeometricBackground.jsx';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center font-mono px-4 relative">
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
        transition={{ duration: 0.6 }}
        className="text-center relative z-[2]"
      >
        <p className="text-[#6aacbc] text-[8px] tracking-[5px] mb-3">// COOPERATIVA PROGRESEMOS</p>

        <h1
          className="text-5xl font-bold text-[#00e5ff] tracking-[8px] mb-2"
          style={{ textShadow: '0 0 32px #00e5ff55' }}
        >
          KERNEL
        </h1>

        <p className="text-[#6aacbc] text-[9px] tracking-[3px] mb-14">
          SISTEMA DE GESTIÓN OPERATIVA
        </p>

        <div className="relative inline-block">
          <span className="absolute -top-3 -left-5 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff44]" />
          <span className="absolute -top-3 -right-5 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff44]" />
          <span className="absolute -bottom-3 -left-5 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff44]" />
          <span className="absolute -bottom-3 -right-5 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff44]" />
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-3 border border-[#00e5ff44] hover:border-[#00e5ffaa] bg-[#00e5ff08] hover:bg-[#00e5ff18] text-[#00e5ff] text-[10px] tracking-[4px] transition-all rounded-sm"
            style={{ textShadow: '0 0 10px #00e5ff44' }}
          >
            INICIAR SESIÓN
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
