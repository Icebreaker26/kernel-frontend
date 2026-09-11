import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Lock, CalendarDays, X, Check, Download, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../../../services/apiService.js';

const ACCENT = '#818cf8';
const POR_PAGINA = 10;

const inputCls = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-4 py-3 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf855] transition-colors';
const labelCls = 'text-xs tracking-widest text-[#6aacbc] mb-1.5 block';

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-lg relative p-8">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm tracking-[3px] font-semibold" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

const Paginacion = ({ total, pagina, porPagina, onChange }) => {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fin = Math.min(pagina * porPagina, total);
  const Btn = ({ p, children, disabled }) => (
    <button onClick={() => !disabled && onChange(p)} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-[10px] rounded-sm border transition-all disabled:opacity-30"
      style={p === pagina
        ? { borderColor: ACCENT + '88', background: ACCENT + '20', color: ACCENT }
        : { borderColor: '#818cf818', background: 'transparent', color: '#6aacbc' }}>
      {children}
    </button>
  );
  const nums = [];
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || Math.abs(i - pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#818cf811]">
      <p className="text-[11px] text-[#4a7a8a]">{inicio}–{fin} <span className="opacity-60">de {total}</span></p>
      <div className="flex items-center gap-1">
        <Btn p={pagina - 1} disabled={pagina === 1}>‹</Btn>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="w-7 text-center text-[10px] text-[#6aacbc]">…</span>
          : <Btn key={n} p={n}>{n}</Btn>
        )}
        <Btn p={pagina + 1} disabled={pagina === totalPags}>›</Btn>
      </div>
    </div>
  );
};

const FILTROS = [
  { key: 'todos',   label: 'TODOS' },
  { key: 'abierto', label: 'ABIERTOS' },
  { key: 'cerrado', label: 'CERRADOS' },
];

