import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Ticket, Banknote, Wallet,
  Loader2, ChevronRight, X, Phone, Mail, UserCircle,
  Edit2, Check, FileText, Trash2, PlusCircle, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

const COLOR = '#f97316';

const fmtMoney = (v) => v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : '—';
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const StatCard = ({ icon: Icon, label, value, sub, color = COLOR }) => (
  <div className="bg-[#08101e] border rounded-sm p-4 relative overflow-hidden" style={{ borderColor: color + '22' }}>
    <div className="absolute inset-0 opacity-[0.05]"
      style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
    <div className="relative">
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-[8px] tracking-[2px] uppercase" style={{ color: color + 'aa' }}>{label}</p>
        <Icon size={13} style={{ color: color + '55' }} className="shrink-0 mt-0.5" />
      </div>
      <p className="font-bold font-mono text-xl leading-none" style={{ color, textShadow: `0 0 16px ${color}44` }}>{value ?? '—'}</p>
      {sub && <p className="text-[8px] tracking-[2px] mt-1.5 uppercase" style={{ color: color + '77' }}>{sub}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-[10px] font-mono" style={{ boxShadow: '0 0 20px #00e5ff11' }}>
      {label && <p className="text-[#6aacbc] mb-1 tracking-wider">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.color ?? COLOR }}>
          {p.name}: <span className="font-bold">{p.dataKey === 'aporte_mensual' ? fmtMoney(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const ChartCard = ({ titulo, children }) => (
  <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm p-5">
    <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-5">{titulo}</p>
    {children}
  </div>
);

const SelectFiltro = ({ value, onChange, opciones }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] focus:outline-none cursor-pointer font-mono">
    {opciones.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
  </select>
);

const exportarPDF = (empresa, stats, asociados) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fecha = new Date().toLocaleDateString('es-CO');
  doc.setFillColor(8, 16, 30);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EXTRACTO DE EMPRESA', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(160, 212, 224);
  doc.text(empresa.nombre.toUpperCase(), 14, 24);
  doc.setFontSize(8);
  doc.setTextColor(106, 172, 188);
  doc.text(`Código: ${empresa.codigo}  ·  Generado: ${fecha}`, 14, 31);
  let y = 50;
  const statsData = [
    ['Asociados activos', stats.asociados_activos],
    ['Bonos activos', stats.bonos_activos],
    ['Aportes mensuales', fmtMoney(stats.sum_aportes)],
    ['Saldo a favor', fmtMoney(stats.saldo_favor)],
    ['Saldo pendiente', fmtMoney(stats.saldo_pendiente)],
  ];
  statsData.forEach(([k, v], i) => {
    const x = 14 + (i % 3) * 65;
    if (i % 3 === 0 && i > 0) y += 14;
    doc.setTextColor(106, 172, 188);
    doc.setFont('helvetica', 'normal');
    doc.text(k.toUpperCase(), x, y);
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v ?? '—'), x, y + 6);
  });
  y += 20;
  autoTable(doc, {
    startY: y,
    head: [['Nombre', 'Cédula', 'Cuota', 'Aporte', 'Saldo', 'Estado']],
    body: asociados.map((a) => {
      const s = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
      return [
        `${a.apellido} ${a.nombre}`, a.codigo,
        labelClaseCuota(a.clase_cuota) ?? '—',
        fmtMoney(a.valor_aporte),
        s === null ? '—' : s === 0 ? 'Al día' : s < 0 ? `A favor ${fmtMoney(Math.abs(s))}` : `Pendiente ${fmtMoney(s)}`,
        a.is_active ? 'Activo' : 'Inactivo',
      ];
    }),
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [8, 16, 30], textColor: [106, 172, 188], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [10, 20, 40] },
    bodyStyles: { textColor: [160, 212, 224] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
  });
  doc.save(`extracto-${empresa.codigo}-${fecha.replace(/\//g, '-')}.pdf`);
  toast.success('PDF generado');
};

const FILTROS_INIT = { estado: '', cuota: '', saldo: '', portal: '' };

