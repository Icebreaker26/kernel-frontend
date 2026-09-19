import { useEffect, useState } from 'react';
import { TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const TONO = { emerald: 'text-emerald-400', blue: 'text-blue-400', purple: 'text-purple-400', amber: 'text-amber-400' };

const Stat = ({ icon: Icon, label, val, color = 'emerald' }) => (
  <div className="bg-slate-900/40 border border-slate-800/60 rounded p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className={TONO[color]} />
      <p className="text-slate-500 text-[9px] tracking-[2px] uppercase">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${TONO[color]}`}>{val ?? '—'}</p>
  </div>
);

const ValoresAsesor = () => {
  const { user } = useAuth();
  const [vals, setVals] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    apiService.get(`/captacion/valores/${user.id}`)
      .then(({ data }) => setVals(data))
      .catch(() => toast.error('Error cargando valores'));
  }, [user?.id]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-emerald-400/60 text-[9px] tracking-[3px] mb-1">// CAPTACIÓN</p>
        <h1 className="text-slate-200 font-bold text-lg tracking-wider">MIS VALORES</h1>
        <p className="text-slate-500 text-xs mt-1">Estadísticas de tu actividad como asesor</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat icon={Users}        label="Total prospectos"  val={vals?.total_prospectos}  color="emerald" />
        <Stat icon={TrendingUp}   label="Vinculados"        val={vals?.vinculados}         color="blue"    />
        <Stat icon={CheckCircle2} label="Entregados"        val={vals?.entregados}         color="purple"  />
        <Stat icon={Clock}        label="En proceso"        val={vals?.en_proceso}         color="amber"   />
      </div>

      {vals?.tasa_conversion !== undefined && (
        <div className="border border-slate-800/50 rounded p-4">
          <p className="text-slate-500 text-[9px] tracking-[2px] mb-3">TASA DE CONVERSIÓN</p>
          <div className="h-2 bg-slate-800 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-500 rounded transition-all"
              style={{ width: `${Math.min(vals.tasa_conversion, 100)}%` }}
            />
          </div>
          <p className="text-emerald-400 text-xl font-bold">{vals.tasa_conversion}%</p>
          <p className="text-slate-600 text-[10px]">Prospectos que completaron la vinculación</p>
        </div>
      )}

      {vals?.ultimo_mes !== undefined && (
        <div className="mt-4 border border-slate-800/50 rounded p-4">
          <p className="text-slate-500 text-[9px] tracking-[2px] mb-2">ESTE MES</p>
          <p className="text-slate-200 text-sm">
            <strong className="text-emerald-400">{vals.ultimo_mes}</strong> nuevos prospectos
          </p>
        </div>
      )}
    </div>
  );
};

export default ValoresAsesor;
