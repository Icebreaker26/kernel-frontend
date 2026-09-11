import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban, Search, Link, ShieldCheck, User, Building2, Download, Eye, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../../../services/apiService.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import PerfilProveedor from '../../../components/PerfilProveedor.jsx';

const ACCENT = '#34d399';
const POR_PAGINA = 10;
const inputCls  = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#34d39955] transition-colors';
const labelCls  = 'text-[10px] tracking-wide text-[#7ec8d8] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'APROBADA',    color: '#34d399', icon: CircleCheck },
  verificada:           { label: 'VERIFICADA',  color: '#22d3ee', icon: ShieldCheck },
  autorizada:           { label: 'AUTORIZADA',  color: '#a78bfa', icon: Check },
  pagada:               { label: 'PAGADA',      color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADA',   color: '#ef4444', icon: Ban },
};

const FILTROS_ESTADO = ['pendiente_aprobacion', 'aprobada', 'verificada', 'autorizada', 'pagada'];

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
    <div className="bg-[#08101e] border border-[#34d39933] rounded-sm w-full max-w-4xl relative p-6 max-h-[92vh] overflow-y-auto">
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
      <div className="mb-5 p-3 rounded-sm border border-[#a78bfa22] bg-[#a78bfa08] text-[9px] text-[#a0d4e0] leading-relaxed space-y-1">
        <p><span className="text-[#a78bfa] font-semibold">Al autorizar</span>, la factura queda en cola de pago.</p>
        <p>El vínculo con la transacción bancaria real se establece cuando se suba el extracto XLS.</p>
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
        </div>
      ) : (
        <>
          <p className="text-[10px] text-[#6aacbc] mb-4 tracking-wide">
            {coincidencias.length} coincidencia{coincidencias.length > 1 ? 's' : ''} por monto — selecciona las que quieres confirmar
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-5">
            {coincidencias.map(({ factura: f, movimiento: m }) => (
              <div key={f.id} onClick={() => toggle(f.id)}
                className="flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-all"
                style={{ borderColor: seleccionadas.has(f.id) ? '#a78bfa44' : '#34d39922', background: seleccionadas.has(f.id) ? '#a78bfa08' : 'transparent' }}>
                <div className={`w-4 h-4 mt-0.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${seleccionadas.has(f.id) ? 'border-[#a78bfa] bg-[#a78bfa]' : 'border-[#34d39944]'}`}>
                  {seleccionadas.has(f.id) && <Check size={9} strokeWidth={3} className="text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] tracking-[2px] text-[#a78bfa]">FACTURA</span>
                    {f.numero_factura && <span className="text-[9px] font-mono text-[#a0d4e0]">{f.numero_factura}</span>}
                  </div>
                  <p className="text-xs text-[#c8e8f0] font-medium">{f.proveedor_nombre}</p>
                  <p className="text-[10px] text-[#7ec8d8]">Vence {f.fecha_vencimiento} · {fmtCOP(f.monto_neto)}</p>
                </div>
                <div className="flex flex-col items-center justify-center px-1 py-1 shrink-0">
                  <Link size={12} className="text-[#a78bfa] opacity-60" />
                </div>
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

const ETAPAS = [
  { key: 'registrada',  label: 'REGISTRADA' },
  { key: 'area',        label: 'APROBACIÓN ÁREA' },
  { key: 'ci',          label: 'VERIFICACIÓN CI' },
  { key: 'tesoreria',   label: 'AUTORIZACIÓN' },
  { key: 'pago',        label: 'PAGO' },
];

const etapaActiva = (estado) => {
  if (estado === 'rechazada') return -1;
  return { pendiente_aprobacion: 1, aprobada: 2, verificada: 3, autorizada: 4, pagada: 5 }[estado] ?? 1;
};

const MiniPasoFactura = ({ estado }) => {
  if (estado === 'rechazada') {
    return (
      <span className="flex items-center gap-1 text-[9px] tracking-wide px-2 py-0.5 rounded-sm border border-[#ef444433] text-[#ef4444] bg-[#ef444411]">
        <Ban size={9} /> RECHAZADA
      </span>
    );
  }
  const activa = etapaActiva(estado);
  const etapaActual = ETAPAS[activa - 1];
  return (
    <div className="flex items-center gap-1.5">
      {ETAPAS.map((_, i) => {
        const num   = i + 1;
        const hecha = num < activa;
        const actual= num === activa;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all"
              style={{
                background: hecha  ? '#34d399'
                          : actual ? ACCENT
                          : '#34d39918',
                boxShadow:  actual ? `0 0 6px ${ACCENT}88` : 'none',
              }} />
            {i < ETAPAS.length - 1 && (
              <div className="w-3 h-px" style={{ background: hecha ? '#34d39955' : '#34d39918' }} />
            )}
          </div>
        );
      })}
      {etapaActual && (
        <span className="text-[9px] tracking-wide ml-1" style={{ color: ACCENT }}>
          {etapaActual.label}
        </span>
      )}
    </div>
  );
};

const PreviewAdjunto = ({ facturaId, adjunto, onClose }) => {
  const [url,     setUrl]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get(`/tesoreria/facturas/${facturaId}/adjunto`)
      .then(({ data }) => setUrl(data.url))
      .catch(() => { toast.error('No se pudo cargar el adjunto'); onClose(); })
      .finally(() => setLoading(false));
  }, [facturaId]);

  const isPdf = adjunto?.mime_type === 'application/pdf';
  const isImg = adjunto?.mime_type?.startsWith('image/');

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[60] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>{adjunto?.nombre || 'ADJUNTO'}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-white transition-colors"><X size={16} /></button>
      </div>
      <div className="flex-1 min-h-0 rounded-sm overflow-hidden border border-[#34d39922]">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[10px] tracking-widest animate-pulse" style={{ color: ACCENT }}>CARGANDO...</p>
          </div>
        )}
        {!loading && url && isPdf && <iframe src={url} className="w-full h-full border-0" title="Vista previa PDF" />}
        {!loading && url && isImg && <img src={url} alt={adjunto?.nombre} className="w-full h-full object-contain bg-[#05080f]" />}
        {!loading && url && !isPdf && !isImg && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <FileText size={40} color={ACCENT} className="opacity-40" />
            <a href={url} target="_blank" rel="noreferrer"
              className="text-[10px] tracking-widest px-4 py-2 border rounded-sm transition-colors"
              style={{ borderColor: ACCENT + '44', color: ACCENT }}>
              DESCARGAR ARCHIVO
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const COOP = {
  nombre:    'COOPERATIVA PROGRESEMOS',
  nit:       '891.408.345-1',
  direccion: 'Calle 15 # 14-55, Pereira, Risaralda',
  telefono:  '(606) 325 0000',
};

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const generarComprobante = (f) => {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W      = doc.internal.pageSize.getWidth();
  const margin = 20;
  const col2   = W / 2;
  const fmtNum = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);
  const totalRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva);
  const tieneRet = totalRet > 0;

  // Encabezado
  doc.setFillColor(8, 16, 30);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(52, 211, 153);
  doc.text(COOP.nombre, margin, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 212, 224);
  doc.text(`NIT ${COOP.nit}  ·  ${COOP.direccion}  ·  ${COOP.telefono}`, margin, 17);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text(tieneRet ? 'COMPROBANTE DE EGRESO Y RETENCIONES' : 'COMPROBANTE DE EGRESO', W - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 212, 224);
  doc.text(`Fecha: ${fmtDate(new Date().toISOString())}`, W - margin, 17, { align: 'right' });

  doc.setFillColor(52, 211, 153); doc.rect(0, 28, W, 1.2, 'F');
  let y = 36;

  // Beneficiario
  doc.setFillColor(245, 252, 249); doc.rect(margin, y - 4, W - margin * 2, 22, 'F');
  doc.setDrawColor(200, 230, 220); doc.rect(margin, y - 4, W - margin * 2, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(30, 120, 90);
  doc.text('BENEFICIARIO', margin + 3, y);
  doc.setFontSize(11); doc.setTextColor(20, 50, 30);
  doc.text(f.proveedor_nombre || '—', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 120, 100);
  if (f.proveedor_nit) doc.text(`NIT: ${f.proveedor_nit}`, margin + 3, y + 12);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(30, 120, 90);
  doc.text('AUTORIZADO POR', col2 + 5, y);
  doc.setFontSize(11); doc.setTextColor(20, 50, 30);
  doc.text(f.autorizado_por_nombre || 'Tesorería', col2 + 5, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 120, 100);
  doc.text(`Autorizado el: ${fmtDate(f.autorizado_at || new Date().toISOString())}`, col2 + 5, y + 12);
  y += 28;

  // Detalle
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(30, 120, 90);
  doc.text('DETALLE DE LA FACTURA', margin, y); y += 4;
  autoTable(doc, {
    startY: y, head: [],
    body: [
      ['N° Factura', f.numero_factura || '—'],
      ['Concepto', f.descripcion || '—'],
      ['Área responsable', f.area_responsable || '—'],
      ['Fecha vencimiento', fmtDate(f.fecha_vencimiento)],
    ],
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fontSize: 8, textColor: [40, 100, 70] },
      1: { fontSize: 8.5, textColor: [20, 50, 30] },
    },
    styles: { cellPadding: 2.5, lineColor: [200, 230, 215], lineWidth: 0.2 }, theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Liquidación
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(30, 120, 90);
  doc.text('LIQUIDACIÓN', margin, y); y += 4;
  const filas = [['Valor Bruto de la Factura', fmtNum(f.monto)]];
  if (tieneRet) {
    if (Number(f.retencion_fuente) > 0) filas.push(['(−) Retención en la Fuente', fmtNum(f.retencion_fuente)]);
    if (Number(f.retencion_ica) > 0)    filas.push(['(−) Retención ICA', fmtNum(f.retencion_ica)]);
    if (Number(f.retencion_iva) > 0)    filas.push(['(−) Retención IVA', fmtNum(f.retencion_iva)]);
  }
  autoTable(doc, {
    startY: y, head: [], body: filas, margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 110, fontSize: 8.5, textColor: [40, 80, 60] },
      1: { halign: 'right', fontSize: 8.5, textColor: [40, 80, 60] },
    },
    styles: { cellPadding: 2.5, lineColor: [200, 230, 215], lineWidth: 0.2 }, theme: 'grid',
  });
  y = doc.lastAutoTable.finalY;
  doc.setFillColor(52, 211, 153); doc.rect(margin, y, W - margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(8, 30, 20);
  doc.text(tieneRet ? 'VALOR NETO AUTORIZADO' : 'VALOR AUTORIZADO', margin + 3, y + 6);
  doc.text(fmtNum(tieneRet ? f.monto_neto : f.monto), W - margin - 3, y + 6, { align: 'right' });

  doc.save(`comprobante_${(f.proveedor_nombre || 'factura').replace(/\s+/g, '_')}_${fmtDate(new Date().toISOString())}.pdf`);
};

