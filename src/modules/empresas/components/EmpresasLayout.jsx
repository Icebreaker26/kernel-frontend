import { Outlet, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const EmpresasLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(249,115,22,0.01) 2px,rgba(249,115,22,0.01) 4px)' }}
      />
      <div className="relative z-[2]">
        <div className="border-b border-[#f9731622] px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/selector')} className="text-[#6aacbc] hover:text-[#f97316] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <Building2 size={15} style={{ color: '#f97316', filter: 'drop-shadow(0 0 6px #f9731666)' }} />
          <p className="text-[#a0d4e0] text-[10px] tracking-[3px]">// EMPRESAS · COOPERATIVA PROGRESEMOS</p>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default EmpresasLayout;
