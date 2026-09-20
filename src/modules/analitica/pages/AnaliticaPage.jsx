import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Eye, Loader2, Minus, MousePointerClick, ShieldCheck, Users } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import { ACCENT } from '../components/AnaliticaLayout.jsx';

const RANGOS = [[7, '7 DÍAS'], [30, '30 DÍAS'], [90, '90 DÍAS'], [365, '1 AÑO']];
const NOMBRES_RUTA = {
  '/': 'Inicio', '/servicios': 'Servicios y créditos', '/beneficios': 'Beneficios', '/aliados': 'Aliados comerciales',
  '/empresas': 'Convenios para empresas', '/nosotros': 'Sobre nosotros', '/transparencia': 'Transparencia', '/pqrs': 'PQRS',
  '/pagos': 'Pagos en línea', '/blog': 'Blog (lista)',
};
const nombreRuta = (r) => NOMBRES_RUTA[r] || (r.startsWith('/blog/') ? `Blog: ${r.slice(6)}` : r);
const NOMBRES_DISPOSITIVO = { movil: 'Celular', escritorio: 'Computador', tablet: 'Tableta' };
const num = (n) => Number(n || 0).toLocaleString('es-CO');
const diaCorto = (d) => { const [, m, dd] = d.split('-'); return `${Number(dd)}/${Number(m)}`; };
const diaLargo = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

// Variación contra el periodo anterior de la misma duración
const Variacion = ({ actual, anterior }) => {
  if (!anterior) return <span className="text-[10px] text-slate-600">sin periodo anterior</span>;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  const Icono = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] ${pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-red-400' : 'text-slate-500'}`}>
      <Icono size={11} /> {pct > 0 ? '+' : ''}{pct} % <span className="text-slate-600">vs. periodo anterior</span>
    </span>
  );
};

const Kpi = ({ icono: Icono, titulo, valor, actual, anterior, color, nota }) => (
  <div className="relative overflow-hidden rounded border bg-[#08101e] px-4 py-4" style={{ borderColor: `${color}22` }}>
    <div className="absolute left-0 top-0 h-[1px] w-1/3" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    <div className="flex items-center gap-2 text-[9px] tracking-[3px] text-[#6aacbc]"><Icono size={13} style={{ color }} /> {titulo}</div>
    <p className="mt-2 text-3xl font-bold" style={{ color: '#e2f4f8' }}>{num(valor)}</p>
    <div className="mt-1 min-h-[14px]">{actual !== undefined ? <Variacion actual={actual} anterior={anterior} /> : <span className="text-[10px] text-slate-600">{nota}</span>}</div>
  </div>
);

