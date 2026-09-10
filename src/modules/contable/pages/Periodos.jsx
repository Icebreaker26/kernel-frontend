import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, CalendarDays, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#818cf8';
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

export default function Periodos() {
  const [periodos, setPeriodos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/contable/periodos')
      .then(({ data }) => setPeriodos(data))
      .catch(() => toast.error('Error al cargar períodos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            PERÍODOS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// CIERRE CONTABLE</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> NUEVO PERÍODO
        </button>
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && periodos.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <CalendarDays size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">AÚN NO HAY PERÍODOS REGISTRADOS</p>
        </div>
      )}

      {!loading && periodos.length > 0 && (
        <div className="space-y-3">
          {periodos.map(p => {
            const cerrado = p.estado === 'cerrado';
            return (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-sm border transition-colors"
                style={{ borderColor: cerrado ? '#818cf811' : ACCENT + '33', background: cerrado ? '#818cf804' : ACCENT + '08' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold tracking-widest" style={{ color: cerrado ? '#6aacbc' : ACCENT }}>
                      {p.nombre}
                    </p>
                    <span className={`text-[7px] tracking-[2px] px-1.5 py-0.5 rounded-sm border ${
                      cerrado
                        ? 'border-[#6aacbc33] text-[#6aacbc] bg-[#6aacbc11]'
                        : 'border-[#818cf833] text-[#818cf8] bg-[#818cf811]'
                    }`}>
                      {cerrado ? 'CERRADO' : 'ABIERTO'}
                    </span>
                  </div>
                  <p className="text-[8px] tracking-widest text-[#6aacbc]">
                    {fmtFecha(p.fecha_inicio)} → {fmtFecha(p.fecha_fin)}
                  </p>
                  <p className="text-[7px] text-[#6aacbc] opacity-50 mt-1">
                    {p.total_movimientos} movimiento{p.total_movimientos !== '1' ? 's' : ''}
                    {cerrado && p.cerrado_por_nombre && ` · Cerrado por ${p.cerrado_por_nombre}`}
                  </p>
                </div>
                {!cerrado && (
                  <button onClick={() => cerrar(p)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
                    style={{ borderColor: '#f9731633', background: '#f9731608', color: '#f97316' }}>
                    <Lock size={10} /> CERRAR
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
