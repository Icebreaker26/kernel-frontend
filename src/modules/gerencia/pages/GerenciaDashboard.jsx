import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Ticket, Banknote, AlertTriangle, ClipboardList,
  Smartphone, RefreshCw, ArrowLeft, ChevronDown, TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

// ── Utilidades ────────────────────────────────────────────────────────────────

const fmtCOP = (v) => {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

const fmtNum = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('es-CO'));

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

const KpiCard = ({ icon: Icon, valor, sub, label, color, alerta, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#08101e] border rounded-sm p-4 relative overflow-hidden flex flex-col gap-1 ${onClick ? 'cursor-pointer hover:bg-[#ffffff04] transition-colors' : ''}`}
    style={{ borderColor: alerta ? '#f59e0b44' : '#00e5ff18' }}
  >
    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: alerta ? '#f59e0b' : color }} />
    <div className="flex items-center justify-between mb-1">
      <span className="text-[8px] tracking-[2px] text-[#6aacbc]">{label}</span>
      <Icon size={13} style={{ color: alerta ? '#f59e0b' : color }} />
    </div>
    <p className="text-2xl font-bold" style={{ color: alerta ? '#f59e0b' : '#e2e8f0' }}>{valor}</p>
    {sub && <p className="text-[8px] text-[#6aacbc]">{sub}</p>}
  </div>
);

const PanelTitle = ({ children }) => (
  <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3 border-b border-[#00e5ff0a] pb-2">{children}</p>
);

// Sparkline SVG simple
const Sparkline = ({ data, colorKey = 'adquisiciones', color = '#00e5ff' }) => {
  if (!data?.length) return <div className="h-10 flex items-center justify-center text-[8px] text-[#334155]">SIN DATOS</div>;
  const vals = data.map(d => Number(d[colorKey]) || 0);
  const max = Math.max(...vals, 1);
  const w = 200; const h = 36;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1 || 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 36 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color.replace('#','')})`} />
    </svg>
  );
};

// Área chart adopción (eje X = meses, eje Y = acumulado)
const AdopcionChart = ({ serie, meta }) => {
  if (!serie?.length) return <div className="h-24 flex items-center justify-center text-[8px] text-[#334155]">SIN DATOS DE ADOPCIÓN</div>;
  const w = 300; const h = 60;
  const maxVal = Math.max(...serie.map(d => d.acumulado), meta || 1);
  const pts = serie.map((d, i) => `${(i / (serie.length - 1 || 1)) * w},${h - (d.acumulado / maxVal) * h}`).join(' ');
  const metaY = h - ((meta || 0) / maxVal) * h;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 14}`} preserveAspectRatio="none" style={{ height: 74 }}>
      <defs>
        <linearGradient id="adopGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e879f9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {meta > 0 && (
        <>
          <line x1="0" y1={metaY} x2={w} y2={metaY} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />
          <text x={w - 2} y={metaY - 2} fontSize="6" fill="#f59e0b" textAnchor="end" opacity="0.7">META</text>
        </>
      )}
      <polyline points={pts} fill="none" stroke="#e879f9" strokeWidth="1.5" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#adopGrad)" />
      {serie.map((d, i) => {
        const x = (i / (serie.length - 1 || 1)) * w;
        const y = h - (d.acumulado / maxVal) * h;
        const isLast = i === serie.length - 1;
        return isLast ? (
          <g key={i}>
            <circle cx={x} cy={y} r="2.5" fill="#e879f9" />
            <text x={x} y={y - 5} fontSize="7" fill="#e879f9" textAnchor="middle">{d.acumulado}</text>
          </g>
        ) : null;
      })}
      {/* Etiquetas eje X — primero y último */}
      {serie.length > 0 && (
        <>
          <text x={1} y={h + 10} fontSize="6" fill="#334155">{serie[0].mes}</text>
          <text x={w - 1} y={h + 10} fontSize="6" fill="#334155" textAnchor="end">{serie[serie.length - 1].mes}</text>
        </>
      )}
    </svg>
  );
};

