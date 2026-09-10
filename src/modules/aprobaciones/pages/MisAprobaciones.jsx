import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Clock, FileText, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const diasParaVencer = (fecha) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha + 'T00:00:00') - hoy) / 86400000);
};

export default function MisAprobaciones() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/aprobaciones')
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobar = async (f) => {
    setSaving(f.id);
    try {
      await apiService.put(`/aprobaciones/${f.id}/aprobar`);
      toast.success(`Factura de ${f.proveedor_nombre} aprobada — pasa a Control Interno`);
      setFacturas(prev => prev.filter(x => x.id !== f.id));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al aprobar');
    } finally { setSaving(null); }
  };

  return (
    <div className="min-h-screen bg-[#05080f] font-mono p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/selector')}
              className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ShieldCheck size={16} style={{ color: ACCENT }} />
                <h1 className="text-lg font-bold tracking-[4px]" style={{ color: ACCENT, textShadow: `0 0 16px ${ACCENT}55` }}>
                  MIS APROBACIONES
                </h1>
              </div>
              <p className="text-[#7ec8d8] text-[10px] tracking-[2px]">// FACTURAS PENDIENTES ASIGNADAS A TI</p>
            </div>
          </div>
          <button onClick={cargar}
            className="p-1.5 border border-[#34d39922] rounded-sm text-[#6aacbc] hover:text-[#34d399] transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && (
          <p className="text-center text-[#7ec8d8] text-xs tracking-wide animate-pulse py-20">CARGANDO...</p>
        )}

        {!loading && facturas.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[#34d39922] rounded-sm">
            <ShieldCheck size={28} color={ACCENT} className="mx-auto mb-4 opacity-30" />
            <p className="text-[#7ec8d8] text-xs tracking-widest">SIN FACTURAS PENDIENTES</p>
            <p className="text-[#6aacbc] text-[10px] mt-2 opacity-60">
              Cuando alguien te asigne una factura para aprobar, aparecerá aquí.
            </p>
          </div>
        )}

        {!loading && facturas.length > 0 && (
          <>
            <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-4">
              {facturas.length} FACTURA{facturas.length !== 1 ? 'S' : ''} PENDIENTE{facturas.length !== 1 ? 'S' : ''}
            </p>
            <div className="space-y-3">
              {facturas.map(f => {
                const dias    = diasParaVencer(f.fecha_vencimiento);
                const vencida = dias < 0;
                const urgente = dias >= 0 && dias <= 5;
                const proc    = saving === f.id;

                return (
                  <div key={f.id}
                    className="px-5 py-4 rounded-sm border transition-colors"
                    style={{
                      borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#34d39918',
                      background:  vencida ? '#ef444406' : '#34d39904',
                    }}>

                    {/* Proveedor + monto */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                        {f.descripcion && (
                          <p className="text-xs text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>
                        )}
                      </div>
                      <p className="text-xl font-black font-mono shrink-0 leading-tight" style={{ color: ACCENT }}>
                        {fmtCOP(f.monto)}
                      </p>
                    </div>

                    {/* Meta + botón */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {f.area_responsable && (
                          <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
                            {f.area_responsable.toUpperCase()}
                          </span>
                        )}
                        {f.numero_factura && (
                          <span className="text-[10px] font-mono text-[#a0d4e0] opacity-70">N° {f.numero_factura}</span>
                        )}
                        {(vencida || urgente) ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold"
                            style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                            <AlertTriangle size={11} />
                            {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#7ec8d8] opacity-50">
                            <Clock size={9} className="inline mr-1" />vence {f.fecha_vencimiento}
                          </span>
                        )}
                        {f.registrado_por_nombre && (
                          <span className="text-[10px] text-[#6aacbc] opacity-50">
                            Registrado por {f.registrado_por_nombre}
                          </span>
                        )}
                      </div>

                      <button onClick={() => aprobar(f)} disabled={proc}
                        className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all shrink-0 disabled:opacity-40"
                        style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                        <Check size={11} /> {proc ? 'APROBANDO...' : 'APROBAR'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
