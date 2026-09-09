import { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertTriangle, Clock, RefreshCw, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const inputCls = 'w-full bg-[#05080f] border border-[#c084fc22] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#c084fc55] transition-colors';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

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
          <button onClick={onClose} className="px-4 py-2 text-[9px] tracking-widest border border-[#ef444422] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
          <button onClick={() => onRechazar(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40 border-[#ef444455] bg-[#ef444415] text-[#ef4444]">
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
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// APROBACIÓN DE PAGOS</p>
        </div>
        <div className="flex items-center gap-2">
          {pendientes > 0 && (
            <span className="text-[8px] tracking-widest px-2 py-1 rounded-sm border border-[#fbbf2444] bg-[#fbbf2411] text-[#fbbf24]">
              {pendientes} PENDIENTE{pendientes > 1 ? 'S' : ''}
            </span>
          )}
          <button onClick={cargar} className="p-1.5 border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { v: 'pendiente_aprobacion', label: 'PENDIENTES' },
          { v: 'aprobada',             label: 'APROBADAS' },
          { v: 'rechazada',            label: 'RECHAZADAS' },
        ].map(({ v, label }) => (
          <button key={v} onClick={() => setFiltro(v)}
            className="px-3 py-1.5 text-[8px] tracking-widest rounded-sm border transition-all"
            style={{
              borderColor: filtro === v ? ACCENT + '55' : '#c084fc22',
              background:  filtro === v ? ACCENT + '10' : 'transparent',
              color:       filtro === v ? ACCENT : '#6aacbc',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#c084fc22] rounded-sm">
          <Clock size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">
            {filtro === 'pendiente_aprobacion' ? 'NO HAY FACTURAS PENDIENTES' : 'SIN REGISTROS'}
          </p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="space-y-3">
          {facturas.map(f => {
            const dias    = diasParaVencer(f.fecha_vencimiento);
            const vencida = dias < 0;
            const urgente = dias >= 0 && dias <= 5;
            const chip    = TIPO_CHIP[f.proveedor_tipo];
            const procesando = saving === f.id;

            return (
              <div key={f.id} className="p-4 rounded-sm border transition-colors"
                style={{ borderColor: vencida ? '#ef444422' : urgente ? '#fbbf2422' : '#c084fc15', background: '#c084fc04' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-[#a0d4e0]">{f.proveedor_nombre}</p>
                      {chip && (
                        <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
                          style={{ color: chip.color, borderColor: chip.color + '44', background: chip.color + '11' }}>
                          {chip.label}
                        </span>
                      )}
                      {f.proveedor_frecuencia && (
                        <span className="text-[7px] text-[#6aacbc] opacity-60">{f.proveedor_frecuencia.toUpperCase()}</span>
                      )}
                    </div>

                    {f.descripcion && (
                      <p className="text-[9px] text-[#6aacbc] mb-1">{f.descripcion}</p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {f.soporte && (
                        <p className="text-[8px] text-[#6aacbc] opacity-50">Soporte: {f.soporte}</p>
                      )}
                      <p className="text-[7px] text-[#6aacbc] opacity-40">
                        Recibida {f.fecha_recibida} · Vence {f.fecha_vencimiento}
                      </p>
                      {(vencida || urgente) && f.estado === 'pendiente_aprobacion' && (
                        <span className="flex items-center gap-1 text-[7px] tracking-widest"
                          style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                          <AlertTriangle size={8} />
                          {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                        </span>
                      )}
                      {f.estado === 'rechazada' && f.rechazo_motivo && (
                        <p className="text-[8px] text-[#ef4444]">Motivo: {f.rechazo_motivo}</p>
                      )}
                      {f.aprobado_por_nombre && (
                        <p className="text-[7px] text-[#6aacbc] opacity-40">
                          {f.estado === 'rechazada' ? 'Rechazado' : 'Aprobado'} por {f.aprobado_por_nombre}
                        </p>
                      )}
                      {f.registrado_por_nombre && (
                        <p className="text-[7px] text-[#6aacbc] opacity-30">Registrado por {f.registrado_por_nombre}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                    {f.estado === 'pendiente_aprobacion' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRechazar(f)}
                          disabled={procesando}
                          className="flex items-center gap-1 px-3 py-1.5 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40 border-[#ef444433] bg-[#ef444408] text-[#ef4444] hover:bg-[#ef444415]">
                          <X size={10} /> RECHAZAR
                        </button>
                        <button
                          onClick={() => aprobar(f)}
                          disabled={procesando}
                          className="flex items-center gap-1 px-3 py-1.5 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
                          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                          <Check size={10} /> {procesando ? '...' : 'APROBAR'}
                        </button>
                      </div>
                    )}
                  </div>
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