export default function Periodos() {
  const [periodos,     setPeriodos]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' });
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pagina,       setPagina]       = useState(1);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/contable/periodos')
      .then(({ data }) => setPeriodos(data))
      .catch(() => toast.error('Error al cargar períodos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado]);

  const periodosVisibles = useMemo(() => periodos.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (busqueda && !p.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }), [periodos, busqueda, filtroEstado]);

  const periodosPagina = periodosVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear = async () => {
    if (!form.nombre || !form.fecha_inicio || !form.fecha_fin) return;
    setSaving(true);
    try {
      await apiService.post('/contable/periodos', form);
      toast.success('Período creado');
      setModal(false);
      setForm({ nombre: '', fecha_inicio: '', fecha_fin: '' });
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const cerrar = async (p) => {
    if (!confirm(`¿Cerrar el período "${p.nombre}"? Los movimientos quedarán bloqueados.`)) return;
    try {
      await apiService.put(`/contable/periodos/${p.id}/cerrar`);
      toast.success('Período cerrado');
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al cerrar');
    }
  };

  const exportarCSV = () => {
    const header = 'Nombre,Inicio,Fin,Estado,Movimientos,Cerrado por';
    const rows = periodosVisibles.map(p =>
      [p.nombre, String(p.fecha_inicio).slice(0,10), String(p.fecha_fin).slice(0,10),
       p.estado, p.total_movimientos || 0, p.cerrado_por_nombre || '']
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'periodos.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(10);
    doc.text('PERÍODOS CONTABLES', 14, 15);
    doc.setFontSize(7);
    doc.text(`Exportado: ${new Date().toLocaleDateString('es-CO')}  ·  Filtro: ${filtroEstado.toUpperCase()}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Nombre', 'Inicio', 'Fin', 'Estado', 'Movimientos', 'Cerrado por']],
      body: periodosVisibles.map(p => [
        p.nombre,
        String(p.fecha_inicio).slice(0,10),
        String(p.fecha_fin).slice(0,10),
        p.estado?.toUpperCase(),
        p.total_movimientos || 0,
        p.cerrado_por_nombre || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [12, 16, 30], textColor: [129, 140, 248] },
      alternateRowStyles: { fillColor: [8, 16, 30] },
    });
    doc.save('periodos.pdf');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            PERÍODOS
          </h1>
          <p className="text-[#6aacbc] text-[10px] tracking-[3px] mt-0.5">// CIERRE CONTABLE</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all hover:border-[#818cf844] hover:text-[#a0d4e0]"
            style={{ borderColor: '#818cf822', color: '#6aacbc' }}>
            <Download size={10} /> CSV
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all hover:border-[#818cf844] hover:text-[#a0d4e0]"
            style={{ borderColor: '#818cf822', color: '#6aacbc' }}>
            <FileText size={10} /> PDF
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
            <Plus size={12} /> NUEVO PERÍODO
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const abiertos = periodos.filter(p => p.estado === 'abierto').length;
        const cerrados = periodos.filter(p => p.estado === 'cerrado').length;
        const movs     = periodos.reduce((s, p) => s + (Number(p.total_movimientos) || 0), 0);
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#818cf81a] rounded-sm overflow-hidden">
            {[
              { label: 'PERÍODOS',     value: periodos.length, color: ACCENT },
              { label: 'ABIERTOS',     value: abiertos,        color: '#22c55e' },
              { label: 'CERRADOS',     value: cerrados,        color: '#6aacbc' },
              { label: 'MOVIMIENTOS',  value: movs,            color: '#fbbf24' },
            ].map(({ label, value, color }, i) => (
              <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
                <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter bar + search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center border border-[#818cf81a] rounded-sm overflow-hidden">
          {FILTROS.map(({ key, label }) => {
            const active = filtroEstado === key;
            return (
              <button key={key} onClick={() => setFiltroEstado(key)}
                className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                style={{
                  color:       active ? ACCENT : '#6aacbc',
                  background:  active ? ACCENT + '10' : 'transparent',
                  borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="BUSCAR PERÍODO..."
            className="w-full bg-[#05080f] border border-[#818cf81a] rounded-sm pl-8 pr-4 py-2 text-xs text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf844] transition-colors tracking-wide"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>
        )}

        {!loading && periodosVisibles.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
            <CalendarDays size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN RESULTADOS</p>
          </div>
        )}

        {!loading && periodosPagina.length > 0 && (
          <div className="space-y-2">
            {periodosPagina.map(p => {
              const cerrado = p.estado === 'cerrado';
              return (
                <div key={p.id}
                  className="flex items-center justify-between px-5 py-4 rounded-sm border transition-colors"
                  style={{ borderColor: cerrado ? '#818cf811' : ACCENT + '33', background: cerrado ? '#818cf804' : ACCENT + '08' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: cerrado ? '#6aacbc33' : ACCENT + '99' }} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold tracking-widest" style={{ color: cerrado ? '#a0d4e0' : ACCENT }}>
                          {p.nombre}
                        </p>
                        <span className="text-[7px] tracking-[2px] px-1.5 py-0.5 rounded-sm border"
                          style={cerrado
                            ? { borderColor: '#6aacbc33', color: '#6aacbc', background: '#6aacbc11' }
                            : { borderColor: '#22c55e33', color: '#22c55e', background: '#22c55e11' }}>
                          {cerrado ? 'CERRADO' : 'ABIERTO'}
                        </span>
                      </div>
                      <p className="text-[9px] tracking-widest text-[#6aacbc]">
                        {fmtFecha(p.fecha_inicio)} → {fmtFecha(p.fecha_fin)}
                      </p>
                      {cerrado && p.cerrado_por_nombre && (
                        <p className="text-[8px] text-[#6aacbc] opacity-50 mt-0.5">Cerrado por {p.cerrado_por_nombre}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-xl font-bold leading-none" style={{ color: cerrado ? '#6aacbc' : ACCENT }}>
                        {Number(p.total_movimientos) || 0}
                      </p>
                      <p className="text-[8px] text-[#6aacbc] tracking-widest mt-0.5">MOVIMIENTOS</p>
                    </div>
                    {!cerrado && (
                      <button onClick={() => cerrar(p)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
                        style={{ borderColor: '#f9731633', background: '#f9731608', color: '#f97316' }}>
                        <Lock size={10} /> CERRAR
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <Paginacion total={periodosVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
          </div>
        )}
      </div>

      {modal && (
        <Modal titulo="NUEVO PERÍODO" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>NOMBRE *</label>
              <input className={inputCls} value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                placeholder="Ej: Enero 2027" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>FECHA INICIO *</label>
                <input className={inputCls} type="date" value={form.fecha_inicio} onChange={e => setF('fecha_inicio', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>FECHA FIN *</label>
                <input className={inputCls} type="date" value={form.fecha_fin} onChange={e => setF('fecha_fin', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(false)}
                className="px-5 py-2.5 text-xs tracking-widest border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
                CANCELAR
              </button>
              <button onClick={crear} disabled={saving || !form.nombre || !form.fecha_inicio || !form.fecha_fin}
                className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Check size={12} /> {saving ? 'CREANDO...' : 'CREAR'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
