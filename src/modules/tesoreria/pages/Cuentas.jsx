import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Check, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const TIPOS   = ['banco', 'caja', 'tarjeta'];
const TIPO_ICON = { banco: '🏦', caja: '💵', tarjeta: '💳' };

const inputCls = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

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

const FormCuenta = ({ inicial, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    tipo: inicial?.tipo || 'banco',
    entidad: inicial?.entidad || '',
    numero: inicial?.numero || '',
    saldo_inicial: inicial?.saldo_inicial ?? '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>NOMBRE *</label>
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Bancolombia Ahorros" />
      </div>
      <div>
        <label className={labelCls}>TIPO *</label>
        <div className="flex gap-2">
          {TIPOS.map(t => (
            <button key={t} onClick={() => set('tipo', t)}
              className="flex-1 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
              style={{
                borderColor: form.tipo === t ? ACCENT + '88' : '#34d39922',
                background: form.tipo === t ? ACCENT + '15' : 'transparent',
                color: form.tipo === t ? ACCENT : '#6aacbc',
              }}>
              {TIPO_ICON[t]} {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>ENTIDAD / BANCO</label>
          <input className={inputCls} value={form.entidad} onChange={e => set('entidad', e.target.value)} placeholder="Bancolombia" />
        </div>
        <div>
          <label className={labelCls}>N° CUENTA / REFERENCIA</label>
          <input className={inputCls} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="****1234" />
        </div>
      </div>
      {!inicial && (
        <div>
          <label className={labelCls}>SALDO INICIAL (COP)</label>
          <input className={inputCls} type="number" min="0" value={form.saldo_inicial}
            onChange={e => set('saldo_inicial', e.target.value)} placeholder="0" />
        </div>
      )}
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

export default function Cuentas() {
  const [cuentas,  setCuentas]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'crear' | cuenta
  const [saving,   setSaving]   = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/tesoreria/cuentas')
      .then(({ data }) => setCuentas(data))
      .catch(() => toast.error('Error al cargar cuentas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/tesoreria/cuentas', form);
        toast.success('Cuenta creada');
      } else {
        await apiService.put(`/tesoreria/cuentas/${modal.id}`, form);
        toast.success('Cuenta actualizada');
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
    if (!confirm(`¿Desactivar la cuenta "${c.nombre}"?`)) return;
    try {
      await apiService.put(`/tesoreria/cuentas/${c.id}`, { is_active: false });
      toast.success('Cuenta desactivada');
      cargar();
    } catch {
      toast.error('Error al desactivar');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            CUENTAS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// BANCO · CAJA · TARJETA</p>
        </div>
        <button onClick={() => setModal('crear')}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> NUEVA CUENTA
        </button>
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-20">CARGANDO...</p>}

      {!loading && cuentas.length === 0 && (
        <div className="text-center py-20 border border-dashed border-[#34d39922] rounded-sm">
          <CreditCard size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">AÚN NO HAY CUENTAS REGISTRADAS</p>
        </div>
      )}

      {!loading && cuentas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentas.map(c => (
            <div key={c.id} className="p-4 rounded-sm border border-[#34d39915] bg-[#34d39906] relative group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{TIPO_ICON[c.tipo]}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal(c)}
                    className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] hover:border-[#34d39944] transition-colors">
                    <Pencil size={10} />
                  </button>
                  <button onClick={() => desactivar(c)}
                    className="p-1.5 border border-[#ff3d3d22] rounded-sm text-[#6aacbc] hover:text-[#ff3d3d] hover:border-[#ff3d3d44] transition-colors">
                    <X size={10} />
                  </button>
                </div>
              </div>
              <p className="text-[9px] tracking-widest text-[#6aacbc] mb-1 truncate">{c.nombre.toUpperCase()}</p>
              <p className="text-2xl font-black font-mono" style={{ color: Number(c.saldo_actual) >= 0 ? ACCENT : '#ef4444' }}>
                {fmtCOP(c.saldo_actual)}
              </p>
              {c.entidad && <p className="text-[7px] text-[#6aacbc] mt-1 opacity-60">{c.entidad}{c.numero ? ` · ${c.numero}` : ''}</p>}
              <p className="text-[7px] tracking-[2px] mt-2 opacity-40 text-[#6aacbc]">
                SALDO INICIAL: {fmtCOP(c.saldo_inicial)}
              </p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          titulo={modal === 'crear' ? 'NUEVA CUENTA' : 'EDITAR CUENTA'}
          onClose={() => setModal(null)}>
          <FormCuenta
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
