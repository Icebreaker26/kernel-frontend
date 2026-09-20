import { Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

export const ACCENT = '#14b8a6';

const TransparenciaLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-[#020617] font-mono text-[#a0d4e0]">
      <GeometricBackground />
      <div className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.01) 2px,rgba(0,229,255,0.01) 4px)' }} />
      <div className="relative z-[2] mx-auto max-w-[1100px] px-4 py-6">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => navigate('/selector')} aria-label="Volver al selector" className="text-[#6aacbc] transition-colors hover:text-[#00e5ff]">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <FileText size={18} style={{ color: ACCENT }} />
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>DOCUMENTOS PÚBLICOS</h1>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default TransparenciaLayout;
