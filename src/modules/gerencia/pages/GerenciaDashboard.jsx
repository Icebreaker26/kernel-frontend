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
    {sub && <p className="text-[10px] text-[#6aacbc]">{sub}</p>}
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

  const { asociados, sorteos, sorteos_serie, patronales, cartera, bienestar, seguros, logs, pendientes } = data || {};
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

        {/* ── KPI Strip — Fila 1: Ingresos ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <p className="text-[10px] tracking-[3px] text-[#475569] mb-2">// INGRESOS MENSUALES PROYECTADOS</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
            <KpiCard icon={TrendingUp} label="INTERESES CARTERA" color="#f97316"
              valor={fmtCOP(cartera?.intereses_mensual)}
              sub={cartera?.tasa_promedio_ponderada != null ? `tasa prom. ${Number(cartera.tasa_promedio_ponderada).toFixed(2)}% M.V.` : '—'} />
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
            const totalMensual = (Number(cartera?.intereses_mensual) || 0)
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
  );
};

export default GerenciaDashboard;
