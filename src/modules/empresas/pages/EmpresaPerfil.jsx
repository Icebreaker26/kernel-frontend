import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Ticket, Banknote, Wallet, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

const COLOR = '#f97316';

const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : '—';

const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const StatCard = ({ icon: Icon, label, value, sub, color = COLOR }) => (
  <div
    className="bg-[#08101e] border rounded-sm p-4 relative overflow-hidden"
    style={{ borderColor: color + '22' }}
  >
    <div
      className="absolute inset-0 opacity-[0.05]"
      style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }}
    />
    <div className="relative">
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-[8px] tracking-[2px] uppercase" style={{ color: color + 'aa' }}>{label}</p>
        <Icon size={13} style={{ color: color + '55' }} className="shrink-0 mt-0.5" />
      </div>
      <p className="font-bold font-mono text-xl leading-none" style={{ color, textShadow: `0 0 16px ${color}44` }}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-[8px] tracking-[2px] mt-1.5 uppercase" style={{ color: color + '77' }}>{sub}</p>}
    </div>
  </div>
);

const EmpresaPerfil = () => {
  const { codigo }        = useParams();
  const navigate          = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ]         = useState('');

  useEffect(() => {
    apiService.get(`/empresas/${codigo}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Error cargando empresa'))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={22} className="animate-spin" style={{ color: COLOR }} />
    </div>
  );

  if (!data) return (
    <div className="text-center py-24">
      <p className="text-[#6aacbc] text-xs tracking-[3px]">EMPRESA NO ENCONTRADA</p>
    </div>
  );

  const { empresa, stats, asociados } = data;

  const filtrados = q.trim()
    ? asociados.filter((a) => {
        const s = q.toLowerCase();
        return (
          a.codigo.toLowerCase().includes(s) ||
          a.nombre.toLowerCase().includes(s) ||
          a.apellido.toLowerCase().includes(s)
        );
      })
    : asociados;

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/empresas')}
          className="mt-1 text-[#6aacbc] hover:text-[#f97316] transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// PERFIL DE EMPRESA</p>
          <h1 className="text-2xl font-bold tracking-wider leading-snug" style={{ color: COLOR, textShadow: `0 0 20px ${COLOR}44` }}>
            {empresa.nombre.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-[#6aacbc] text-[9px] tracking-widest">{empresa.codigo}</p>
            <span
              className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border"
              style={empresa.is_active
                ? { color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }
                : { color: '#6aacbc', borderColor: '#6aacbc33', background: '#6aacbc11' }
              }
            >
              {empresa.is_active ? 'ACTIVA' : 'RETIRADA'}
            </span>
            {empresa.fecha_ingreso && (
              <span className="text-[#6aacbc] text-[9px]">Desde {fmtFecha(empresa.fecha_ingreso)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={Users}
          label="Asociados activos"
          value={stats.asociados_activos}
          sub={`${stats.asociados_total} en total`}
          color={COLOR}
        />
        <StatCard
          icon={Ticket}
          label="Bonos activos"
          value={stats.bonos_activos}
          sub="en sorteos"
          color="#00e5ff"
        />
        <StatCard
          icon={Banknote}
          label="Aportes mensuales"
          value={fmtMoney(stats.sum_aportes)}
          sub="suma de cuotas activas"
          color="#a78bfa"
        />
        <StatCard
          icon={Wallet}
          label="Saldo a favor"
          value={fmtMoney(stats.saldo_favor)}
          sub={stats.saldo_pendiente > 0 ? `${fmtMoney(stats.saldo_pendiente)} pendiente` : 'sin pendientes'}
          color="#10b981"
        />
      </div>

      {/* Lista de asociados */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-[8px] tracking-[3px] text-[#6aacbc]">
          ASOCIADOS <span style={{ color: COLOR }}>({asociados.length})</span>
        </p>
        <div
          className="flex items-center gap-2 bg-[#08101e] border rounded-sm px-3 py-2 w-56 transition-colors"
          style={{ borderColor: COLOR + '22' }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar asociado..."
            className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono"
          />
        </div>
      </div>

      <div className="border border-[#00e5ff0d] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff08] bg-[#00e5ff04]">
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">NOMBRE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CÉDULA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">CUOTA</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">APORTE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">SALDO</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ESTADO</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6aacbc] tracking-widest text-[9px]">
                  SIN RESULTADOS
                </td>
              </tr>
            ) : filtrados.map((a, i) => {
              const saldo = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
              return (
                <motion.tr
                  key={a.codigo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.25) }}
                  onClick={() => navigate(`/asociados/${a.codigo}`)}
                  className="border-b border-[#00e5ff06] hover:bg-[#00e5ff04] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-[#a0d4e0]">{a.nombre} {a.apellido}</td>
                  <td className="px-4 py-3 text-[#6aacbc] font-mono">{a.codigo}</td>
                  <td className="px-4 py-3 text-[#6aacbc]">{labelClaseCuota(a.clase_cuota)}</td>
                  <td className="px-4 py-3 text-[#a0d4e0] font-mono">{fmtMoney(a.valor_aporte)}</td>
                  <td className="px-4 py-3 font-mono">
                    {saldo != null ? (
                      <span style={{ color: saldo < 0 ? '#10b981' : saldo > 0 ? '#ff3d3d' : '#6aacbc' }}>
                        {saldo === 0 ? 'AL DÍA' : fmtMoney(Math.abs(saldo))}
                        {saldo < 0 && <span className="text-[8px] ml-1 opacity-70">FAV</span>}
                        {saldo > 0 && <span className="text-[8px] ml-1 opacity-70">PEND</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded-sm border text-[8px] tracking-wider ${
                      a.is_active
                        ? 'bg-[#00e5ff0d] text-[#00e5ff] border-[#00e5ff22]'
                        : 'bg-[#ff3d3d0d] text-[#ff3d3d] border-[#ff3d3d22]'
                    }`}>
                      {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={13} className="text-[#6aacbc] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLOR }} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default EmpresaPerfil;