const PasoFactura = ({ estado }) => {
  if (estado === 'rechazada') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-sm border border-[#ef444433] bg-[#ef444408]">
        <Ban size={13} className="text-[#ef4444] shrink-0" />
        <span className="text-base text-[#ef4444] tracking-wide">FACTURA RECHAZADA</span>
      </div>
    );
  }
  const activa = etapaActiva(estado);
  return (
    <div className="flex items-center gap-0">
      {ETAPAS.map((etapa, i) => {
        const num      = i + 1;
        const hecha    = num < activa;
        const actual   = num === activa;
        const ultimo   = i === ETAPAS.length - 1;
        return (
          <div key={etapa.key} className="flex items-center" style={{ flex: ultimo ? '0 0 auto' : 1, minWidth: 0 }}>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
                style={{
                  borderColor: hecha ? '#34d399' : actual ? ACCENT : ACCENT + '22',
                  background:  hecha ? '#34d39922' : actual ? ACCENT + '22' : 'transparent',
                }}>
                {hecha
                  ? <Check size={11} className="text-[#34d399]" strokeWidth={3} />
                  : <span className="text-[11px] font-bold" style={{ color: actual ? ACCENT : '#6aacbc55' }}>{num}</span>
                }
              </div>
              <span className="text-[10px] tracking-wide mt-1 whitespace-nowrap"
                style={{ color: hecha ? '#34d399' : actual ? ACCENT : '#6aacbc44' }}>
                {etapa.label}
              </span>
            </div>
            {!ultimo && (
              <div className="h-px mx-1 transition-all" style={{ flex: 1, background: hecha ? '#34d39955' : ACCENT + '18' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const DetalleFactura = ({ factura: f, onClose, onAprobar, onAutorizar, onPreviewAdjunto, saving }) => {
  const accentBorder = ACCENT + '33';
  const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
  const diasVenc = f.fecha_vencimiento ? diasParaVencer(f.fecha_vencimiento) : null;

  const Campo = ({ label, valor, mono }) => (
    <div>
      <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">{label}</p>
      <p className={`text-base text-[#c8e8f0] ${mono ? 'font-mono' : ''}`}>{valor || '—'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border rounded-sm w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col relative"
        style={{ borderColor: accentBorder }}>
        <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: ACCENT }} />
        <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: ACCENT }} />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b" style={{ borderColor: accentBorder }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[4px] text-[#6aacbc] mb-1">DETALLE DE FACTURA</p>
              <h2 className="text-2xl font-bold text-[#c8e8f0]">{f.proveedor_nombre}</h2>
            </div>
            <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="mb-4">
            <PasoFactura estado={f.estado} />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">MONTO BRUTO</p>
              <p className="text-3xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
            </div>
            {tieneRet && (
              <>
                <div className="text-[#6aacbc] text-2xl mb-1">→</div>
                <div>
                  <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">NETO A PAGAR</p>
                  <p className="text-3xl font-black font-mono text-[#34d399]">{fmtCOP(f.monto_neto)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {tieneRet && (
            <div className="p-4 rounded-sm border space-y-2" style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">RETENCIONES</p>
              {Number(f.retencion_fuente) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención en la Fuente</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_fuente)}</span>
                </div>
              )}
              {Number(f.retencion_ica) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención ICA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_ica)}</span>
                </div>
              )}
              {Number(f.retencion_iva) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-[#7ec8d8]">Retención IVA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_iva)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-2 border-t" style={{ borderColor: ACCENT + '22' }}>
                <span className="text-[#c8e8f0] font-semibold">Neto a pagar</span>
                <span className="font-mono font-bold text-[#34d399]">{fmtCOP(f.monto_neto)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {f.descripcion && (
              <div className="col-span-3">
                <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">CONCEPTO</p>
                <p className="text-base text-[#c8e8f0]">{f.descripcion}</p>
              </div>
            )}
            {f.numero_factura    && <Campo label="N° FACTURA"       valor={f.numero_factura}    mono />}
            {f.area_responsable  && <Campo label="ÁREA RESPONSABLE" valor={f.area_responsable} />}
            {f.responsable_nombre && <Campo label="RESPONSABLE"     valor={f.responsable_nombre} />}
            <Campo label="FECHA RECIBIDA"    valor={fmtDate(f.fecha_recibida)} />
            <Campo label="FECHA VENCIMIENTO" valor={
              f.fecha_vencimiento ? (
                <span className="flex items-center gap-2">
                  <span>{fmtDate(f.fecha_vencimiento)}</span>
                  {diasVenc !== null && f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                    <span className="text-base font-medium" style={{
                      color: diasVenc < 0 ? '#ef4444' : diasVenc <= 5 ? '#fbbf24' : diasVenc <= 15 ? '#f97316' : '#7ec8d8',
                    }}>
                      {diasVenc < 0 ? `· vencida hace ${Math.abs(diasVenc)}d`
                        : diasVenc === 0 ? '· vence hoy'
                        : `· en ${diasVenc}d`}
                    </span>
                  )}
                </span>
              ) : '—'
            } />
            {f.fecha_pago && <Campo label="FECHA DE PAGO" valor={fmtDate(f.fecha_pago)} />}
          </div>

          {f.adjunto && (
            <div>
              <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-2">DOCUMENTO ADJUNTO</p>
              <button onClick={(e) => { e.stopPropagation(); onPreviewAdjunto(f); }}
                className="w-full flex items-center gap-3 p-3 border rounded-sm transition-colors text-left"
                style={{ borderColor: ACCENT + '33', background: ACCENT + '06' }}>
                <Eye size={14} style={{ color: ACCENT }} />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#c8e8f0] truncate">{f.adjunto.nombre}</p>
                  {f.adjunto.size_bytes && (
                    <p className="text-[9px] text-[#6aacbc] tracking-wide mt-0.5">
                      {(f.adjunto.size_bytes / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
                <span className="ml-auto text-[9px] tracking-widest shrink-0" style={{ color: ACCENT }}>VER PDF</span>
              </button>
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: accentBorder }}>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              {f.registrado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Registrado por (Contable)</span>
                  <span className="text-[#c8e8f0]">{f.registrado_por_nombre} · {fmtDate(f.created_at)}</span>
                </div>
              )}
              {f.aprobado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Verificado por (Control Interno)</span>
                  <span className="text-[#c8e8f0]">{f.aprobado_por_nombre} · {fmtDate(f.aprobado_at)}</span>
                </div>
              )}
              {f.autorizado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Autorizado por (Tesorería)</span>
                  <span className="text-[#c8e8f0]">{f.autorizado_por_nombre} · {fmtDate(f.autorizado_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: accentBorder }}>
          <div className="flex gap-2 items-center">
            {f.adjunto && (
              <button onClick={() => onPreviewAdjunto(f)}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Eye size={11} /> VER PDF ADJUNTO
              </button>
            )}
            {f.estado === 'pagada' && (
              <button onClick={() => generarComprobante(f)}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Receipt size={11} /> COMPROBANTE PDF
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {f.estado === 'pendiente_aprobacion' && onAprobar && (
              <button onClick={() => { onAprobar(f.id); onClose(); }} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: '#34d39955', background: '#34d39915', color: '#34d399' }}>
                <Check size={11} /> APROBAR
              </button>
            )}
            {f.estado === 'verificada' && onAutorizar && (
              <button onClick={() => { onAutorizar(f); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
                style={{ borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }}>
                <Check size={11} /> AUTORIZAR PAGO
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2 text-base tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
              style={{ borderColor: accentBorder }}>
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Paginacion = ({ total, pagina, porPagina, onChange }) => {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fin = Math.min(pagina * porPagina, total);
  const Btn = ({ p, children, disabled }) => (
    <button onClick={() => !disabled && onChange(p)} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-[10px] rounded-sm border transition-all disabled:opacity-30"
      style={p === pagina
        ? { borderColor: ACCENT + '88', background: ACCENT + '20', color: ACCENT }
        : { borderColor: '#34d39918', background: 'transparent', color: '#6aacbc' }}>
      {children}
    </button>
  );
  const nums = [];
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || Math.abs(i - pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#34d39911]">
      <p className="text-[11px] text-[#4a7a8a]">{inicio}–{fin} <span className="opacity-60">de {total}</span></p>
      <div className="flex items-center gap-1">
        <Btn p={pagina - 1} disabled={pagina === 1}>‹</Btn>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="w-7 text-center text-[10px] text-[#6aacbc]">…</span>
          : <Btn key={n} p={n}>{n}</Btn>
        )}
        <Btn p={pagina + 1} disabled={pagina === totalPags}>›</Btn>
      </div>
    </div>
  );
};

export default function Facturas() {
  const { user } = useAuth();
  const [facturas,             setFacturas]             = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [modalPagar,           setModalPagar]           = useState(null);
  const [modalCoincidencias,   setModalCoincidencias]   = useState(null);
  const [saving,               setSaving]               = useState(false);
  const [perfilProveedor,      setPerfilProveedor]      = useState(null);
  const [detalleFactura,       setDetalleFactura]       = useState(null);
  const [previewFactura,       setPreviewFactura]       = useState(null);
  const [filtroEstado,         setFiltroEstado]         = useState('verificada');
  const [busqueda,             setBusqueda]             = useState('');
  const [pagina,               setPagina]               = useState(1);

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/tesoreria/facturas?estado=${filtroEstado}`)
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado]);

  const facturasVisibles = useMemo(() => {
    if (!busqueda) return facturas;
    const q = busqueda.toLowerCase();
    return facturas.filter(f =>
      f.proveedor_nombre?.toLowerCase().includes(q) ||
      f.numero_factura?.toLowerCase().includes(q) ||
      f.descripcion?.toLowerCase().includes(q) ||
      f.area_responsable?.toLowerCase().includes(q)
    );
  }, [facturas, busqueda]);

  const facturasPagina = facturasVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

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
      toast.success(`${data.exitosos} factura${data.exitosos !== 1 ? 's' : ''} pagada${data.exitosos !== 1 ? 's' : ''}`);
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
      toast.success('Pago autorizado');
      setModalPagar(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al autorizar pago');
    } finally { setSaving(false); }
  };

  const aprobarArea = async (facturaId) => {
    setSaving(true);
    try {
      await apiService.put(`/tesoreria/facturas/${facturaId}/aprobar-area`, {});
      toast.success('Factura aprobada — pasa a Control Interno');
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al aprobar factura');
    } finally { setSaving(false); }
  };

  const exportarCSV = () => {
    const header = 'Proveedor,# Factura,Estado,Monto,Vencimiento,Área,Responsable';
    const rows = facturasVisibles.map(f =>
      [f.proveedor_nombre, f.numero_factura || '', f.estado, f.monto,
       f.fecha_vencimiento, f.area_responsable || '', f.responsable_nombre || '']
        .map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'facturas.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(10);
    doc.text('FACTURAS — TESORERÍA', 14, 15);
    doc.setFontSize(7);
    doc.text(`Exportado: ${new Date().toLocaleDateString('es-CO')}  ·  Filtro: ${filtroEstado.toUpperCase()}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Proveedor', '# Factura', 'Estado', 'Monto', 'Vencimiento', 'Área']],
      body: facturasVisibles.map(f => [
        f.proveedor_nombre, f.numero_factura || '—', (ESTADO_META[f.estado]?.label || f.estado),
        fmtCOP(f.monto), f.fecha_vencimiento, f.area_responsable || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [12, 16, 30], textColor: [52, 211, 153] },
      alternateRowStyles: { fillColor: [8, 16, 30] },
    });
    doc.save('facturas.pdf');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FACTURAS</h1>
          <p className="text-[#6aacbc] text-[10px] tracking-[3px] mt-0.5">// FLUJO DE APROBACIÓN</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <Download size={10} /> CSV
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-widest rounded-sm border transition-all"
            style={{ borderColor: '#34d39922', color: '#6aacbc' }}>
            <FileText size={10} /> PDF
          </button>
          <button onClick={abrirCoincidencias} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: '#a78bfa44', background: '#a78bfa0d', color: '#a78bfa' }}>
            <Link size={12} /> BUSCAR COINCIDENCIAS
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const montoTotal = facturas.reduce((s, f) => s + Number(f.monto || 0), 0);
        const vencidas   = facturas.filter(f => f.estado !== 'pagada' && diasParaVencer(f.fecha_vencimiento) < 0).length;
        const urgentes   = facturas.filter(f => f.estado !== 'pagada' && diasParaVencer(f.fecha_vencimiento) >= 0 && diasParaVencer(f.fecha_vencimiento) <= 5).length;
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#34d3991a] rounded-sm overflow-hidden">
            {[
              { label: 'TOTAL',        value: facturas.length,  color: ACCENT,     fmt: false },
              { label: 'MONTO TOTAL',  value: fmtCOP(montoTotal), color: '#a0d4e0', fmt: true },
              { label: 'VENCIDAS',     value: vencidas,         color: vencidas > 0 ? '#ef4444' : '#6aacbc', fmt: false },
              { label: 'URGENTES',     value: urgentes,         color: urgentes > 0 ? '#fbbf24' : '#6aacbc', fmt: false },
            ].map(({ label, value, color, fmt }, i) => (
              <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
                <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
                <p className={fmt ? 'text-sm font-bold leading-none mt-1' : 'text-2xl font-bold leading-none'} style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Estado chips + búsqueda */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center border border-[#34d3991a] rounded-sm overflow-hidden">
          {FILTROS_ESTADO.map(e => {
            const meta = ESTADO_META[e] || { label: e.toUpperCase(), color: ACCENT };
            const active = filtroEstado === e;
            return (
              <button key={e} onClick={() => setFiltroEstado(e)}
                className="px-3 py-2 text-[9px] tracking-[2px] transition-all"
                style={{
                  color:        active ? meta.color : '#6aacbc',
                  background:   active ? meta.color + '10' : 'transparent',
                  borderBottom: active ? `2px solid ${meta.color}` : '2px solid transparent',
                }}>
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="BUSCAR PROVEEDOR, # FACTURA, CONCEPTO..."
            className="w-full bg-[#05080f] border border-[#34d3991a] rounded-sm pl-8 pr-4 py-2 text-xs text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39944] transition-colors tracking-wide" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

        {!loading && facturasVisibles.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[#34d39922] rounded-sm">
            <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN RESULTADOS</p>
          </div>
        )}

        {!loading && facturasPagina.length > 0 && (
          <div className="space-y-2">
            {facturasPagina.map(f => {
              const dias     = diasParaVencer(f.fecha_vencimiento);
              const vencida  = dias < 0;
              const urgente  = dias >= 0 && dias <= 5;
              const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
              return (
                <div key={f.id}
                  onClick={() => setDetalleFactura(f)}
                  className="px-5 py-4 rounded-sm border transition-colors cursor-pointer hover:border-[#34d39940] hover:bg-[#34d3990a]"
                  style={{ borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#34d39918', background: vencida ? '#ef444406' : '#34d39905' }}>

                  {/* Fila 1: proveedor + monto */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                      {f.descripcion && <p className="text-base text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black font-mono leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                      {tieneRet && <p className="text-[12px] text-[#7ec8d8] opacity-70 mt-0.5">neto {fmtCOP(f.monto_neto)}</p>}
                    </div>
                  </div>

                  {/* Fila 2: stepper */}
                  <div className="mb-3">
                    <MiniPasoFactura estado={f.estado} />
                  </div>

                  {/* Fila 3: metadata */}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    {f.numero_factura && <span className="text-base font-mono text-[#a0d4e0]">{f.numero_factura}</span>}
                    {f.area_responsable && (
                      <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border border-[#34d39933] text-[#34d399] bg-[#34d39910]">
                        {f.area_responsable.toUpperCase()}
                      </span>
                    )}
                    {f.responsable_nombre && (
                      <span className="flex items-center gap-1.5 text-base text-[#7ec8d8]">
                        <User size={11} /> {f.responsable_nombre}
                      </span>
                    )}
                  </div>

                  {/* Fila 4: countdown + acciones */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {f.estado === 'pagada' ? (
                        <span className="text-base text-[#38bdf8] opacity-70">
                          {f.dias_tesoreria != null ? `Pagada en ${f.dias_tesoreria}d` : 'Pagada'}
                        </span>
                      ) : f.estado !== 'rechazada' && (
                        <span className="flex items-center gap-1.5 text-base font-medium"
                          style={{ color: vencida ? '#ef4444' : dias <= 5 ? '#fbbf24' : dias <= 15 ? '#f97316' : '#7ec8d8' }}>
                          {(vencida || dias <= 5) && <AlertTriangle size={11} />}
                          {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias}d · ${f.fecha_vencimiento}`}
                        </span>
                      )}
                      {f.estado === 'aprobada' && <span className="text-[11px] text-[#34d399] opacity-60">en verificación CI</span>}
                      {f.estado === 'autorizada' && <span className="text-[11px] text-[#a78bfa] opacity-70">pendiente conciliación bancaria</span>}
                    </div>
                    <div className="flex gap-2 shrink-0 items-center" onClick={e => e.stopPropagation()}>
                      {f.adjunto && (
                        <button onClick={() => setPreviewFactura(f)}
                          className="flex items-center gap-1.5 text-xs tracking-wide px-3 py-1.5 rounded-sm border transition-all"
                          style={{ color: ACCENT, borderColor: ACCENT + '33', background: ACCENT + '0d' }}>
                          <Eye size={11} /> VER PDF
                        </button>
                      )}
                      {f.proveedor_id && (
                        <button onClick={() => setPerfilProveedor({ id: f.proveedor_id, nombre: f.proveedor_nombre })}
                          className="flex items-center gap-1.5 text-xs tracking-wide px-3 py-1.5 rounded-sm border transition-all"
                          style={{ color: ACCENT, borderColor: ACCENT + '33', background: ACCENT + '0d' }}>
                          <Building2 size={11} /> PROVEEDOR
                        </button>
                      )}
                      {f.estado === 'pendiente_aprobacion' && f.responsable_id === user?.id && (
                        <button onClick={() => aprobarArea(f.id)} disabled={saving}
                          className="flex items-center gap-1.5 text-xs tracking-wide px-3 py-1.5 rounded-sm border transition-all disabled:opacity-40"
                          style={{ borderColor: '#34d39955', background: '#34d39915', color: '#34d399' }}>
                          <Check size={11} /> APROBAR
                        </button>
                      )}
                      {f.estado === 'verificada' && (
                        <button onClick={() => setModalPagar(f)}
                          className="flex items-center gap-1.5 text-xs tracking-wide px-3 py-1.5 rounded-sm border transition-all"
                          style={{ borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }}>
                          <Check size={11} /> AUTORIZAR PAGO
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <Paginacion total={facturasVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
          </div>
        )}
      </div>

      {detalleFactura && (
        <DetalleFactura
          factura={detalleFactura}
          onClose={() => setDetalleFactura(null)}
          onAprobar={aprobarArea}
          onAutorizar={(f) => { setModalPagar(f); }}
          onPreviewAdjunto={(f) => setPreviewFactura(f)}
          saving={saving}
        />
      )}
      {previewFactura && (
        <PreviewAdjunto
          facturaId={previewFactura.id}
          adjunto={previewFactura.adjunto}
          onClose={() => setPreviewFactura(null)}
        />
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
      {perfilProveedor && (
        <PerfilProveedor
          proveedor={perfilProveedor}
          apiBase="/tesoreria"
          accent={ACCENT}
          onClose={() => setPerfilProveedor(null)}
        />
      )}
    </div>
  );
}
