import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const MailingLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020617] font-mono text-[#a0d4e0] relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.01) 2px,rgba(0,229,255,0.01) 4px)' }} />
      <div className="relative z-[2] max-w-[1100px] mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/selector')} className="text-[#6aacbc] hover:text-[#00e5ff] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <Mail size={18} style={{ color: '#6366f1' }} />
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: '#6366f1', textShadow: '0 0 20px #6366f155' }}>
                CAMPAÑAS DE CORREO
              </h1>
            </div>
          </div>
        </div>
        <nav className="flex gap-2 mb-6">
          {[['/mailing', 'CAMPAÑAS', true], ['/mailing/contactos', 'CONTACTOS DE JORNADA', false]].map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}
              className="text-[10px] tracking-widest px-4 py-2 rounded-sm border transition-colors"
              style={({ isActive }) => isActive
                ? { color: '#6366f1', borderColor: '#6366f166', background: '#6366f118' }
                : { color: '#475569', borderColor: '#1e293b' }}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
};

export default MailingLayout;