const TabAsociados = ({ asociados, navigate }) => {
  const [q, setQ]             = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INIT);
  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }));
  const hayFiltros = q || Object.values(filtros).some(Boolean);

  const filtrados = useMemo(() => asociados.filter((a) => {
    if (q) {
      const s = q.toLowerCase();
      if (!a.codigo.toLowerCase().includes(s) && !a.nombre.toLowerCase().includes(s) && !a.apellido.toLowerCase().includes(s)) return false;
    }
    if (filtros.estado === 'activo'   && !a.is_active) return false;
    if (filtros.estado === 'inactivo' &&  a.is_active) return false;
    if (filtros.cuota && a.clase_cuota !== filtros.cuota) return false;
    if (filtros.portal === 'si' && !a.portal_activo) return false;
    if (filtros.portal === 'no' &&  a.portal_activo) return false;
    if (filtros.saldo) {
      const s = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
      if (filtros.saldo === 'favor'     && !(s < 0))  return false;
      if (filtros.saldo === 'pendiente' && !(s > 0))  return false;
      if (filtros.saldo === 'aldia'     && !(s === 0)) return false;
    }
    return true;
  }), [asociados, q, filtros]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-[#08101e] border border-[#00e5ff11] rounded-sm px-3 py-2 flex-1 min-w-48">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o cédula..."
            className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono" />
        </div>
        <SelectFiltro value={filtros.estado} onChange={(v) => setF('estado', v)} opciones={[['', 'Estado'], ['activo', 'Activos'], ['inactivo', 'Inactivos']]} />
        <SelectFiltro value={filtros.cuota}  onChange={(v) => setF('cuota', v)}  opciones={[['', 'Cuota'], ['1', 'Quincenal'], ['2', 'Mensual']]} />
        <SelectFiltro value={filtros.saldo}  onChange={(v) => setF('saldo', v)}  opciones={[['', 'Saldo'], ['favor', 'A favor'], ['aldia', 'Al día'], ['pendiente', 'Pendiente']]} />
        <SelectFiltro value={filtros.portal} onChange={(v) => setF('portal', v)} opciones={[['', 'Portal'], ['si', 'Con acceso'], ['no', 'Sin acceso']]} />
        {hayFiltros && (
          <button onClick={() => { setQ(''); setFiltros(FILTROS_INIT); }}
            className="flex items-center gap-1 px-3 py-2 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors">
            <X size={11} /> Limpiar
          </button>
        )}
      </div>
      <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">
        ASOCIADOS <span style={{ color: COLOR }}>({filtrados.length}{filtrados.length !== asociados.length ? ` de ${asociados.length}` : ''})</span>
      </p>
      <div className="border border-[#00e5ff0d] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff08] bg-[#00e5ff04]">
              {['NOMBRE', 'CÉDULA', 'CUOTA', 'APORTE', 'SALDO', 'ESTADO', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6aacbc] tracking-widest text-[9px]">SIN RESULTADOS</td></tr>
            ) : filtrados.map((a, i) => {
              const saldo = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
              return (
                <motion.tr key={a.codigo} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.2) }}
                  onClick={() => navigate(`/asociados/${a.codigo}`)}
                  className="border-b border-[#00e5ff06] hover:bg-[#00e5ff04] transition-colors cursor-pointer group">
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
                    <span className={`px-1.5 py-0.5 rounded-sm border text-[8px] tracking-wider ${a.is_active ? 'bg-[#00e5ff0d] text-[#00e5ff] border-[#00e5ff22]' : 'bg-[#ff3d3d0d] text-[#ff3d3d] border-[#ff3d3d22]'}`}>
                      {a.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLOR }} />
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

const TabEstadisticas = ({ asociados, stats, historialData }) => {
  const activos = asociados.filter(a => a.is_active);
  const PIE_COLORS = [COLOR, '#00e5ff', '#a78bfa', '#ffb700', '#10b981'];

  const distCuota = useMemo(() => {
    const map = {};
    activos.forEach(a => { const l = labelClaseCuota(a.clase_cuota) ?? 'Sin cuota'; map[l] = (map[l] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activos]);

  const distSaldo = useMemo(() => {
    let favor = 0, aldia = 0, pendiente = 0;
    activos.forEach(a => {
      const s = a.saldo_aporte != null ? Number(a.saldo_aporte) : null;
      if (s == null) return;
      if (s < 0) favor++; else if (s > 0) pendiente++; else aldia++;
    });
    return [
      { name: 'A favor',   value: favor,     fill: '#10b981' },
      { name: 'Al día',    value: aldia,     fill: '#6aacbc' },
      { name: 'Pendiente', value: pendiente, fill: '#ff3d3d' },
    ].filter(d => d.value > 0);
  }, [activos]);

  const topAportes = useMemo(() =>
    [...activos].filter(a => a.valor_aporte != null)
      .sort((a, b) => Number(b.valor_aporte) - Number(a.valor_aporte)).slice(0, 10)
      .map(a => ({ name: `${a.nombre} ${a.apellido}`.slice(0, 22), value: Number(a.valor_aporte) }))
  , [activos]);

  const conPortal = activos.filter(a => a.portal_activo).length;
  const sinPortal = activos.length - conPortal;
  const distPortal = [
    { name: 'Con acceso', value: conPortal, fill: COLOR },
    { name: 'Sin acceso', value: sinPortal, fill: '#6aacbc33' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard titulo="DISTRIBUCIÓN POR CLASE DE CUOTA">
          {distCuota.length === 0 ? <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={distCuota} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {distCuota.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {distCuota.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[9px] text-[#6aacbc]">{d.name}</span>
                    <span className="text-[9px] font-bold text-[#a0d4e0]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard titulo="ESTADO DE SALDO — ASOCIADOS ACTIVOS">
          {distSaldo.length === 0 ? <p className="text-[#6aacbc] text-xs text-center py-8">Sin datos</p> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={distSaldo} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {distSaldo.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {distSaldo.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                    <span className="text-[9px] text-[#6aacbc]">{d.name}</span>
                    <span className="text-[9px] font-bold text-[#a0d4e0]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {historialData.length > 0 && (
        <ChartCard titulo="EVOLUCIÓN MENSUAL — ÚLTIMOS 12 MESES">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historialData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAporte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAsoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" />
              <XAxis dataKey="label" tick={{ fill: '#6aacbc', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left"  hide />
              <YAxis yAxisId="right" orientation="right" hide />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left"  type="monotone" dataKey="aporte_mensual"    name="Aporte"    stroke={COLOR}    fill="url(#gradAporte)" strokeWidth={2}   dot={false} />
              <Area yAxisId="right" type="monotone" dataKey="asociados_activos" name="Asociados" stroke="#00e5ff" fill="url(#gradAsoc)"   strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 inline-block" style={{ background: COLOR }} /><span className="text-[9px] text-[#6aacbc]">Aporte mensual</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#00e5ff] inline-block" /><span className="text-[9px] text-[#6aacbc]">Asociados activos</span></div>
          </div>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {topAportes.length > 0 && (
          <ChartCard titulo="TOP 10 — CUOTA DE APORTE">
            <ResponsiveContainer width="100%" height={topAportes.length * 34 + 16}>
              <BarChart data={topAportes} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00e5ff08" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={145}
                  tick={{ fill: '#6aacbc', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <div className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-[10px] font-mono">
                    <p style={{ color: COLOR }}>{fmtMoney(payload[0].value)}</p>
                  </div>;
                }} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={14} fill={COLOR}
                  label={{ position: 'right', fill: '#6aacbc', fontSize: 8, formatter: (v) => fmtMoney(v) }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard titulo="ADOPCIÓN DEL PORTAL">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={distPortal} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {distPortal.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <div>
                <p className="text-[#6aacbc] text-[8px] tracking-[2px] mb-0.5">CON ACCESO</p>
                <p className="font-mono font-bold text-2xl" style={{ color: COLOR }}>{conPortal}</p>
                <p className="text-[8px] text-[#6aacbc]">{activos.length > 0 ? `${Math.round(conPortal / activos.length * 100)}%` : '—'}</p>
              </div>
              <div>
                <p className="text-[#6aacbc] text-[8px] tracking-[2px] mb-0.5">SIN ACCESO</p>
                <p className="font-mono font-bold text-2xl text-[#6aacbc]">{sinPortal}</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

const TabContacto = ({ empresa, onUpdate }) => {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    contacto_nombre:   empresa.contacto_nombre   ?? '',
    contacto_telefono: empresa.contacto_telefono ?? '',
    contacto_email:    empresa.contacto_email    ?? '',
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    setSaving(true);
    try {
      const { data } = await apiService.put(`/empresas/${empresa.codigo}/contacto`, form);
      onUpdate(data);
      setEditando(false);
      toast.success('Contacto actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ icon: Icon, label, field, placeholder }) => (
    <div className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={11} style={{ color: COLOR + '88' }} />
        <p className="text-[8px] tracking-[2px] text-[#6aacbc]">{label}</p>
      </div>
      {editando
        ? <input value={form[field]} onChange={(e) => setF(field, e.target.value)} placeholder={placeholder}
            className="w-full bg-transparent border-b border-[#f9731644] text-[#a0d4e0] text-sm font-mono focus:outline-none py-1" />
        : <p className="text-[#a0d4e0] font-mono text-sm">{form[field] || <span className="text-[#6aacbc] text-[10px]">Sin registrar</span>}</p>
      }
    </div>
  );

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] tracking-[3px] text-[#6aacbc]">DATOS DE CONTACTO</p>
        {!editando
          ? <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#f97316] transition-colors"><Edit2 size={11} /> EDITAR</button>
          : <div className="flex gap-2">
              <button onClick={() => setEditando(false)} className="flex items-center gap-1 text-[9px] text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"><X size={11} /> Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="flex items-center gap-1 text-[9px] px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-50"
                style={{ color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }}>
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
              </button>
            </div>
        }
      </div>
      <Field icon={UserCircle} label="NOMBRE DEL CONTACTO" field="contacto_nombre"   placeholder="Nombre y apellido" />
      <Field icon={Phone}      label="TELÉFONO"            field="contacto_telefono" placeholder="Ej. 300 123 4567" />
      <Field icon={Mail}       label="CORREO ELECTRÓNICO"  field="contacto_email"    placeholder="correo@empresa.com" />
    </div>
  );
};

const TabNotas = ({ codigo, notasIniciales }) => {
  const [notas, setNotas]   = useState(notasIniciales);
  const [texto, setTexto]   = useState('');
  const [saving, setSaving] = useState(false);

  const agregar = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiService.post(`/empresas/${codigo}/notas`, { contenido: texto.trim() });
      setNotas(n => [data, ...n]);
      setTexto('');
      toast.success('Nota agregada');
    } catch {
      toast.error('Error al guardar nota');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    try {
      await apiService.delete(`/empresas/notas/${id}`);
      setNotas(n => n.filter(x => x.id !== id));
      toast.success('Nota eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-[#08101e] border border-[#f9731622] rounded-sm p-4">
        <p className="text-[8px] tracking-[3px] text-[#6aacbc] mb-3">NUEVA NOTA</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          placeholder="Escribe una observación, acuerdo o seguimiento..."
          className="w-full bg-transparent text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none font-mono resize-none" />
        <div className="flex justify-end mt-2">
          <button onClick={agregar} disabled={saving || !texto.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] rounded-sm border transition-all disabled:opacity-40"
            style={{ color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : <PlusCircle size={11} />} AGREGAR
          </button>
        </div>
      </div>
      {notas.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-3 opacity-10" style={{ color: COLOR }} />
          <p className="text-[#6aacbc] text-[9px] tracking-[3px]">SIN NOTAS AÚN</p>
        </div>
      ) : (
        <AnimatePresence>
          {notas.map((n) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-[#08101e] border border-[#00e5ff0d] rounded-sm p-4 group">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-[#a0d4e0] font-mono leading-relaxed flex-1">{n.contenido}</p>
                <button onClick={() => eliminar(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6aacbc] hover:text-[#ff3d3d] shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex gap-3 mt-2">
                {n.autor?.trim() && <span className="text-[8px] text-[#6aacbc] tracking-wider">{n.autor.trim()}</span>}
                <span className="text-[8px] text-[#6aacbc]">{fmtFecha(n.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

const TABS = [
  { id: 'asociados',    label: 'ASOCIADOS' },
  { id: 'estadisticas', label: 'ESTADÍSTICAS' },
  { id: 'contacto',     label: 'CONTACTO' },
  { id: 'notas',        label: 'NOTAS' },
];

const EmpresaPerfil = () => {
  const { codigo }              = useParams();
  const navigate                = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [historial, setHistorial] = useState([]);
  const [tab, setTab]           = useState('asociados');

  useEffect(() => {
    apiService.get(`/empresas/${codigo}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Error cargando empresa'))
      .finally(() => setLoading(false));
    apiService.get(`/empresas/${codigo}/historial`)
      .then(({ data }) => setHistorial(data))
      .catch(() => {});
  }, [codigo]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={22} className="animate-spin" style={{ color: COLOR }} /></div>;
  if (!data)   return <div className="text-center py-24"><p className="text-[#6aacbc] text-xs tracking-[3px]">EMPRESA NO ENCONTRADA</p></div>;

  const { empresa, stats, asociados, notas } = data;
  const notasCount = notas?.length ?? 0;

  return (
    <>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">// PERFIL DE EMPRESA</p>
          <h1 className="text-2xl font-bold tracking-wider leading-snug" style={{ color: COLOR, textShadow: `0 0 20px ${COLOR}44` }}>
            {empresa.nombre.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-[#6aacbc] text-[9px] tracking-widest">{empresa.codigo}</p>
            <span className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border"
              style={empresa.is_active ? { color: COLOR, borderColor: COLOR + '44', background: COLOR + '11' } : { color: '#6aacbc', borderColor: '#6aacbc33', background: '#6aacbc11' }}>
              {empresa.is_active ? 'ACTIVA' : 'RETIRADA'}
            </span>
            {empresa.fecha_ingreso && <span className="text-[#6aacbc] text-[9px]">Desde {fmtFecha(empresa.fecha_ingreso)}</span>}
          </div>
        </div>
        <button onClick={() => exportarPDF(empresa, stats, asociados)}
          className="flex items-center gap-2 px-4 py-2 text-[9px] tracking-widest border rounded-sm transition-all hover:bg-[#f9731611] shrink-0"
          style={{ color: COLOR, borderColor: COLOR + '44' }}>
          <Download size={12} /> EXTRACTO PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Users}    label="Asociados activos"  value={stats.asociados_activos} sub={`${stats.asociados_total} en total`}  color={COLOR} />
        <StatCard icon={Ticket}   label="Bonos activos"      value={stats.bonos_activos}     sub="en sorteos"                           color="#00e5ff" />
        <StatCard icon={Banknote} label="Aportes mensuales"  value={fmtMoney(stats.sum_aportes)} sub="suma cuotas activas"              color="#a78bfa" />
        <StatCard icon={Wallet}   label="Saldo a favor"      value={fmtMoney(stats.saldo_favor)}
          sub={Number(stats.saldo_pendiente) > 0 ? `${fmtMoney(stats.saldo_pendiente)} pendiente` : 'sin pendientes'}
          color="#10b981" />
      </div>

      <div className="flex border-b border-[#00e5ff11] mb-6">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-3 text-[9px] tracking-[2px] transition-all border-b-2 -mb-px relative ${tab === id ? 'border-[#f97316]' : 'text-[#6aacbc] border-transparent hover:text-[#a0d4e0]'}`}
            style={tab === id ? { color: COLOR, textShadow: `0 0 8px ${COLOR}44` } : {}}>
            {label}
            {id === 'notas' && notasCount > 0 && (
              <span className="absolute -top-0.5 -right-1 min-w-[14px] h-3.5 rounded-sm text-[7px] flex items-center justify-center px-0.5"
                style={{ background: COLOR, color: '#fff' }}>{notasCount}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}>
          {tab === 'asociados'    && <TabAsociados asociados={asociados} navigate={navigate} />}
          {tab === 'estadisticas' && <TabEstadisticas asociados={asociados} stats={stats} historialData={historial} />}
          {tab === 'contacto'     && <TabContacto empresa={empresa} onUpdate={(u) => setData(d => ({ ...d, empresa: { ...d.empresa, ...u } }))} />}
          {tab === 'notas'        && <TabNotas codigo={codigo} notasIniciales={notas ?? []} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default EmpresaPerfil;
