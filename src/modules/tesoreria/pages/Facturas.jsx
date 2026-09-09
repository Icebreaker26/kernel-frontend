import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const inputCls  = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PENDIENTE',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'APROBADA',   color: '#34d399', icon: CircleCheck },
  pagada:               { label: 'PAGADA',     color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADA',  color: '#ef4444', icon: Ban },
};

const EstadoChip = ({ estado }) => {
  const m = ESTADO_META[estado] || {};
  const Icon = m.icon || Clock;
  return (
    <span className="flex items-center gap-1 text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={8} /> {m.label}
    </span>
  );
};

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-lg relative p-6 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#34d399]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#34d399]" />
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={14} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AREAS_SUGERIDAS = ['Gerencia', 'Administración', 'Contabilidad', 'Tesorería', 'Control Interno', 'Comercial', 'Operaciones', 'Sistemas', 'RRHH'];

const FormFactura = ({ proveedores, onSave, onCancel, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    proveedor_id: '', monto: '',
    fecha_emision: '', fecha_recibida: hoy, fecha_vencimiento: '',
    area_responsable: '', fecha_entrega_area: '',
    descripcion: '', numero_factura: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>PROVEEDOR *</label>
        <select className={selectCls} value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)}>
          <option value="">— Seleccionar proveedor —</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.nit ? `· ${p.nit}` : ''}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>N° FACTURA</label>
          <input className={inputCls} value={form.numero_factura}
            onChange={e => set('numero_factura', e.target.value)} placeholder="FAC-2026-0001" />
        </div>
        <div>
          <label className={labelCls}>MONTO (COP) *</label>
          <input className={inputCls} type="number" min="1" value={form.monto}
            onChange={e => set('monto', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>FECHA EMISIÓN</label>
          <input className={inputCls} type="date" value={form.fecha_emision}
            onChange={e => set('fecha_emision', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>FECHA RECIBIDA *</label>
          <input className={inputCls} type="date" value={form.fecha_recibida}
            onChange={e => set('fecha_recibida', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>FECHA VENCIMIENTO *</label>
          <input className={inputCls} type="date" value={form.fecha_vencimiento}
            onChange={e => set('fecha_vencimiento', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>ÁREA RESPONSABLE</label>
          <input className={inputCls} list="areas-list" value={form.area_responsable}
            onChange={e => set('area_responsable', e.target.value)}
            placeholder="Ej: Gerencia, RRHH..." />
          <datalist id="areas-list">
            {AREAS_SUGERIDAS.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>ENTREGA A ÁREA RESPONSABLE</label>
          <input className={inputCls} type="date" value={form.fecha_entrega_area}
            onChange={e => set('fecha_entrega_area', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>CONCEPTO / DESCRIPCIÓN</label>
        <input className={inputCls} value={form.descripcion}
          onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Factura agosto 2026" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)}
          disabled={loading || !form.proveedor_id || !form.monto || !form.fecha_vencimiento}
          className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={11} /> {loading ? 'REGISTRANDO...' : 'REGISTRAR'}
        </button>
      </div>
    </div>
  );
};

const ModalPagar = ({ factura, cuentas, periodos, onPagar, onClose, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    cuenta_pago_id: factura.cuenta_pago_id || '',
    fecha_pago: hoy,
    referencia: '',
    periodo_id: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal titulo={`PAGAR — ${factura.proveedor_nombre}`} onClose={onClose}>
      <div className="mb-4 p-3 rounded-sm border border-[#34d39922] bg-[#34d39908]">
        <p className="text-lg font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(factura.monto)}</p>
        {factura.descripcion && <p className="text-[9px] text-[#6aacbc] mt-0.5">{factura.descripcion}</p>}
      </div>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>CUENTA DE PAGO *</label>
          <select className={selectCls} value={form.cuenta_pago_id} onChange={e => set('cuenta_pago_id', e.target.value)}>
            <option value="">— Seleccionar cuenta —</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>FECHA DE PAGO *</label>
            <input className={inputCls} type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>REFERENCIA</label>
            <input className={inputCls} value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="N° transferencia" />
          </div>
        </div>
        <div>
          <label className={labelCls}>PERÍODO</label>
          <select className={selectCls} value={form.periodo_id} onChange={e => set('periodo_id', e.target.value)}>
            <option value="">— Sin período —</option>
            {periodos.filter(p => p.estado === 'abierto').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
          <button onClick={() => onPagar(form)} disabled={loading || !form.cuenta_pago_id || !form.fecha_pago}
            className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
            <Check size={11} /> {loading ? 'PROCESANDO...' : 'CONFIRMAR PAGO'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

export default function Facturas() {
  const [facturas,    setFacturas]    = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cuentas,     setCuentas]     = useState([]);
  const [periodos,    setPeriodos]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalCrear,  setModalCrear]  = useState(false);
  const [modalPagar,  setModalPagar]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    const p = filtroEstado ? `?estado=${filtroEstado}` : '';
    apiService.get(`/tesoreria/facturas${p}`)
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    apiService.get('/tesoreria/proveedores').then(({ data }) => setProveedores(data)).catch(() => {});
    apiService.get('/tesoreria/cuentas').then(({ data }) => setCuentas(data)).catch(() => {});
    apiService.get('/tesoreria/periodos').then(({ data }) => setPeriodos(data)).catch(() => {});
  }, []);

  const registrar = async (form) => {
    setSaving(true);
    try {
      await apiService.post('/tesoreria/facturas', form);
      toast.success('Factura registrada — pendiente de aprobación por Control Interno');
      setModalCrear(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar');
    } finally { setSaving(false); }
  };

  const pagar = async (form) => {
    setSaving(true);
    try {
      await apiService.put(`/tesoreria/facturas/${modalPagar.id}/pagar`, form);
      toast.success('Pago registrado y movimiento creado');
      setModalPagar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al pagar');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FACTURAS</h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// CUENTAS POR PAGAR</p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> REGISTRAR FACTURA
        </button>
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pendiente_aprobacion', 'aprobada', 'pagada', 'rechazada'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className="px-3 py-1.5 text-[8px] tracking-widest rounded-sm border transition-all"
            style={{
              borderColor: filtroEstado === e ? ACCENT + '55' : '#34d39922',
              background:  filtroEstado === e ? ACCENT + '10' : 'transparent',
              color:       filtroEstado === e ? ACCENT : '#6aacbc',
            }}>
            {e === '' ? 'TODAS' : ESTADO_META[e]?.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
          <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN FACTURAS</p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="space-y-2">
          {facturas.map(f => {
            const dias    = diasParaVencer(f.fecha_vencimiento);
            const vencida = dias < 0;
            const urgente = dias >= 0 && dias <= 5;
            return (
              <div key={f.id} className="flex items-center justify-between px-4 py-3 rounded-sm border transition-colors"
                style={{ borderColor: vencida ? '#ef444422' : urgente ? '#fbbf2422' : '#34d39915', background: vencida ? '#ef444406' : '#34d39904' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-[11px] font-semibold text-[#a0d4e0]">{f.proveedor_nombre}</p>
                    <EstadoChip estado={f.estado} />
                    {(vencida || urgente) && f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                      <span className="flex items-center gap-1 text-[7px] tracking-widest"
                        style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                        <AlertTriangle size={8} />
                        {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {f.numero_factura && <p className="text-[7px] font-mono text-[#a0d4e0] opacity-70">{f.numero_factura}</p>}
                    {f.area_responsable && (
                      <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
                        {f.area_responsable.toUpperCase()}
                      </span>
                    )}
                    {f.descripcion && <p className="text-[8px] text-[#6aacbc] truncate max-w-[180px]">{f.descripcion}</p>}
                    <p className="text-[7px] text-[#6aacbc] opacity-40">vence {f.fecha_vencimiento}</p>
                    {f.estado === 'pagada' && f.dias_tesoreria != null && (
                      <p className="text-[7px] text-[#6aacbc] opacity-40">pagada en {f.dias_tesoreria}d</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <p className="text-base font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                  {f.estado === 'aprobada' && (
                    <button onClick={() => setModalPagar(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-widest rounded-sm border transition-all"
                      style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                      <Check size={10} /> PAGAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCrear && (
        <Modal titulo="REGISTRAR FACTURA" onClose={() => setModalCrear(false)}>
          <FormFactura proveedores={proveedores} onSave={registrar} onCancel={() => setModalCrear(false)} loading={saving} />
        </Modal>
      )}

      {modalPagar && (
        <ModalPagar factura={modalPagar} cuentas={cuentas} periodos={periodos}
          onPagar={pagar} onClose={() => setModalPagar(null)} loading={saving} />
      )}
    </div>
  );
}
