import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Check, Building2, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import PerfilProveedor from '../../../components/PerfilProveedor.jsx';

const ACCENT = '#34d399';
const inputCls  = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const FRECUENCIAS = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];
const CATEGORIAS  = ['Servicios públicos', 'Suscripción', 'Arriendo', 'Nómina', 'Mantenimiento', 'Seguros', 'Otro'];

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

const FormProveedor = ({ inicial, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    nit: inicial?.nit || '',
    email: inicial?.email || '',
    telefono: inicial?.telefono || '',
    tipo_pago: inicial?.tipo_pago || 'unico',
    frecuencia: inicial?.frecuencia || '',
    categoria: inicial?.categoria || '',
    notas: inicial?.notas || '',
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
              className="flex-1 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
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
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-[9px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)} disabled={loading || !form.nombre}
          className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={11} /> {loading ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
};

const TIPO_CHIP = {
  recurrente: { label: 'RECURRENTE', color: '#38bdf8' },
  unico:      { label: 'ÚNICO',      color: '#a78bfa' },
};

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [perfil,      setPerfil]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [busqueda,    setBusqueda]    = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/tesoreria/proveedores')
      .then(({ data }) => setProveedores(data))
      .catch(() => toast.error('Error al cargar proveedores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/tesoreria/proveedores', form);
        toast.success('Proveedor creado');
      } else {
        const { nombre: _, tipo_pago: __, ...editable } = form;
        await apiService.put(`/tesoreria/proveedores/${modal.id}`, editable);
        toast.success('Proveedor actualizado');
      }
      setModal(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (p) => {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return;
    try {
      await apiService.put(`/tesoreria/proveedores/${p.id}`, { is_active: false });
      toast.success('Proveedor desactivado');
      cargar();
    } catch { toast.error('Error al desactivar'); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>PROVEEDORES</h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// RECURRENTES · ÚNICOS</p>
        </div>
        <button onClick={() => setModal('crear')}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> NUEVO PROVEEDOR
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar proveedor, NIT, categoría..."
          className="w-full bg-[#05080f] border border-[#34d39922] rounded-sm pl-8 pr-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#34d39955] transition-colors"
        />
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && proveedores.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
          <Building2 size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">AÚN NO HAY PROVEEDORES REGISTRADOS</p>
        </div>
      )}

      {!loading && proveedores.length > 0 && (
        <div className="space-y-2">
          {proveedores.filter(p => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return (
              p.nombre?.toLowerCase().includes(q) ||
              p.nit?.toLowerCase().includes(q) ||
              p.categoria?.toLowerCase().includes(q)
            );
          }).map(p => {
            const chip = TIPO_CHIP[p.tipo_pago];
            return (
              <div key={p.id} className="px-5 py-4 rounded-sm border border-[#34d39918] bg-[#34d39905] group hover:border-[#34d39930] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Fila superior: nombre + chip tipo */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <button onClick={() => setPerfil(p)}
                        className="text-base font-semibold text-[#c8e8f0] leading-tight hover:text-[#34d399] transition-colors text-left">
                        {p.nombre}
                      </button>
                      <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border shrink-0"
                        style={{ color: chip.color, borderColor: chip.color + '44', background: chip.color + '11' }}>
                        {chip.label}{p.tipo_pago === 'recurrente' && p.frecuencia ? ` · ${p.frecuencia.toUpperCase()}` : ''}
                      </span>
                    </div>
                    {/* Fila inferior: meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.categoria && <span className="text-xs text-[#7ec8d8]">{p.categoria}</span>}
                      {p.nit && <span className="text-xs text-[#7ec8d8] opacity-50">NIT {p.nit}</span>}
                      {Number(p.facturas_pendientes) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#fbbf2422] text-[#fbbf24]">
                          {p.facturas_pendientes} factura{p.facturas_pendientes > 1 ? 's' : ''} pendiente{p.facturas_pendientes > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setPerfil(p)}
                      className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-colors"
                      title="Ver perfil">
                      <ExternalLink size={11} />
                    </button>
                    <button onClick={() => setModal(p)}
                      className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-colors">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => desactivar(p)}
                      className="p-1.5 border border-[#ff3d3d22] rounded-sm text-[#6aacbc] hover:text-[#ff3d3d] transition-colors">
                      <X size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        />
      )}
    </div>
  );
}
