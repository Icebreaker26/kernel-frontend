import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, ArrowLeftRight, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
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

const FormMovimiento = ({ cuentas, categorias, periodos, onSave, onCancel, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tipo: 'ingreso',
    monto: '',
    fecha: hoy,
    descripcion: '',
    referencia: '',
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

  const [filtros, setFiltros] = useState({ tipo: '', cuenta_id: '', categoria_id: '', periodo_id: '', desde: '', hasta: '' });
  const setF = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPage(0); };

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            MOVIMIENTOS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// INGRESOS · EGRESOS · TRASLADOS</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> NUEVO
        </button>
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
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#34d39915]">
                  {['FECHA', 'TIPO', 'DESCRIPCIÓN', 'CUENTA', 'CATEGORÍA', 'MONTO'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-[8px] tracking-[2px] text-[#6aacbc] font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-[#6aacbc] opacity-40 text-[9px] tracking-widest">SIN MOVIMIENTOS</td></tr>
                )}
                {movimientos.map(m => (
                  <tr key={m.id} className="border-b border-[#34d39908] hover:bg-[#34d39905] transition-colors">
                    <td className="py-2.5 pr-4 text-[#a0d4e0]">{m.fecha?.slice(0, 10)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1 font-bold" style={{ color: tipoColor(m.tipo) }}>
                        {tipoSign(m.tipo)} {m.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[#a0d4e0] max-w-[180px] truncate">
                      {m.descripcion || '—'}
                      {m.referencia && <span className="ml-1 text-[#6aacbc] opacity-60">· {m.referencia}</span>}
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
                    <td className="py-2.5 text-right font-bold font-mono" style={{ color: tipoColor(m.tipo) }}>
                      {tipoSign(m.tipo)}{fmtCOP(m.monto)}
                    </td>
                  </tr>
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
            onSave={guardar}
            onCancel={() => setModal(false)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
