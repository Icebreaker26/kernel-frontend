import { Outlet, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const FRASES = [
  'El ahorro de hoy es la libertad de mañana.',
  'Juntos construimos más de lo que lograríamos solos.',
  'Cada aporte cuenta. El tuyo también.',
  'Cooperar es crecer con propósito.',
  'Tu constancia es el motor de Progresemos.',
  'Un paso a la vez, siempre hacia adelante.',
  'La solidaridad es nuestra mayor fortaleza.',
  'Invertir en la cooperativa es invertir en ti mismo.',
  'Pequeños aportes, grandes sueños posibles.',
  'Gracias por ser parte de esta comunidad.',
  'El progreso real se construye entre todos.',
  'Tu participación hace la diferencia.',
  'Ahorrando hoy, aseguramos el mañana.',
  'Una cooperativa fuerte empieza con miembros comprometidos.',
  'Confía en el proceso. Confía en tu cooperativa.',
];

const fraseDelDia = () => {
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  return FRASES[seed % FRASES.length];
};

const AsociadosLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(16,185,129,0.01) 2px,rgba(16,185,129,0.01) 4px)' }} />

      <div className="relative z-[2]">
        {/* Navbar */}
        <div className="border-b border-[#10b98122] px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/selector')} className="text-[#6aacbc] hover:text-[#10b981] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <Users size={15} style={{ color: '#10b981', filter: 'drop-shadow(0 0 6px #10b98166)' }} />
          <p className="text-[#a0d4e0] text-[10px] tracking-[3px]">// ASOCIADOS · COOPERATIVA PROGRESEMOS</p>
        </div>

        {/* Frase motivacional del día */}
        <div className="border-b border-[#10b98111] px-6 py-2 text-center">
          <p className="text-[#10b98166] text-[9px] tracking-[2px] italic">"{fraseDelDia()}"</p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AsociadosLayout;
