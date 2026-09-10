import { useState, useEffect, useCallback } from 'react';
import { X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban, Search, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#34d399';
const inputCls  = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#34d39955] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-[10px] tracking-wide text-[#7ec8d8] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PENDIENTE',   color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'APROBADA',    color: '#34d399', icon: CircleCheck },
  autorizada:           { label: 'AUTORIZADA',  color: '#a78bfa', icon: Check },
  pagada:               { label: 'PAGADA',      color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADA',   color: '#ef4444', icon: Ban },
};

const EstadoChip = ({ estado }) => {
  const m = ESTADO_META[estado] || {};
  const Icon = m.icon || Clock;
  return (
    <span className="flex items-center gap-1 text-[9px] tracking-wide px-2 py-0.5 rounded-sm border"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

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

const ModalAutorizar = ({ factura, onAutorizar, onClose, loading }) => {
  const tieneRet = Number(factura.retencion_fuente) + Number(factura.retencion_ica) + Number(factura.retencion_iva) > 0;
  return (
    <Modal titulo={`AUTORIZAR PAGO — ${factura.proveedor_nombre}`} onClose={onClose}>
      {/* Resumen de montos */}
      <div className="mb-5 p-3 rounded-sm border border-[#34d39922] bg-[#34d39908]">
        {tieneRet ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] tracking-wide text-[#7ec8d8]">MONTO BRUTO</span>
              <span className="text-xs font-mono text-[#7ec8d8] line-through">{fmtCOP(factura.monto)}</span>
            </div>
            {Number(factura.retencion_fuente) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-[#7ec8d8]">— Ret. Fuente</span>
                <span className="text-[11px] font-mono text-[#7ec8d8]">−{fmtCOP(factura.retencion_fuente)}</span>
              </div>
            )}
            {Number(factura.retencion_ica) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-[#7ec8d8]">— Ret. ICA</span>
                <span className="text-[11px] font-mono text-[#7ec8d8]">−{fmtCOP(factura.retencion_ica)}</span>
              </div>
            )}
            {Number(factura.retencion_iva) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-[#7ec8d8]">— Ret. IVA</span>
                <span className="text-[11px] font-mono text-[#7ec8d8]">−{fmtCOP(factura.retencion_iva)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#34d39922]">
              <span className="text-[10px] tracking-wide text-[#34d399]">NETO A PAGAR</span>
              <p className="text-lg font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(factura.monto_neto)}</p>
            </div>
          </>
        ) : (
          <p className="text-lg font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(factura.monto)}</p>
        )}
        {factura.descripcion && <p className="text-[9px] text-[#6aacbc] mt-1">{factura.descripcion}</p>}
      </div>

      {/* Nota informativa */}
      <div className="mb-5 p-3 rounded-sm border border-[#a78bfa22] bg-[#a78bfa08] text-[9px] text-[#a0d4e0] leading-relaxed space-y-1">
        <p><span className="text-[#a78bfa] font-semibold">Al autorizar</span>, la factura queda en cola de pago.</p>
        <p>El vínculo con la transacción bancaria real se establece cuando se suba el extracto XLS — el sistema sugerirá la coincidencia automáticamente por monto.</p>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-[10px] tracking-wide border border-[#34d39922] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onAutorizar()} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }}>
          <Check size={11} /> {loading ? 'AUTORIZANDO...' : 'AUTORIZAR PAGO'}
        </button>
      </div>
    </Modal>
  );
};

const ModalCoincidencias = ({ coincidencias, onConfirmar, onClose, loading }) => {
  const [seleccionadas, setSeleccionadas] = useState(
    () => new Set(coincidencias.map(c => c.factura.id))
  );
  const toggle = (id) => setSeleccionadas(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const vinculos = coincidencias
    .filter(c => seleccionadas.has(c.factura.id))
    .map(c => ({ factura_id: c.factura.id, movimiento_id: c.movimiento.id }));

  return (
    <Modal titulo="CONCILIACIÓN — COINCIDENCIAS ENCONTRADAS" onClose={onClose}>
      {coincidencias.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#7ec8d8] text-xs tracking-wide">No se encontraron coincidencias automáticas.</p>
          <p className="text-[10px] text-[#6aacbc] mt-1 opacity-60">Verifica que los movimientos del extracto estén importados y sin vincular.</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-[#6aacbc] mb-4 tracking-wide">
            {coincidencias.length} coincidencia{coincidencias.length > 1 ? 's' : ''} por monto — selecciona las que quieres confirmar
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-5">
            {coincidencias.map(({ factura: f, movimiento: m }) => (
              <div key={f.id}
                onClick={() => toggle(f.id)}
                className="flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-all"
                style={{ borderColor: seleccionadas.has(f.id) ? '#a78bfa44' : '#34d39922', background: seleccionadas.has(f.id) ? '#a78bfa08' : 'transparent' }}>
                {/* Checkbox */}
                <div className={`w-4 h-4 mt-0.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${seleccionadas.has(f.id) ? 'border-[#a78bfa] bg-[#a78bfa]' : 'border-[#34d39944]'}`}>
                  {seleccionadas.has(f.id) && <Check size={9} strokeWidth={3} className="text-black" />}
                </div>
                {/* Factura */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] tracking-[2px] text-[#a78bfa]">FACTURA</span>
                    {f.numero_factura && <span className="text-[9px] font-mono text-[#a0d4e0]">{f.numero_factura}</span>}
                    <span className="text-[9px] text-[#6aacbc] uppercase">{f.estado}</span>
                  </div>
                  <p className="text-xs text-[#c8e8f0] font-medium">{f.proveedor_nombre}</p>
                  <p className="text-[10px] text-[#7ec8d8]">Vence {f.fecha_vencimiento} · {fmtCOP(f.monto_neto)}</p>
                </div>
                {/* Icono enlace */}
                <div className="flex flex-col items-center justify-center px-1 py-1 shrink-0">
                  <Link size={12} className="text-[#a78bfa] opacity-60" />
                </div>
                {/* Movimiento */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-[9px] tracking-[2px] text-[#34d399]">MOVIMIENTO</span>
                  </div>
                  <p className="text-xs text-[#c8e8f0] font-medium">{m.cuenta_nombre}</p>
                  <p className="text-[10px] text-[#7ec8d8]">{m.fecha} · {fmtCOP(m.monto)}</p>
                  {m.referencia_bancaria && <p className="text-[9px] font-mono text-[#6aacbc] truncate">{m.referencia_bancaria}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end border-t border-[#34d39922] pt-4">
            <button onClick={onClose} className="px-4 py-2 text-[10px] tracking-wide border border-[#34d39922] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
            <button onClick={() => onConfirmar(vinculos)} disabled={loading || !vinculos.length}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
              style={{ borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }}>
              <Link size={11} /> {loading ? 'CONFIRMANDO...' : `CONFIRMAR ${vinculos.length} VÍNCULO${vinculos.length !== 1 ? 'S' : ''}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

const FILTROS = ['aprobada', 'autorizada', 'pagada'];

export default function Facturas() {
  const [facturas,    setFacturas]    = useState([]);
  const [cuentas,     setCuentas]     = useState([]);
  const [periodos,    setPeriodos]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalPagar,        setModalPagar]        = useState(null);
  const [modalCoincidencias, setModalCoincidencias] = useState(null); // null | array de coincidencias
  const [saving,            setSaving]            = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('aprobada');
  const [busqueda,     setBusqueda]     = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/tesoreria/facturas?estado=${filtroEstado}`)
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    apiService.get('/tesoreria/cuentas').then(({ data }) => setCuentas(data)).catch(() => {});
    apiService.get('/tesoreria/periodos').then(({ data }) => setPeriodos(data)).catch(() => {});
  }, []);

  const abrirCoincidencias = async () => {
    setSaving(true);
    try {
      const { data } = await apiService.get('/tesoreria/coincidencias');
      setModalCoincidencias(data.coincidencias);
    } catch {
      toast.error('Error al buscar coincidencias');
    } finally { setSaving(false); }
  };

  const confirmarConciliacion = async (vinculos) => {
    setSaving(true);
    try {
      const { data } = await apiService.post('/tesoreria/conciliar', { vinculos });
      toast.success(`${data.exitosos} factura${data.exitosos !== 1 ? 's' : ''} marcada${data.exitosos !== 1 ? 's' : ''} como pagada${data.exitosos !== 1 ? 's' : ''}`);
      setModalCoincidencias(null);
      cargar();
    } catch {
      toast.error('Error al confirmar conciliación');
    } finally { setSaving(false); }
  };

  const autorizar = async () => {
    setSaving(true);
    try {
      await apiService.put(`/tesoreria/facturas/${modalPagar.id}/autorizar`, {});
      toast.success('Pago autorizado — se registrará al subir el extracto bancario');
      setModalPagar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al autorizar pago');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FACTURAS</h1>
          <p className="text-[#7ec8d8] text-[11px] tracking-[2px] mt-1">// APROBADAS · AUTORIZADAS · PAGADAS</p>
        </div>
        <button onClick={abrirCoincidencias} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: '#a78bfa44', background: '#a78bfa0d', color: '#a78bfa' }}>
          <Link size={12} /> BUSCAR COINCIDENCIAS
        </button>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar proveedor, # factura, concepto..."
            className="w-full bg-[#05080f] border border-[#34d39922] rounded-sm pl-8 pr-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#34d39955] transition-colors"
          />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {FILTROS.map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className="px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
            style={{
              borderColor: filtroEstado === e ? ACCENT + '55' : '#34d39922',
              background:  filtroEstado === e ? ACCENT + '10' : 'transparent',
              color:       filtroEstado === e ? ACCENT : '#6aacbc',
            }}>
            {ESTADO_META[e]?.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#7ec8d8] text-xs tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
          <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-xs tracking-wide">
            {filtroEstado === 'aprobada'   ? 'SIN FACTURAS APROBADAS PENDIENTES' :
             filtroEstado === 'autorizada' ? 'SIN FACTURAS CON PAGO AUTORIZADO' :
             'SIN FACTURAS PAGADAS'}
          </p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="space-y-2">
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
            return (
              <div key={f.id} className="px-5 py-4 rounded-sm border transition-colors"
                style={{ borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#34d39918', background: vencida ? '#ef444406' : '#34d39905' }}>

                {/* Fila superior: proveedor + monto */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                    {f.descripcion && (
                      <p className="text-xs text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>
                    )}
                  </div>
                  <p className="text-lg font-black font-mono shrink-0 leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                </div>

                {/* Fila inferior: chips + fecha + botón */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EstadoChip estado={f.estado} />
                    {f.numero_factura && (
                      <span className="text-[10px] font-mono text-[#a0d4e0] opacity-80">{f.numero_factura}</span>
                    )}
                    {f.area_responsable && (
                      <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
                        {f.area_responsable.toUpperCase()}
                      </span>
                    )}
                    {(vencida || urgente) && f.estado !== 'pagada' && (
                      <span className="flex items-center gap-1 text-[10px] tracking-wide font-semibold"
                        style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                        <AlertTriangle size={11} />
                        {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    )}
                    {!(vencida || urgente) && (
                      <span className="text-[10px] text-[#7ec8d8] opacity-50">vence {f.fecha_vencimiento}</span>
                    )}
                    {f.estado === 'pagada' && f.dias_tesoreria != null && (
                      <span className="text-[10px] text-[#7ec8d8] opacity-60">pagada en {f.dias_tesoreria}d</span>
                    )}
                  </div>
                  {f.estado === 'aprobada' && (
                    <button onClick={() => setModalPagar(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all shrink-0"
                      style={{ borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }}>
                      <Check size={10} /> AUTORIZAR PAGO
                    </button>
                  )}
                  {f.estado === 'autorizada' && (
                    <span className="text-[10px] text-[#a78bfa] opacity-70 shrink-0">
                      pendiente conciliación bancaria
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalPagar && (
        <ModalAutorizar factura={modalPagar}
          onAutorizar={autorizar} onClose={() => setModalPagar(null)} loading={saving} />
      )}
      {modalCoincidencias && (
        <ModalCoincidencias
          coincidencias={modalCoincidencias}
          onConfirmar={confirmarConciliacion}
          onClose={() => setModalCoincidencias(null)}
          loading={saving} />
      )}
    </div>
  );
}
