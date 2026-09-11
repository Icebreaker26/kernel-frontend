import { useState, useEffect } from 'react';
import { Settings, Check, X, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const inputCls = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

function UmbralRow({ u, onUpdated }) {
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [monto,    setMonto]    = useState(String(u.monto_umbral));
  const [dias,     setDias]     = useState(String(u.dias_vencimiento));
  const [desc,     setDesc]     = useState(u.descripcion || '');

  const guardar = async () => {
    setSaving(true);
    try {
      await apiService.put(`/tesoreria/config/umbrales/${u.id}`, {
        monto_umbral:     Number(monto),
        dias_vencimiento: Number(dias),
        descripcion:      desc,
      });
      toast.success('Umbral actualizado');
      onUpdated();
      setEditing(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancelar = () => {
    setMonto(String(u.monto_umbral));
    setDias(String(u.dias_vencimiento));
    setDesc(u.descripcion || '');
    setEditing(false);
  };

  return (
    <div className="border border-[#34d39922] rounded-sm p-5 space-y-4 bg-[#05080f]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[3px] font-bold" style={{ color: ACCENT }}>
            {u.tipo_operacion.toUpperCase().replace(/_/g, ' ')}
          </p>
          {!editing && (
            <p className="text-[#6aacbc] text-[9px] mt-1">{u.descripcion || '—'}</p>
          )}
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[8px] tracking-widest border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
              <Edit2 size={10} /> EDITAR
            </button>
          : <div className="flex items-center gap-2">
              <button onClick={cancelar}
                className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#ef4444] transition-colors">
                <X size={12} />
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-[8px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Check size={10} /> {saving ? '...' : 'GUARDAR'}
              </button>
            </div>
        }
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[8px] tracking-[2px] text-[#6aacbc]">UMBRAL DE MONTO</p>
            <p className="text-[#a0d4e0] text-sm font-mono font-bold mt-1">{fmtCOP(u.monto_umbral)}</p>
            <p className="text-[#6aacbc] text-[8px] mt-0.5">Facturas por encima de este valor requieren aprobación de Gerencia</p>
          </div>
          <div>
            <p className="text-[8px] tracking-[2px] text-[#6aacbc]">DÍAS DE VIGENCIA</p>
            <p className="text-[#a0d4e0] text-sm font-mono font-bold mt-1">{u.dias_vencimiento} días</p>
            <p className="text-[#6aacbc] text-[8px] mt-0.5">Tiempo que tiene Tesorería para pagar desde la aprobación de CI</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>DESCRIPCIÓN</label>
            <input className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del umbral" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>UMBRAL DE MONTO (COP)</label>
              <input className={inputCls} type="number" min="1" value={monto}
                onChange={e => setMonto(e.target.value)} placeholder="5000000" />
            </div>
            <div>
              <label className={labelCls}>DÍAS DE VIGENCIA</label>
              <input className={inputCls} type="number" min="1" max="90" value={dias}
                onChange={e => setDias(e.target.value)} placeholder="7" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigUmbrales() {
  const [umbrales, setUmbrales] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const cargar = () => {
    setLoading(true);
    apiService.get('/tesoreria/config/umbrales')
      .then(({ data }) => setUmbrales(data))
      .catch(() => toast.error('Error al cargar umbrales'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={18} style={{ color: ACCENT }} />
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            UMBRALES
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// APROBACIÓN · VIGENCIA</p>
        </div>
      </div>

      <div className="mb-5 p-4 border border-[#34d39915] rounded-sm bg-[#34d39908]">
        <p className="text-[9px] tracking-[2px] text-[#6aacbc]">
          Los umbrales definen a partir de qué monto una factura requiere aprobación de Gerencia,
          y por cuántos días es válida la aprobación de Control Interno antes de expirar.
        </p>
      </div>

      {loading && (
        <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>
      )}

      {!loading && (
        <div className="space-y-4">
          {umbrales.map(u => (
            <UmbralRow key={u.id} u={u} onUpdated={cargar} />
          ))}
          {umbrales.length === 0 && (
            <p className="text-center text-[#6aacbc] opacity-40 text-[9px] tracking-widest py-12">SIN UMBRALES CONFIGURADOS</p>
          )}
        </div>
      )}
    </div>
  );
}
