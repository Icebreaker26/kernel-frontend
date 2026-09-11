import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, X, Edit2, Plus, Search, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtTipo = (s) => s?.toUpperCase().replace(/_/g, ' ') || '—';

const inputCls = 'w-full bg-[#05080f] border border-[#c084fc22] rounded-sm px-3 py-2 text-base text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#c084fc55] transition-colors';
const labelCls = 'text-[10px] tracking-[3px] text-[#6aacbc] mb-1 block';

// ── Modal crear umbral ─────────────────────────────────────────────────────────
const ModalCrear = ({ onCrear, onClose, saving }) => {
  const [form, setForm] = useState({ tipo_operacion: '', monto_umbral: '', descripcion: '', dias_vencimiento: '7' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valido = form.tipo_operacion.trim() && Number(form.monto_umbral) > 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-lg relative p-6" style={{ borderColor: ACCENT + '33' }}>
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: ACCENT }} />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: ACCENT }} />
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>NUEVO UMBRAL</p>
          <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"><X size={14} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>TIPO DE OPERACIÓN *</label>
            <input className={inputCls} value={form.tipo_operacion} onChange={set('tipo_operacion')}
              placeholder="ej. pago_proveedor" />
            <p className="text-[10px] text-[#4a7a8a] mt-1">Identificador único — usar snake_case</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>UMBRAL DE MONTO (COP) *</label>
              <input className={inputCls} type="number" min="1" value={form.monto_umbral}
                onChange={set('monto_umbral')} placeholder="5000000" />
            </div>
            <div>
              <label className={labelCls}>DÍAS DE VIGENCIA</label>
              <input className={inputCls} type="number" min="1" max="90" value={form.dias_vencimiento}
                onChange={set('dias_vencimiento')} placeholder="7" />
            </div>
          </div>
          <div>
            <label className={labelCls}>DESCRIPCIÓN</label>
            <input className={inputCls} value={form.descripcion} onChange={set('descripcion')}
              placeholder="Descripción del umbral (opcional)" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-[10px] tracking-wide border rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors"
            style={{ borderColor: ACCENT + '22' }}>
            CANCELAR
          </button>
          <button onClick={() => onCrear(form)} disabled={saving || !valido}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
            <Check size={11} /> {saving ? 'CREANDO...' : 'CREAR UMBRAL'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal detalle / editar umbral ──────────────────────────────────────────────
const ModalDetalle = ({ u, onClose, onGuardar, saving }) => {
  const [editando, setEditando] = useState(false);
  const [form, setForm]         = useState({
    monto_umbral:     String(u.monto_umbral),
    dias_vencimiento: String(u.dias_vencimiento),
    descripcion:      u.descripcion || '',
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const accentBorder = ACCENT + '33';

  const cancelar = () => {
    setForm({
      monto_umbral:     String(u.monto_umbral),
      dias_vencimiento: String(u.dias_vencimiento),
      descripcion:      u.descripcion || '',
    });
    setEditando(false);
  };

  const Campo = ({ label, valor, mono, accent }) => (
    <div>
      <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">{label}</p>
      <p className={`text-base ${mono ? 'font-mono' : ''}`}
        style={{ color: accent ? ACCENT : '#c8e8f0' }}>
        {valor || '—'}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col relative"
        style={{ borderColor: accentBorder }}>
        <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: ACCENT }} />
        <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: ACCENT }} />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b" style={{ borderColor: accentBorder }}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[4px] text-[#6aacbc] mb-1">UMBRAL DE APROBACIÓN</p>
              <h2 className="text-xl font-bold" style={{ color: ACCENT }}>
                {fmtTipo(u.tipo_operacion)}
              </h2>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          {!editando && u.descripcion && (
            <p className="text-base text-[#7ec8d8]">{u.descripcion}</p>
          )}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {!editando ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-6 p-4 rounded-sm border"
                style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
                <div>
                  <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-1">UMBRAL DE MONTO</p>
                  <p className="text-2xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(u.monto_umbral)}</p>
                  <p className="text-[11px] text-[#4a7a8a] mt-1 leading-relaxed">
                    Facturas por encima de este valor requieren aprobación de Gerencia
                  </p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-1">DÍAS DE VIGENCIA</p>
                  <p className="text-2xl font-black font-mono text-[#34d399]">{u.dias_vencimiento} <span className="text-base font-normal">días</span></p>
                  <p className="text-[11px] text-[#4a7a8a] mt-1 leading-relaxed">
                    Tiempo que tiene Tesorería para pagar desde la aprobación de CI
                  </p>
                </div>
              </div>
              {u.descripcion && (
                <Campo label="DESCRIPCIÓN" valor={u.descripcion} />
              )}
              <Campo label="TIPO DE OPERACIÓN" valor={u.tipo_operacion} mono />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>UMBRAL DE MONTO (COP) *</label>
                <input className={inputCls} type="number" min="1" value={form.monto_umbral}
                  onChange={set('monto_umbral')} />
              </div>
              <div>
                <label className={labelCls}>DÍAS DE VIGENCIA</label>
                <input className={inputCls} type="number" min="1" max="90" value={form.dias_vencimiento}
                  onChange={set('dias_vencimiento')} />
              </div>
              <div>
                <label className={labelCls}>DESCRIPCIÓN</label>
                <input className={inputCls} value={form.descripcion} onChange={set('descripcion')}
                  placeholder="Descripción del umbral" />
              </div>
              <p className="text-[10px] text-[#4a7a8a]">
                El tipo de operación (<span className="font-mono text-[#7ec8d8]">{u.tipo_operacion}</span>) no puede modificarse.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: accentBorder }}>
          {!editando ? (
            <>
              <button onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
                style={{ borderColor: ACCENT + '44', background: ACCENT + '0d', color: ACCENT }}>
                <Edit2 size={11} /> EDITAR
              </button>
              <button onClick={onClose}
                className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
                style={{ borderColor: accentBorder }}>
                CERRAR
              </button>
            </>
          ) : (
            <>
              <button onClick={cancelar}
                className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors"
                style={{ borderColor: ACCENT + '22' }}>
                CANCELAR
              </button>
              <button onClick={() => onGuardar(u.id, form)} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Check size={11} /> {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────────
export default function ConfigUmbrales() {
  const [umbrales,   setUmbrales]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [busqueda,   setBusqueda]   = useState('');
  const [detalle,    setDetalle]    = useState(null);
  const [mostrarNew, setMostrarNew] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/control_interno/config/umbrales')
      .then(({ data }) => setUmbrales(data))
      .catch(() => toast.error('Error al cargar umbrales'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const umbralesFiltrados = useMemo(() => {
    if (!busqueda) return umbrales;
    const q = busqueda.toLowerCase();
    return umbrales.filter(u =>
      u.tipo_operacion?.toLowerCase().includes(q) ||
      u.descripcion?.toLowerCase().includes(q)
    );
  }, [umbrales, busqueda]);

  const guardar = async (id, form) => {
    setSaving(true);
    try {
      await apiService.put(`/control_interno/config/umbrales/${id}`, {
        monto_umbral:     Number(form.monto_umbral),
        dias_vencimiento: Number(form.dias_vencimiento),
        descripcion:      form.descripcion,
      });
      toast.success('Umbral actualizado');
      setDetalle(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const crear = async (form) => {
    setSaving(true);
    try {
      await apiService.post('/control_interno/config/umbrales', {
        tipo_operacion:   form.tipo_operacion.trim(),
        monto_umbral:     Number(form.monto_umbral),
        dias_vencimiento: Number(form.dias_vencimiento) || 7,
        descripcion:      form.descripcion || undefined,
      });
      toast.success('Umbral creado');
      setMostrarNew(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear');
    } finally { setSaving(false); }
  };

  // Stats
  const montos    = umbrales.map(u => Number(u.monto_umbral));
  const diasArr   = umbrales.map(u => Number(u.dias_vencimiento));
  const montoMax  = montos.length  ? Math.max(...montos) : 0;
  const diasProm  = diasArr.length ? Math.round(diasArr.reduce((a, b) => a + b, 0) / diasArr.length) : 0;

  const fmtCompacto = (n) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`;

  return (
    <div className="p-8 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            UMBRALES
          </h1>
          <p className="text-[#7ec8d8] text-[13px] tracking-[2px] mt-0.5">// CONFIGURACIÓN DE APROBACIÓN — CONTROL INTERNO</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
            <Plus size={12} /> NUEVO UMBRAL
          </button>
          <button onClick={cargar}
            className="p-2 border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-stretch gap-px mb-4 border border-[#c084fc1a] rounded-sm overflow-hidden">
          {[
            { label: 'UMBRALES',       value: umbrales.length,             color: '#c8e8f0' },
            { label: 'EN BÚSQUEDA',    value: umbralesFiltrados.length,    color: '#c8e8f0' },
            { label: 'MONTO MÁX.',     value: fmtCompacto(montoMax),       color: ACCENT    },
            { label: 'DÍAS PROMEDIO',  value: diasProm ? `${diasProm}d`  : '—', color: '#34d399' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
              <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por tipo de operación o descripción..."
          className="w-full bg-[#05080f] border border-[#c084fc22] rounded-sm pl-8 pr-3 py-2 text-base text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#c084fc55] transition-colors"
        />
      </div>

      {loading && <p className="text-center text-[#7ec8d8] text-base tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && umbralesFiltrados.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#c084fc22] rounded-sm">
          <Shield size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-base tracking-wide">
            {busqueda ? 'SIN RESULTADOS' : 'SIN UMBRALES CONFIGURADOS'}
          </p>
          {!busqueda && (
            <button onClick={() => setMostrarNew(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-widest rounded-sm border transition-all mx-auto"
              style={{ borderColor: ACCENT + '44', background: ACCENT + '10', color: ACCENT }}>
              <Plus size={11} /> CREAR PRIMER UMBRAL
            </button>
          )}
        </div>
      )}

      {!loading && umbralesFiltrados.length > 0 && (
        <div className="space-y-2">
          {umbralesFiltrados.map(u => {
            const montoNum = Number(u.monto_umbral);
            const umbralAlto = montoNum >= 10_000_000;

            return (
              <div key={u.id}
                onClick={() => setDetalle(u)}
                className="px-5 py-4 rounded-sm border transition-colors cursor-pointer hover:border-[#c084fc40] hover:bg-[#c084fc0a]"
                style={{ borderColor: '#c084fc18', background: '#c084fc04' }}>

                {/* Fila 1: tipo + descripción + botón editar */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] tracking-widest px-2.5 py-1 rounded-sm border shrink-0"
                      style={{ borderColor: ACCENT + '44', background: ACCENT + '12', color: ACCENT }}>
                      {fmtTipo(u.tipo_operacion)}
                    </span>
                    {u.descripcion && (
                      <span className="text-base text-[#7ec8d8] truncate max-w-[320px]">{u.descripcion}</span>
                    )}
                    {umbralAlto && (
                      <span className="flex items-center gap-1 text-[11px] text-[#fbbf24]">
                        <AlertTriangle size={10} /> ALTO VALOR
                      </span>
                    )}
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDetalle(u)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wide rounded-sm border transition-all"
                      style={{ borderColor: ACCENT + '33', background: ACCENT + '08', color: '#6aacbc' }}>
                      <Edit2 size={10} /> EDITAR
                    </button>
                  </div>
                </div>

                {/* Fila 2: monto + días */}
                <div className="flex items-end gap-8">
                  <div>
                    <p className="text-[10px] tracking-[2px] text-[#4a7a8a] mb-0.5">UMBRAL DE MONTO</p>
                    <p className="text-2xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(u.monto_umbral)}</p>
                  </div>
                  <div className="mb-0.5">
                    <p className="text-[10px] tracking-[2px] text-[#4a7a8a] mb-0.5">DÍAS DE VIGENCIA</p>
                    <p className="text-2xl font-black font-mono text-[#34d399]">
                      {u.dias_vencimiento} <span className="text-sm font-normal text-[#34d39966]">días</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detalle && (
        <ModalDetalle
          u={detalle}
          onClose={() => setDetalle(null)}
          onGuardar={guardar}
          saving={saving}
        />
      )}

      {mostrarNew && (
        <ModalCrear
          onCrear={crear}
          onClose={() => setMostrarNew(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
