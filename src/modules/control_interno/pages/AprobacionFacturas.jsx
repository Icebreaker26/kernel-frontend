import { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertTriangle, Clock, RefreshCw, Ban, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const inputCls = 'w-full bg-[#05080f] border border-[#c084fc22] rounded-sm px-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#c084fc55] transition-colors';
const labelCls = 'text-[10px] tracking-wide text-[#7ec8d8] mb-1 block';

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

const TIPO_CHIP = {
  recurrente: { label: 'RECURRENTE', color: '#38bdf8' },
  unico:      { label: 'ÚNICO',      color: '#a78bfa' },
};

const ModalRechazar = ({ factura, onRechazar, onClose, loading }) => {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#ef444433] rounded-sm w-full max-w-md relative p-6">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]" />
        <p className="text-[10px] tracking-[3px] text-[#ef4444] mb-5">RECHAZAR FACTURA</p>
        <p className="text-[11px] text-[#a0d4e0] mb-1">{factura.proveedor_nombre}</p>
        <p className="text-lg font-black font-mono text-[#ef4444] mb-5">{fmtCOP(factura.monto)}</p>
        <div className="mb-5">
          <label className={labelCls}>MOTIVO DE RECHAZO *</label>
          <textarea className={inputCls.replace('c084fc', 'ef4444') + ' resize-none'} rows={3}
            value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Explica el motivo del rechazo..." />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[10px] tracking-wide border border-[#ef444422] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
          <button onClick={() => onRechazar(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444455] bg-[#ef444415] text-[#ef4444]">
            <Ban size={11} /> {loading ? 'RECHAZANDO...' : 'CONFIRMAR RECHAZO'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AprobacionFacturas() {
  const [facturas, setFacturas]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(null); // id de la factura que está procesando
  const [filtro,   setFiltro]     = useState('pendiente_aprobacion');
  const [rechazar, setRechazar]   = useState(null);
  const [busqueda, setBusqueda]   = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/control_interno/facturas?estado=${filtro}`)
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobar = async (f) => {
    setSaving(f.id);
    try {
      await apiService.put(`/control_interno/facturas/${f.id}/aprobar`);
      toast.success(`Factura de ${f.proveedor_nombre} aprobada`);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al aprobar');
    } finally { setSaving(null); }
  };

  const confirmarRechazo = async (motivo) => {
    setSaving(rechazar.id);
    try {
      await apiService.put(`/control_interno/facturas/${rechazar.id}/rechazar`, { motivo });
      toast.success('Factura rechazada');
      setRechazar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setSaving(null); }
  };

  const pendientes = facturas.filter(f => f.estado === 'pendiente_aprobacion').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            FACTURAS
          </h1>
          <p className="text-[#7ec8d8] text-[11px] tracking-[2px] mt-1">// APROBACIÓN DE PAGOS</p>
        </div>
        <div className="flex items-center gap-2">
          {pendientes > 0 && (
            <span className="text-[10px] tracking-wide px-2 py-1 rounded-sm border border-[#fbbf2444] bg-[#fbbf2411] text-[#fbbf24]">
              {pendientes} PENDIENTE{pendientes > 1 ? 'S' : ''}
            </span>
          )}
          <button onClick={cargar} className="p-1.5 border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar proveedor, # factura, concepto..."
            className="w-full bg-[#05080f] border border-[#c084fc22] rounded-sm pl-8 pr-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#c084fc55] transition-colors"
          />
        </div>
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { v: 'pendiente_aprobacion', label: 'PENDIENTES' },
          { v: 'aprobada',             label: 'APROBADAS' },
          { v: 'rechazada',            label: 'RECHAZADAS' },
        ].map(({ v, label }) => (
          <button key={v} onClick={() => setFiltro(v)}
            className="px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
            style={{
              borderColor: filtro === v ? ACCENT + '55' : '#c084fc22',
              background:  filtro === v ? ACCENT + '10' : 'transparent',
              color:       filtro === v ? ACCENT : '#7ec8d8',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#7ec8d8] text-xs tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#c084fc22] rounded-sm">
          <Clock size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-xs tracking-wide">
            {filtro === 'pendiente_aprobacion' ? 'NO HAY FACTURAS PENDIENTES' : 'SIN REGISTROS'}
          </p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="space-y-3">
          {facturas.filter(f => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return (
              f.proveedor_nombre?.toLowerCase().includes(q) ||
              f.numero_factura?.toLowerCase().includes(q) ||
              f.descripcion?.toLowerCase().includes(q) ||
              f.area_responsable?.toLowerCase().includes(q)
            );
          }).map(f => {
            const dias    = diasParaVencer(f.fecha_vencimiento);
            const vencida = dias < 0;
            const urgente = dias >= 0 && dias <= 5;
            const chip    = TIPO_CHIP[f.proveedor_tipo];
            const procesando = saving === f.id;

            return (
              <div key={f.id} className="px-5 py-4 rounded-sm border transition-colors"
                style={{ borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#c084fc18', background: '#c084fc04' }}>

                {/* Fila superior: proveedor + monto */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-base font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                      {chip && (
                        <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border"
                          style={{ color: chip.color, borderColor: chip.color + '44', background: chip.color + '11' }}>
                          {chip.label}{f.proveedor_frecuencia ? ` · ${f.proveedor_frecuencia.toUpperCase()}` : ''}
                        </span>
                      )}
                    </div>
                    {f.descripcion && (
                      <p className="text-xs text-[#7ec8d8] truncate max-w-[340px]">{f.descripcion}</p>
                    )}
                  </div>
                  <p className="text-lg font-black font-mono shrink-0 leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                </div>

                {/* Fila inferior: chips + fechas + acciones */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.numero_factura && (
                      <span className="text-[10px] font-mono text-[#a0d4e0] opacity-80">N° {f.numero_factura}</span>
                    )}
                    {f.area_responsable && (
                      <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border border-[#c084fc33] text-[#c084fc] bg-[#c084fc10]">
                        {f.area_responsable.toUpperCase()}
                      </span>
                    )}
                    {(vencida || urgente) && f.estado === 'pendiente_aprobacion' && (
                      <span className="flex items-center gap-1 text-[10px] tracking-wide font-semibold"
                        style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                        <AlertTriangle size={11} />
                        {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    )}
                    <span className="text-[10px] text-[#7ec8d8] opacity-50">
                      {f.fecha_emision ? `Emisión ${f.fecha_emision} · ` : ''}Vence {f.fecha_vencimiento}
                    </span>
                    {f.estado === 'rechazada' && f.rechazo_motivo && (
                      <span className="text-[10px] text-[#ef4444]">· {f.rechazo_motivo}</span>
                    )}
                    {f.aprobado_por_nombre && (
                      <span className="text-[10px] text-[#7ec8d8] opacity-60">
                        {f.estado === 'rechazada' ? 'Rechazado' : 'Aprobado'} por {f.aprobado_por_nombre}
                      </span>
                    )}
                    {f.registrado_por_nombre && (
                      <span className="text-[10px] text-[#7ec8d8] opacity-40">· Registrado por {f.registrado_por_nombre}</span>
                    )}
                  </div>
                  {f.estado === 'pendiente_aprobacion' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setRechazar(f)} disabled={procesando}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
                        <X size={11} /> RECHAZAR
                      </button>
                      <button onClick={() => aprobar(f)} disabled={procesando}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
                        style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                        <Check size={10} /> {procesando ? '...' : 'APROBAR'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rechazar && (
        <ModalRechazar
          factura={rechazar}
          onRechazar={confirmarRechazo}
          onClose={() => setRechazar(null)}
          loading={!!saving}
        />
      )}
    </div>
  );
}
