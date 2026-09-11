import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Check, Building2, Search, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../../../services/apiService.js';
import PerfilProveedor from '../../../components/PerfilProveedor.jsx';

const ACCENT = '#34d399';
const POR_PAGINA = 12;
const inputCls  = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-4 py-3 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-xs tracking-widest text-[#6aacbc] mb-1.5 block';
const smallSelect = 'bg-[#05080f] border border-[#34d3991a] rounded-sm px-3 py-2 text-[9px] text-[#6aacbc] focus:outline-none focus:border-[#34d39933] transition-colors cursor-pointer tracking-widest';

const FRECUENCIAS = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];
const CATEGORIAS  = ['Servicios públicos', 'Suscripción', 'Arriendo', 'Nómina', 'Mantenimiento', 'Seguros', 'Otro'];

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-xl relative p-8 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#34d399]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#34d399]" />
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm tracking-[3px] font-semibold" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const FormProveedor = ({ inicial, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    nombre:    inicial?.nombre    || '',
    nit:       inicial?.nit       || '',
    email:     inicial?.email     || '',
    telefono:  inicial?.telefono  || '',
    tipo_pago: inicial?.tipo_pago || 'unico',
    frecuencia:inicial?.frecuencia|| '',
    categoria: inicial?.categoria || '',
    notas:     inicial?.notas     || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>NOMBRE *</label>
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: EPM S.A." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>NIT</label>
          <input className={inputCls} value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="900.000.000-1" />
        </div>
        <div>
          <label className={labelCls}>TELÉFONO</label>
          <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+57 300 000 0000" />
        </div>
      </div>
      <div>
        <label className={labelCls}>EMAIL</label>
        <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="pagos@proveedor.com" />
      </div>
      <div>
        <label className={labelCls}>TIPO DE PAGO *</label>
        <div className="flex gap-2">
          {['unico', 'recurrente'].map(t => (
            <button key={t} onClick={() => { set('tipo_pago', t); if (t === 'unico') set('frecuencia', ''); }}
              className="flex-1 py-2.5 text-xs tracking-widest rounded-sm border transition-all"
              style={{
                borderColor: form.tipo_pago === t ? ACCENT + '88' : '#34d39922',
                background:  form.tipo_pago === t ? ACCENT + '15' : 'transparent',
                color:       form.tipo_pago === t ? ACCENT : '#6aacbc',
              }}>
              {t === 'unico' ? 'PAGO ÚNICO' : 'RECURRENTE'}
            </button>
          ))}
        </div>
      </div>
      {form.tipo_pago === 'recurrente' && (
        <div>
          <label className={labelCls}>FRECUENCIA *</label>
          <select className={selectCls} value={form.frecuencia} onChange={e => set('frecuencia', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {FRECUENCIAS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={labelCls}>CATEGORÍA</label>
        <select className={selectCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
          <option value="">— Sin categoría —</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>NOTAS</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.notas}
          onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel}
          className="px-5 py-2.5 text-xs tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
          CANCELAR
        </button>
        <button onClick={() => onSave(form)} disabled={loading || !form.nombre}
          className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={12} /> {loading ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
};

const TIPO_CHIP = {
  recurrente: { label: 'RECURRENTE', color: '#38bdf8' },
  unico:      { label: 'ÚNICO',      color: '#a78bfa' },
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

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [perfil,      setPerfil]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroTipo,  setFiltroTipo]  = useState('todos');
  const [filtroBanco, setFiltroBanco] = useState('todos');
  const [filtroCat,   setFiltroCat]   = useState('');
  const [orden,       setOrden]       = useState('');
  const [pagina,      setPagina]      = useState(1);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/tesoreria/proveedores')
      .then(({ data }) => setProveedores(data))
      .catch(() => toast.error('Error al cargar proveedores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroTipo, filtroCat, filtroBanco, orden]);

  const proveedoresVisibles = useMemo(() => {
    let arr = proveedores.filter(p => {
      if (filtroTipo !== 'todos' && p.tipo_pago !== filtroTipo) return false;
      if (filtroCat && p.categoria !== filtroCat) return false;
      if (filtroBanco !== 'todos') {
        const estado = p.datos_bancarios_estado || 'sin_datos';
        if (filtroBanco === 'sin_datos'   && estado !== 'sin_datos')   return false;
        if (filtroBanco === 'pendiente_ci'&& estado !== 'pendiente_ci') return false;
        if (filtroBanco === 'verificado'  && estado !== 'verificado')   return false;
      }
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          p.nombre?.toLowerCase().includes(q) ||
          p.nit?.toLowerCase().includes(q) ||
          p.categoria?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (orden === 'facturas_desc') arr = [...arr].sort((a, b) => (Number(b.facturas_pendientes) || 0) - (Number(a.facturas_pendientes) || 0));
    if (orden === 'nombre_asc')    arr = [...arr].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return arr;
  }, [proveedores, busqueda, filtroTipo, filtroCat, filtroBanco, orden]);

  const proveedoresPagina = proveedoresVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/tesoreria/proveedores', form);
        toast.success('Proveedor creado');
        setModal(null);
        cargar();
      } else {
        const { nombre: _, ...editable } = form;
        const { data: actualizado } = await apiService.put(`/tesoreria/proveedores/${modal.id}`, editable);
        toast.success('Proveedor actualizado');
        setModal(null);
        cargar();
        if (perfil?.id === modal.id) setPerfil(actualizado);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const exportarCSV = () => {
    const header = 'Nombre,NIT,Tipo,Categoría,Email,Teléfono,Facturas Pendientes,Datos Bancarios';
    const rows = proveedoresVisibles.map(p =>
      [p.nombre, p.nit || '', p.tipo_pago, p.categoria || '', p.email || '',
       p.telefono || '', p.facturas_pendientes || 0, p.datos_bancarios_estado || 'sin_datos']
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'proveedores.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(10);
    doc.text('PROVEEDORES — TESORERÍA', 14, 15);
    doc.setFontSize(7);
    doc.text(`Exportado: ${new Date().toLocaleDateString('es-CO')}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Nombre', 'NIT', 'Tipo', 'Categoría', 'Email', 'Fact. Pend.', 'Banco']],
      body: proveedoresVisibles.map(p => [
        p.nombre, p.nit || '—', p.tipo_pago, p.categoria || '—',
        p.email || '—', p.facturas_pendientes || 0, p.datos_bancarios_estado || 'sin_datos',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [12, 16, 30], textColor: [52, 211, 153] },
      alternateRowStyles: { fillColor: [8, 16, 30] },
    });
    doc.save('proveedores.pdf');
  };

  const categoriasUnicas = useMemo(() =>
    [...new Set(proveedores.map(p => p.categoria).filter(Boolean))].sort()
  , [proveedores]);

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>PROVEEDORES</h1>
          <p className="text-[#6aacbc] text-[10px] tracking-[3px] mt-0.5">// RECURRENTES · ÚNICOS</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <Download size={10} /> CSV
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <FileText size={10} /> PDF
          </button>
          <button onClick={() => setModal('crear')}
            className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
            <Plus size={12} /> NUEVO PROVEEDOR
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const recurrentes  = proveedores.filter(p => p.tipo_pago === 'recurrente').length;
        const unicos       = proveedores.filter(p => p.tipo_pago === 'unico').length;
        const sinBanco     = proveedores.filter(p => !p.datos_bancarios_estado || p.datos_bancarios_estado === 'sin_datos').length;
        const verificados  = proveedores.filter(p => p.datos_bancarios_estado === 'verificado').length;
        const factPend     = proveedores.reduce((s, p) => s + (Number(p.facturas_pendientes) || 0), 0);
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#34d3991a] rounded-sm overflow-hidden">
            {[
              { label: 'PROVEEDORES',  value: proveedores.length, color: ACCENT },
              { label: 'RECURRENTES',  value: recurrentes,        color: '#38bdf8' },
              { label: 'ÚNICOS',       value: unicos,             color: '#a78bfa' },
              { label: 'SIN BANCO',    value: sinBanco,           color: sinBanco > 0 ? '#fbbf24' : '#6aacbc' },
              { label: 'VERIFICADOS',  value: verificados,        color: '#22c55e' },
              { label: 'FACT. PEND.',  value: factPend,           color: factPend > 0 ? '#f97316' : '#6aacbc' },
            ].map(({ label, value, color }, i) => (
              <div key={i} className="flex-1 px-3 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
                <p className="text-[9px] tracking-[2px] text-[#4a7a8a]">{label}</p>
                <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter bar */}
      <div className="space-y-2 mb-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="BUSCAR PROVEEDOR, NIT, CATEGORÍA..."
            className="w-full bg-[#05080f] border border-[#34d3991a] rounded-sm pl-8 pr-4 py-2 text-xs text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39944] transition-colors tracking-wide" />
        </div>

        {/* Chips de tipo */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
            {[['todos','TODOS'],['recurrente','RECURRENTE'],['unico','ÚNICO']].map(([val, lbl]) => {
              const active = filtroTipo === val;
              return (
                <button key={val} onClick={() => setFiltroTipo(val)}
                  className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                  style={{
                    color:        active ? ACCENT : '#6aacbc',
                    background:   active ? ACCENT + '10' : 'transparent',
                    borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                  }}>
                  {lbl}
                </button>
              );
            })}
          </div>

          <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
            {[
              ['todos','TODOS',ACCENT],
              ['sin_datos','SIN DATOS','#6aacbc'],
              ['pendiente_ci','PEND. CI','#fbbf24'],
              ['verificado','VERIFICADO','#22c55e'],
            ].map(([val, lbl, c]) => {
              const active = filtroBanco === val;
              return (
                <button key={val} onClick={() => setFiltroBanco(val)}
                  className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                  style={{
                    color:        active ? c : '#6aacbc',
                    background:   active ? c + '10' : 'transparent',
                    borderBottom: active ? `2px solid ${c}` : '2px solid transparent',
                  }}>
                  {lbl}
                </button>
              );
            })}
          </div>

          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className={smallSelect}>
            <option value="">TODAS LAS CATEGORÍAS</option>
            {categoriasUnicas.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>

          <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
            {[
              ['','SIN ORDEN'],
              ['facturas_desc','↓ FACT. PEND.'],
              ['nombre_asc','A→Z'],
            ].map(([val, lbl]) => {
              const active = orden === val;
              return (
                <button key={val} onClick={() => setOrden(val)}
                  className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                  style={{
                    color:        active ? ACCENT : '#6aacbc',
                    background:   active ? ACCENT + '10' : 'transparent',
                    borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                  }}>
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

        {!loading && proveedoresVisibles.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
            <Building2 size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN RESULTADOS</p>
          </div>
        )}

        {!loading && proveedoresPagina.length > 0 && (
          <div className="space-y-2">
            {proveedoresPagina.map(p => {
              const chip     = TIPO_CHIP[p.tipo_pago] || { label: p.tipo_pago, color: ACCENT };
              const dbEstado = p.datos_bancarios_estado || 'sin_datos';
              const dbColor  = { sin_datos: '#6aacbc44', pendiente_ci: '#fbbf2488', verificado: '#34d39988' }[dbEstado] || '#6aacbc44';
              return (
                <button key={p.id} onClick={() => setPerfil(p)}
                  className="w-full text-left px-5 py-4 rounded-sm border border-[#34d39918] bg-[#34d39905] hover:border-[#34d39940] hover:bg-[#34d3990a] transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-base font-semibold text-[#c8e8f0] leading-tight">{p.nombre}</span>
                        <span className="text-[9px] tracking-wide px-2 py-0.5 rounded-sm border shrink-0"
                          style={{ color: chip.color, borderColor: chip.color + '44', background: chip.color + '11' }}>
                          {chip.label}{p.tipo_pago === 'recurrente' && p.frecuencia ? ` · ${p.frecuencia.toUpperCase()}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {p.categoria && <span className="text-xs text-[#7ec8d8]">{p.categoria}</span>}
                        {p.nit && <span className="text-xs text-[#7ec8d8] opacity-50">NIT {p.nit}</span>}
                        {Number(p.facturas_pendientes) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#fbbf2422] text-[#fbbf24]">
                            {p.facturas_pendientes} fact. pend.
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dbColor }}
                      title={dbEstado.replace('_', ' ')} />
                  </div>
                </button>
              );
            })}
            <Paginacion total={proveedoresVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
          </div>
        )}
      </div>

      {modal && (
        <Modal titulo={modal === 'crear' ? 'NUEVO PROVEEDOR' : 'EDITAR PROVEEDOR'} onClose={() => setModal(null)}>
          <FormProveedor
            inicial={modal !== 'crear' ? modal : null}
            onSave={guardar}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}

      {perfil && (
        <PerfilProveedor
          proveedor={perfil}
          apiBase="/tesoreria"
          accent={ACCENT}
          onClose={() => setPerfil(null)}
          onEdit={(p) => { setPerfil(null); setModal(p); }}
        />
      )}
    </div>
  );
}