// Barra de ocupación sorteo
const BaraOcupacion = ({ asignados, total, color = '#00e5ff' }) => {
  const pct = total > 0 ? Math.round((asignados / total) * 100) : 0;
  const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? color : '#f59e0b';
  return (
    <div>
      <div className="flex justify-between text-[8px] text-[#6aacbc] mb-1">
        <span>{fmtNum(asignados)} / {fmtNum(total)} bonos</span>
        <span style={{ color: barColor }}>{pct}% ocupado</span>
      </div>
      <div className="h-[5px] rounded-sm bg-[#0d1829]">
        <div className="h-[5px] rounded-sm transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
};

// Barra horizontal mora
const BaraMora = ({ valor, max, nombre }) => {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[8px] text-[#6aacbc] truncate" style={{ minWidth: 90, maxWidth: 90 }}>{nombre}</span>
      <div className="flex-1 h-[4px] rounded-sm bg-[#0d1829]">
        <div className="h-[4px] rounded-sm bg-[#ef4444aa]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[8px] text-[#ef4444]" style={{ minWidth: 44, textAlign: 'right' }}>{fmtCOP(valor)}</span>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const GerenciaDashboard = () => {
  const navigate  = useNavigate();
  const [data, setData]           = useState(null);
  const [cobertura, setCobertura] = useState([]);
  const [sorteoSel, setSorteoSel] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadingCob, setLoadingCob] = useState(false);
  const [ultimaActu, setUltimaActu] = useState(null);
  const intervalRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const { data: d } = await apiService.get('/gerencia/resumen');
      setData(d);
      setUltimaActu(new Date());
      // Seleccionar primer sorteo activo por defecto si no hay selección
      setSorteoSel(prev => prev ?? d.sorteos?.[0]?.id ?? null);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    intervalRef.current = setInterval(cargar, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  // Cargar cobertura cuando cambia el sorteo seleccionado
  useEffect(() => {
    if (!sorteoSel) return;
    setLoadingCob(true);
    apiService.get(`/gerencia/cobertura/${sorteoSel}`)
      .then(({ data: rows }) => setCobertura(rows))
      .catch(() => setCobertura([]))
      .finally(() => setLoadingCob(false));
  }, [sorteoSel]);

  // Export PDF
  const exportarPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('courier');
    doc.setFontSize(14);
    doc.text('CENTRO DE MANDO — GERENCIA', 14, 14);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 20);

    if (data) {
      doc.setFontSize(10);
      doc.text('ASOCIADOS', 14, 30);
      autoTable(doc, {
        startY: 33,
        head: [['Activos', 'Total', 'Con Portal', 'Adopción']],
        body: [[data.asociados.activos, data.asociados.total, data.asociados.con_portal, `${data.asociados.adopcion_pct}%`]],
        styles: { font: 'courier', fontSize: 8 },
      });

      doc.text('PATRONALES', 14, doc.lastAutoTable.finalY + 8);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 11,
        head: [['Causado', 'Cobrado', 'Mora', 'Empresas en deuda']],
        body: [[fmtCOP(data.patronales.total_causado), fmtCOP(data.patronales.total_cobrado), fmtCOP(data.patronales.total_mora), data.patronales.empresas_en_deuda]],
        styles: { font: 'courier', fontSize: 8 },
      });

      doc.text('SORTEOS', 14, doc.lastAutoTable.finalY + 8);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 11,
        head: [['Sorteo', 'Bonos asignados', 'Total', 'Ocupación', 'Ingreso mensual', 'Pendientes']],
        body: data.sorteos.map(s => [
          s.nombre,
          s.boletos_asignados,
          s.boletos_total,
          `${s.boletos_total > 0 ? Math.round((s.boletos_asignados / s.boletos_total) * 100) : 0}%`,
          fmtCOP(s.ingreso_mensual),
          s.solicitudes_pendientes,
        ]),
        styles: { font: 'courier', fontSize: 8 },
      });
    }

    doc.save(`kernel-gerencia-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] font-mono flex items-center justify-center">
      <p className="text-[#6aacbc] text-[10px] tracking-widest animate-pulse">CARGANDO CENTRO DE MANDO...</p>
    </div>
  );

  const { asociados, sorteos, sorteos_serie, patronales, logs, pendientes } = data || {};
  const maxMora = Math.max(...(patronales?.top_mora?.map(e => Number(e.mora)) || [1]), 1);
  const sorteoSelObj = sorteos?.find(s => s.id === sorteoSel);
  const serieDelSorteo = (sorteos_serie || []).filter(d => d.sorteo_id === sorteoSel);

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-[#a0d4e0] relative">
      <GeometricBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.01) 2px, rgba(0,229,255,0.01) 4px)' }} />

      <div className="relative z-[2] max-w-[1400px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/selector')} className="text-[#6aacbc] hover:text-[#00e5ff] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-[8px] tracking-[4px] text-[#6aacbc]">// COOPERATIVA PROGRESEMOS</p>
              <h1 className="text-xl font-bold tracking-[4px]" style={{ color: '#e879f9', textShadow: '0 0 20px #e879f955' }}>
                CENTRO DE MANDO
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ultimaActu && (
              <span className="text-[8px] text-[#334155]">
                Act. {ultimaActu.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => { setLoading(false); cargar(); }}
              className="flex items-center gap-1.5 text-[9px] tracking-widest text-[#6aacbc] hover:text-[#00e5ff] transition-colors border border-[#00e5ff11] hover:border-[#00e5ff33] px-3 py-1.5 rounded-sm"
            >
              <RefreshCw size={11} />
              ACTUALIZAR
            </button>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-1.5 text-[9px] tracking-widest text-[#6aacbc] hover:text-[#e879f9] transition-colors border border-[#e879f911] hover:border-[#e879f933] px-3 py-1.5 rounded-sm"
            >
              EXPORTAR PDF
            </button>
          </div>
        </div>

        {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5"
        >
          <KpiCard icon={Users}        label="ASOCIADOS ACTIVOS" color="#00e5ff"
            valor={fmtNum(asociados?.activos)} sub={`de ${fmtNum(asociados?.total)} en padrón`} />
          <KpiCard icon={Smartphone}   label="ADOPCIÓN PORTAL"   color="#e879f9"
            valor={`${asociados?.adopcion_pct ?? '—'}%`}
            sub={`${fmtNum(asociados?.con_portal)} con acceso`} />
          <KpiCard icon={Ticket}       label="INGRESOS SORTEOS"  color="#22c55e"
            valor={fmtCOP(sorteos?.reduce((s, x) => s + Number(x.ingreso_mensual || 0), 0))}
            sub="proyección mensual" />
          <KpiCard icon={Banknote}     label="CAUSADO PATRONAL"  color="#a855f7"
            valor={fmtCOP(patronales?.total_causado)}
            sub={`cobrado ${fmtCOP(patronales?.total_cobrado)}`} />
          <KpiCard icon={AlertTriangle} label="MORA PATRONAL"    color="#ef4444" alerta={patronales?.total_mora > 0}
            valor={fmtCOP(patronales?.total_mora)}
            sub={`${patronales?.empresas_en_deuda ?? 0} empresa(s)`} />
          <KpiCard icon={ClipboardList} label="SOLICITUDES PEND." color="#f59e0b" alerta={(pendientes?.bonos + pendientes?.portal) > 0}
            valor={(pendientes?.bonos ?? 0) + (pendientes?.portal ?? 0)}
            sub={`${pendientes?.bonos ?? 0} bonos · ${pendientes?.portal ?? 0} portal`} />
        </motion.div>

        {/* ── Fila principal ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Sorteos */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-[#08101e] border border-[#00e5ff18] rounded-sm p-4 relative overflow-hidden">
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00e5ff44]" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00e5ff44]" />
            <PanelTitle>SORTEOS EN VIVO</PanelTitle>
            {!sorteos?.length ? (
              <p className="text-[#334155] text-[9px] tracking-widest text-center py-6">SIN SORTEOS ACTIVOS</p>
            ) : (
              <div className="flex flex-col gap-5">
                {sorteos.map(s => (
                  <div key={s.id}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[9px] tracking-wider text-[#a0d4e0]">{s.nombre.toUpperCase()}</p>
                      <span className="text-[8px] font-bold" style={{ color: '#22c55e' }}>{fmtCOP(s.ingreso_mensual)}<span className="text-[#334155] font-normal">/mes</span></span>
                    </div>
                    <BaraOcupacion asignados={Number(s.boletos_asignados)} total={Number(s.boletos_total)} />
                    {s.solicitudes_pendientes > 0 && (
                      <p className="text-[8px] text-[#f59e0b] mt-1">⏳ {s.solicitudes_pendientes} solicitud(es) pendiente(s)</p>
                    )}
                  </div>
                ))}
                <div>
                  <p className="text-[7px] text-[#334155] mb-1 tracking-widest">ACTIVIDAD ÚLTIMOS 30 DÍAS</p>
                  <Sparkline data={serieDelSorteo} colorKey="adquisiciones" color="#00e5ff" />
                </div>
              </div>
            )}
          </motion.div>

          {/* Patronales */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#08101e] border border-[#00e5ff18] rounded-sm p-4">
            <PanelTitle>PATRONALES</PanelTitle>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { label: 'CAUSADO', valor: patronales?.total_causado, color: '#a0d4e0' },
                { label: 'COBRADO', valor: patronales?.total_cobrado, color: '#22c55e' },
                { label: 'EN MORA', valor: patronales?.total_mora,    color: '#ef4444' },
              ].map(({ label, valor, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-[#00e5ff08]">
                  <span className="text-[8px] tracking-wider text-[#6aacbc]">{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{fmtCOP(valor)}</span>
                </div>
              ))}
            </div>
            {patronales?.top_mora?.length > 0 && (
              <>
                <p className="text-[7px] tracking-[3px] text-[#6aacbc] mb-3">TOP MORA POR EMPRESA</p>
                {patronales.top_mora.map(e => (
                  <BaraMora key={e.codigo} nombre={e.nombre} valor={Number(e.mora)} max={maxMora} />
                ))}
              </>
            )}
          </motion.div>

          {/* Actividad reciente */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-[#08101e] border border-[#00e5ff18] rounded-sm p-4">
            <PanelTitle>ACTIVIDAD RECIENTE</PanelTitle>
            {!logs?.length ? (
              <p className="text-[#334155] text-[9px] tracking-widest text-center py-6">SIN ACTIVIDAD REGISTRADA</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {logs.map((log, i) => {
                  const color = log.accion?.includes('RETIRO') ? '#f59e0b'
                    : log.accion?.includes('PORTAL') ? '#22c55e'
                    : '#00e5ff';
                  return (
                    <div key={i} className="flex gap-2 py-2 border-b border-[#00e5ff06]">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div>
                        <p className="text-[8px] text-[#a0d4e0] leading-relaxed">
                          {log.accion?.replace(/_/g, ' ')}
                          {log.usuario_nombre && <span className="text-[#6aacbc]"> — {log.usuario_nombre}</span>}
                        </p>
                        {log.detalle && <p className="text-[7px] text-[#334155] truncate max-w-[200px]">{typeof log.detalle === 'string' ? log.detalle : JSON.stringify(log.detalle)}</p>}
                        <p className="text-[7px] text-[#1e293b] mt-0.5">{timeAgo(log.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Fila inferior ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Adopción portal */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#08101e] border border-[#e879f918] rounded-sm p-4 relative overflow-hidden">
            <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#e879f9' }} />
            <div className="flex items-center justify-between mb-3">
              <PanelTitle>ADOPCIÓN DEL PORTAL</PanelTitle>
              <div className="flex items-center gap-1 text-[#e879f9]">
                <TrendingUp size={12} />
                <span className="text-[9px] font-bold">{asociados?.adopcion_pct ?? '—'}%</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'ACTIVOS', valor: fmtNum(asociados?.activos), color: '#a0d4e0' },
                { label: 'CON PORTAL', valor: fmtNum(asociados?.con_portal), color: '#e879f9' },
                { label: 'SIN PORTAL', valor: fmtNum((asociados?.activos ?? 0) - (asociados?.con_portal ?? 0)), color: '#334155' },
              ].map(({ label, valor, color }) => (
                <div key={label} className="text-center">
                  <p className="text-[7px] tracking-wider text-[#6aacbc] mb-1">{label}</p>
                  <p className="text-lg font-bold" style={{ color }}>{valor}</p>
                </div>
              ))}
            </div>
            {/* Barra de adopción */}
            <div className="mb-4">
              <div className="h-2 rounded-sm bg-[#0d1829] overflow-hidden">
                <div className="h-2 rounded-sm transition-all" style={{
                  width: `${asociados?.adopcion_pct ?? 0}%`,
                  background: 'linear-gradient(90deg, #a855f7, #e879f9)',
                }} />
              </div>
            </div>
            <p className="text-[7px] tracking-[3px] text-[#6aacbc] mb-2">CRECIMIENTO HISTÓRICO</p>
            <AdopcionChart serie={asociados?.adopcion_serie} meta={asociados?.activos} />
          </motion.div>

          {/* Cobertura por empresa */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-[#08101e] border border-[#00e5ff18] rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <PanelTitle>COBERTURA POR EMPRESA</PanelTitle>
              {/* Selector de sorteo */}
              {sorteos?.length > 0 && (
                <div className="relative">
                  <select
                    value={sorteoSel ?? ''}
                    onChange={e => setSorteoSel(e.target.value)}
                    className="appearance-none bg-[#0d1829] border border-[#00e5ff22] text-[#6aacbc] text-[8px] tracking-wider pl-2 pr-6 py-1 rounded-sm focus:outline-none focus:border-[#00e5ff55] cursor-pointer"
                  >
                    {sorteos.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#6aacbc] pointer-events-none" />
                </div>
              )}
            </div>
            {loadingCob ? (
              <p className="text-[#334155] text-[9px] tracking-widest text-center py-6 animate-pulse">CARGANDO...</p>
            ) : !cobertura.length ? (
              <p className="text-[#334155] text-[9px] tracking-widest text-center py-6">SIN DATOS</p>
            ) : (
              <div className="overflow-y-auto max-h-52 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {cobertura.slice(0, 20).map(emp => {
                  const pct = emp.asociados_activos > 0
                    ? Math.round((emp.bonos_asignados / emp.asociados_activos) * 100)
                    : 0;
                  const barColor = pct >= 80 ? '#22c55e88' : pct >= 50 ? '#00e5ff88' : pct >= 20 ? '#f59e0b88' : '#ef444488';
                  const txtColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#00e5ff' : pct >= 20 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={emp.codigo} className="flex items-center gap-2 mb-2">
                      <span className="text-[7px] text-[#6aacbc] truncate" style={{ minWidth: 90, maxWidth: 90 }} title={emp.nombre}>
                        {emp.nombre}
                      </span>
                      <div className="flex-1 h-[4px] rounded-sm bg-[#0d1829]">
                        <div className="h-[4px] rounded-sm" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-[7px] font-bold" style={{ color: txtColor, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                      <span className="text-[7px] text-[#334155]">{emp.bonos_asignados}/{emp.asociados_activos}</span>
                    </div>
                  );
                })}
                {cobertura.length > 20 && (
                  <p className="text-[7px] text-[#334155] text-center mt-2">+{cobertura.length - 20} más</p>
                )}
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default GerenciaDashboard;
