import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Ticket, AlertTriangle, ClipboardList, Heart, ShieldCheck,
  Smartphone, RefreshCw, ArrowLeft, ChevronDown, TrendingUp, Landmark, Info,
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
      <span className="text-[10px] tracking-[2px] text-[#6aacbc]">{label}</span>
      <Icon size={14} style={{ color: alerta ? '#f59e0b' : color }} />
    </div>
    <p className="text-2xl font-bold" style={{ color: alerta ? '#f59e0b' : '#e2e8f0' }}>{valor}</p>
    {sub && <p className="text-xs text-[#6aacbc] leading-snug">{sub}</p>}
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

// Recaudo mensual — últimos 12 meses (reutilizable para bienestar y seguros)
const BienestarChart = ({ serie, color = '#22c55e' }) => {
  const [tip, setTip] = useState(null);
  if (!serie?.length) return <div className="h-24 flex items-center justify-center text-xs text-[#334155]">SIN DATOS</div>;

  const fmtMes = (ym) => { const [y, m] = ym.split('-'); return `${m}/${String(y).slice(2)}`; };
  const w = 560; const h = 80; const padL = 60; const totalW = w + padL;
  const maxRec = Math.max(...serie.map(d => Number(d.recaudo)), 1);

  const pts = serie.map((d, i) => {
    const x = padL + (i / (serie.length - 1 || 1)) * w;
    const y = h - (Number(d.recaudo) / maxRec) * h;
    return { x, y, ...d };
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${h} ` + polyPts + ` ${pts[pts.length - 1].x},${h}`;

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${h + 20}`} preserveAspectRatio="none" style={{ height: 130 }}
      onMouseLeave={() => setTip(null)}>
      <defs>
        <linearGradient id={`recGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y-axis */}
      {[maxRec, maxRec / 2].map((v, i) => (
        <text key={i} x={padL - 4} y={i === 0 ? 8 : h / 2 + 4} fontSize="8" fill="#475569" textAnchor="end">{fmtCOP(v)}</text>
      ))}
      <line x1={padL} y1={0} x2={padL} y2={h} stroke="#1e293b" strokeWidth="1" />

      {/* Área rellena */}
      <polygon points={area} fill={`url(#recGrad-${color.replace('#','')})`} />

      {/* Línea */}
      <polyline points={polyPts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.8" />

      {/* Puntos + etiquetas X + hover */}
      {pts.map((p, i) => (
        <g key={p.mes} onMouseEnter={() => setTip({ ...p, i })}>
          <rect x={p.x - 12} y={0} width={24} height={h + 20} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={tip?.i === i ? 4 : 2.5}
            fill={tip?.i === i ? color : '#0d1829'} stroke={color} strokeWidth="1.5" />
          <text x={p.x} y={h + 13} fontSize="7.5" fill="#475569" textAnchor="middle">{fmtMes(p.mes)}</text>
        </g>
      ))}

      {/* Tooltip */}
      {tip && (() => {
        const tw = 150; const th = 42;
        const tx = Math.min(tip.x - tw / 2, totalW - tw - 2);
        const ty = Math.max(2, tip.y - th - 8);
        return (
          <g>
            <rect x={tx} y={ty} width={tw} height={th} rx="3" fill="#0d1829" stroke={`${color}44`} strokeWidth="1" />
            <text x={tx + 8} y={ty + 14} fontSize="8" fill="#475569">RECAUDO</text>
            <text x={tx + tw - 8} y={ty + 14} fontSize="9.5" fill={color} textAnchor="end" fontWeight="bold">{fmtCOP(tip.recaudo)}</text>
            <text x={tx + 8} y={ty + 30} fontSize="8" fill="#475569">ASOCIADOS</text>
            <text x={tx + tw - 8} y={ty + 30} fontSize="9.5" fill="#6aacbc" textAnchor="end" fontWeight="bold">{tip.asociados}</text>
          </g>
        );
      })()}
    </svg>
  );
};

// Distribución de plazos
const PLAZO_COLORS = ['#475569', '#6aacbc', '#22c55e', '#f97316', '#e879f9'];
const PlazosChart = ({ data }) => {
  const [tip, setTip] = useState(null);
  if (!data?.length) return (
    <div className="h-24 flex items-center justify-center text-xs text-[#334155]">SIN DATOS DE PLAZO</div>
  );

  const totalSaldo = data.reduce((s, r) => s + Number(r.saldo), 0) || 1;
  const totalCreditos = data.reduce((s, r) => s + r.creditos, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" onMouseLeave={() => setTip(null)}>
      {/* Barras horizontales — saldo */}
      <div>
        <p className="text-xs tracking-[3px] text-[#6aacbc] mb-3">SALDO POR PLAZO</p>
        <div className="space-y-4">
          {data.map((r) => {
            const pct = Math.round((Number(r.saldo) / totalSaldo) * 100);
            const color = PLAZO_COLORS[r.plazo_id] ?? '#22c55e';
            return (
              <div key={r.plazo_id}
                className="cursor-default"
                onMouseEnter={() => setTip(r)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold" style={{ color }}>{r.plazo}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#475569]">{r.creditos} crédito{r.creditos !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-bold text-[#a0d4e0]">{fmtCOP(r.saldo)}</span>
                    <span className="text-xs font-bold text-[#334155]">{pct}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-[#0d1829] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: tip?.plazo_id === r.plazo_id ? 1 : 0.6 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del plazo seleccionado + donut visual */}
      <div className="flex flex-col justify-center">
        {tip ? (
          <div className="bg-[#0d1829] border rounded-sm p-4 space-y-2" style={{ borderColor: PLAZO_COLORS[tip.plazo_id] + '44' }}>
            <p className="text-sm font-bold mb-1" style={{ color: PLAZO_COLORS[tip.plazo_id] }}>{tip.plazo}</p>
            {[
              { label: 'CRÉDITOS', valor: `${tip.creditos}` },
              { label: 'SALDO TOTAL', valor: fmtCOP(tip.saldo) },
              { label: 'INTERESES/MES', valor: fmtCOP(tip.intereses_mensual) },
              { label: 'CUOTAS PROM.', valor: tip.cuotas_promedio ? `${tip.cuotas_promedio} meses` : '—' },
              { label: '% DE CARTERA', valor: `${Math.round(Number(tip.saldo) / totalSaldo * 100)}%` },
              { label: '% DE CRÉDITOS', valor: `${Math.round(tip.creditos / totalCreditos * 100)}%` },
            ].map(({ label, valor }) => (
              <div key={label} className="flex justify-between items-center border-b border-[#1e293b] py-2 last:border-0">
                <span className="text-xs tracking-wider text-[#475569]">{label}</span>
                <span className="text-base font-bold text-[#a0d4e0]">{valor}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            {data.map(r => (
              <div key={r.plazo_id} className="flex items-center gap-2 w-full max-w-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PLAZO_COLORS[r.plazo_id] }} />
                <span className="text-xs text-[#475569] flex-1">{r.plazo}</span>
                <span className="text-xs font-bold text-[#6aacbc]">{Math.round(Number(r.saldo) / totalSaldo * 100)}% saldo</span>
              </div>
            ))}
            <p className="text-[10px] text-[#334155] mt-2">pasa el cursor sobre una barra para ver detalle</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Barras de vencimientos mensuales
const VencimientosChart = ({ data }) => {
  const [tip, setTip] = useState(null);

  if (!data?.length) return (
    <div className="h-32 flex items-center justify-center text-xs text-[#334155]">SIN VENCIMIENTOS EN LOS PRÓXIMOS 12 MESES</div>
  );

  const padL = 58; const w = 600; const h = 100; const totalW = w + padL;
  const maxCap = Math.max(...data.map(d => Number(d.capital)), 1);
  const fmtMes = (ym) => { const [y, m] = ym.split('-'); return `${m}/${String(y).slice(2)}`; };
  const barW = Math.max(8, Math.floor(w / data.length) - 4);

  // Y-axis labels
  const yTicks = [maxCap, maxCap * 0.5, 0];

  // Acumulado capital para línea overlay naranja
  let acum = 0;
  const acums = data.map(d => { acum += Number(d.capital); return acum; });
  const maxAcum = acum || 1;
  const pts = acums.map((v, i) => {
    const x = padL + (i / (data.length - 1 || 1)) * w;
    return `${x},${h - (v / maxAcum) * h}`;
  }).join(' ');

  // Línea de intereses proyectados por mes (decrece conforme vencen créditos)
  const interesesSerie = data.map(d => Number(d.intereses ?? 0));
  const maxInt = Math.max(...interesesSerie, 1);
  const ptsInt = interesesSerie.map((v, i) => {
    const x = padL + (i / (data.length - 1 || 1)) * w;
    return `${x},${h - (v / maxCap) * h}`;
  }).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${h + 22}`} preserveAspectRatio="none" style={{ height: 150 }}
      onMouseLeave={() => setTip(null)}>
      <defs>
        <linearGradient id="vcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Y-axis labels */}
      {yTicks.map((v, i) => {
        const y = i === 0 ? 6 : i === 1 ? h / 2 + 3 : h;
        return (
          <text key={i} x={padL - 4} y={y} fontSize="7.5" fill="#475569" textAnchor="end">
            {v === 0 ? '0' : fmtCOP(v)}
          </text>
        );
      })}
      {/* Y-axis line */}
      <line x1={padL} y1={0} x2={padL} y2={h} stroke="#1e293b" strokeWidth="1" />

      {/* Bars */}
      {data.map((d, i) => {
        const cx = padL + (i / (data.length - 1 || 1)) * w;
        const x = cx - barW / 2;
        const barH = Math.max(3, (Number(d.capital) / maxCap) * h);
        const isHovered = tip?.i === i;
        return (
          <g key={d.mes}
            onMouseEnter={() => setTip({ i, x: cx, y: h - barH, capital: Number(d.capital), mes: d.mes, creditos: d.creditos, intereses: Number(d.intereses ?? 0) })}
          >
            <rect x={x} y={h - barH} width={barW} height={barH}
              fill={isHovered ? '#22c55e' : 'url(#vcGrad)'} rx="1" style={{ cursor: 'crosshair' }} />
            <text x={cx} y={h + 13} fontSize="7.5" fill="#475569" textAnchor="middle">{fmtMes(d.mes)}</text>
          </g>
        );
      })}

      {/* Línea intereses proyectados (verde, sólida) */}
      {data.length > 1 && (
        <polyline points={ptsInt} fill="none" stroke="#6aacbc" strokeWidth="1.5" strokeDasharray="2,3" opacity="0.8" />
      )}
      {/* Etiqueta intereses mes actual */}
      {interesesSerie.length > 0 && (() => {
        const x = padL; const y = h - (interesesSerie[0] / maxCap) * h;
        return <text x={x + 3} y={y - 4} fontSize="7.5" fill="#6aacbc" textAnchor="start">{fmtCOP(interesesSerie[0])}</text>;
      })()}

      {/* Línea acumulado capital (naranja, dashed) */}
      {data.length > 1 && (
        <polyline points={pts} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
      )}

      {/* Etiqueta acumulado final */}
      {(() => {
        const x = padL + w; const y = h - (acums[acums.length - 1] / maxAcum) * h;
        return <text x={x - 2} y={y - 4} fontSize="7.5" fill="#f97316" textAnchor="end" fontWeight="bold">{fmtCOP(acums[acums.length - 1])}</text>;
      })()}

      {/* Tooltip */}
      {tip && (() => {
        const tw = 160; const th = 48;
        const tx = Math.min(tip.x - tw / 2, totalW - tw - 2);
        const ty = Math.max(2, tip.y - th - 6);
        return (
          <g>
            <rect x={tx} y={ty} width={tw} height={th} rx="3" fill="#0d1829" stroke="#22c55e44" strokeWidth="1" />
            <text x={tx + 8} y={ty + 13} fontSize="8" fill="#475569" textAnchor="start">CAPITAL</text>
            <text x={tx + tw - 8} y={ty + 13} fontSize="9" fill="#22c55e" textAnchor="end" fontWeight="bold">{fmtCOP(tip.capital)}</text>
            <text x={tx + 8} y={ty + 27} fontSize="8" fill="#475569" textAnchor="start">INTERESES/MES</text>
            <text x={tx + tw - 8} y={ty + 27} fontSize="9" fill="#f97316" textAnchor="end" fontWeight="bold">{fmtCOP(tip.intereses)}</text>
            <text x={tx + tw / 2} y={ty + 42} fontSize="7.5" fill="#6aacbc" textAnchor="middle">{tip.creditos} crédito{tip.creditos !== 1 ? 's' : ''} activos · {fmtMes(tip.mes)}</text>
          </g>
        );
      })()}
    </svg>
  );
};

// Área chart adopción diaria (eje X = días, eje Y = acumulado)
const AdopcionChart = ({ serie, meta }) => {
  if (!serie?.length) return <div className="h-24 flex items-center justify-center text-xs text-[#334155]">SIN ACTIVIDAD EN LOS ÚLTIMOS 90 DÍAS</div>;
  const w = 600; const h = 90;
  const data = serie.length === 1 ? [serie[0], serie[0]] : serie;
  const maxVal = Math.max(...data.map(d => d.acumulado), meta || 1);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.acumulado / maxVal) * h}`).join(' ');
  const metaY = h - ((meta || 0) / maxVal) * h;

  // Etiquetas eje X: primera, cada ~2 semanas y última
  const labelIdxs = new Set([0, data.length - 1]);
  const step = Math.max(1, Math.floor(data.length / 5));
  for (let i = step; i < data.length - 1; i += step) labelIdxs.add(i);

  const fmtDia = (iso) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 18}`} preserveAspectRatio="none" style={{ height: 120 }}>
      <defs>
        <linearGradient id="adopGradD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e879f9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {meta > 0 && (
        <>
          <line x1="0" y1={metaY} x2={w} y2={metaY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
          <text x={w - 2} y={metaY - 3} fontSize="8" fill="#f59e0b" textAnchor="end" opacity="0.7">META {meta}</text>
        </>
      )}
      {/* Barras de nuevos por día */}
      {data.map((d, i) => {
        if (!d.nuevos) return null;
        const x = (i / (data.length - 1)) * w;
        const barH = Math.max(2, (d.nuevos / Math.max(...data.map(dd => dd.nuevos), 1)) * 20);
        return <rect key={i} x={x - 1.5} y={h - barH} width={3} height={barH} fill="#e879f944" />;
      })}
      <polyline points={pts} fill="none" stroke="#e879f9" strokeWidth="2" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#adopGradD)" />
      {/* Punto final */}
      {(() => {
        const last = data[data.length - 1];
        const x = w; const y = h - (last.acumulado / maxVal) * h;
        return (
          <g>
            <circle cx={x} cy={y} r="3" fill="#e879f9" />
            <text x={x - 4} y={y - 5} fontSize="9" fill="#e879f9" textAnchor="end" fontWeight="bold">{last.acumulado}</text>
          </g>
        );
      })()}
      {/* Etiquetas eje X */}
      {[...labelIdxs].sort((a,b) => a-b).map(i => (
        <text key={i} x={(i / (data.length - 1)) * w} y={h + 13} fontSize="8" fill="#475569"
          textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
          {fmtDia(data[i].dia)}
        </text>
      ))}
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
  const [proyMeses, setProyMeses] = useState(12);
  const [loading, setLoading]     = useState(true);
  const [loadingCob, setLoadingCob] = useState(false);
  const [ultimaActu, setUltimaActu] = useState(null);
  const intervalRef = useRef(null);
  const [showExport, setShowExport] = useState(false);

  const SECCIONES = [
    { id: 'resumen',      label: 'Resumen ejecutivo',                color: '#6aacbc' },
    { id: 'cartera',      label: 'Cartera de créditos',              color: '#f97316' },
    { id: 'vencimientos', label: 'Vencimientos próximos 12M',        color: '#22c55e' },
    { id: 'sorteos',      label: 'Ingresos por sorteos',             color: '#22c55e' },
    { id: 'bienestar',    label: 'Fondo de bienestar',               color: '#22c55e' },
    { id: 'seguros',      label: 'Seguros, pólizas y funerarios',    color: '#6aacbc' },
    { id: 'patronales',   label: 'Aportes patronales',               color: '#a855f7' },
    { id: 'adopcion',     label: 'Adopción del portal',              color: '#e879f9' },
    { id: 'actividad',    label: 'Actividad reciente',               color: '#6aacbc' },
  ];
  const [secciones, setSecciones] = useState(() => Object.fromEntries(SECCIONES.map(s => [s.id, true])));

  const toggleSeccion = (id) => setSecciones(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleTodas   = () => {
    const allOn = SECCIONES.every(s => secciones[s.id]);
    setSecciones(Object.fromEntries(SECCIONES.map(s => [s.id, !allOn])));
  };
  const [modoPresent, setModoPresent] = useState(false);

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
  const exportarPDF = async (secs, present = false) => {
    setShowExport(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const { asociados, sorteos, patronales, cartera, bienestar, seguros, logs, pendientes } = data || {};

    const navy   = [2, 6, 23];
    const orange = [249, 115, 22];
    const green  = [34, 197, 94];
    const purple = [168, 85, 247];
    const pink   = [232, 121, 249];
    const teal   = [106, 172, 188];
    const slate  = [71, 85, 105];
    const cyan   = [0, 229, 255];

    const fmtFull = (v) => {
      if (v === null || v === undefined) return '—';
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v));
    };

    // ── MODO PRESENTACIÓN ────────────────────────────────────────────────────
    if (present) {
      const { asociados: as, sorteos: sr, patronales: pt, cartera: ct, bienestar: bw, seguros: sg, logs: lg } = data || {};

      const bgPage = (accentColor) => {
        doc.setFillColor(...navy); doc.rect(0, 0, W, H, 'F');
        if (accentColor) { doc.setFillColor(...accentColor); doc.rect(0, 0, W, 2, 'F'); }
        doc.setFillColor(8, 16, 30); doc.rect(0, H - 13, W, 13, 'F');
        doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.setTextColor(...slate);
        doc.text(`Sistema KERNEL · ${new Date().toLocaleString('es-CO')}`, W - 14, H - 5, { align: 'right' });
      };

      // KPI card: label arriba (10pt slate), valor abajo (18pt color)
      const kpiCard = (x, y, w, h, label, value, color) => {
        doc.setFillColor(8, 16, 30); doc.roundedRect(x, y, w, h, 2, 2, 'F');
        doc.setFillColor(...color); doc.rect(x, y, w, 1.4, 'F');
        doc.setFont('courier', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...slate);
        doc.text(label, x + w / 2, y + 10, { align: 'center', maxWidth: w - 4 });
        doc.setFont('courier', 'bold'); doc.setFontSize(17); doc.setTextColor(...color);
        doc.text(String(value), x + w / 2, y + 24, { align: 'center', maxWidth: w - 4 });
      };

      const presTable = (y, head, body, foot, color) => {
        autoTable(doc, {
          startY: y, head, body, foot,
          styles: { font: 'courier', fontSize: 9, cellPadding: 3, fillColor: [13, 24, 41], textColor: [160, 212, 224], lineColor: [30, 41, 59], lineWidth: 0.1 },
          headStyles: { fillColor: [4, 10, 20], textColor: color, fontStyle: 'bold', fontSize: 8.5 },
          alternateRowStyles: { fillColor: [17, 30, 52] },
          footStyles: foot ? { fillColor: [4, 10, 20], textColor: color, fontStyle: 'bold', fontSize: 8.5 } : undefined,
        });
        return doc.lastAutoTable.finalY;
      };

      // Barra horizontal con label izquierda y valor derecha (9pt)
      // Si la barra supera el 85%, el valor se renderiza en navy para contrastar con el fondo de color
      const hBar = (x, y, bw, bh, pct, color, label, value) => {
        doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(160, 212, 224);
        doc.text(label, x, y + bh - 1);
        doc.setFillColor(13, 24, 41); doc.rect(x + 92, y, bw, bh, 'F');
        doc.setFillColor(...color); doc.rect(x + 92, y, bw * pct, bh, 'F');
        const valueColor = pct > 0.85 ? [2, 6, 23] : [...color];
        doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(...valueColor);
        doc.text(value, W - 16, y + bh - 1, { align: 'right' });
      };

      // Título de sección: 11pt + línea decorativa
      const secTitle = (label, color) => {
        doc.setFont('courier', 'bold'); doc.setFontSize(11); doc.setTextColor(...color);
        doc.text(`// ${label}`, 14, 16);
        doc.setFillColor(...color.map(c => Math.round(c * 0.25))); doc.rect(14, 18.5, W - 28, 0.6, 'F');
      };

      // Número hero: label 11pt teal + valor 38pt color (usa fmtCOP para no desbordar)
      const bigNumber = (label, value, color) => {
        doc.setFont('courier', 'normal'); doc.setFontSize(11); doc.setTextColor(...teal);
        doc.text(label, W / 2, 28, { align: 'center' });
        doc.setFont('courier', 'bold'); doc.setFontSize(38); doc.setTextColor(...color);
        doc.text(String(value), W / 2, 50, { align: 'center' });
      };

      // ── Portada ───────────────────────────────────────────────────────────
      bgPage(null);
      for (let i = 0; i < 6; i++) {
        doc.setFillColor(...cyan.map(c => Math.round(c * (0.04 + i * 0.015))));
        doc.rect(0, 25 + i * 30, W, 0.5, 'F');
      }
      doc.setFont('courier', 'bold'); doc.setFontSize(40); doc.setTextColor(...cyan);
      doc.text('CENTRO DE MANDO', W / 2, 82, { align: 'center' });
      doc.setFontSize(15); doc.setTextColor(...teal);
      doc.text('COOPERATIVA PROGRESEMOS', W / 2, 96, { align: 'center' });
      doc.setFillColor(...cyan); doc.rect(W / 2 - 55, 101, 110, 0.8, 'F');
      doc.setFontSize(9); doc.setTextColor(...slate);
      doc.text('INFORME EJECUTIVO DE GERENCIA', W / 2, 112, { align: 'center' });
      doc.text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase(), W / 2, 120, { align: 'center' });
      doc.setFillColor(8, 16, 30); doc.rect(0, H - 12, W, 12, 'F');
      doc.setFont('courier', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...slate);
      doc.text('Sistema KERNEL · kernel.cooperativaprogresemos.coop', W / 2, H - 4, { align: 'center' });

      // ── Resumen ejecutivo ─────────────────────────────────────────────────
      if (secs.resumen && data) {
        doc.addPage(); bgPage(teal); secTitle('RESUMEN EJECUTIVO', teal);
        const tot = (Number(ct?.capital_mensual)||0)+(Number(ct?.intereses_mensual)||0)
          +(sr?.reduce((s,x)=>s+Number(x.ingreso_mensual||0),0)||0)
          +(Number(bw?.mensual)||0)+(Number(sg?.mensual)||0)+(Number(pt?.total_causado)||0);
        doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...slate);
        doc.text('TOTAL INGRESOS MENSUALES PROYECTADOS', W/2, 26, { align: 'center' });
        doc.setFont('courier', 'bold'); doc.setFontSize(38); doc.setTextColor(...orange);
        doc.text(fmtCOP(tot), W/2, 48, { align: 'center' });
        doc.setFontSize(10); doc.setTextColor(...slate);
        doc.text(`${fmtCOP(tot * 12)} proyectado anual`, W/2, 57, { align: 'center' });

        const cw = 52; const ch = 32; const gap = 4;
        const sx = (W - 5*(cw+gap)+gap) / 2;
        [
          { label: 'CARTERA', v: fmtCOP((Number(ct?.capital_mensual)||0)+(Number(ct?.intereses_mensual)||0)), c: orange },
          { label: 'SORTEOS', v: fmtCOP(sr?.reduce((s,x)=>s+Number(x.ingreso_mensual||0),0)), c: green },
          { label: 'BIENESTAR', v: fmtCOP(bw?.mensual), c: green },
          { label: 'SEGUROS', v: fmtCOP(sg?.mensual), c: teal },
          { label: 'PATRONALES', v: fmtCOP(pt?.total_causado), c: purple },
        ].forEach((k, i) => kpiCard(sx + i*(cw+gap), 62, cw, ch, k.label, k.v, k.c));

        [
          { label: 'ASOC. ACTIVOS', v: fmtNum(as?.activos), c: cyan },
          { label: 'CON PORTAL', v: fmtNum(as?.con_portal), c: pink },
          { label: 'ADOPCIÓN', v: `${as?.adopcion_pct??'—'}%`, c: pink },
          { label: 'MORA PATRONAL', v: fmtCOP(pt?.total_mora), c: [239,68,68] },
          { label: 'SOL. PENDIENTES', v: String((pendientes?.bonos??0)+(pendientes?.portal??0)), c: [245,158,11] },
        ].forEach((k, i) => kpiCard(sx + i*(cw+gap), 100, cw, ch, k.label, k.v, k.c));

        // Composición bar
        const barY = 139; const barH2 = 11; const barW2 = W - 28;
        doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...slate);
        doc.text('COMPOSICIÓN DE INGRESOS', 14, barY - 3);
        const srcs = [
          { label: 'Cartera', val: (Number(ct?.capital_mensual)||0)+(Number(ct?.intereses_mensual)||0), c: orange },
          { label: 'Sorteos', val: sr?.reduce((s,x)=>s+Number(x.ingreso_mensual||0),0)||0, c: green },
          { label: 'Bienestar', val: Number(bw?.mensual)||0, c: green },
          { label: 'Seguros', val: Number(sg?.mensual)||0, c: teal },
          { label: 'Patronales', val: Number(pt?.total_causado)||0, c: purple },
        ];
        let bx = 14;
        srcs.forEach(src => {
          const pct = tot > 0 ? src.val / tot : 0; const bw3 = pct * barW2;
          doc.setFillColor(...src.c); doc.rect(bx, barY, bw3, barH2, 'F');
          if (bw3 > 22) { doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.setTextColor(2, 6, 23); doc.text(`${Math.round(pct*100)}%`, bx + bw3/2, barY + barH2/2 + 3, { align: 'center' }); }
          bx += bw3;
        });
        let lx = 14;
        srcs.forEach(src => {
          doc.setFillColor(...src.c); doc.rect(lx, barY + barH2 + 4, 6, 4, 'F');
          doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...slate);
          doc.text(src.label, lx + 9, barY + barH2 + 8); lx += 50;
        });
      }

      // ── Cartera ───────────────────────────────────────────────────────────
      if (secs.cartera && data) {
        doc.addPage(); bgPage(orange); secTitle('CARTERA DE CRÉDITOS', orange);
        bigNumber('SALDO PENDIENTE', fmtCOP(ct?.cartera_total), orange);
        const cw = 54; const ch = 32; const gap = 5;
        const n = 4; const sx = (W - n*(cw+gap)+gap) / 2;
        [
          { label: 'CRÉDITOS ACTIVOS', v: fmtNum(ct?.creditos_activos), c: teal },
          { label: 'INTERESES / MES', v: fmtCOP(ct?.intereses_mensual), c: green },
          { label: 'CAPITAL / MES', v: fmtCOP(ct?.capital_mensual), c: [34,197,94] },
          { label: 'TASA PROM. POND.', v: ct?.tasa_promedio_ponderada != null ? `${Number(ct.tasa_promedio_ponderada).toFixed(2)}%` : '—', c: [160,212,224] },
        ].forEach((k, i) => kpiCard(sx + i*(cw+gap), 58, cw, ch, k.label, k.v, k.c));

        if (ct?.obligacion_total > 0) {
          const pct = Math.round((ct.cartera_total / ct.obligacion_total) * 100);
          const barY = 96; const barH2 = 8;
          doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...slate);
          doc.text(`PENDIENTE VS CAPITAL ORIGINAL: ${pct}% · Original: ${fmtCOP(ct.obligacion_total)}`, 14, barY - 3);
          doc.setFillColor(13, 24, 41); doc.rect(14, barY, W - 28, barH2, 'F');
          doc.setFillColor(...orange); doc.rect(14, barY, (W - 28) * pct / 100, barH2, 'F');
        }

        if (ct?.plazos?.length) {
          const totalSaldo = ct.plazos.reduce((s, r) => s + Number(r.saldo), 0) || 1;
          doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(...orange);
          doc.text('DISTRIBUCIÓN POR PLAZO', 14, 112);
          presTable(115, [['PLAZO', 'CRÉDITOS', 'SALDO', 'INTERESES/MES', 'CUOTAS PROM.', '% CARTERA']],
            ct.plazos.map(r => [r.plazo, r.creditos, fmtFull(r.saldo), fmtFull(r.intereses_mensual), r.cuotas_promedio ? `${r.cuotas_promedio} meses` : '—', `${Math.round(Number(r.saldo)/totalSaldo*100)}%`]),
            null, orange);
        }
      }

      // ── Vencimientos ──────────────────────────────────────────────────────
      if (secs.vencimientos && data && ct?.vencimientos?.length) {
        doc.addPage(); bgPage(green); secTitle('CAPITAL DISPONIBLE — PRÓXIMOS 12 MESES', green);
        const totVenc = ct.vencimientos.reduce((s,r)=>s+Number(r.capital),0);
        const totCred = ct.vencimientos.reduce((s,r)=>s+Number(r.creditos),0);
        bigNumber('CAPITAL QUE RETORNA EN 12 MESES', fmtCOP(totVenc), green);
        doc.setFontSize(11); doc.setFont('courier', 'normal'); doc.setTextColor(...slate);
        doc.text(`${fmtNum(totCred)} créditos`, W/2, 58, { align: 'center' });

        // Bar chart
        const chartY = 64; const chartH2 = 60; const chartW = W - 28;
        const maxCap = Math.max(...ct.vencimientos.map(d => Number(d.capital)), 1);
        const bw4 = Math.max(6, Math.floor(chartW / ct.vencimientos.length) - 3);
        doc.setFillColor(13, 24, 41); doc.rect(14, chartY, chartW, chartH2, 'F');
        const fmtM = (ym) => { const [y2,m2] = ym.split('-'); return `${m2}/${String(y2).slice(2)}`; };
        ct.vencimientos.forEach((d, i) => {
          const cx = 14 + (i / (ct.vencimientos.length - 1 || 1)) * chartW;
          const bh2 = Math.max(3, (Number(d.capital) / maxCap) * (chartH2 - 16));
          doc.setFillColor(34, 197, 94); doc.rect(cx - bw4/2, chartY + chartH2 - 14 - bh2, bw4, bh2, 'F');
          doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...slate);
          doc.text(fmtM(d.mes), cx, chartY + chartH2 - 3, { align: 'center' });
        });

        doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...green);
        doc.text('DETALLE POR MES', 14, chartY + chartH2 + 12);
        presTable(chartY + chartH2 + 15,
          [['MES', 'CAPITAL QUE VENCE', 'CRÉDITOS', 'INTERESES/MES']],
          ct.vencimientos.map(r => [r.mes, fmtFull(r.capital), r.creditos, fmtFull(r.intereses ?? 0)]),
          [['TOTAL', fmtFull(totVenc), totCred, '—']], green);
      }

      // ── Sorteos ───────────────────────────────────────────────────────────
      if (secs.sorteos && data && sr?.length) {
        doc.addPage(); bgPage(green); secTitle('INGRESOS POR SORTEOS', green);
        const totMesSr = sr.reduce((s,x)=>s+Number(x.ingreso_mensual),0);
        bigNumber('INGRESO MENSUAL SORTEOS', fmtCOP(totMesSr), green);
        doc.setFontSize(11); doc.setFont('courier', 'normal'); doc.setTextColor(...slate);
        doc.text(`${fmtCOP(totMesSr * 12)} anual · ${sr.length} sorteo${sr.length!==1?'s':''} activo${sr.length!==1?'s':''}`, W/2, 58, { align: 'center' });

        const cw2 = Math.min(82, (W - 28 - (sr.length-1)*5) / sr.length);
        sr.forEach((s, i) => {
          const cx2 = 14 + i*(cw2+5); const pct2 = s.boletos_total > 0 ? Math.round((s.boletos_asignados/s.boletos_total)*100) : 0;
          doc.setFillColor(8, 16, 30); doc.roundedRect(cx2, 65, cw2, 62, 2, 2, 'F');
          doc.setFillColor(...green); doc.rect(cx2, 65, cw2, 1.4, 'F');
          doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(...green);
          doc.text(s.nombre, cx2 + cw2/2, 74, { align: 'center', maxWidth: cw2 - 4 });
          doc.setFontSize(17); doc.setTextColor(...orange);
          doc.text(fmtCOP(s.ingreso_mensual), cx2 + cw2/2, 87, { align: 'center' });
          doc.setFontSize(8.5); doc.setTextColor(...slate); doc.text('/mes', cx2 + cw2/2, 93, { align: 'center' });
          doc.setFillColor(13, 24, 41); doc.rect(cx2 + 5, 98, cw2-10, 6, 'F');
          const bc = pct2 >= 80 ? [34,197,94] : pct2 >= 50 ? green : [239,68,68];
          doc.setFillColor(...bc); doc.rect(cx2 + 5, 98, (cw2-10)*pct2/100, 6, 'F');
          doc.setFontSize(8.5); doc.setFont('courier', 'bold'); doc.setTextColor(...bc);
          doc.text(`${pct2}% ocupado`, cx2 + cw2/2, 110, { align: 'center' });
          doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.setTextColor(...slate);
          doc.text(`${fmtNum(s.boletos_asignados)} / ${fmtNum(s.boletos_total)} boletos`, cx2 + cw2/2, 117, { align: 'center' });
          if (s.solicitudes_pendientes > 0) { doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.setTextColor(245,158,11); doc.text(`${s.solicitudes_pendientes} pendientes`, cx2 + cw2/2, 124, { align: 'center' }); }
        });
      }

      // ── Bienestar ─────────────────────────────────────────────────────────
      if (secs.bienestar && data) {
        doc.addPage(); bgPage(green); secTitle('FONDO DE BIENESTAR', green);
        bigNumber('RECAUDO MENSUAL', fmtCOP(bw?.mensual), green);
        const cw3 = 60; const ch3 = 32; const gap3 = 6;
        const n3 = 3; const sx3 = (W - n3*(cw3+gap3)+gap3) / 2;
        [
          { label: 'PROYECCIÓN ANUAL', v: fmtCOP(bw?.anual), c: green },
          { label: 'ASOCIADOS', v: fmtNum(bw?.asociados), c: teal },
          { label: 'APORTE PROMEDIO', v: fmtCOP(bw?.asociados > 0 ? Math.round(bw.mensual/bw.asociados) : 0), c: [160,212,224] },
        ].forEach((k, i) => kpiCard(sx3 + i*(cw3+gap3), 58, cw3, ch3, k.label, k.v, k.c));
        if (bw?.lineas?.length) {
          doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...green);
          doc.text('DESGLOSE POR LÍNEA', 14, 100);
          const maxMB = Math.max(...bw.lineas.map(l => Number(l.mensual)), 1);
          bw.lineas.forEach((l, i) => hBar(14, 104 + i*15, W-106, 8, Number(l.mensual)/maxMB, green, l.nombre_linea, fmtFull(l.mensual)));
        }
      }

      // ── Seguros ───────────────────────────────────────────────────────────
      if (secs.seguros && data) {
        doc.addPage(); bgPage(teal); secTitle('SEGUROS, PÓLIZAS Y SERVICIOS FUNERARIOS', teal);
        bigNumber('RECAUDO MENSUAL', fmtCOP(sg?.mensual), teal);
        const cw4 = 60; const ch4 = 32; const gap4 = 6;
        const n4 = 3; const sx4 = (W - n4*(cw4+gap4)+gap4) / 2;
        [
          { label: 'PROYECCIÓN ANUAL', v: fmtCOP(sg?.anual), c: teal },
          { label: 'ASOCIADOS', v: fmtNum(sg?.asociados), c: cyan },
          { label: 'PRIMA PROMEDIO', v: fmtCOP(sg?.asociados > 0 ? Math.round(sg.mensual/sg.asociados) : 0), c: [160,212,224] },
        ].forEach((k, i) => kpiCard(sx4 + i*(cw4+gap4), 58, cw4, ch4, k.label, k.v, k.c));
        if (sg?.lineas?.length) {
          doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...teal);
          doc.text('DESGLOSE POR LÍNEA', 14, 100);
          const maxMS = Math.max(...sg.lineas.map(l => Number(l.mensual)), 1);
          sg.lineas.forEach((l, i) => hBar(14, 104 + i*15, W-106, 8, Number(l.mensual)/maxMS, teal, l.nombre_linea, fmtFull(l.mensual)));
        }
      }

      // ── Patronales ────────────────────────────────────────────────────────
      if (secs.patronales && data) {
        doc.addPage(); bgPage(purple); secTitle('APORTES PATRONALES', purple);
        bigNumber('TOTAL CAUSADO', fmtCOP(pt?.total_causado), purple);
        const cw5 = 56; const ch5 = 32; const gap5 = 5;
        const n5 = 4; const sx5 = (W - n5*(cw5+gap5)+gap5) / 2;
        [
          { label: 'TOTAL COBRADO', v: fmtCOP(pt?.total_cobrado), c: green },
          { label: 'EN MORA', v: fmtCOP(pt?.total_mora), c: [239,68,68] },
          { label: 'EMPRESAS DEUDA', v: String(pt?.empresas_en_deuda ?? 0), c: [245,158,11] },
          { label: 'COBERTURA', v: pt?.total_causado > 0 ? `${Math.round((pt.total_cobrado/pt.total_causado)*100)}%` : '—', c: teal },
        ].forEach((k, i) => kpiCard(sx5 + i*(cw5+gap5), 58, cw5, ch5, k.label, k.v, k.c));
        if (pt?.top_mora?.length) {
          doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...purple);
          doc.text('TOP MORA POR EMPRESA', 14, 100);
          const maxMP = Math.max(...pt.top_mora.map(e => Number(e.mora)), 1);
          pt.top_mora.forEach((e, i) => hBar(14, 104 + i*15, W-106, 8, Number(e.mora)/maxMP, [239,68,68], e.nombre, fmtFull(e.mora)));
        }
      }

      // ── Adopción ──────────────────────────────────────────────────────────
      if (secs.adopcion && data) {
        doc.addPage(); bgPage(pink); secTitle('ADOPCIÓN DEL PORTAL', pink);
        doc.setFont('courier', 'normal'); doc.setFontSize(11); doc.setTextColor(...teal);
        doc.text('ADOPCIÓN ACTUAL', W/2, 28, { align: 'center' });
        doc.setFont('courier', 'bold'); doc.setFontSize(48); doc.setTextColor(...pink);
        doc.text(`${as?.adopcion_pct ?? '—'}%`, W/2, 52, { align: 'center' });
        const cw6 = 60; const ch6 = 32; const gap6 = 6;
        const n6 = 3; const sx6 = (W - n6*(cw6+gap6)+gap6) / 2;
        [
          { label: 'ACTIVOS', v: fmtNum(as?.activos), c: [160,212,224] },
          { label: 'CON PORTAL', v: fmtNum(as?.con_portal), c: pink },
          { label: 'SIN PORTAL', v: fmtNum((as?.activos??0)-(as?.con_portal??0)), c: slate },
        ].forEach((k, i) => kpiCard(sx6 + i*(cw6+gap6), 60, cw6, ch6, k.label, k.v, k.c));
        const pct6 = as?.adopcion_pct ?? 0; const barY6 = 100; const barH6 = 14;
        doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(...slate);
        doc.text('BARRA DE ADOPCIÓN', 14, barY6 - 3);
        doc.setFillColor(13, 24, 41); doc.rect(14, barY6, W-28, barH6, 'F');
        doc.setFillColor(168, 85, 247); doc.rect(14, barY6, (W-28)*pct6/100*0.5, barH6, 'F');
        doc.setFillColor(...pink); doc.rect(14 + (W-28)*pct6/100*0.5, barY6, (W-28)*pct6/100*0.5, barH6, 'F');
        if (pct6 > 8) { doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.setTextColor(2,6,23); doc.text(`${pct6}%`, 14+(W-28)*pct6/100-6, barY6+barH6/2+3, { align: 'right' }); }
      }

      // ── Actividad ─────────────────────────────────────────────────────────
      if (secs.actividad && data && lg?.length) {
        doc.addPage(); bgPage(teal); secTitle('ACTIVIDAD RECIENTE', teal);
        presTable(20, [['ACCIÓN', 'USUARIO', 'DETALLE', 'TIEMPO']],
          lg.slice(0, 25).map(log => [
            (log.accion ?? '').replace(/_/g, ' '),
            log.usuario_nombre ?? '—',
            (typeof log.detalle === 'string' ? log.detalle : JSON.stringify(log.detalle ?? '')).slice(0, 70),
            timeAgo(log.created_at),
          ]), null, teal);
      }

      doc.save(`kernel-gerencia-presentacion-${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }
    // ── FIN MODO PRESENTACIÓN ────────────────────────────────────────────────

    const pageHeader = (page) => {
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, 14, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...cyan);
      doc.text('CENTRO DE MANDO', 14, 8);
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text('COOPERATIVA PROGRESEMOS — GERENCIA GENERAL', 14, 13);
      doc.setTextColor(...slate);
      doc.text(`Pág. ${page} · ${new Date().toLocaleString('es-CO')}`, W - 14, 10, { align: 'right' });
    };

    const secHeader = (label, y, color) => {
      doc.setFillColor(...color.map(c => Math.round(c * 0.18)));
      doc.rect(0, y, W, 7, 'F');
      doc.setDrawColor(...color);
      doc.setLineWidth(0.4);
      doc.line(0, y, W, y);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...color);
      doc.text(`// ${label}`, 14, y + 4.5);
      doc.setTextColor(0, 0, 0);
      return y + 9;
    };

    const tblHead = (fillColor, textColor) => ({
      fillColor,
      textColor,
      fontStyle: 'bold',
      fontSize: 7,
    });

    // ── Página 1: Resumen ejecutivo + Cartera ────────────────────────────────
    pageHeader(1);
    let y = 18;

    if (data) {
      const totalMensual =
        (Number(cartera?.capital_mensual) || 0) +
        (Number(cartera?.intereses_mensual) || 0) +
        (sorteos?.reduce((s, x) => s + Number(x.ingreso_mensual || 0), 0) || 0) +
        (Number(bienestar?.mensual) || 0) +
        (Number(seguros?.mensual) || 0) +
        (Number(patronales?.total_causado) || 0);

      if (secs.resumen) {
      y = secHeader('RESUMEN EJECUTIVO', y, teal);
      autoTable(doc, {
        startY: y,
        head: [['TOTAL INGRESOS/MES', 'Cartera', 'Sorteos', 'Bienestar', 'Seguros', 'Patronales', 'Asoc. activos', 'Adopción', 'Mora patronal', 'Solicitudes']],
        body: [[
          fmtFull(totalMensual),
          fmtCOP((Number(cartera?.capital_mensual) || 0) + (Number(cartera?.intereses_mensual) || 0)),
          fmtCOP(sorteos?.reduce((s, x) => s + Number(x.ingreso_mensual || 0), 0)),
          fmtCOP(bienestar?.mensual),
          fmtCOP(seguros?.mensual),
          fmtCOP(patronales?.total_causado),
          fmtNum(asociados?.activos),
          `${asociados?.adopcion_pct ?? '—'}%`,
          fmtCOP(patronales?.total_mora),
          String((pendientes?.bonos ?? 0) + (pendientes?.portal ?? 0)),
        ]],
        styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
        headStyles: tblHead([...navy], [...teal]),
        columnStyles: { 0: { fontStyle: 'bold', textColor: orange } },
      });
      y = doc.lastAutoTable.finalY + 5;
      } // end resumen

      if (secs.cartera) {
      y = secHeader('CARTERA DE CRÉDITOS', y, orange);
      autoTable(doc, {
        startY: y,
        head: [['SALDO PENDIENTE', 'CRÉDITOS ACTIVOS', 'INTERESES/MES', 'CAPITAL/MES', 'TASA PROM. POND.', 'CAPITAL ORIGINAL', 'RECUPERADO']],
        body: [[
          fmtFull(cartera?.cartera_total),
          fmtNum(cartera?.creditos_activos),
          fmtFull(cartera?.intereses_mensual),
          fmtFull(cartera?.capital_mensual),
          cartera?.tasa_promedio_ponderada != null ? `${Number(cartera.tasa_promedio_ponderada).toFixed(2)}% M.V.` : '—',
          fmtFull(cartera?.obligacion_total),
          cartera?.obligacion_total > 0 ? `${Math.round((cartera.cartera_total / cartera.obligacion_total) * 100)}%` : '—',
        ]],
        styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
        headStyles: tblHead([40, 20, 10], [...orange]),
      });
      y = doc.lastAutoTable.finalY + 3;

      if (cartera?.distribucion?.length) {
        autoTable(doc, {
          startY: y,
          head: [['RANGO DE MONTO', 'CRÉDITOS', 'SUBTOTAL']],
          body: cartera.distribucion.map(r => [r.rango, r.cantidad, fmtFull(r.subtotal)]),
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([40, 20, 10], [...orange]),
          tableWidth: 'wrap',
        });
        y = doc.lastAutoTable.finalY + 3;
      }

      if (cartera?.plazos?.length) {
        const totalSaldo = cartera.plazos.reduce((s, r) => s + Number(r.saldo), 0) || 1;
        autoTable(doc, {
          startY: y,
          head: [['PLAZO', 'CRÉDITOS', 'SALDO', 'INTERESES/MES', 'CUOTAS PROM.', '% CARTERA']],
          body: cartera.plazos.map(r => [
            r.plazo,
            r.creditos,
            fmtFull(r.saldo),
            fmtFull(r.intereses_mensual),
            r.cuotas_promedio ? `${r.cuotas_promedio} meses` : '—',
            `${Math.round(Number(r.saldo) / totalSaldo * 100)}%`,
          ]),
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([40, 20, 10], [...orange]),
        });
        y = doc.lastAutoTable.finalY + 3;
      }
      } // end cartera

      if (secs.vencimientos && cartera?.vencimientos?.length) {
        y = secHeader('CAPITAL DISPONIBLE — PRÓXIMOS 12 MESES', y, green);
        autoTable(doc, {
          startY: y,
          head: [['MES', 'CAPITAL QUE VENCE', 'CRÉDITOS', 'INTERESES/MES']],
          body: cartera.vencimientos.map(r => [r.mes, fmtFull(r.capital), r.creditos, fmtFull(r.intereses ?? 0)]),
          foot: [[
            'TOTAL',
            fmtFull(cartera.vencimientos.reduce((s, r) => s + Number(r.capital), 0)),
            cartera.vencimientos.reduce((s, r) => s + Number(r.creditos), 0),
            '—',
          ]],
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([10, 30, 10], [...green]),
          footStyles: tblHead([10, 30, 10], [...green]),
        });
      }
    }

    // ── Página 2: Sorteos + Bienestar + Seguros ──────────────────────────────
    doc.addPage();
    pageHeader(2);
    y = 18;

    if (data) {
      if (secs.sorteos && sorteos?.length) {
        y = secHeader('INGRESOS POR SORTEOS', y, green);
        const totalMes = sorteos.reduce((s, x) => s + Number(x.ingreso_mensual), 0);
        autoTable(doc, {
          startY: y,
          head: [['SORTEO', 'ESTADO', 'BOLETOS ASIG.', 'TOTAL BOLETOS', 'OCUPACIÓN', 'INGRESO/MES', 'PROY. ANUAL', 'PEND.']],
          body: sorteos.map(s => [
            s.nombre,
            s.estado.toUpperCase(),
            fmtNum(s.boletos_asignados),
            fmtNum(s.boletos_total),
            `${s.boletos_total > 0 ? Math.round((s.boletos_asignados / s.boletos_total) * 100) : 0}%`,
            fmtFull(s.ingreso_mensual),
            fmtFull(Number(s.ingreso_mensual) * 12),
            s.solicitudes_pendientes,
          ]),
          foot: [['TOTALES', '', fmtNum(sorteos.reduce((s,x)=>s+Number(x.boletos_asignados),0)), fmtNum(sorteos.reduce((s,x)=>s+Number(x.boletos_total),0)), '', fmtFull(totalMes), fmtFull(totalMes*12), '']],
          styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
          headStyles: tblHead([10, 30, 10], [...green]),
          footStyles: tblHead([10, 30, 10], [...green]),
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (secs.bienestar) {
      y = secHeader('FONDO DE BIENESTAR', y, green);
      autoTable(doc, {
        startY: y,
        head: [['RECAUDO MENSUAL', 'PROYECCIÓN ANUAL', 'ASOCIADOS', 'APORTE PROMEDIO']],
        body: [[
          fmtFull(bienestar?.mensual),
          fmtFull(bienestar?.anual),
          fmtNum(bienestar?.asociados),
          fmtFull(bienestar?.asociados > 0 ? Math.round(bienestar.mensual / bienestar.asociados) : 0),
        ]],
        styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
        headStyles: tblHead([10, 30, 10], [...green]),
      });
      y = doc.lastAutoTable.finalY + 3;

      if (bienestar?.lineas?.length) {
        autoTable(doc, {
          startY: y,
          head: [['LÍNEA DE BIENESTAR', 'ASOCIADOS', 'MENSUAL', 'ANUAL']],
          body: bienestar.lineas.map(l => [l.nombre_linea, l.asociados, fmtFull(l.mensual), fmtFull(Number(l.mensual) * 12)]),
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([10, 30, 10], [...green]),
        });
        y = doc.lastAutoTable.finalY + 5;
      }
      } // end bienestar

      if (secs.seguros) {
      y = secHeader('SEGUROS, PÓLIZAS Y SERVICIOS FUNERARIOS', y, teal);
      autoTable(doc, {
        startY: y,
        head: [['RECAUDO MENSUAL', 'PROYECCIÓN ANUAL', 'ASOCIADOS', 'PRIMA PROMEDIO']],
        body: [[
          fmtFull(seguros?.mensual),
          fmtFull(seguros?.anual),
          fmtNum(seguros?.asociados),
          fmtFull(seguros?.asociados > 0 ? Math.round(seguros.mensual / seguros.asociados) : 0),
        ]],
        styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
        headStyles: tblHead([10, 25, 30], [...teal]),
      });
      y = doc.lastAutoTable.finalY + 3;

      if (seguros?.lineas?.length) {
        autoTable(doc, {
          startY: y,
          head: [['LÍNEA DE SEGUROS', 'ASOCIADOS', 'MENSUAL', 'ANUAL']],
          body: seguros.lineas.map(l => [l.nombre_linea, l.asociados, fmtFull(l.mensual), fmtFull(Number(l.mensual) * 12)]),
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([10, 25, 30], [...teal]),
        });
      }
      } // end seguros
    }

    // ── Página 3: Patronales + Adopción + Actividad ──────────────────────────
    const needsPag3 = secs.patronales || secs.adopcion || secs.actividad;
    if (data && needsPag3) {
      doc.addPage();
      pageHeader(3);
      y = 18;

      if (secs.patronales) {
        y = secHeader('APORTES PATRONALES', y, purple);
        autoTable(doc, {
          startY: y,
          head: [['TOTAL CAUSADO', 'TOTAL COBRADO', 'MORA TOTAL', 'EMPRESAS EN DEUDA']],
          body: [[
            fmtFull(patronales?.total_causado),
            fmtFull(patronales?.total_cobrado),
            fmtFull(patronales?.total_mora),
            patronales?.empresas_en_deuda ?? 0,
          ]],
          styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
          headStyles: tblHead([20, 10, 30], [...purple]),
        });
        y = doc.lastAutoTable.finalY + 3;

        if (patronales?.top_mora?.length) {
          autoTable(doc, {
            startY: y,
            head: [['EMPRESA', 'MORA']],
            body: patronales.top_mora.map(e => [e.nombre, fmtFull(e.mora)]),
            styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
            headStyles: tblHead([20, 10, 30], [...purple]),
            tableWidth: 'wrap',
          });
          y = doc.lastAutoTable.finalY + 5;
        }
      }

      if (secs.adopcion) {
        y = secHeader('ADOPCIÓN DEL PORTAL', y, pink);
        autoTable(doc, {
          startY: y,
          head: [['ASOCIADOS ACTIVOS', 'CON ACCESO PORTAL', 'SIN ACCESO', 'ADOPCIÓN']],
          body: [[
            fmtNum(asociados?.activos),
            fmtNum(asociados?.con_portal),
            fmtNum((asociados?.activos ?? 0) - (asociados?.con_portal ?? 0)),
            `${asociados?.adopcion_pct ?? '—'}%`,
          ]],
          styles: { font: 'courier', fontSize: 7.5, cellPadding: 2 },
          headStyles: tblHead([20, 10, 20], [...pink]),
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (secs.actividad && logs?.length) {
        y = secHeader('ACTIVIDAD RECIENTE', y, teal);
        autoTable(doc, {
          startY: y,
          head: [['ACCIÓN', 'USUARIO', 'DETALLE', 'TIEMPO']],
          body: logs.slice(0, 20).map(log => [
            (log.accion ?? '').replace(/_/g, ' '),
            log.usuario_nombre ?? '—',
            (typeof log.detalle === 'string' ? log.detalle : JSON.stringify(log.detalle ?? '')).slice(0, 70),
            timeAgo(log.created_at),
          ]),
          styles: { font: 'courier', fontSize: 7, cellPadding: 1.5 },
          headStyles: tblHead([10, 25, 30], [...teal]),
        });
      }
    }

    doc.save(`kernel-gerencia-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] font-mono flex items-center justify-center">
      <p className="text-[#6aacbc] text-[10px] tracking-widest animate-pulse">CARGANDO CENTRO DE MANDO...</p>
    </div>
  );

  const { asociados, sorteos, sorteos_serie, patronales, cartera, bienestar, seguros, logs, pendientes } = data || {};
  const maxMora = Math.max(...(patronales?.top_mora?.map(e => Number(e.mora)) || [1]), 1);
  const sorteoSelObj = sorteos?.find(s => s.id === sorteoSel);
  const serieDelSorteo = (sorteos_serie || []).filter(d => d.sorteo_id === sorteoSel);

  return (
    <>
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
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 text-[9px] tracking-widest text-[#6aacbc] hover:text-[#e879f9] transition-colors border border-[#e879f911] hover:border-[#e879f933] px-3 py-1.5 rounded-sm"
            >
              EXPORTAR PDF
            </button>
          </div>
        </div>

        {/* ── KPI Strip — Fila 1: Ingresos ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <p className="text-[10px] tracking-[3px] text-[#475569] mb-2">// INGRESOS MENSUALES PROYECTADOS</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
            <KpiCard icon={TrendingUp} label="RECAUDO CARTERA" color="#f97316"
              valor={fmtCOP((Number(cartera?.capital_mensual) || 0) + (Number(cartera?.intereses_mensual) || 0))}
              sub={<><span>cap. {fmtCOP(cartera?.capital_mensual)}</span><br/><span>int. {fmtCOP(cartera?.intereses_mensual)}</span></>} />
            <KpiCard icon={Ticket} label="SORTEOS" color="#22c55e"
              valor={fmtCOP(sorteos?.reduce((s, x) => s + Number(x.ingreso_mensual || 0), 0))}
              sub={`${sorteos?.length ?? 0} sorteo${sorteos?.length !== 1 ? 's' : ''} activo${sorteos?.length !== 1 ? 's' : ''}`} />
            <KpiCard icon={Heart} label="BIENESTAR" color="#34d399"
              valor={fmtCOP(bienestar?.mensual)}
              sub={`${fmtNum(bienestar?.asociados ?? 0)} asociados`} />
            <KpiCard icon={ShieldCheck} label="SEGUROS Y FUNERARIOS" color="#6aacbc"
              valor={fmtCOP(seguros?.mensual)}
              sub={`${fmtNum(seguros?.asociados ?? 0)} asociados`} />
            <KpiCard icon={Landmark} label="APORTES PATRONALES" color="#a855f7"
              valor={fmtCOP(patronales?.total_causado)}
              sub={`cobrado ${fmtCOP(patronales?.total_cobrado)}`} />
          </div>
          {/* Barra total */}
          {(() => {
            const totalMensual = (Number(cartera?.capital_mensual) || 0)
              + (Number(cartera?.intereses_mensual) || 0)
              + (sorteos?.reduce((s, x) => s + Number(x.ingreso_mensual || 0), 0) || 0)
              + (Number(bienestar?.mensual) || 0)
              + (Number(seguros?.mensual) || 0)
              + (Number(patronales?.total_causado) || 0);
            return (
              <div className="bg-[#08101e] border border-[#00e5ff15] rounded-sm px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[2px] text-[#6aacbc] mb-1">TOTAL INGRESOS MENSUALES PROYECTADOS</p>
                  <div className="flex items-center gap-4">
                    {[
                      { label: 'Cartera', color: '#f97316' },
                      { label: 'Sorteos', color: '#22c55e' },
                      { label: 'Bienestar', color: '#34d399' },
                      { label: 'Seguros', color: '#6aacbc' },
                      { label: 'Patronal', color: '#a855f7' },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-[#475569]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#e2e8f0]">{fmtCOP(totalMensual)}</p>
                  <p className="text-[10px] text-[#475569]">{fmtCOP(totalMensual * 12)} anual proyectado</p>
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* ── KPI Strip — Fila 2: Operativo ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="mb-5">
          <p className="text-[10px] tracking-[3px] text-[#475569] mb-2">// OPERATIVO Y ALERTAS</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Users} label="ASOCIADOS ACTIVOS" color="#00e5ff"
              valor={fmtNum(asociados?.activos)} sub={`de ${fmtNum(asociados?.total)} en padrón`} />
            <KpiCard icon={Smartphone} label="ADOPCIÓN PORTAL" color="#e879f9"
              valor={`${asociados?.adopcion_pct ?? '—'}%`}
              sub={`${fmtNum(asociados?.con_portal)} con acceso`} />
            <KpiCard icon={AlertTriangle} label="MORA PATRONAL" color="#ef4444" alerta={patronales?.total_mora > 0}
              valor={fmtCOP(patronales?.total_mora)}
              sub={`${patronales?.empresas_en_deuda ?? 0} empresa(s)`} />
            <KpiCard icon={ClipboardList} label="SOLICITUDES PEND." color="#f59e0b" alerta={(pendientes?.bonos + pendientes?.portal) > 0}
              valor={(pendientes?.bonos ?? 0) + (pendientes?.portal ?? 0)}
              sub={`${pendientes?.bonos ?? 0} bonos · ${pendientes?.portal ?? 0} portal`} />
          </div>
        </motion.div>

        {/* ── Cartera de créditos ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#08101e] border border-[#f9731618] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#f97316' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>CARTERA DE CRÉDITOS</PanelTitle>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#6aacbc] tracking-wider">PROYECCIÓN</span>
              {[6, 12].map(m => (
                <button key={m} onClick={() => setProyMeses(m)}
                  className="text-[9px] px-2 py-0.5 rounded-sm border transition-all tracking-wider"
                  style={{
                    borderColor: proyMeses === m ? '#f97316' : '#f9731622',
                    color:       proyMeses === m ? '#f97316' : '#6aacbc',
                    background:  proyMeses === m ? '#f9731611' : 'transparent',
                  }}>
                  {m}M
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Izquierda: KPIs + barra recuperación */}
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: 'SALDO PENDIENTE', valor: fmtCOP(cartera?.cartera_total), color: '#f97316' },
                  { label: 'CRÉDITOS ACTIVOS', valor: fmtNum(cartera?.creditos_activos), color: '#a0d4e0' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="bg-[#0d1829] rounded-sm p-3">
                    <p className="text-[10px] tracking-wider text-[#6aacbc] mb-1">{label}</p>
                    <p className="text-2xl font-bold" style={{ color }}>{valor}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'INTERESES / MES', valor: fmtCOP(cartera?.intereses_mensual), color: '#22c55e' },
                  { label: `PROYECCIÓN ${proyMeses}M`, valor: fmtCOP(cartera?.intereses_mensual * proyMeses), color: '#22c55e' },
                  { label: 'TASA PROM. POND.', valor: cartera?.tasa_promedio_ponderada != null ? `${Number(cartera.tasa_promedio_ponderada).toFixed(2)}% M.V.` : '—', color: '#a0d4e0' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="bg-[#0d1829] rounded-sm p-3">
                    <p className="text-[10px] tracking-wider text-[#6aacbc] mb-1">{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{valor}</p>
                  </div>
                ))}
              </div>
              {cartera?.obligacion_total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-[#6aacbc] mb-1">
                    <span>PENDIENTE VS CAPITAL ORIGINAL</span>
                    <span style={{ color: '#f97316' }}>
                      {Math.round((cartera.cartera_total / cartera.obligacion_total) * 100)}%
                    </span>
                  </div>
                  <div className="h-[6px] rounded-sm bg-[#0d1829]">
                    <div className="h-[6px] rounded-sm transition-all"
                      style={{
                        width: `${Math.round((cartera.cartera_total / cartera.obligacion_total) * 100)}%`,
                        background: 'linear-gradient(90deg, #f97316, #fb923c)',
                      }} />
                  </div>
                  <p className="text-xs text-[#6aacbc] mt-1">Capital original: {fmtCOP(cartera.obligacion_total)}</p>
                </div>
              )}
            </div>

            {/* Derecha: distribución por rangos */}
            <div>
              <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-3">DISTRIBUCIÓN POR MONTO</p>
              {!cartera?.distribucion?.length ? (
                <p className="text-[#334155] text-xs text-center py-4">SIN DATOS</p>
              ) : (() => {
                const maxCant = Math.max(...cartera.distribucion.map(r => r.cantidad), 1);
                return cartera.distribucion.map(r => (
                  <div key={r.rango} className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-[#6aacbc]" style={{ minWidth: 82 }}>{r.rango}</span>
                    <div className="flex-1 h-[6px] rounded-sm bg-[#0d1829]">
                      <div className="h-[6px] rounded-sm"
                        style={{ width: `${Math.round((r.cantidad / maxCant) * 100)}%`, background: '#f9731688' }} />
                    </div>
                    <span className="text-xs font-bold text-[#f97316]" style={{ minWidth: 24, textAlign: 'right' }}>{r.cantidad}</span>
                    <span className="text-xs text-[#6aacbc]" style={{ minWidth: 52, textAlign: 'right' }}>{fmtCOP(r.subtotal)}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </motion.div>

        {/* ── Flujo de vencimientos ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#08101e] border border-[#22c55e18] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#22c55e' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>CAPITAL DISPONIBLE PARA NUEVOS CRÉDITOS — PRÓXIMOS 12 MESES</PanelTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#22c55e]">
                {fmtCOP(cartera?.vencimientos?.reduce((s, r) => s + Number(r.capital), 0))}
              </span>
              <div className="relative group">
                <button className="text-[#334155] hover:text-[#6aacbc] transition-colors">
                  <Info size={14} />
                </button>
                <div className="absolute right-0 top-6 w-72 bg-[#0d1829] border border-[#22c55e22] rounded-sm p-3 z-10
                  opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                  <p className="text-[10px] text-[#6aacbc] leading-relaxed">
                    Muestra cuánto capital regresa a la cooperativa cada mes a medida que los créditos actuales llegan a su fecha de vencimiento.
                    Ese capital queda disponible para otorgar nuevos préstamos.
                  </p>
                  <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                    Las <span className="text-[#22c55e]">barras</span> representan el capital que vence en cada mes.
                    La <span className="text-[#f97316]">línea naranja</span> muestra el capital acumulado recuperado.
                    La <span className="text-[#6aacbc]">línea azul</span> muestra los intereses que genera la cartera activa cada mes (decrece conforme vencen créditos).
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPIs */}
            <div className="flex flex-col gap-3">
              {(() => {
                const v = cartera?.vencimientos ?? [];
                const total = v.reduce((s, r) => s + Number(r.capital), 0);
                const creditosTotal = v.reduce((s, r) => s + Number(r.creditos), 0);
                const proxMes = v[0];
                return (
                  <>
                    <div className="bg-[#0d1829] rounded-sm p-3">
                      <p className="text-[10px] tracking-wider text-[#6aacbc] mb-1">CAPITAL QUE VENCE (12M)</p>
                      <p className="text-2xl font-bold text-[#22c55e]">{fmtCOP(total)}</p>
                      <p className="text-xs text-[#475569] mt-0.5">{fmtNum(creditosTotal)} créditos</p>
                    </div>
                    {proxMes && (
                      <div className="bg-[#0d1829] rounded-sm p-3">
                        <p className="text-[10px] tracking-wider text-[#6aacbc] mb-1">PRÓXIMO MES</p>
                        <p className="text-xl font-bold text-[#a0d4e0]">{fmtCOP(proxMes.capital)}</p>
                        <p className="text-xs text-[#475569] mt-0.5">{proxMes.creditos} crédito(s)</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Gráfica */}
            <div className="lg:col-span-2">
              <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-2">CAPITAL POR MES · <span className="text-[#f97316]">─ ─</span> ACUMULADO · <span className="text-[#6aacbc]">···</span> INTERESES/MES · HOVER PARA DETALLE</p>
              <VencimientosChart data={cartera?.vencimientos} />
            </div>
          </div>
        </motion.div>

        {/* ── Distribución de plazos ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#08101e] border border-[#22c55e18] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#22c55e' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>DISTRIBUCIÓN DE PLAZOS</PanelTitle>
            <span className="text-[10px] tracking-widest text-[#475569]">{cartera?.plazos?.reduce((s, r) => s + r.creditos, 0) ?? 0} CRÉDITOS</span>
          </div>
          <PlazosChart data={cartera?.plazos} />
        </motion.div>

        {/* ── Bienestar ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#08101e] border border-[#22c55e18] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#22c55e' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>FONDO DE BIENESTAR</PanelTitle>
            <span className="text-[10px] tracking-widest text-[#475569]">{bienestar?.asociados ?? 0} ASOCIADOS</span>
          </div>

          {/* Fila 1: KPIs + desglose */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'RECAUDO MENSUAL', valor: fmtCOP(bienestar?.mensual), color: '#22c55e' },
                { label: 'PROYECCIÓN ANUAL', valor: fmtCOP(bienestar?.anual), color: '#6aacbc' },
                { label: 'APORTE PROMEDIO', valor: fmtCOP(bienestar?.asociados > 0 ? Math.round(bienestar.mensual / bienestar.asociados) : 0), color: '#a0d4e0' },
              ].map(({ label, valor, color }) => (
                <div key={label} className="bg-[#0d1829] rounded-sm p-3">
                  <p className="text-[10px] tracking-wider text-[#475569] mb-1">{label}</p>
                  <p className="text-xl font-bold font-mono" style={{ color }}>{valor}</p>
                </div>
              ))}
            </div>

            {/* Desglose por línea — barras horizontales */}
            <div className="lg:col-span-2">
              <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-3">DESGLOSE POR LÍNEA</p>
              {!bienestar?.lineas?.length ? (
                <div className="h-20 flex items-center justify-center text-xs text-[#334155]">SIN REGISTROS</div>
              ) : (() => {
                const maxMensual = Math.max(...bienestar.lineas.map(l => Number(l.mensual)), 1);
                return (
                  <div className="space-y-3">
                    {bienestar.lineas.map((l) => {
                      const pct = Math.round((Number(l.mensual) / maxMensual) * 100);
                      return (
                        <div key={l.nombre_linea}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-[#6aacbc]">{l.nombre_linea}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-[#475569]">{l.asociados} asoc.</span>
                              <span className="text-xs font-bold text-[#a0d4e0]">{fmtCOP(l.mensual)}/mes</span>
                              <span className="text-xs text-[#334155]">{fmtCOP(Number(l.mensual) * 12)}/año</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-[#0d1829] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: '#22c55e', opacity: 0.65 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fila 2: Gráfica recaudo mensual últimos 12 meses */}
          <div>
            <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-2">RECAUDO MENSUAL — ÚLTIMOS 12 MESES · HOVER PARA DETALLE</p>
            <BienestarChart serie={bienestar?.serie} />
          </div>
        </motion.div>

        {/* ── Seguros ───────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#08101e] border border-[#6aacbc18] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#6aacbc' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>SEGUROS, PÓLIZAS Y SERVICIOS FUNERARIOS</PanelTitle>
            <span className="text-[10px] tracking-widest text-[#475569]">{seguros?.asociados ?? 0} ASOCIADOS</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {[
              { label: 'RECAUDO MENSUAL',  valor: fmtCOP(seguros?.mensual), color: '#6aacbc' },
              { label: 'PROYECCIÓN ANUAL', valor: fmtCOP(seguros?.anual),   color: '#a0d4e0' },
              { label: 'PRIMA PROMEDIO',   valor: fmtCOP(seguros?.asociados > 0 ? Math.round(seguros.mensual / seguros.asociados) : 0), color: '#22c55e' },
            ].map(({ label, valor, color }) => (
              <div key={label} className="bg-[#0d1829] rounded-sm p-3">
                <p className="text-[10px] tracking-wider text-[#475569] mb-1">{label}</p>
                <p className="text-xl font-bold font-mono" style={{ color }}>{valor}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-3">
              <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-3">DESGLOSE POR LÍNEA</p>
              {!seguros?.lineas?.length ? (
                <div className="h-20 flex items-center justify-center text-xs text-[#334155]">SIN REGISTROS</div>
              ) : (() => {
                const maxMensual = Math.max(...seguros.lineas.map(l => Number(l.mensual)), 1);
                return (
                  <div className="space-y-3">
                    {seguros.lineas.map((l) => {
                      const pct = Math.round((Number(l.mensual) / maxMensual) * 100);
                      return (
                        <div key={l.nombre_linea}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-[#6aacbc]">{l.nombre_linea}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-[#475569]">{l.asociados} asoc.</span>
                              <span className="text-xs font-bold text-[#a0d4e0]">{fmtCOP(l.mensual)}/mes</span>
                              <span className="text-xs text-[#334155]">{fmtCOP(Number(l.mensual) * 12)}/año</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-[#0d1829] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: '#6aacbc', opacity: 0.65 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-2">RECAUDO MENSUAL — ÚLTIMOS 12 MESES · HOVER PARA DETALLE</p>
            <BienestarChart serie={seguros?.serie} color="#6aacbc" />
          </div>
        </motion.div>

        {/* ── Sorteos — ingresos ────────────────────────────────────────────── */}
        {sorteos?.length > 0 && (() => {
          const totalMensual = sorteos.reduce((s, r) => s + Number(r.ingreso_mensual), 0);
          const totalAnual   = totalMensual * 12;
          const totalBoletos = sorteos.reduce((s, r) => s + r.boletos_total, 0);
          const totalVendidos = sorteos.reduce((s, r) => s + r.boletos_asignados, 0);
          const ocupacionGlobal = totalBoletos > 0 ? Math.round((totalVendidos / totalBoletos) * 100) : 0;
          const maxIngreso = Math.max(...sorteos.map(r => Number(r.ingreso_mensual)), 1);

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-[#08101e] border border-[#f97316]/10 rounded-sm p-4 relative overflow-hidden mb-4">
              <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#f97316' }} />
              <div className="flex items-center justify-between mb-4">
                <PanelTitle>INGRESOS POR SORTEOS</PanelTitle>
                <span className="text-[10px] tracking-widest text-[#475569]">{sorteos.length} SORTEO{sorteos.length !== 1 ? 'S' : ''} ACTIVO{sorteos.length !== 1 ? 'S' : ''}</span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'INGRESO MENSUAL',  valor: fmtCOP(totalMensual),  color: '#f97316' },
                  { label: 'PROYECCIÓN ANUAL', valor: fmtCOP(totalAnual),    color: '#fbbf24' },
                  { label: 'BOLETOS VENDIDOS', valor: fmtNum(totalVendidos), color: '#a0d4e0' },
                  { label: 'OCUPACIÓN GLOBAL', valor: `${ocupacionGlobal}%`, color: ocupacionGlobal >= 80 ? '#22c55e' : ocupacionGlobal >= 50 ? '#f97316' : '#ef4444' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="bg-[#0d1829] rounded-sm p-3">
                    <p className="text-[10px] tracking-wider text-[#475569] mb-1">{label}</p>
                    <p className="text-xl font-bold font-mono" style={{ color }}>{valor}</p>
                  </div>
                ))}
              </div>

              {/* Desglose por sorteo */}
              <p className="text-[10px] tracking-[3px] text-[#f97316] mb-3">DESGLOSE POR SORTEO</p>
              <div className="space-y-4">
                {sorteos.map((s) => {
                  const pctIngreso  = Math.round((Number(s.ingreso_mensual) / maxIngreso) * 100);
                  const pctOcupacion = s.boletos_total > 0 ? Math.round((s.boletos_asignados / s.boletos_total) * 100) : 0;
                  const colorOcup = pctOcupacion >= 80 ? '#22c55e' : pctOcupacion >= 50 ? '#f97316' : '#ef4444';
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.estado === 'activo' ? 'bg-[#22c55e22] text-[#22c55e]' : 'bg-[#f9731622] text-[#f97316]'}`}>
                            {s.estado.toUpperCase()}
                          </span>
                          <span className="text-sm font-semibold text-[#a0d4e0]">{s.nombre}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-[#475569]">{fmtNum(s.boletos_asignados)}/{fmtNum(s.boletos_total)} boletos</span>
                          <span className="text-xs font-bold" style={{ color: colorOcup }}>{pctOcupacion}% ocupado</span>
                          <span className="text-xs font-bold text-[#f97316]">{fmtCOP(s.ingreso_mensual)}/mes</span>
                          <span className="text-xs text-[#334155]">{fmtCOP(Number(s.ingreso_mensual) * 12)}/año</span>
                        </div>
                      </div>
                      {/* Barra doble: ingreso (naranja) + ocupación (superpuesta, fina) */}
                      <div className="relative h-3 bg-[#0d1829] rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${pctIngreso}%`, backgroundColor: '#f97316', opacity: 0.5 }} />
                        <div className="absolute inset-y-0 left-0 h-1 top-1 rounded-full transition-all duration-500"
                          style={{ width: `${pctOcupacion}%`, backgroundColor: colorOcup, opacity: 0.9 }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-[#1e293b]">▬ ingreso relativo · — ocupación</span>
                        {s.solicitudes_pendientes > 0 && (
                          <span className="text-[9px] text-[#f97316]">{s.solicitudes_pendientes} solicitud{s.solicitudes_pendientes !== 1 ? 'es' : ''} pendiente{s.solicitudes_pendientes !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* ── Adopción portal — ancho completo ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#08101e] border border-[#e879f918] rounded-sm p-4 relative overflow-hidden mb-4">
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#e879f9' }} />
          <div className="flex items-center justify-between mb-4">
            <PanelTitle>ADOPCIÓN DEL PORTAL</PanelTitle>
            <div className="flex items-center gap-1 text-[#e879f9]">
              <TrendingUp size={12} />
              <span className="text-xs font-bold">{asociados?.adopcion_pct ?? '—'}%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Izquierda: KPIs + barra */}
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'ACTIVOS', valor: fmtNum(asociados?.activos), color: '#a0d4e0' },
                  { label: 'CON PORTAL', valor: fmtNum(asociados?.con_portal), color: '#e879f9' },
                  { label: 'SIN PORTAL', valor: fmtNum((asociados?.activos ?? 0) - (asociados?.con_portal ?? 0)), color: '#475569' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="bg-[#0d1829] rounded-sm p-3 text-center">
                    <p className="text-[10px] tracking-wider text-[#6aacbc] mb-1">{label}</p>
                    <p className="text-2xl font-bold" style={{ color }}>{valor}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#6aacbc] mb-1">
                  <span>ADOPCIÓN ACTUAL</span>
                  <span style={{ color: '#e879f9' }}>{asociados?.adopcion_pct ?? 0}%</span>
                </div>
                <div className="h-[6px] rounded-sm bg-[#0d1829] overflow-hidden">
                  <div className="h-[6px] rounded-sm transition-all" style={{
                    width: `${asociados?.adopcion_pct ?? 0}%`,
                    background: 'linear-gradient(90deg, #a855f7, #e879f9)',
                  }} />
                </div>
              </div>
            </div>
            {/* Derecha: gráfica diaria */}
            <div>
              <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-2">ACTIVACIONES — ÚLTIMOS 90 DÍAS</p>
              <AdopcionChart serie={asociados?.adopcion_serie} meta={asociados?.activos} />
            </div>
          </div>
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
        <div className="grid grid-cols-1 gap-4">

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
              <div className="overflow-y-auto max-h-64 pr-1" style={{ scrollbarWidth: 'thin' }}>
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

    {/* ── Modal exportar PDF ──────────────────────────────────────────────── */}
    {showExport && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)' }}
        onClick={() => setShowExport(false)}
      >
        <div
          className="bg-[#08101e] border border-[#e879f922] rounded-sm p-6 w-[360px] shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[8px] tracking-[3px] text-[#6aacbc]">// EXPORTAR INFORME</p>
              <p className="text-sm font-bold text-[#e879f9] tracking-wider mt-0.5">SELECCIONAR SECCIONES</p>
            </div>
            <button
              onClick={() => setShowExport(false)}
              className="text-[#334155] hover:text-[#6aacbc] transition-colors text-lg leading-none"
            >✕</button>
          </div>

          {/* Modo presentación */}
          <label
            className="flex items-center gap-3 cursor-pointer mb-4 pb-4 border-b border-[#e879f911]"
            onClick={() => setModoPresent(p => !p)}
          >
            <span
              className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-all"
              style={{ borderColor: modoPresent ? '#e879f9' : '#334155', background: modoPresent ? '#e879f922' : 'transparent' }}
            >
              {modoPresent && <span className="text-[8px] font-bold leading-none" style={{ color: '#e879f9' }}>✓</span>}
            </span>
            <div>
              <span className="text-[11px] tracking-wide text-[#e2e8f0]">Modo presentación ejecutiva</span>
              <p className="text-[9px] text-[#475569] mt-0.5">Portada + diapositivas con KPIs grandes y gráficas</p>
            </div>
          </label>

          {/* Seleccionar todas */}
          <button
            onClick={toggleTodas}
            className="w-full text-left text-[8px] tracking-widest text-[#475569] hover:text-[#6aacbc] transition-colors mb-3 border-b border-[#00e5ff08] pb-2"
          >
            {SECCIONES.every(s => secciones[s.id]) ? '— DESELECCIONAR TODAS' : '+ SELECCIONAR TODAS'}
          </button>

          {/* Checkboxes */}
          <div className="space-y-2 mb-6">
            {SECCIONES.map(s => (
              <label
                key={s.id}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => toggleSeccion(s.id)}
              >
                <span
                  className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: secciones[s.id] ? s.color : '#334155',
                    background:  secciones[s.id] ? `${s.color}22` : 'transparent',
                  }}
                >
                  {secciones[s.id] && (
                    <span className="text-[8px] font-bold leading-none" style={{ color: s.color }}>✓</span>
                  )}
                </span>
                <span
                  className="text-[11px] tracking-wide transition-colors"
                  style={{ color: secciones[s.id] ? '#a0d4e0' : '#475569' }}
                >
                  {s.label}
                </span>
              </label>
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowExport(false)}
              className="flex-1 py-2 text-[9px] tracking-widest text-[#475569] border border-[#1e293b] rounded-sm hover:border-[#334155] hover:text-[#6aacbc] transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={() => exportarPDF(secciones, modoPresent)}
              disabled={!SECCIONES.some(s => secciones[s.id])}
              className="flex-1 py-2 text-[9px] tracking-widest font-bold rounded-sm transition-all"
              style={{
                background: SECCIONES.some(s => secciones[s.id]) ? 'rgba(232,121,249,0.12)' : 'transparent',
                color:      SECCIONES.some(s => secciones[s.id]) ? '#e879f9' : '#334155',
                border:     `1px solid ${SECCIONES.some(s => secciones[s.id]) ? '#e879f933' : '#1e293b'}`,
                cursor:     SECCIONES.some(s => secciones[s.id]) ? 'pointer' : 'not-allowed',
              }}
            >
              GENERAR PDF
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default GerenciaDashboard;
