import { useState, useEffect, useCallback } from 'react';
import { Check, X, Building2, CreditCard, RefreshCw, Clock, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#c084fc';

const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

function RechazarModal({ solicitud, onConfirm, onClose, loading }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#ef444433] rounded-sm w-full max-w-md relative p-6">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]" />
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] tracking-[3px] text-[#ef4444]">RECHAZAR SOLICITUD</p>
          <button onClick={onClose} className="text-[#6aacbc] hover:text-[#c8e8f0]"><X size={14} /></button>
        </div>
        <p className="text-sm font-semibold text-[#c8e8f0] mb-0.5">{solicitud.proveedor_nombre}</p>
        <p className="text-xs text-[#6aacbc] mb-5">{solicitud.banco} · {solicitud.numero_cuenta}</p>
        <label className="text-xs tracking-widest text-[#6aacbc] mb-1.5 block">MOTIVO *</label>
        <textarea
          className="w-full bg-[#05080f] border border-[#ef444422] rounded-sm px-3 py-2.5 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#ef444455] transition-colors resize-none"
          rows={3}
          placeholder="Indique el motivo del rechazo..."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-[9px] tracking-widest border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
            CANCELAR
          </button>
          <button onClick={() => onConfirm(motivo)} disabled={loading || !motivo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: '#ef444455', background: '#ef444415', color: '#ef4444' }}>
            <X size={11} /> {loading ? 'RECHAZANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewCertModal({ solicitudId, onClose }) {
  const [url,     setUrl]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.get(`/control_interno/datos-bancarios/${solicitudId}/certificado`)
      .then(({ data }) => setUrl(data.url))
      .catch(() => { toast.error('Sin certificado adjunto'); onClose(); })
      .finally(() => setLoading(false));
  }, [solicitudId]);
  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[60] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={14} color={ACCENT} />
          <p className="text-xs tracking-widest" style={{ color: ACCENT }}>CERTIFICADO BANCARIO</p>
        </div>
        <button onClick={onClose} className="p-1.5 border border-[#c084fc33] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0 rounded-sm overflow-hidden border border-[#c084fc22]">
        {loading && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-xs tracking-widest text-[#6aacbc] animate-pulse">CARGANDO...</p>
          </div>
        )}
        {!loading && url && (
          <iframe src={url} className="w-full h-full border-0" title="Certificado bancario" />
        )}
      </div>
    </div>
  );
}

export default function DatosBancarios() {
  const [solicitudes,  setSolicitudes]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [rechazando,   setRechazando]   = useState(null);
  const [procesando,   setProcesando]   = useState(null);
  const [certPreview,  setCertPreview]  = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/control_interno/datos-bancarios')
      .then(({ data }) => setSolicitudes(data))
      .catch(() => toast.error('Error al cargar solicitudes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const verificar = async (s) => {
    setProcesando(s.id);
    try {
      await apiService.put(`/control_interno/datos-bancarios/${s.id}/verificar`);
      toast.success(`Datos bancarios de ${s.proveedor_nombre} verificados`);
      setSolicitudes(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al verificar');
    } finally { setProcesando(null); }
  };

  const confirmarRechazo = async (motivo) => {
    setProcesando(rechazando.id);
    try {
      await apiService.put(`/control_interno/datos-bancarios/${rechazando.id}/rechazar`, { motivo });
      toast.success('Solicitud rechazada');
      setSolicitudes(prev => prev.filter(x => x.id !== rechazando.id));
      setRechazando(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al rechazar');
    } finally { setProcesando(null); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>
            DATOS BANCARIOS
          </h1>
          <p className="text-[#6aacbc] text-xs tracking-[3px] mt-1">// VERIFICACIÓN · PROVEEDORES</p>
        </div>
        <button onClick={cargar}
          className="p-2 border border-[#c084fc22] rounded-sm text-[#6aacbc] hover:text-[#c084fc] transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mb-6 p-4 border border-[#c084fc15] rounded-sm bg-[#c084fc08]">
        <p className="text-xs text-[#6aacbc] leading-relaxed">
          El área Contable ha registrado datos bancarios para los siguientes proveedores.
          Verifica que la información sea correcta antes de aprobarla — una vez aprobada,
          Tesorería podrá usarla para realizar pagos.
        </p>
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-sm tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && solicitudes.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#c084fc22] rounded-sm">
          <CreditCard size={28} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-sm tracking-widest">SIN SOLICITUDES PENDIENTES</p>
        </div>
      )}

      {!loading && solicitudes.length > 0 && (
        <div className="space-y-5">
          {solicitudes.map(s => {
            const proc = procesando === s.id;
            return (
              <div key={s.id} className="border border-[#c084fc22] rounded-sm p-6 bg-[#c084fc05]">
                {/* Proveedor */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <Building2 size={16} color={ACCENT} />
                      <p className="text-lg font-bold text-[#c8e8f0]">{s.proveedor_nombre}</p>
                    </div>
                    {s.proveedor_nit && (
                      <p className="text-xs text-[#6aacbc] ml-7">NIT {s.proveedor_nit}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6aacbc] shrink-0">
                    <Clock size={12} />
                    {fmtFecha(s.created_at)}
                  </div>
                </div>

                {/* Datos bancarios propuestos */}
                <div className="grid grid-cols-2 gap-5 mb-5 p-5 border border-[#c084fc18] rounded-sm bg-[#c084fc08]">
                  <div>
                    <p className="text-xs tracking-widest text-[#6aacbc] mb-1">BANCO</p>
                    <p className="text-base text-[#c8e8f0] font-semibold">{s.banco}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-[#6aacbc] mb-1">TIPO DE CUENTA</p>
                    <p className="text-base text-[#c8e8f0] font-semibold">{s.tipo_cuenta?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-[#6aacbc] mb-1">NÚMERO DE CUENTA</p>
                    <p className="text-base text-[#c8e8f0] font-mono font-semibold tracking-wider">{s.numero_cuenta}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-[#6aacbc] mb-1">TITULAR</p>
                    <p className="text-base text-[#c8e8f0] font-semibold">{s.titular_cuenta}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {s.solicitado_por_nombre && (
                    <p className="text-xs text-[#6aacbc] opacity-60">Solicitado por {s.solicitado_por_nombre}</p>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <button onClick={() => setCertPreview(s.id)} disabled={proc}
                      title="Ver certificado bancario"
                      className="flex items-center gap-2 px-4 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
                      style={{ borderColor: '#c084fc33', background: '#c084fc08', color: '#6aacbc' }}>
                      <Eye size={12} /> CERTIFICADO
                    </button>
                    <button onClick={() => setRechazando(s)} disabled={proc}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
                      style={{ borderColor: '#ef444444', background: '#ef444410', color: '#ef4444' }}>
                      <X size={12} /> RECHAZAR
                    </button>
                    <button onClick={() => verificar(s)} disabled={proc}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
                      style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                      <Check size={12} /> {proc ? 'VERIFICANDO...' : 'VERIFICAR'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rechazando && (
        <RechazarModal
          solicitud={rechazando}
          onConfirm={confirmarRechazo}
          onClose={() => setRechazando(null)}
          loading={!!procesando}
        />
      )}

      {certPreview && (
        <PreviewCertModal
          solicitudId={certPreview}
          onClose={() => setCertPreview(null)}
        />
      )}
    </div>
  );
}
