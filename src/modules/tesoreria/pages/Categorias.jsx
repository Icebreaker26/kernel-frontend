import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, X, Check, Tag, Download, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const POR_PAGINA = 15;
const inputCls = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const TIPOS = ['ingreso', 'egreso', 'traslado'];
const tipoColor = { ingreso: '#22c55e', egreso: '#ef4444', traslado: '#38bdf8' };
const tipoLabel = { ingreso: 'INGRESO', egreso: 'EGRESO', traslado: 'TRASLADO' };

const COLORES_PRESET = [
  '#22c55e','#16a34a','#4ade80','#86efac',
  '#ef4444','#dc2626','#f97316','#fb923c',
  '#38bdf8','#818cf8','#a78bfa','#fbbf24',
  '#64748b','#94a3b8','#e2e8f0',
];

const FILTROS = [
  { key: 'todos',    label: 'TODOS' },
  { key: 'ingreso',  label: 'INGRESOS' },
  { key: 'egreso',   label: 'EGRESOS' },
  { key: 'traslado', label: 'TRASLADOS' },
];

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-md relative p-6">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#34d399]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#34d399]" />
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"><X size={14} /></button>
      </div>
      {children}
    </div>
  </div>
);

const FormCategoria = ({ inicial, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    tipo:   inicial?.tipo   || 'ingreso',
    color:  inicial?.color  || '#22c55e',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>NOMBRE *</label>
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)}
          placeholder="Ej: Cuotas de administración" />
      </div>
      {!inicial && (
        <div>
          <label className={labelCls}>TIPO *</label>
          <div className="flex gap-2">
            {TIPOS.map(t => (
              <button key={t} onClick={() => set('tipo', t)}
                className="flex-1 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
                style={{
                  borderColor: form.tipo === t ? tipoColor[t] + '88' : '#34d39922',
                  background:  form.tipo === t ? tipoColor[t] + '15' : 'transparent',
                  color:       form.tipo === t ? tipoColor[t] : '#6aacbc',
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className={labelCls}>COLOR</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COLORES_PRESET.map(c => (
            <button key={c} onClick={() => set('color', c)}
              className="w-6 h-6 rounded-sm border-2 transition-all"
              style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent' }} />
          ))}
        </div>
        <input className={inputCls} value={form.color} onChange={e => set('color', e.target.value)}
          placeholder="#22c55e" maxLength={7} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
          CANCELAR
        </button>
        <button onClick={() => onSave(form)} disabled={loading || !form.nombre}
          className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={11} /> {loading ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
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
        : { borderColor: '#34d39918', background: 'transparent', color: '#6aacbc' }}>
      {children}
    </button>
  );
  const nums = [];
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || Math.abs(i - pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#34d39911]">
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

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [pagina,     setPagina]     = useState(1);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/tesoreria/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroTipo]);

  const categoriasVisibles = useMemo(() => categorias.filter(c => {
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
    if (busqueda && !c.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }), [categorias, busqueda, filtroTipo]);

  const categoriasPagina = categoriasVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/tesoreria/categorias', form);
        toast.success('Categoría creada');
      } else {
        await apiService.put(`/tesoreria/categorias/${modal.id}`, { nombre: form.nombre, color: form.color });
        toast.success('Categoría actualizada');
      }
      setModal(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (c) => {
    if (!confirm(`¿Desactivar la categoría "${c.nombre}"?`)) return;
    try {
      await apiService.put(`/tesoreria/categorias/${c.id}`, { is_active: false });
      toast.success('Categoría desactivada');
      cargar();
    } catch { toast.error('Error al desactivar'); }
  };

  const exportarCSV = () => {
    const header = 'Nombre,Tipo,Color';
    const rows = categoriasVisibles.map(c =>
      [c.nombre, c.tipo, c.color].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'categorias.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(10);
    doc.text('CATEGORÍAS — TESORERÍA', 14, 15);
    doc.setFontSize(7);
    doc.text(`Exportado: ${new Date().toLocaleDateString('es-CO')}  ·  Filtro: ${filtroTipo.toUpperCase()}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Nombre', 'Tipo', 'Color']],
      body: categoriasVisibles.map(c => [c.nombre, c.tipo?.toUpperCase(), c.color]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [12, 16, 30], textColor: [52, 211, 153] },
      alternateRowStyles: { fillColor: [8, 16, 30] },
    });
    doc.save('categorias.pdf');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            CATEGORÍAS
          </h1>
          <p className="text-[#6aacbc] text-[10px] tracking-[3px] mt-0.5">// CLASIFICACIÓN DE MOVIMIENTOS</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all hover:border-[#34d39944] hover:text-[#a0d4e0]"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <Download size={10} /> CSV
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all hover:border-[#34d39944] hover:text-[#a0d4e0]"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <FileText size={10} /> PDF
          </button>
          <button onClick={() => setModal('crear')}
            className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
            <Plus size={12} /> NUEVA CATEGORÍA
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const ingresos  = categorias.filter(c => c.tipo === 'ingreso').length;
        const egresos   = categorias.filter(c => c.tipo === 'egreso').length;
        const traslados = categorias.filter(c => c.tipo === 'traslado').length;
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#34d3991a] rounded-sm overflow-hidden">
            {[
              { label: 'TOTAL',      value: categorias.length, color: ACCENT },
              { label: 'INGRESOS',   value: ingresos,          color: tipoColor.ingreso },
              { label: 'EGRESOS',    value: egresos,           color: tipoColor.egreso },
              { label: 'TRASLADOS',  value: traslados,         color: tipoColor.traslado },
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
        <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
          {FILTROS.map(({ key, label }) => {
            const active = filtroTipo === key;
            const color  = key === 'todos' ? ACCENT : (tipoColor[key] || ACCENT);
            return (
              <button key={key} onClick={() => setFiltroTipo(key)}
                className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                style={{
                  color:        active ? color : '#6aacbc',
                  background:   active ? color + '10' : 'transparent',
                  borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                }}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="BUSCAR CATEGORÍA..."
            className="w-full bg-[#05080f] border border-[#34d3991a] rounded-sm pl-8 pr-4 py-2 text-xs text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39944] transition-colors tracking-wide" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

        {!loading && categoriasVisibles.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
            <Tag size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN RESULTADOS</p>
          </div>
        )}

        {!loading && categoriasPagina.length > 0 && (
          <div className="space-y-1">
            {categoriasPagina.map(c => {
              const color = tipoColor[c.tipo] || ACCENT;
              return (
                <div key={c.id}
                  className="flex items-center justify-between px-4 py-3 rounded-sm border border-[#34d39910] bg-[#34d39905] group hover:border-[#34d39922] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c.color }} />
                    <span className="text-sm text-[#a0d4e0]">{c.nombre}</span>
                    <span className="text-[7px] tracking-[2px] px-1.5 py-0.5 rounded-sm border"
                      style={{ borderColor: color + '33', color, background: color + '11' }}>
                      {tipoLabel[c.tipo] || c.tipo?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal(c)}
                      className="p-1 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-colors">
                      <Pencil size={9} />
                    </button>
                    <button onClick={() => desactivar(c)}
                      className="p-1 border border-[#ff3d3d22] rounded-sm text-[#6aacbc] hover:text-[#ff3d3d] hover:border-[#ff3d3d44] transition-colors">
                      <X size={9} />
                    </button>
                  </div>
                </div>
              );
            })}
            <Paginacion total={categoriasVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
          </div>
        )}
      </div>

      {modal && (
        <Modal titulo={modal === 'crear' ? 'NUEVA CATEGORÍA' : 'EDITAR CATEGORÍA'} onClose={() => setModal(null)}>
          <FormCategoria
            inicial={modal !== 'crear' ? modal : null}
            onSave={guardar}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
