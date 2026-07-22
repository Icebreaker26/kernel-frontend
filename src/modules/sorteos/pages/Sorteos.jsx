import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Users, ClipboardList, RefreshCw, DollarSign, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const REFRESH_INTERVAL = 60; // segundos

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n ?? 0).toLocaleString('es-CO');
const fmtCOP = (n) => `$${Number(n ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

// ── Componentes ──────────────────────────────────────────────────────────────

const MetricCard = ({ icon: Icon, valor, label, color, sub, alerta }) => (
  <div
    className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-5 py-4 relative overflow-hidden"
    style={{ boxShadow: alerta ? `0 0 24px ${color}22` : 'none' }}
  >
    <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: color + '55' }} />
    <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: color + '33' }} />
    <div className="flex items-start justify-between mb-2">
      <Icon size={13} style={{ color }} className="opacity-60 mt-0.5" />
      {alerta && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
    </div>
    <p className="text-xl font-bold mb-0.5 truncate" style={{ color, textShadow: `0 0 16px ${color}44` }}>
      {valor}
    </p>
    <p className="text-[9px] tracking-widest text-[#6aacbc]">{label}</p>
    {sub && <p className="text-[8px] text-[#4a6a7a] mt-0.5 tracking-wider">{sub}</p>}
  </div>
);

// Gráfica SVG de área — progreso acumulado por sorteo en los últimos 60 días
const AreaChart = ({ serie, sorteos }) => {
  if (!serie?.length || !sorteos?.length) return (
    <div className="flex items-center justify-center h-40 text-[#6aacbc] text-[9px] tracking-widest opacity-40">
      SIN DATOS DE ACTIVIDAD
    </div>
  );

  // Construir fechas continuas (últimos 30 días visibles)
  const hoy = new Date();
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  // Agrupar deltas por sorteo y fecha
  const deltaMap = {};
  for (const row of serie) {
    const key = `${row.sorteo_id}::${row.fecha}`;
    deltaMap[key] = (Number(row.adquisiciones) - Number(row.liberaciones));
  }

  // Calcular series acumuladas desde el inicio (no solo 30 días)
  const COLORS = ['#00e5ff', '#3b82f6', '#a855f7', '#22c55e', '#ffb700'];
  const series = sorteos.map((s, idx) => {
    // Acumulado antes del período visible
    const prevTotal = serie
      .filter(r => r.sorteo_id === s.id && r.fecha < dias[0])
      .reduce((acc, r) => acc + Number(r.adquisiciones) - Number(r.liberaciones), 0);

    let running = prevTotal;
    const puntos = dias.map(fecha => {
      running += deltaMap[`${s.id}::${fecha}`] ?? 0;
      return Math.max(0, running);
    });
    return { nombre: s.nombre, puntos, color: COLORS[idx % COLORS.length] };
  });

  const maxVal = Math.max(...series.flatMap(s => s.puntos), 1);

  const W = 600, H = 140, PAD = { t: 10, r: 10, b: 30, l: 36 };
  const gW = W - PAD.l - PAD.r;
  const gH = H - PAD.t - PAD.b;

  const xPos = (i) => PAD.l + (i / (dias.length - 1)) * gW;
  const yPos = (v) => PAD.t + gH - (v / maxVal) * gH;

  const pathD = (puntos) =>
    puntos.map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');

  const areaD = (puntos) =>
    `${pathD(puntos)} L${xPos(puntos.length - 1).toFixed(1)},${(PAD.t + gH).toFixed(1)} L${PAD.l},${(PAD.t + gH).toFixed(1)} Z`;

  // Etiquetas eje X: cada 7 días
  const xLabels = dias.filter((_, i) => i % 7 === 0 || i === dias.length - 1);

  // Líneas Y
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'monospace' }}>
      {/* Grid */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={yPos(v)} x2={PAD.l + gW} y2={yPos(v)} stroke="#00e5ff0d" strokeWidth="1" />
          <text x={PAD.l - 4} y={yPos(v) + 3} textAnchor="end" fontSize="7" fill="#4a6a7a">{v}</text>
        </g>
      ))}

      {/* Áreas y líneas */}
      {series.map(({ puntos, color, nombre }) => (
        <g key={nombre}>
          <path d={areaD(puntos)} fill={color} fillOpacity="0.05" />
          <path d={pathD(puntos)} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />
        </g>
      ))}

      {/* Eje X */}
      {xLabels.map(fecha => {
        const i = dias.indexOf(fecha);
        return (
          <text key={fecha} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="7" fill="#4a6a7a">
            {fecha.slice(5)}
          </text>
        );
      })}

      {/* Eje Y base */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + gH} stroke="#00e5ff11" strokeWidth="1" />
    </svg>
  );
};

// ── Sorteo card ───────────────────────────────────────────────────────────────

const SorteoCard = ({ sorteo, onNavigate }) => {
  const asignados      = Number(sorteo.boletos_asignados ?? 0);
  const quincenales    = Number(sorteo.boletos_quincenales ?? 0);
  const mensuales      = Number(sorteo.boletos_mensuales ?? 0);
  const pendientes     = Number(sorteo.solicitudes_pendientes ?? 0);
  const pct            = Math.round((asignados / 1000) * 100);
  const activo         = sorteo.estado === 'activo';
  const ingresoMensual = Number(sorteo.ingreso_mensual ?? 0);

  return (
    <div className="bg-[#08101e] border border-[#00e5ff11] hover:border-[#00e5ff22] rounded-sm px-5 py-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onNavigate} className="text-[#a0d4e0] text-xs font-bold tracking-widest hover:text-[#00e5ff] transition-colors text-left">
          {sorteo.nombre.toUpperCase()}
        </button>
        <div className="flex items-center gap-2">
          {pendientes > 0 && (
            <span className="bg-[#ffb700] text-black text-[8px] px-1.5 py-0.5 rounded-sm font-bold animate-pulse">
              {pendientes}
            </span>
          )}
          <span className={`flex items-center gap-1 text-[8px] px-2 py-0.5 border rounded-sm tracking-wider ${
            activo ? 'border-[#00e5ff44] text-[#00e5ff] bg-[#00e5ff11]' : 'border-[#ff3d3d44] text-[#ff3d3d] bg-[#ff3d3d11]'
          }`}>
            <Circle size={5} className={activo ? 'fill-[#00e5ff]' : 'fill-[#ff3d3d]'} />
            {sorteo.estado.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-[#0d1829] rounded-full mb-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: activo ? '#00e5ff' : '#6aacbc',
            boxShadow: activo ? '0 0 8px #00e5ff55' : 'none',
          }}
        />
      </div>
      <div className="flex justify-between mb-4">
        <span className="text-[8px] text-[#6aacbc]">{fmt(asignados)} / 1000 boletos · {pct}%</span>
        {Number(sorteo.boletos_pendientes) > 0 && (
          <span className="text-[8px] text-[#ffb700]">{sorteo.boletos_pendientes} en trámite</span>
        )}
      </div>

      {/* Desglose cuota — solo frecuencia de pago, no afecta el ingreso mensual */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-[#0a1520] rounded-sm px-3 py-2">
          <p className="text-[8px] text-[#6aacbc] tracking-wider mb-0.5">QUINCENAL</p>
          <p className="text-[#a0d4e0] text-xs font-bold">{fmt(quincenales)}</p>
          <p className="text-[8px] text-[#4a6a7a]">$1.500 × 2/mes</p>
        </div>
        <div className="flex-1 bg-[#0a1520] rounded-sm px-3 py-2">
          <p className="text-[8px] text-[#6aacbc] tracking-wider mb-0.5">MENSUAL</p>
          <p className="text-[#a0d4e0] text-xs font-bold">{fmt(mensuales)}</p>
          <p className="text-[8px] text-[#4a6a7a]">$3.000 × 1/mes</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#00e5ff08] pt-3">
        <p className="text-[9px] text-[#6aacbc] tracking-wider">INGRESO MENSUAL</p>
        <p className="text-[#22c55e] text-sm font-bold" style={{ textShadow: '0 0 12px #22c55e44' }}>
          {fmtCOP(ingresoMensual)}
        </p>
      </div>
    </div>
  );
};

// ── Dashboard principal ───────────────────────────────────────────────────────

const Sorteos = () => {
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(countdown);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const { data: d } = await apiService.get('/sorteos/dashboard');
      setData(d);
      setCountdown(REFRESH_INTERVAL);
      countdownRef.current = REFRESH_INTERVAL;
    } catch {
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial + auto-refresh
  useEffect(() => {
    cargar();
    const interval = setInterval(() => cargar(true), REFRESH_INTERVAL * 1000);
    const tick     = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(c => c - 1);
    }, 1000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [cargar]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <RefreshCw size={18} className="animate-spin text-[#00e5ff44]" />
    </div>
  );

  if (!data?.sorteos?.length) return (
    <div className="flex flex-col items-center justify-center h-full text-[#6aacbc] py-20">
      <Ticket size={40} className="mb-4 opacity-20" style={{ color: '#00e5ff' }} />
      <p className="text-[10px] tracking-[3px]">NO HAY SORTEOS REGISTRADOS</p>
      <p className="text-[9px] mt-1 tracking-widest opacity-60">crea uno nuevo con el botón superior</p>
    </div>
  );

  const { sorteos, serie } = data;

  const totalAsignados  = sorteos.reduce((s, r) => s + Number(r.boletos_asignados ?? 0), 0);
  const totalIngresos   = sorteos.reduce((s, r) => s + Number(r.ingreso_mensual ?? 0), 0);
  const totalPendientes = sorteos.reduce((s, r) => s + Number(r.solicitudes_pendientes ?? 0), 0);
  const activos         = sorteos.filter(s => s.estado === 'activo').length;
  const ocupacionGlobal = Math.round((totalAsignados / (sorteos.length * 1000)) * 100);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// PANEL DE CONTROL</p>
          <h1 className="text-[#00e5ff] font-bold text-lg tracking-[4px]" style={{ textShadow: '0 0 20px #00e5ff44' }}>
            SORTEOS
          </h1>
        </div>
        <button
          onClick={() => cargar()}
          className="flex items-center gap-2 px-3 py-1.5 border border-[#00e5ff22] bg-[#00e5ff08] hover:bg-[#00e5ff15] hover:border-[#00e5ff44] text-[#6aacbc] hover:text-[#00e5ff] text-[9px] tracking-widest rounded-sm transition-all"
        >
          <RefreshCw size={11} />
          ACTUALIZAR <span className="text-[#4a6a7a]">({countdown}s)</span>
        </button>
      </div>

      {/* Métricas globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={Ticket}        valor={sorteos.length}       label="SORTEOS"             color="#00e5ff"  sub={`${activos} activos`} />
        <MetricCard icon={Users}         valor={fmt(totalAsignados)}  label="BOLETOS ASIGNADOS"   color="#3b82f6"  sub={`${ocupacionGlobal}% ocupación`} />
        <MetricCard icon={DollarSign}    valor={fmtCOP(totalIngresos)} label="INGRESO MENSUAL"    color="#22c55e" />
        <MetricCard icon={ClipboardList} valor={totalPendientes}      label="SOLICITUDES PEND."   color="#ffb700"  alerta={totalPendientes > 0} />
      </div>

      {/* Barra ocupación global */}
      <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-widest text-[#6aacbc]">OCUPACIÓN GLOBAL</p>
          <p className="text-[#00e5ff] text-xs font-bold">{ocupacionGlobal}%</p>
        </div>
        <div className="h-2 bg-[#0d1829] rounded-full">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${ocupacionGlobal}%`,
              background: 'linear-gradient(90deg, #00e5ff, #3b82f6)',
              boxShadow: '0 0 10px #00e5ff44',
            }}
          />
        </div>
        <p className="text-[8px] text-[#4a6a7a] mt-1.5 tracking-wider">
          {fmt(totalAsignados)} de {fmt(sorteos.length * 1000)} boletos vendidos en todos los sorteos
        </p>
      </div>

      {/* Gráfica temporal */}
      <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] tracking-widest text-[#6aacbc]">AVANCE EN EL TIEMPO <span className="text-[#4a6a7a]">— últimos 30 días</span></p>
          <div className="flex items-center gap-3">
            {sorteos.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <span className="w-4 h-0.5 inline-block rounded-full" style={{ background: ['#00e5ff','#3b82f6','#a855f7','#22c55e','#ffb700'][i % 5] }} />
                <span className="text-[8px] text-[#6aacbc] tracking-wider">{s.nombre.split(' ')[1] || s.nombre}</span>
              </div>
            ))}
          </div>
        </div>
        <AreaChart serie={serie} sorteos={sorteos} />
      </div>

      {/* Cards por sorteo */}
      <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-3">// DETALLE POR SORTEO</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sorteos.map((s) => (
          <SorteoCard
            key={s.id}
            sorteo={s}
            onNavigate={() => navigate(`/sorteos/${s.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default Sorteos;
