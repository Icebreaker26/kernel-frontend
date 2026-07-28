import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingDown, AlertTriangle, Building2, Zap, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#f59e0b';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const StatCard = ({ icon: Icon, label, valor, color, alerta }) => (
  <div
    className="bg-[#08101e] border rounded-sm px-5 py-4 flex items-center gap-4 relative overflow-hidden"
    style={{ borderColor: alerta ? '#ff3d3d22' : '#f59e0b11' }}
  >
    <div className="absolute top-0 left-0 w-1/3 h-[1px]" style={{ background: alerta ? '#ff3d3d' : color, boxShadow: `0 0 6px ${alerta ? '#ff3d3d' : color}` }} />
    <div className="p-2.5 rounded-sm bg-[#0d1829]">
      <Icon size={16} style={{ color: alerta ? '#ff3d3d' : color }} />
    </div>
    <div>
      <p className="text-lg font-bold tabular-nums" style={{ color: alerta ? '#ff3d3d' : '#a0d4e0' }}>{fmt(valor)}</p>
      <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase">{label}</p>
    </div>
  </div>
);

const periodoActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(periodoActual);
  const [causing, setCausing] = useState(false);

  useEffect(() => {
    apiService.get('/patronales/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Error al cargar métricas'))
      .finally(() => setLoading(false));
  }, []);

  const handleCausar = async (e) => {
    e.preventDefault();
    if (!window.confirm(`¿Causar facturas para el período ${periodo}? Esta acción genera las cuentas de cobro para todas las empresas activas.`)) return;
    setCausing(true);
    try {
      const { data } = await apiService.post('/patronales/causar', { periodo });
      const creadas  = data.results.filter((r) => r.created).length;
      const existian = data.results.filter((r) => !r.created).length;
      toast.success(`${creadas} factura(s) generada(s)${existian ? ` · ${existian} ya existían` : ''}`);
      navigate('/patronales/facturas');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al causar');
    } finally {
      setCausing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// MÓDULO PATRONALES</p>
      <h1 className="text-2xl font-bold text-[#f59e0b] tracking-[3px] mb-8" style={{ textShadow: '0 0 20px #f59e0b44' }}>
        DASHBOARD
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#f59e0b44]" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={DollarSign}    label="Total causado"        valor={stats?.total_causado}   color={ACCENT} />
          <StatCard icon={TrendingDown}  label="Total cobrado"        valor={stats?.total_cobrado}   color="#22c55e" />
          <StatCard icon={AlertTriangle} label="En mora"              valor={stats?.total_mora}      color="#ff3d3d" alerta={parseFloat(stats?.total_mora ?? 0) > 0} />
          <StatCard
            icon={Building2}
            label="Empresas en deuda"
            valor={`${stats?.empresas_en_deuda ?? 0} empresa${stats?.empresas_en_deuda !== 1 ? 's' : ''}`}
            color={ACCENT}
            alerta={parseInt(stats?.empresas_en_deuda ?? 0) > 0}
          />
        </div>
      )}

      {/* Causar */}
      <div className="bg-[#08101e] border border-[#f59e0b22] rounded-sm p-6 max-w-md relative">
        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#f59e0b66]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#f59e0b66]" />
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-[#f59e0b]" />
          <p className="text-[#f59e0b] text-[10px] font-bold tracking-[3px]">GENERAR FACTURAS</p>
        </div>
        <p className="text-[#6aacbc] text-[10px] tracking-wider mb-4">
          Genera las cuentas de cobro para todas las empresas activas del período indicado.
          Si ya existen, se omiten (idempotente).
        </p>
        <form onSubmit={handleCausar} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">PERÍODO (YYYY-MM)</label>
            <input
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="2026-07"
              pattern="\d{4}-\d{2}"
              className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] transition-colors font-mono"
              required
            />
          </div>
          <button
            type="submit"
            disabled={causing}
            className="flex items-center gap-2 border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
          >
            {causing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            CAUSAR
          </button>
        </form>
      </div>
    </div>
  );
}
