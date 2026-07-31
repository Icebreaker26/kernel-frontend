import { Outlet, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const AsociadosLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(16,185,129,0.01) 2px,rgba(16,185,129,0.01) 4px)' }} />

      <div className="relative z-[2]">
        {/* Navbar */}
        <div className="border-b border-[#10b98122] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/selector')} className="text-[#6aacbc] hover:text-[#10b981] transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <Users size={15} className="shrink-0" style={{ color: '#10b981', filter: 'drop-shadow(0 0 6px #10b98166)' }} />
          <p className="text-[#a0d4e0] text-[9px] sm:text-[10px] tracking-[2px] sm:tracking-[3px] truncate">// ASOCIADOS · COOPERATIVA PROGRESEMOS</p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AsociadosLayout;