// Lista con barras proporcionales
const Barras = ({ titulo, filas, etiqueta, valorKey = 'vistas', vacio = 'Sin datos en este periodo' }) => {
  const max = Math.max(1, ...filas.map((f) => f[valorKey]));
  return (
    <section className="rounded border border-slate-800/60 bg-slate-900/20 p-4">
      <h2 className="mb-3 text-[10px] tracking-[3px] text-slate-500">{titulo}</h2>
      {filas.length === 0 && <p className="py-4 text-center text-xs text-slate-600">{vacio}</p>}
      <ul className="space-y-2">
        {filas.map((f) => (
          <li key={etiqueta(f)}>
            <div className="mb-0.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-300" title={etiqueta(f)}>{etiqueta(f)}</span>
              <span className="shrink-0 font-bold text-slate-200">{num(f[valorKey])}</span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-slate-800"><div className="h-full rounded" style={{ width: `${(f[valorKey] / max) * 100}%`, background: ACCENT }} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const TooltipGrafica = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-slate-700 bg-[#0b1626] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-slate-400">{diaLargo(label)}</p>
      {payload.map((p) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{num(p.value)}</strong></p>)}
    </div>
  );
};

const AnaliticaPage = () => {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    apiService.get('/analitica/resumen', { params: { dias } })
      .then(({ data }) => { if (vivo) { setDatos(data); setError(''); } })
      .catch((err) => vivo && setError(err.response?.status === 403 ? 'No tienes permiso para ver este módulo.' : 'No se pudo cargar la analítica.'))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [dias]);

  const sinDatos = datos && datos.totales.vistas === 0;
  const totalClics = datos?.clics.reduce((n, c) => n + c.total, 0) || 0;
  const totalDisp = datos?.dispositivos.reduce((n, d) => n + d.vistas, 0) || 0;
  const dispositivos = useMemo(() => (datos?.dispositivos || []).map((d) => ({ ...d, nombre: `${NOMBRES_DISPOSITIVO[d.dispositivo] || d.dispositivo} · ${totalDisp ? Math.round((d.vistas / totalDisp) * 100) : 0} %` })), [datos, totalDisp]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-500" />
          <span>Medición propia del sitio, <strong className="text-slate-300">sin cookies y sin datos personales</strong>: no se guarda la IP ni el navegador de nadie, y los visitantes se cuentan por día.</span>
        </p>
        <div className="flex gap-1" role="group" aria-label="Periodo">
          {RANGOS.map(([d, n]) => (
            <button key={d} onClick={() => setDias(d)} aria-pressed={dias === d}
                    className={`rounded border px-3 py-1.5 text-[10px] tracking-[2px] transition-colors ${dias === d ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{n}</button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-300">{error}</p>}
      {cargando && !datos && !error && <p className="flex items-center gap-2 py-10 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}

      {datos && (
        <div className={`space-y-5 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
          <p className="text-[10px] tracking-wider text-slate-600">DEL {diaLargo(datos.rango.desde).toUpperCase()} AL {diaLargo(datos.rango.hasta).toUpperCase()} · HORA DE COLOMBIA</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi icono={Eye} titulo="VISITAS A PÁGINAS" valor={datos.totales.vistas} actual={datos.totales.vistas} anterior={datos.totales.anterior.vistas} color="#00e5ff" />
            <Kpi icono={Users} titulo="VISITANTES" valor={datos.totales.visitantes} actual={datos.totales.visitantes} anterior={datos.totales.anterior.visitantes} color="#34d399" />
            <Kpi icono={MousePointerClick} titulo="CLICS CLAVE" valor={datos.totales.clics} actual={datos.totales.clics} anterior={datos.totales.anterior.clics} color="#f59e0b" />
          </div>
          <p className="-mt-2 text-[10px] leading-relaxed text-slate-600">“Visitantes” son personas distintas por día, sumadas: quien vuelve otro día cuenta otra vez, porque la medición no puede reconocerlo.</p>

          {sinDatos ? (
            <div className="rounded border border-slate-800/60 p-10 text-center">
              <Eye size={28} className="mx-auto text-slate-700" />
              <p className="mt-3 text-sm text-slate-300">Todavía no hay visitas en este periodo</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">La medición empieza cuando el sitio actualizado está publicado. Apenas alguien lo visite, aquí verás las cifras.</p>
            </div>
          ) : (
            <>
              <section className="rounded border border-slate-800/60 bg-slate-900/20 p-4">
                <h2 className="mb-3 text-[10px] tracking-[3px] text-slate-500">VISITAS POR DÍA</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datos.serie} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gVistas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00e5ff" stopOpacity={0.35} /><stop offset="95%" stopColor="#00e5ff" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gVisit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3} /><stop offset="95%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={diaCorto} stroke="#475569" tick={{ fontSize: 10 }} minTickGap={24} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip content={<TooltipGrafica />} />
                      <Area type="monotone" dataKey="vistas" name="Visitas" stroke="#00e5ff" strokeWidth={2} fill="url(#gVistas)" />
                      <Area type="monotone" dataKey="visitantes" name="Visitantes" stroke="#34d399" strokeWidth={2} fill="url(#gVisit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#00e5ff]" /> Visitas</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#34d399]" /> Visitantes</span>
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <Barras titulo="PÁGINAS MÁS VISTAS" filas={datos.paginas} etiqueta={(f) => nombreRuta(f.ruta)} />
                <Barras titulo="DE DÓNDE LLEGAN" filas={datos.origenes} etiqueta={(f) => f.origen} />
                <Barras titulo="DISPOSITIVOS" filas={dispositivos} etiqueta={(f) => f.nombre} />
                <Barras titulo={`CLICS CLAVE · ${num(totalClics)}`} filas={datos.clics} etiqueta={(f) => f.nombre} valorKey="total" vacio="Sin clics en este periodo" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnaliticaPage;
