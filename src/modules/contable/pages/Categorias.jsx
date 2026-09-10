import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Check, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#818cf8';
const inputCls = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf855] transition-colors';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const TIPOS = ['ingreso', 'egreso', 'traslado'];
const tipoColor = { ingreso: '#22c55e', egreso: '#ef4444', traslado: '#38bdf8' };

const COLORES_PRESET = [
  '#22c55e','#16a34a','#4ade80','#86efac',
  '#ef4444','#dc2626','#f97316','#fb923c',
  '#38bdf8','#818cf8','#a78bfa','#fbbf24',
  '#64748b','#94a3b8','#e2e8f0',
];

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-md relative p-6">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
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
                  borderColor: form.tipo === t ? tipoColor[t] + '88' : '#818cf822',
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
          placeholder="#818cf8" maxLength={7} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 text-[9px] tracking-widest border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
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

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [saving,     setSaving]     = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/contable/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/contable/categorias', form);
        toast.success('Categoría creada');
      } else {
        await apiService.put(`/contable/categorias/${modal.id}`, { nombre: form.nombre, color: form.color });
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
      await apiService.put(`/contable/categorias/${c.id}`, { is_active: false });
      toast.success('Categoría desactivada');
      cargar();
    } catch { toast.error('Error al desactivar'); }
  };

  const agrupadas = TIPOS.reduce((acc, t) => {
    acc[t] = categorias.filter(c => c.tipo === t);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            CATEGORÍAS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// CLASIFICACIÓN DE MOVIMIENTOS</p>
        </div>
        <button onClick={() => setModal('crear')}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> NUEVA CATEGORÍA
        </button>
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && categorias.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <Tag size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN CATEGORÍAS</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {TIPOS.map(tipo => agrupadas[tipo]?.length > 0 && (
            <div key={tipo}>
              <p className="text-[8px] tracking-[3px] mb-3" style={{ color: tipoColor[tipo] }}>
                {tipo.toUpperCase()}S
              </p>
              <div className="space-y-1">
                {agrupadas[tipo].map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-sm border border-[#818cf810] bg-[#818cf805] group hover:border-[#818cf822] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c.color }} />
                      <span className="text-[10px] text-[#a0d4e0]">{c.nombre}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal(c)}
                        className="p-1 border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#818cf8] hover:border-[#818cf844] transition-colors">
                        <Pencil size={9} />
                      </button>
                      <button onClick={() => desactivar(c)}
                        className="p-1 border border-[#ff3d3d22] rounded-sm text-[#6aacbc] hover:text-[#ff3d3d] hover:border-[#ff3d3d44] transition-colors">
                        <X size={9} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
