import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-mono">
      <p className="text-slate-600 text-6xl font-bold mb-4">404</p>
      <p className="text-slate-400 text-sm mb-6">Página no encontrada</p>
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
      >
        ← Volver
      </button>
    </div>
  );
};

export default NotFound;
