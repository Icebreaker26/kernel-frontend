import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, FileText, DollarSign,
  AlertTriangle, Loader2, Plus, XCircle, CheckCircle, ExternalLink,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const estadoColor = (estado) => ({
  pendiente:    { border: '#f59e0b44', text: '#f59e0b',  bg: '#f59e0b11' },
  pago_parcial: { border: '#3b82f644', text: '#3b82f6',  bg: '#3b82f611' },
  vencida:      { border: '#ff3d3d44', text: '#ff3d3d',  bg: '#ff3d3d11' },
  pagada:       { border: '#22c55e44', text: '#22c55e',  bg: '#22c55e11' },
  anulada:      { border: '#6b728044', text: '#6b7280',  bg: '#6b728011' },
}[estado] ?? { border: '#6b728044', text: '#6b7280', bg: '#6b728011' });

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Renglones desplegables — v2 (conceptos JSONB) y legacy
function DetalleRows({ detalle, esV2 }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState({});
  const toggle = (key) => setAbierto((p) => ({ ...p, [key]: !p[key] }));

  if (!detalle?.length) return null;

  return (
    <div className="bg-[#08101e] border border-[#f59e0b11] rounded-sm divide-y divide-[#f59e0b06]">
      {detalle.map((d) => {
        const key      = d.asociado_codigo ?? d.id;
        const open     = !!abierto[key];
        const quincenal = String(d.clase_cuota_snapshot ?? '').startsWith('2');
        const tipo     = quincenal ? 'QUINCENAL' : 'MENSUAL';

        let total, conceptos;
        if (esV2) {
          conceptos = d.conceptos ?? [];
          total     = conceptos.reduce((s, c) => s + (c.monto ?? 0), 0);
        } else {
          const aporte = parseFloat(d.valor_aporte_snapshot ?? 0);
          const bono   = d.bonos_monto > 0 ? d.bonos_monto : 0;
          total        = parseFloat(d.monto_cobrado ?? aporte + bono);
          conceptos    = [
            { codigo: 'APORTE', nombre: 'Aporte mensual', monto: aporte, detalle: null },
            ...(bono > 0 ? [{ codigo: 'BONO', nombre: 'Bono sorteo', monto: bono, detalle: d.bonos_detalle }] : []),
          ];
        }

        return (
          <div key={key}>
            <div className="flex items-center gap-2 hover:bg-[#f59e0b04] transition-colors">
              <button
                onClick={() => toggle(key)}
                className="flex-1 flex items-center gap-3 px-4 py-3 text-left"
              >
                {open
                  ? <ChevronDown size={12} className="text-[#f59e0b66] shrink-0" />
                  : <ChevronRight size={12} className="text-[#4a6a7a] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-[#a0d4e0] text-sm font-mono">{d.nombre_snapshot}</span>
                  <span className="ml-3 text-[#4a6a7a] text-xs">CC {d.asociado_codigo}</span>
                </div>
                <span className="text-[9px] text-[#4a6a7a] tracking-widest shrink-0 mr-3">{tipo}</span>
                <span className="text-[#f59e0b] font-mono tabular-nums text-sm shrink-0 w-28 text-right">
                  {fmt(total)}
                </span>
              </button>
              <button
                onClick={() => navigate(`/asociados/${d.asociado_codigo}`)}
                title="Ver perfil"
                className="px-3 py-3 text-[#4a6a7a] hover:text-[#f59e0b] transition-colors shrink-0"
              >
                <ExternalLink size={13} />
              </button>
            </div>
            {open && (
              <div className="px-12 pb-3 pt-1 flex flex-col gap-1.5 bg-[#f59e0b03]">
                {conceptos.map((c) => (
                  <div key={c.codigo}>
                    <div className="flex justify-between items-baseline text-xs font-mono">
                      <span className="text-[#6aacbc]">
                        {c.nombre}
                        <span className="ml-2 text-[#4a6a7a] text-[9px]">{c.codigo}</span>
                      </span>
                      <span className="text-[#a0d4e0] tabular-nums">{fmt(c.monto)}</span>
                    </div>
                    {c.detalle?.map((b) => (
                      <div key={b.sorteo} className="flex justify-between items-baseline pl-4 text-[10px] font-mono text-[#00e5ff] opacity-60 mt-0.5">
                        <span>↳ {b.sorteo} · #{b.boletos?.join(', #')}</span>
                        <span className="tabular-nums">{fmt(b.precio_boleto)} c/u</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const DetalleV2     = ({ detalle }) => <DetalleRows detalle={detalle} esV2 />;
const DetalleLegacy = ({ detalle }) => <DetalleRows detalle={detalle} esV2={false} />;

const Section = ({ title, children }) => (
  <div className="mb-8">
    <p className="text-[#6aacbc] text-[9px] tracking-[3px] mb-3">// {title}</p>
    {children}
  </div>
);

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [factura,   setFactura]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showPago,  setShowPago]  = useState(false);
  const [showAnul,  setShowAnul]  = useState(false);
  const [formPago,  setFormPago]  = useState({ fecha_pago: new Date().toISOString().slice(0, 10), monto: '', referencia: '' });
  const [motivo,    setMotivo]    = useState('');
  const [saving,    setSaving]    = useState(false);

  const cargar = () =>
    apiService.get(`/patronales/facturas/${id}`)
      .then(({ data }) => setFactura(data))
      .catch(() => toast.error('Error al cargar factura'))
      .finally(() => setLoading(false));

  useEffect(() => { cargar(); }, [id]);

  const registrarPago = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.post(`/patronales/facturas/${id}/pago`, {
        fecha_pago: formPago.fecha_pago,
        monto:      parseFloat(formPago.monto),
        referencia: formPago.referencia || undefined,
      });
      toast.success('Pago registrado');
      setShowPago(false);
      setFormPago({ fecha_pago: new Date().toISOString().slice(0, 10), monto: '', referencia: '' });
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const anular = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.put(`/patronales/facturas/${id}/anular`, { motivo });
      toast.success('Factura anulada');
      setShowAnul(false);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al anular');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-[#f59e0b44]" /></div>;
  if (!factura) return <div className="p-8 text-[#ff3d3d] text-sm tracking-widest">FACTURA NO ENCONTRADA</div>;

  const c           = estadoColor(factura.estado);
  const puedePagar  = !['pagada', 'anulada'].includes(factura.estado);
  const puedeAnular = !['pagada', 'anulada'].includes(factura.estado);

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[#6aacbc] hover:text-[#f59e0b] text-[9px] tracking-widest mb-5 transition-colors"
      >
        <ChevronLeft size={11} /> ATRÁS
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#08101e] border border-[#f59e0b22] rounded-sm">
            <FileText size={20} className="text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">{factura.nombre_empresa}</h1>
            <div className="flex items-center gap-3 mt-1 text-[9px] tracking-widest text-[#6aacbc]">
              <span>{factura.periodo}</span>
              <span>{factura.tipo_cuota.toUpperCase()}</span>
              <span className="px-1.5 py-0.5 border" style={{ color: c.text, borderColor: c.border, background: c.bg }}>
                {factura.estado.replace('_', ' ').toUpperCase()}
              </span>
              {factura.dias_mora > 0 && (
                <span className="flex items-center gap-1 text-[#ff3d3d]">
                  <AlertTriangle size={9} /> {factura.dias_mora} DÍAS MORA
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {puedePagar && (
            <button
              onClick={() => setShowPago(true)}
              className="flex items-center gap-1.5 text-[10px] tracking-widest border border-[#22c55e55] bg-[#22c55e11] hover:bg-[#22c55e] hover:text-black text-[#22c55e] px-3 py-2 rounded-sm transition-all"
            >
              <Plus size={12} /> REGISTRAR PAGO
            </button>
          )}
          {puedeAnular && (
            <button
              onClick={() => setShowAnul(true)}
              className="flex items-center gap-1.5 text-[10px] tracking-widest border border-[#ff3d3d22] bg-[#ff3d3d08] hover:border-[#ff3d3d55] hover:text-[#ff3d3d] text-[#6aacbc] px-3 py-2 rounded-sm transition-all"
            >
              <XCircle size={12} /> ANULAR
            </button>
          )}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'TOTAL FACTURADO', valor: factura.monto_total, color: '#f59e0b' },
          { label: 'PAGADO',          valor: factura.total_pagado, color: '#22c55e' },
          { label: 'SALDO PENDIENTE', valor: factura.saldo,        color: factura.saldo > 0 ? '#ff3d3d' : '#22c55e' },
        ].map(({ label, valor, color }) => (
          <div key={label} className="bg-[#08101e] border border-[#f59e0b11] rounded-sm px-4 py-4">
            <p className="text-[#6aacbc] text-[9px] tracking-widest mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color }}>{fmt(valor)}</p>
          </div>
        ))}
      </div>

      {/* Detalle de asociados */}
      <Section title="ASOCIADOS INCLUIDOS">
        {factura.detalle?.[0]?.conceptos != null
          ? <DetalleV2 detalle={factura.detalle} />
          : <DetalleLegacy detalle={factura.detalle} />}
      </Section>

      {/* Pagos */}
      <Section title="PAGOS REGISTRADOS">
        {!factura.pagos?.length ? (
          <p className="text-[#6aacbc] text-[10px] tracking-widest py-4">SIN PAGOS AÚN</p>
        ) : (
          <div className="flex flex-col gap-2">
            {factura.pagos.map((p) => (
              <div key={p.id} className="bg-[#08101e] border border-[#22c55e11] rounded-sm px-4 py-3 flex items-center gap-4">
                <CheckCircle size={14} className="text-[#22c55e] shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-4 text-[10px] tracking-widest">
                    <span className="text-[#22c55e] font-bold tabular-nums">{fmt(p.monto)}</span>
                    <span className="text-[#6aacbc]">{p.fecha_pago}</span>
                    {p.referencia && <span className="text-[#6aacbc]">Ref: {p.referencia}</span>}
                    {p.registrado_por_nombre && <span className="text-[#6aacbc]">Por: {p.registrado_por_nombre}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Modal Registrar Pago */}
      {showPago && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#08101e] border border-[#f59e0b33] rounded-sm p-6 w-full max-w-sm relative" style={{ boxShadow: '0 0 40px #f59e0b11' }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f59e0b]" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f59e0b]" />
            <p className="text-[#f59e0b] font-bold text-sm mb-5 tracking-widest">REGISTRAR PAGO</p>
            <form onSubmit={registrarPago} className="flex flex-col gap-3">
              <div>
                <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">FECHA DE PAGO</label>
                <input
                  type="date"
                  value={formPago.fecha_pago}
                  onChange={(e) => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                  required
                  className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                />
              </div>
              <div>
                <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">MONTO (COP)</label>
                <input
                  type="number" step="0.01" min="1"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                  required
                  className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                />
              </div>
              <div>
                <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">REFERENCIA (opcional)</label>
                <input
                  value={formPago.referencia}
                  onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                  className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowPago(false)} className="text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] px-4 py-2 tracking-widest">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 border border-[#22c55e55] bg-[#22c55e11] hover:bg-[#22c55e] hover:text-black disabled:opacity-40 text-[#22c55e] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />} GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anular */}
      {showAnul && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#08101e] border border-[#ff3d3d33] rounded-sm p-6 w-full max-w-sm relative" style={{ boxShadow: '0 0 40px #ff3d3d11' }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ff3d3d]" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ff3d3d]" />
            <p className="text-[#ff3d3d] font-bold text-sm mb-5 tracking-widest">ANULAR FACTURA</p>
            <form onSubmit={anular} className="flex flex-col gap-3">
              <div>
                <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">MOTIVO *</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-[#0d1829] border border-[#ff3d3d22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#ff3d3d55] resize-none font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAnul(false)} className="text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] px-4 py-2 tracking-widest">CANCELAR</button>
                <button type="submit" disabled={saving || !motivo} className="flex items-center gap-2 border border-[#ff3d3d55] bg-[#ff3d3d11] hover:bg-[#ff3d3d] hover:text-white disabled:opacity-40 text-[#ff3d3d] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} ANULAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
