import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Check, ArrowLeftRight, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileSpreadsheet, FileDown, User, Search, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const PAGE_SIZE = 30;

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const inputCls = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const TIPOS = [
  { v: 'ingreso',  label: 'INGRESO',   icon: <TrendingUp  size={11} />, color: '#22c55e' },
  { v: 'egreso',   label: 'EGRESO',    icon: <TrendingDown size={11} />, color: '#ef4444' },
  { v: 'traslado', label: 'TRASLADO',  icon: <ArrowLeftRight size={11} />, color: '#38bdf8' },
];

const tipoColor = (t) => t === 'ingreso' ? '#22c55e' : t === 'egreso' ? '#ef4444' : '#38bdf8';
const tipoSign  = (t) => t === 'ingreso' ? '+' : t === 'egreso' ? '-' : '↔';

// ── Buscador de tercero ────────────────────────────────────────────────────────

const BuscadorTercero = ({ value, onChange, proveedores = [] }) => {
  const [query,      setQuery]      = useState(value || '');
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto,    setAbierto]    = useState(false);
  const [cargando,   setCargando]   = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = (q) => {
    setQuery(q);
    onChange(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setSugerencias([]); setAbierto(false); return; }
    timerRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const qLow = q.toLowerCase();
        const items = [];

        // Proveedores locales (ya cargados, sin llamada extra)
        proveedores
          .filter(p => p.nombre.toLowerCase().includes(qLow))
          .slice(0, 5)
          .forEach(p => items.push({ label: p.nombre, sub: p.nit || p.categoria || 'Proveedor', tipo: 'PROVEEDOR' }));

        // Asociados y empresas desde busqueda API
        const { data } = await apiService.get(`/busqueda?q=${encodeURIComponent(q)}`);
        (data.asociados || []).forEach(a => items.push({ label: a.nombre, sub: `CC ${a.codigo}`, tipo: 'ASOCIADO' }));
        (data.empresas   || []).forEach(e => items.push({ label: e.nombre, sub: `Cód. ${e.codigo}`, tipo: 'EMPRESA' }));

        setSugerencias(items);
        setAbierto(items.length > 0);
      } catch { /* ignore */ }
      finally { setCargando(false); }
    }, 280);
  };

  const elegir = (item) => {
    setQuery(item.label);
    onChange(item.label);
    setSugerencias([]);
    setAbierto(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          className={inputCls + ' pr-7'}
          value={query}
          onChange={e => buscar(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder="Nombre libre o buscar asociado / empresa..."
        />
        {cargando && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#34d39966] text-[8px] animate-pulse">···</span>
        )}
      </div>
      {abierto && sugerencias.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#08101e] border border-[#34d39933] rounded-sm max-h-48 overflow-y-auto shadow-xl">
          {sugerencias.map((s, i) => (
            <button key={i} onMouseDown={() => elegir(s)}
              className="w-full text-left px-3 py-2 hover:bg-[#34d39910] transition-colors flex items-center gap-2 border-b border-[#34d39908] last:border-0">
              <User size={9} className="shrink-0" style={{ color: '#34d39966' }} />
              <span className="flex-1 min-w-0">
                <span className="text-[10px] text-[#a0d4e0] block truncate">{s.label}</span>
                <span className="text-[8px] text-[#6aacbc]">{s.sub}</span>
              </span>
              <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm shrink-0"
                style={{
                  background: s.tipo === 'PROVEEDOR' ? '#f59e0b18' : s.tipo === 'ASOCIADO' ? '#34d39911' : '#38bdf818',
                  color:      s.tipo === 'PROVEEDOR' ? '#f59e0b'   : s.tipo === 'ASOCIADO' ? '#34d399'   : '#38bdf8',
                }}>{s.tipo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-lg relative p-6 max-h-[90vh] overflow-y-auto">
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

const FormMovimiento = ({ cuentas, categorias, periodos, proveedores, onSave, onCancel, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tipo: 'ingreso',
    monto: '',
    fecha: hoy,
    descripcion: '',
    referencia: '',
    tercero_nombre: '',
    cuenta_id: cuentas[0]?.id || '',
    cuenta_destino_id: '',
    categoria_id: '',
    periodo_id: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const catsFiltradas = categorias.filter(c => c.tipo === form.tipo || c.tipo === 'traslado' && form.tipo === 'traslado');

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div>
        <label className={labelCls}>TIPO *</label>
        <div className="flex gap-2">
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => { set('tipo', t.v); set('categoria_id', ''); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
              style={{
                borderColor: form.tipo === t.v ? t.color + '88' : '#34d39922',
                background:  form.tipo === t.v ? t.color + '15' : 'transparent',
                color:       form.tipo === t.v ? t.color : '#6aacbc',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>MONTO (COP) *</label>
          <input className={inputCls} type="number" min="1" value={form.monto}
            onChange={e => set('monto', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>FECHA *</label>
          <input className={inputCls} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>{form.tipo === 'traslado' ? 'CUENTA ORIGEN *' : 'CUENTA *'}</label>
        <select className={selectCls} value={form.cuenta_id} onChange={e => set('cuenta_id', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {form.tipo === 'traslado' && (
        <div>
          <label className={labelCls}>CUENTA DESTINO *</label>
          <select className={selectCls} value={form.cuenta_destino_id} onChange={e => set('cuenta_destino_id', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {cuentas.filter(c => c.id !== form.cuenta_id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>CATEGORÍA</label>
          <select className={selectCls} value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            <option value="">— Sin categoría —</option>
            {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PERÍODO</label>
          <select className={selectCls} value={form.periodo_id} onChange={e => set('periodo_id', e.target.value)}>
            <option value="">— Sin período —</option>
            {periodos.filter(p => p.estado === 'abierto').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>TERCERO / BENEFICIARIO</label>
        <BuscadorTercero value={form.tercero_nombre} onChange={v => set('tercero_nombre', v)} proveedores={proveedores} />
      </div>

      <div>
        <label className={labelCls}>DESCRIPCIÓN</label>
        <input className={inputCls} value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          placeholder="Descripción del movimiento" />
      </div>
      <div>
        <label className={labelCls}>REFERENCIA / N° TRANSACCIÓN</label>
        <input className={inputCls} value={form.referencia} onChange={e => set('referencia', e.target.value)}
          placeholder="REF-12345" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
          CANCELAR
        </button>
        <button onClick={() => onSave(form)}
          disabled={loading || !form.monto || !form.cuenta_id || !form.fecha}
          className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={11} /> {loading ? 'REGISTRANDO...' : 'REGISTRAR'}
        </button>
      </div>
    </div>
  );
};

const TIPO_BANCARIO_LABEL = {
  N109: 'Transferencia recibida (ACH)',
  N110: 'Depósito efectivo recaudo',
  N126: 'Abono nómina / proveedor',
  N129: 'Crédito transferencia internet',
  N209: 'Débito autorizado ACH',
  N223: 'Pago nómina / proveedores',
  N227: 'Compra internet',
  N202: 'Pago cheque ventanilla',
  N334: 'Devolución transacción no exitosa',
  N511: 'Depósito en ventanilla',
};

const FilaMovimiento = ({ m }) => {
  const [expandida, setExpandida] = useState(false);
  const tieneDatosBanco = m.referencia_bancaria || m.tipo_bancario || m.oficina_bancaria || m.detalles_banco;

  return (
    <>
      <tr
        onClick={() => tieneDatosBanco && setExpandida(v => !v)}
        className={`border-b border-[#34d39908] transition-colors ${
          tieneDatosBanco ? 'cursor-pointer hover:bg-[#34d39907]' : 'hover:bg-[#34d39905]'
        } ${expandida ? 'bg-[#0d1a2a]' : ''}`}
      >
        <td className="py-2.5 pr-4 text-[#a0d4e0]">{m.fecha?.slice(0, 10)}</td>
        <td className="py-2.5 pr-4">
          <span className="flex items-center gap-1 font-bold" style={{ color: tipoColor(m.tipo) }}>
            {tipoSign(m.tipo)} {m.tipo.toUpperCase()}
          </span>
        </td>
        <td className="py-2.5 pr-4 max-w-[200px]">
          {m.tercero_nombre && (
            <span className="flex items-center gap-1 text-[#34d399] text-[11px] font-semibold mb-0.5 truncate">
              <User size={9} /> {m.tercero_nombre}
            </span>
          )}
          <span className="text-[#a0d4e0] truncate block">{m.descripcion || '—'}</span>
          {m.referencia && <span className="text-[#6aacbc] opacity-60 text-[10px]">· {m.referencia}</span>}
        </td>
        <td className="py-2.5 pr-4 text-[#6aacbc]">
          {m.cuenta_nombre}
          {m.cuenta_destino_nombre && <span> → {m.cuenta_destino_nombre}</span>}
        </td>
        <td className="py-2.5 pr-4">
          {m.categoria_nombre
            ? <span className="px-1.5 py-0.5 rounded-sm text-[7px]"
                style={{ background: (m.categoria_color || '#64748b') + '22', color: m.categoria_color || '#64748b' }}>
                {m.categoria_nombre}
              </span>
            : <span className="text-[#6aacbc] opacity-30">—</span>
          }
        </td>
        <td className="py-2.5 pr-2 text-right font-bold font-mono" style={{ color: tipoColor(m.tipo) }}>
          {tipoSign(m.tipo)}{fmtCOP(m.monto)}
        </td>
        <td className="py-2.5 w-5">
          {tieneDatosBanco && (
            <span className="text-[#34d39944]">
              {expandida ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </span>
          )}
        </td>
      </tr>

      {expandida && tieneDatosBanco && (
        <tr className="bg-[#08101e]">
          <td colSpan={7} className="px-6 py-3 border-b border-[#34d39915]">
            <div className="ml-2 grid grid-cols-2 gap-x-8 gap-y-3">

              {m.referencia_bancaria && (
                <div>
                  <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-0.5">REFERENCIA BANCO</p>
                  <p className="text-[13px] text-[#34d399] font-mono">{m.referencia_bancaria}</p>
                </div>
              )}

              {m.tipo_bancario && (
                <div>
                  <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-0.5">TIPO DE OPERACIÓN</p>
                  <p className="text-[12px] text-[#a0d4e0]">
                    <span className="text-[#34d39988] font-mono mr-1.5">{m.tipo_bancario}</span>
                    {TIPO_BANCARIO_LABEL[m.tipo_bancario] || 'Desconocido'}
                  </p>
                </div>
              )}

              {m.oficina_bancaria && (
                <div>
                  <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-0.5">OFICINA</p>
                  <p className="text-[12px] text-[#a0d4e0] flex items-center gap-1">
                    <Building2 size={10} style={{ color: '#6aacbc' }} />
                    {m.oficina_bancaria}
                  </p>
                </div>
              )}

              {m.origen === 'extracto' && (
                <div>
                  <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-0.5">ORIGEN</p>
                  <p className="text-[12px] text-[#38bdf8]">Extracto bancario</p>
                </div>
              )}

              {m.detalles_banco && (
                <div className="col-span-2">
                  <p className="text-[9px] tracking-[2px] text-[#6aacbc] mb-0.5">DETALLES ADICIONALES</p>
                  <p className="text-[12px] text-[#a0d4e0] font-mono break-all leading-relaxed bg-[#05080f] border border-[#34d39911] rounded-sm px-3 py-2">
                    {m.detalles_banco}
                  </p>
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [saving,      setSaving]      = useState(false);

  const [cuentas,    setCuentas]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [periodos,   setPeriodos]   = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [filtros, setFiltros] = useState({ tipo: '', cuenta_id: '', categoria_id: '', periodo_id: '', desde: '', hasta: '' });
  const setF = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPage(0); };
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
    Object.entries(filtros).forEach(([k, v]) => { if (v) p.set(k, v); });
    apiService.get(`/tesoreria/movimientos?${p}`)
      .then(({ data }) => { setMovimientos(data.movimientos); setTotal(data.total); })
      .catch(() => toast.error('Error al cargar movimientos'))
      .finally(() => setLoading(false));
  }, [filtros, page]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    apiService.get('/tesoreria/cuentas').then(({ data }) => setCuentas(data)).catch(() => {});
    apiService.get('/tesoreria/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
    apiService.get('/tesoreria/periodos').then(({ data }) => setPeriodos(data)).catch(() => {});
    apiService.get('/tesoreria/proveedores').then(({ data }) => setProveedores(data)).catch(() => {});
  }, []);

  const guardar = async (form) => {
    setSaving(true);
    try {
      await apiService.post('/tesoreria/movimientos', form);
      toast.success('Movimiento registrado');
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildParams = () => {
    const p = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p;
  };

  const exportExcel = async () => {
    try {
      const resp = await apiService.get(`/tesoreria/movimientos/export?${buildParams()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimientos_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar Excel');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(11);
    doc.text('Movimientos — Tesorería', 14, 14);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 20);
    doc.autoTable({
      startY: 25,
      head: [['Fecha', 'Tipo', 'Tercero', 'Descripción', 'Cuenta', 'Categoría', 'Monto (COP)']],
      body: movimientos.map(m => [
        m.fecha?.slice(0, 10) || '',
        m.tipo.toUpperCase(),
        m.tercero_nombre || '',
        (m.descripcion || '') + (m.referencia ? ` · ${m.referencia}` : ''),
        m.cuenta_nombre + (m.cuenta_destino_nombre ? ` → ${m.cuenta_destino_nombre}` : ''),
        m.categoria_nombre || '',
        new Intl.NumberFormat('es-CO').format(m.monto),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 27, 46], textColor: [52, 211, 153], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 245, 250] },
    });
    doc.save(`movimientos_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            MOVIMIENTOS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// INGRESOS · EGRESOS · TRASLADOS</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#22c55e55', background: '#22c55e10', color: '#22c55e' }}
            title="Exportar Excel">
            <FileSpreadsheet size={11} /> EXCEL
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#f59e0b55', background: '#f59e0b10', color: '#f59e0b' }}
            title="Exportar PDF — página actual">
            <FileDown size={11} /> PDF
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
            <Plus size={12} /> NUEVO
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar descripción, tercero, referencia, cuenta..."
          className="w-full bg-[#05080f] border border-[#34d39922] rounded-sm pl-8 pr-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#34d39955] transition-colors"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <select className={inputCls + ' text-[9px]'} value={filtros.tipo} onChange={e => setF('tipo', e.target.value)}>
          <option value="">TIPO</option>
          <option value="ingreso">INGRESO</option>
          <option value="egreso">EGRESO</option>
          <option value="traslado">TRASLADO</option>
        </select>
        <select className={inputCls + ' text-[9px]'} value={filtros.cuenta_id} onChange={e => setF('cuenta_id', e.target.value)}>
          <option value="">CUENTA</option>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className={inputCls + ' text-[9px]'} value={filtros.categoria_id} onChange={e => setF('categoria_id', e.target.value)}>
          <option value="">CATEGORÍA</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className={inputCls + ' text-[9px]'} value={filtros.periodo_id} onChange={e => setF('periodo_id', e.target.value)}>
          <option value="">PERÍODO</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input className={inputCls + ' text-[9px]'} type="date" value={filtros.desde} onChange={e => setF('desde', e.target.value)} />
        <input className={inputCls + ' text-[9px]'} type="date" value={filtros.hasta} onChange={e => setF('hasta', e.target.value)} />
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#34d39915]">
                  {['FECHA', 'TIPO', 'DESCRIPCIÓN', 'CUENTA', 'CATEGORÍA', 'MONTO', ''].map((h, i) => (
                    <th key={i} className="text-left pb-2 pr-4 text-[10px] tracking-[2px] text-[#6aacbc] font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-[#6aacbc] opacity-40 text-[9px] tracking-widest">SIN MOVIMIENTOS</td></tr>
                )}
                {movimientos.filter(m => {
                  if (!busqueda) return true;
                  const q = busqueda.toLowerCase();
                  return (
                    m.descripcion?.toLowerCase().includes(q) ||
                    m.tercero_nombre?.toLowerCase().includes(q) ||
                    m.referencia?.toLowerCase().includes(q) ||
                    m.referencia_bancaria?.toLowerCase().includes(q) ||
                    m.detalles_banco?.toLowerCase().includes(q) ||
                    m.cuenta_nombre?.toLowerCase().includes(q) ||
                    m.cuenta_destino_nombre?.toLowerCase().includes(q)
                  );
                }).map(m => (
                  <FilaMovimiento key={m.id} m={m} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[8px] tracking-widest text-[#6aacbc]">{total} MOVIMIENTOS</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] disabled:opacity-30 transition-colors">
                  <ChevronLeft size={12} />
                </button>
                <span className="text-[9px] text-[#a0d4e0]">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] disabled:opacity-30 transition-colors">
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal titulo="REGISTRAR MOVIMIENTO" onClose={() => setModal(false)}>
          <FormMovimiento
            cuentas={cuentas}
            categorias={categorias}
            periodos={periodos}
            proveedores={proveedores}
            onSave={guardar}
            onCancel={() => setModal(false)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
