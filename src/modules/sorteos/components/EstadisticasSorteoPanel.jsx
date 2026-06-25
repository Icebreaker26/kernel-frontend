import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
const MapaColombia = lazy(() => import('./MapaColombia.jsx'));

// ── Colores ──────────────────────────────────────────────────────────────────
const C = {
  emerald: '#10b981',
  red:     '#f43f5e',
  amber:   '#f59e0b',
  slate:   '#475569',
  blue:    '#3b82f6',
};

const PIE_COLORS = [C.emerald, C.slate, C.amber, C.red];

// ── Tooltip personalizado ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Tarjeta métrica ──────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-4">
    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
  </div>
);

// ── Panel principal ──────────────────────────────────────────────────────────
const EstadisticasSorteoPanel = ({ sorteoId, sorteoNombre }) => {
  const [datos, setDatos]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const panelRef = useRef(null);

  const exportarPDF = async () => {
    if (!panelRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(panelRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();
      const margin  = 12;
      const contentW = pdfW - margin * 2;

      // Header
      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Estadísticas — ${sorteoNombre ?? 'Sorteo'}`, margin, margin + 4);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado el ${new Date().toLocaleString('es-CO')}`, margin, margin + 10);

      // Imagen del panel
      const imgH = (canvas.height / canvas.width) * contentW;
      const startY = margin + 16;

      if (imgH <= pdfH - startY - margin) {
        pdf.addImage(imgData, 'PNG', margin, startY, contentW, imgH);
      } else {
        // Si no cabe en una página, escala para que quepa
        const scale  = (pdfH - startY - margin) / imgH;
        pdf.addImage(imgData, 'PNG', margin, startY, contentW * scale, imgH * scale);
      }

      pdf.save(`estadisticas_${(sorteoNombre ?? 'sorteo').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF generado');
    } catch {
      toast.error('Error al generar PDF');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    apiService.get(`/sorteos/${sorteoId}/estadisticas`)
      .then(({ data }) => setDatos(data))
      .catch(() => toast.error('Error cargando estadísticas'))
      .finally(() => setLoading(false));
  }, [sorteoId]);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!datos)  return <p className="text-slate-600 text-sm">Sin datos disponibles</p>;

  const { ocupacion, evolucion, porEmpresa, topAsociados, porCiudad } = datos;

  const ocupacionPct = ocupacion.total
    ? Math.round((ocupacion.asignados / ocupacion.total) * 100)
    : 0;

  const pieData = [
    { name: 'Asignados',          value: ocupacion.asignados },
    { name: 'Libres',             value: ocupacion.libres },
    { name: 'Pend. adquisición',  value: ocupacion.pendiente_adquisicion },
    { name: 'Pend. retiro',       value: ocupacion.pendiente_retiro },
  ].filter((d) => d.value > 0);

  return (
    <div ref={panelRef} className="flex flex-col gap-8">

      {/* ── Encabezado con botón exportar ── */}
      <div className="flex justify-end">
        <button
          onClick={exportarPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-rose-600/60 text-slate-400 hover:text-rose-400 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
          Exportar PDF
        </button>
      </div>

      {/* ── Métricas clave ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Asignados"
          value={ocupacion.asignados}
          sub={`de ${ocupacion.total} totales`}
          color="text-emerald-400"
        />
        <MetricCard
          label="Libres"
          value={ocupacion.libres}
          color="text-slate-300"
        />
        <MetricCard
          label="Ocupación"
          value={`${ocupacionPct}%`}
          sub={`${ocupacion.pendiente_adquisicion} pendientes adquisición`}
          color={ocupacionPct >= 80 ? 'text-emerald-400' : ocupacionPct >= 50 ? 'text-amber-400' : 'text-red-400'}
        />
        <MetricCard
          label="Pend. retiro"
          value={ocupacion.pendiente_retiro}
          color={ocupacion.pendiente_retiro > 0 ? 'text-amber-400' : 'text-slate-400'}
        />
      </div>

      {/* ── Ocupación: pie + barra horizontal ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pie */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium mb-4">Distribución de boletos</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top empresas */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium mb-4">Boletos por empresa (top 10)</p>
          {porEmpresa.length === 0 ? (
            <p className="text-slate-600 text-xs mt-8 text-center">Sin datos</p>
          ) : (() => {
            const maxLen = Math.max(...porEmpresa.map((e) => (e.empresa ?? '').length));
            const yWidth = Math.min(Math.max(maxLen * 6.5, 80), 200);
            const rowH   = 28;
            const chartH = Math.max(porEmpresa.length * rowH + 16, 120);
            return (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={porEmpresa} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="empresa"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    width={yWidth}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                  <Bar dataKey="boletos" fill={C.emerald} radius={[0, 4, 4, 0]} name="Boletos" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* ── Top asociados ── */}
      {topAsociados?.length > 0 && (() => {
        const maxLen = Math.max(...topAsociados.map((a) => (a.nombre ?? '').length));
        const yWidth = Math.min(Math.max(maxLen * 6.5, 80), 220);
        const rowH   = 28;
        const chartH = Math.max(topAsociados.length * rowH + 16, 120);
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs font-medium mb-4">Top 10 asociados con más bonos</p>
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={topAsociados} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  width={yWidth}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                <Bar dataKey="boletos" fill={C.blue} radius={[0, 4, 4, 0]} name="Bonos" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ── Mapa de Colombia ── */}
      {porCiudad?.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium mb-4">Distribución geográfica de bonos</p>
          <Suspense fallback={<div className="h-[420px] flex items-center justify-center text-slate-600 text-xs">Cargando mapa...</div>}>
            <MapaColombia porCiudad={porCiudad} />
          </Suspense>
        </div>
      )}

      {/* ── Evolución: área acumulada + compras vs retiros ── */}
      {evolucion.length > 0 && (
        <>
          {/* Acumulado */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs font-medium mb-4">Boletos activos por día</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucion} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="fecha" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="asignados"
                  stroke={C.emerald}
                  strokeWidth={2}
                  fill="url(#gAcum)"
                  name="Boletos activos"
                  dot={evolucion.length < 15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Compras vs retiros por día */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs font-medium mb-4">Compras vs retiros por día</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucion} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="fecha" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                <Legend
                  formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                  iconSize={8}
                />
                <Bar dataKey="compras" fill={C.emerald} radius={[3, 3, 0, 0]} name="Compras" />
                <Bar dataKey="retiros" fill={C.red}     radius={[3, 3, 0, 0]} name="Retiros" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {evolucion.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-600 text-sm">Aún no hay movimientos registrados en este sorteo</p>
        </div>
      )}
    </div>
  );
};

export default EstadisticasSorteoPanel;
