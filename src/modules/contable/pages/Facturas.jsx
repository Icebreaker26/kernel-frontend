import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban, RefreshCw, Receipt, Search, User, ShieldCheck, Paperclip, Download, Trash2, Upload, Eye, ExternalLink, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import apiService from '../../../services/apiService.js';
import PerfilProveedor from '../../../components/PerfilProveedor.jsx';

// ── Datos de la cooperativa (actualizar según escritura pública) ───────────────
const COOP = {
  nombre:   'COOPERATIVA PROGRESEMOS',
  nit:      '891.408.345-1',
  direccion: 'Calle 15 # 14-55, Pereira, Risaralda',
  telefono: '(606) 325 0000',
};

const generarComprobante = (f) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 20;
  const col2 = W / 2;

  const fmtNum = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);
  const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

  const totalRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva);
  const tieneRet = totalRet > 0;

  // ── Encabezado ────────────────────────────────────────────────────────────────
  doc.setFillColor(8, 16, 30);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(129, 140, 248);
  doc.text(COOP.nombre, margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 212, 224);
  doc.text(`NIT ${COOP.nit}  ·  ${COOP.direccion}  ·  ${COOP.telefono}`, margin, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  const titulo = tieneRet ? 'COMPROBANTE DE EGRESO Y RETENCIONES' : 'COMPROBANTE DE EGRESO';
  doc.text(titulo, W - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 212, 224);
  doc.text(`Fecha: ${fmtDate(new Date().toISOString())}`, W - margin, 17, { align: 'right' });

  // ── Franja separadora ─────────────────────────────────────────────────────────
  doc.setFillColor(129, 140, 248);
  doc.rect(0, 28, W, 1.2, 'F');

  let y = 36;
  doc.setTextColor(30, 30, 60);

  // ── Datos del beneficiario ───────────────────────────────────────────────────
  doc.setFillColor(245, 246, 255);
  doc.rect(margin, y - 4, W - margin * 2, 22, 'F');
  doc.setDrawColor(200, 200, 230);
  doc.rect(margin, y - 4, W - margin * 2, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 180);
  doc.text('BENEFICIARIO', margin + 3, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 50);
  doc.text(f.proveedor_nombre || '—', margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 120);
  if (f.proveedor_nit) doc.text(`NIT: ${f.proveedor_nit}`, margin + 3, y + 12);

  // Derecha — referencia de pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 180);
  doc.text('REFERENCIA DE PAGO', col2 + 5, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 50);
  doc.text(f.pago_referencia || '—', col2 + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 120);
  doc.text(`Pagado el: ${fmtDate(f.fecha_pago)}`, col2 + 5, y + 12);

  y += 28;

  // ── Detalle de la factura ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 180);
  doc.text('DETALLE DE LA FACTURA', margin, y);
  y += 4;

  const detalle = [
    ['N° Factura',        f.numero_factura   || '—'],
    ['Concepto',          f.descripcion      || '—'],
    ['Área responsable',  f.area_responsable || '—'],
    ['Fecha recibida',    fmtDate(f.fecha_recibida)],
    ['Fecha vencimiento', fmtDate(f.fecha_vencimiento)],
    ['Cuenta de pago',    f.cuenta_pago_nombre || '—'],
  ];

  doc.autoTable({
    startY: y,
    head: [],
    body: detalle,
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fontSize: 8, textColor: [80, 80, 120] },
      1: { fontSize: 8.5, textColor: [20, 20, 50] },
    },
    styles: { cellPadding: 2.5, lineColor: [220, 222, 240], lineWidth: 0.2 },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Liquidación ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 180);
  doc.text('LIQUIDACIÓN', margin, y);
  y += 4;

  const filas = [
    ['Valor Bruto de la Factura', fmtNum(f.monto)],
  ];
  if (tieneRet) {
    if (Number(f.retencion_fuente) > 0)
      filas.push(['(−) Retención en la Fuente', fmtNum(f.retencion_fuente)]);
    if (Number(f.retencion_ica) > 0)
      filas.push(['(−) Retención ICA', fmtNum(f.retencion_ica)]);
    if (Number(f.retencion_iva) > 0)
      filas.push(['(−) Retención IVA', fmtNum(f.retencion_iva)]);
  }

  doc.autoTable({
    startY: y,
    head: [],
    body: filas,
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 110, fontSize: 8.5, textColor: [50, 50, 80] },
      1: { halign: 'right', fontSize: 8.5, textColor: [50, 50, 80] },
    },
    styles: { cellPadding: 2.5, lineColor: [220, 222, 240], lineWidth: 0.2 },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY;

  // Fila de neto resaltada
  const netoLabel = tieneRet ? 'VALOR NETO PAGADO' : 'VALOR PAGADO';
  const netoMonto = tieneRet ? f.monto_neto : f.monto;
  doc.setFillColor(129, 140, 248);
  doc.rect(margin, y, W - margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(netoLabel, margin + 3, y + 6);
  doc.text(fmtNum(netoMonto), W - margin - 3, y + 6, { align: 'right' });
  y += 16;

  // ── Firmas / aprobaciones ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 180);
  doc.text('TRAZABILIDAD Y APROBACIONES', margin, y);
  y += 4;

  const aprobaciones = [
    ['Registrado por (Contable)', f.registrado_por_nombre || '—', fmtDate(f.created_at)],
    ['Aprobado por (Control Interno)', f.aprobado_por_nombre || '—', fmtDate(f.aprobado_at)],
  ];

  doc.autoTable({
    startY: y,
    head: [['Rol', 'Responsable', 'Fecha']],
    body: aprobaciones,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [240, 240, 255], textColor: [80, 80, 160], fontSize: 7.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 80] },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Pie de página ─────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 230);
  doc.line(margin, y, W - margin, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 170);
  doc.text(
    'Documento generado por el sistema de gestión de Cooperativa Progresemos. ' +
    'Válido como soporte contable interno.',
    margin, y
  );

  const nombre = `comprobante-${f.proveedor_nombre?.replace(/\s+/g, '-').toLowerCase()}-${fmtDate(f.fecha_pago)}.pdf`;
  doc.save(nombre);
};

const ACCENT = '#818cf8';
const inputCls  = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-3 py-2.5 text-sm text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#818cf855] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-xs tracking-wide text-[#7ec8d8] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PEND. ÁREA',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'PEND. CI',    color: '#a78bfa', icon: CircleCheck },
  verificada:           { label: 'VERIFICADA',  color: '#22d3ee', icon: ShieldCheck },
  autorizada:           { label: 'AUTORIZADA',  color: '#34d399', icon: CircleCheck },
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

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const DetalleFactura = ({ factura: f, onClose, onReenviar, onComprobante, saving, adjuntoSlot }) => {
  const accentBorder = ACCENT + '33';
  const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
  const estadoMeta = ESTADO_META[f.estado] || {};

  const Campo = ({ label, valor, mono }) => (
    <div>
      <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-0.5">{label}</p>
      <p className={`text-sm text-[#c8e8f0] ${mono ? 'font-mono' : ''}`}>{valor || '—'}</p>
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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] tracking-[4px] text-[#6aacbc] mb-1">DETALLE DE FACTURA</p>
              <h2 className="text-xl font-bold text-[#c8e8f0]">{f.proveedor_nombre}</h2>
              {f.descripcion && <p className="text-sm text-[#7ec8d8] mt-1">{f.descripcion}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-[10px] tracking-wide px-2.5 py-1 rounded-sm border"
                style={{ color: estadoMeta.color, borderColor: estadoMeta.color + '44', background: estadoMeta.color + '11' }}>
                {estadoMeta.icon && <estadoMeta.icon size={11} />} {estadoMeta.label || f.estado.toUpperCase()}
              </span>
              <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Monto destacado */}
          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-0.5">MONTO BRUTO</p>
              <p className="text-3xl font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
            </div>
            {tieneRet && (
              <>
                <div className="text-[#6aacbc] text-lg mb-1">→</div>
                <div>
                  <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-0.5">NETO A PAGAR</p>
                  <p className="text-2xl font-black font-mono text-[#34d399]">{fmtCOP(f.monto_neto)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

          {/* Retenciones */}
          {tieneRet && (
            <div className="p-4 rounded-sm border space-y-2" style={{ borderColor: ACCENT + '22', background: ACCENT + '05' }}>
              <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-3">RETENCIONES</p>
              {Number(f.retencion_fuente) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7ec8d8]">Retención en la Fuente</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_fuente)}</span>
                </div>
              )}
              {Number(f.retencion_ica) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7ec8d8]">Retención ICA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_ica)}</span>
                </div>
              )}
              {Number(f.retencion_iva) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7ec8d8]">Retención IVA</span>
                  <span className="font-mono text-[#ef4444]">− {fmtCOP(f.retencion_iva)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: ACCENT + '22' }}>
                <span className="text-[#c8e8f0] font-semibold">Neto a pagar</span>
                <span className="font-mono font-bold text-[#34d399]">{fmtCOP(f.monto_neto)}</span>
              </div>
            </div>
          )}

          {/* Datos generales */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {f.numero_factura && <Campo label="N° FACTURA" valor={f.numero_factura} mono />}
            {f.area_responsable && <Campo label="ÁREA RESPONSABLE" valor={f.area_responsable} />}
            {f.responsable_nombre && <Campo label="RESPONSABLE" valor={f.responsable_nombre} />}
            <Campo label="FECHA RECIBIDA"    valor={fmtDate(f.fecha_recibida)} />
            <Campo label="FECHA VENCIMIENTO" valor={fmtDate(f.fecha_vencimiento)} />
            {f.fecha_pago && <Campo label="FECHA DE PAGO" valor={fmtDate(f.fecha_pago)} />}
            {f.fecha_emision && <Campo label="FECHA EMISIÓN" valor={fmtDate(f.fecha_emision)} />}
            {f.cuenta_pago_nombre && <Campo label="CUENTA DE PAGO" valor={f.cuenta_pago_nombre} />}
            {f.pago_referencia && <Campo label="REFERENCIA DE PAGO" valor={f.pago_referencia} mono />}
          </div>

          {/* Trazabilidad */}
          <div className="border-t pt-4" style={{ borderColor: accentBorder }}>
            <p className="text-[9px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              {f.registrado_por_nombre && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#7ec8d8]">Registrado por</span>
                  <span className="text-[#c8e8f0]">{f.registrado_por_nombre} · {fmtDate(f.created_at)}</span>
                </div>
              )}
              {f.aprobado_por_nombre && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#7ec8d8]">Aprobado por CI</span>
                  <span className="text-[#c8e8f0]">{f.aprobado_por_nombre} · {fmtDate(f.aprobado_at)}</span>
                </div>
              )}
              {f.estado === 'rechazada' && f.rechazo_motivo && (
                <div className="flex items-start justify-between text-sm gap-4">
                  <span className="text-[#ef4444] shrink-0">Motivo de rechazo</span>
                  <span className="text-[#ef4444] text-right opacity-80">{f.rechazo_motivo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="px-7 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: accentBorder }}>
          <div className="flex gap-2 items-center">
            {adjuntoSlot}
          </div>
          <div className="flex gap-2 items-center">
            {f.estado === 'pagada' && (
              <button onClick={() => { onComprobante(f); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs tracking-wide rounded-sm border transition-all"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Receipt size={11} /> COMPROBANTE PDF
              </button>
            )}
            {f.estado === 'rechazada' && (
              <button onClick={() => { onReenviar(f.id); onClose(); }} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: '#f59e0b55', background: '#f59e0b15', color: '#f59e0b' }}>
                <RefreshCw size={11} /> REENVIAR A CI
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2 text-xs tracking-wide border rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors"
              style={{ borderColor: accentBorder }}>
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-xl relative p-8 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm tracking-[3px] font-semibold" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#7ec8d8] hover:text-[#a0d4e0]"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AREAS_SUGERIDAS = ['Gerencia', 'Crédito', 'Comercial', 'Cartera', 'Contable', 'Control Interno', 'Seguros', 'Sistemas', 'Otro'];

const EDITABLE_ESTADOS = ['pendiente_aprobacion', 'rechazada'];

const PreviewModal = ({ nombre, mime, url, onClose }) => {
  const esPDF    = mime === 'application/pdf';
  const esImagen = mime?.startsWith('image/');
  return (
    <div className="fixed inset-0 bg-black/85 flex flex-col z-50" onClick={onClose}>
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#818cf822] bg-[#08101e] shrink-0"
        onClick={e => e.stopPropagation()}>
        <p className="text-xs tracking-wide text-[#818cf8] truncate max-w-[400px]">{nombre}</p>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
            style={{ borderColor: '#818cf855', background: '#818cf815', color: '#818cf8' }}>
            <ExternalLink size={10} /> ABRIR EN PESTAÑA
          </a>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wide rounded-sm border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444410] transition-all">
            <X size={10} /> CERRAR
          </button>
        </div>
      </div>
      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={e => e.stopPropagation()}>
        {esPDF && (
          <iframe src={url} title={nombre}
            className="w-full h-full border-0 rounded-sm bg-white"
            style={{ maxWidth: '900px' }} />
        )}
        {esImagen && (
          <img src={url} alt={nombre}
            className="max-w-full max-h-full object-contain rounded-sm"
            style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }} />
        )}
        {!esPDF && !esImagen && (
          <div className="text-center text-[#7ec8d8]">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-xs tracking-wide mb-3">Vista previa no disponible para este tipo de archivo</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border mx-auto w-fit transition-all"
              style={{ borderColor: '#818cf855', background: '#818cf815', color: '#818cf8' }}>
              <Download size={10} /> DESCARGAR
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const AdjuntoButton = ({ factura, onUpdated }) => {
  const inputRef      = useRef(null);
  const [loading,     setLoading]     = useState(false);
  const [previewing,  setPreviewing]  = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const canEdit = EDITABLE_ESTADOS.includes(factura.estado);

  const verPrevia = async () => {
    setPreviewing(true);
    try {
      const { data } = await apiService.get(`/contable/facturas/${factura.id}/adjunto`);
      setPreviewData(data);
    } catch {
      toast.error('No se pudo obtener el archivo');
    } finally { setPreviewing(false); }
  };

  const subir = async (file) => {
    if (!file) return;
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { toast.error('Solo PDF, JPG o PNG'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('El archivo excede 15 MB'); return; }

    setLoading(true);
    try {
      // 1. Solicitar presigned URL
      const { data: { uploadUrl, key } } = await apiService.post(
        `/contable/facturas/${factura.id}/adjunto`,
        { nombre: file.name, mime: file.type, size: file.size }
      );

      // 2. Upload directo a S3 (sin pasar por backend)
      const upload = await fetch(uploadUrl, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type },
      });
      if (!upload.ok) throw new Error('Error al subir a S3');

      // 3. Confirmar key en DB
      await apiService.patch(`/contable/facturas/${factura.id}/adjunto`, {
        key, nombre: file.name, mime: file.type, size: file.size,
      });

      toast.success('Adjunto guardado');
      onUpdated();
    } catch (e) {
      toast.error(e.message || 'Error al subir el archivo');
    } finally { setLoading(false); }
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar el adjunto?')) return;
    setLoading(true);
    try {
      await apiService.delete(`/contable/facturas/${factura.id}/adjunto`);
      toast.success('Adjunto eliminado');
      onUpdated();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al eliminar');
    } finally { setLoading(false); }
  };

  if (factura.adjunto?.s3_key) {
    const adjunto = factura.adjunto;
    return (
      <>
        {previewData && (
          <PreviewModal
            nombre={previewData.nombre}
            mime={previewData.mime}
            url={previewData.url}
            onClose={() => setPreviewData(null)}
          />
        )}
        <div className="flex gap-1.5">
          <button onClick={verPrevia} disabled={previewing}
            title={adjunto.nombre}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: '#34d39955', background: '#34d39910', color: '#34d399' }}>
            {previewing ? <Upload size={10} className="animate-pulse" /> : <Eye size={10} />}
            {adjunto.nombre?.split('.').pop().toUpperCase()}
          </button>
          {canEdit && (
            <button onClick={eliminar} disabled={loading}
              className="flex items-center px-2 py-1.5 text-[10px] rounded-sm border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444410] transition-all disabled:opacity-40">
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </>
    );
  }

  if (!canEdit) return null;

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden" onChange={e => subir(e.target.files[0])} />
      <button onClick={() => inputRef.current?.click()} disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
        style={{ borderColor: '#818cf833', color: '#7ec8d8' }}>
        {loading ? <Upload size={10} className="animate-pulse" /> : <Paperclip size={10} />}
        {loading ? 'SUBIENDO...' : 'ADJUNTAR'}
      </button>
    </>
  );
};

const RET_FIELDS = [
  { key: 'retencion_fuente', label: 'RET. FUENTE', pctDefault: '3.5' },
  { key: 'retencion_ica',    label: 'RET. ICA',    pctDefault: '0.414' },
  { key: 'retencion_iva',    label: 'RET. IVA',    pctDefault: '15' },
];

const FormFactura = ({ proveedores, usuarios, onSave, onCancel, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    proveedor_id: '', monto: '',
    fecha_emision: '', fecha_recibida: hoy, fecha_vencimiento: '',
    area_responsable: '', responsable_id: '',
    descripcion: '', numero_factura: '',
    retencion_fuente: '', retencion_ica: '', retencion_iva: '',
  });
  const [modoRet, setModoRet] = useState({ retencion_fuente: '$', retencion_ica: '$', retencion_iva: '$' });
  const [pctRet,  setPctRet]  = useState({ retencion_fuente: '', retencion_ica: '', retencion_iva: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const monto     = Number(form.monto) || 0;
  const retFuente = Number(form.retencion_fuente) || 0;
  const retIca    = Number(form.retencion_ica)    || 0;
  const retIva    = Number(form.retencion_iva)    || 0;
  const totalRet  = retFuente + retIca + retIva;
  const montoNeto = monto - totalRet;
  const retValida = totalRet === 0 || (totalRet > 0 && totalRet < monto);

  const toggleModo = (key) => {
    const next = modoRet[key] === '$' ? '%' : '$';
    setModoRet(m => ({ ...m, [key]: next }));
    if (next === '%') {
      // al pasar a %, limpiar el valor COP guardado
      set(key, '');
      setPctRet(p => ({ ...p, [key]: '' }));
    } else {
      // al pasar a $, calcular desde el % actual si hay monto
      const pct = Number(pctRet[key]) || 0;
      set(key, monto > 0 && pct > 0 ? String(Math.round(monto * pct / 100)) : '');
    }
  };

  const handlePct = (key, val) => {
    setPctRet(p => ({ ...p, [key]: val }));
    const pct = Number(val) || 0;
    set(key, monto > 0 && pct > 0 ? String(Math.round(monto * pct / 100)) : '');
  };

  // Recalcular valores % cuando cambia el monto bruto
  const handleMonto = (val) => {
    set('monto', val);
    const m = Number(val) || 0;
    RET_FIELDS.forEach(({ key }) => {
      if (modoRet[key] === '%') {
        const pct = Number(pctRet[key]) || 0;
        set(key, m > 0 && pct > 0 ? String(Math.round(m * pct / 100)) : '');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>PROVEEDOR *</label>
        <select className={selectCls} value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)}>
          <option value="">— Seleccionar proveedor —</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.nit ? `· ${p.nit}` : ''}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>N° FACTURA</label>
          <input className={inputCls} value={form.numero_factura}
            onChange={e => set('numero_factura', e.target.value)} placeholder="FAC-2026-0001" />
        </div>
        <div>
          <label className={labelCls}>MONTO BRUTO (COP) *</label>
          <input className={inputCls} type="number" min="1" value={form.monto}
            onChange={e => handleMonto(e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Retenciones */}
      <div>
        <p className="text-xs tracking-wide text-[#818cf8] mb-2 opacity-80">RETENCIONES (opcional)</p>
        <div className="grid grid-cols-3 gap-3">
          {RET_FIELDS.map(({ key, label, pctDefault }) => {
            const esPct = modoRet[key] === '%';
            const valorCOP = Number(form[key]) || 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + ' mb-0'}>{label}</label>
                  <button type="button" onClick={() => toggleModo(key)}
                    className="text-[9px] px-1.5 py-0.5 rounded-sm border transition-all"
                    style={{
                      borderColor: esPct ? '#818cf855' : '#818cf822',
                      background:  esPct ? '#818cf815' : 'transparent',
                      color:       esPct ? '#818cf8'   : '#7ec8d8',
                    }}>
                    {esPct ? '%' : '$'}
                  </button>
                </div>
                {esPct ? (
                  <div className="relative">
                    <input
                      className={inputCls + ' pr-7'}
                      type="number" min="0" max="100" step="0.001"
                      value={pctRet[key]}
                      onChange={e => handlePct(key, e.target.value)}
                      placeholder={pctDefault}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#818cf8] pointer-events-none">%</span>
                  </div>
                ) : (
                  <input className={inputCls} type="number" min="0" value={form[key]}
                    onChange={e => set(key, e.target.value)} placeholder="0" />
                )}
                {esPct && valorCOP > 0 && (
                  <p className="text-[9px] text-[#7ec8d8] mt-1 font-mono">{fmtCOP(valorCOP)}</p>
                )}
              </div>
            );
          })}
        </div>
        {totalRet > 0 && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-sm border border-[#818cf822] bg-[#818cf808]">
            <span className="text-xs tracking-wide text-[#7ec8d8]">NETO A PAGAR</span>
            <span className="text-sm font-black font-mono" style={{ color: retValida ? ACCENT : '#ef4444' }}>
              {fmtCOP(montoNeto)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>FECHA EMISIÓN</label>
          <input className={inputCls} type="date" value={form.fecha_emision}
            onChange={e => set('fecha_emision', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>FECHA RECIBIDA *</label>
          <input className={inputCls} type="date" value={form.fecha_recibida}
            onChange={e => set('fecha_recibida', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>FECHA VENCIMIENTO *</label>
          <input className={inputCls} type="date" value={form.fecha_vencimiento}
            onChange={e => set('fecha_vencimiento', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>ÁREA RESPONSABLE</label>
          <input className={inputCls} list="areas-list" value={form.area_responsable}
            onChange={e => set('area_responsable', e.target.value)}
            placeholder="Ej: Gerencia, RRHH..." />
          <datalist id="areas-list">
            {AREAS_SUGERIDAS.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>RESPONSABLE DE APROBACIÓN</label>
          <select className={selectCls} value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>CONCEPTO / DESCRIPCIÓN</label>
        <input className={inputCls} value={form.descripcion}
          onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Factura agosto 2026" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-[10px] tracking-wide border border-[#818cf822] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)}
          disabled={loading || !form.proveedor_id || !form.monto || !form.fecha_vencimiento || !retValida}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={11} /> {loading ? 'REGISTRANDO...' : 'REGISTRAR'}
        </button>
      </div>
    </div>
  );
};

const diasParaVencer = (fecha) => {
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.round((vence - hoy) / 86400000);
};

export default function ContableFacturas() {
  const [facturas,    setFacturas]    = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [usuarios,    setUsuarios]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalCrear,  setModalCrear]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filtroEstado,    setFiltroEstado]    = useState('');
  const [busqueda,        setBusqueda]        = useState('');
  const [perfilProveedor, setPerfilProveedor] = useState(null);
  const [detalleFactura,  setDetalleFactura]  = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    const p = filtroEstado ? `?estado=${filtroEstado}` : '';
    apiService.get(`/contable/facturas${p}`)
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    apiService.get('/contable/proveedores').then(({ data }) => setProveedores(data)).catch(() => {});
    apiService.get('/aprobaciones/usuarios').then(({ data }) => setUsuarios(data)).catch(() => {});
  }, []);

  const registrar = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, fecha_entrega_area: new Date().toISOString().slice(0, 10) };
      await apiService.post('/contable/facturas', payload);
      toast.success('Factura registrada — pendiente de aprobación por área responsable');
      setModalCrear(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar');
    } finally { setSaving(false); }
  };

  const reenviar = async (id) => {
    setSaving(true);
    try {
      await apiService.put(`/contable/facturas/${id}/reenviar`);
      toast.success('Factura reenviada a Control Interno');
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al reenviar');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FACTURAS</h1>
          <p className="text-[#7ec8d8] text-[11px] tracking-[2px] mt-0.5">// REGISTRO DE FACTURAS DE PROVEEDORES</p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs tracking-wide rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> REGISTRAR FACTURA
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar proveedor, # factura, concepto, área..."
          className="w-full bg-[#05080f] border border-[#818cf822] rounded-sm pl-8 pr-3 py-2 text-xs text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#818cf855] transition-colors"
        />
      </div>

      {/* Filtro estado — todos visibles desde Contable */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pendiente_aprobacion', 'aprobada', 'verificada', 'autorizada', 'pagada', 'rechazada'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className="px-3 py-1.5 text-[10px] tracking-wide rounded-sm border transition-all"
            style={{
              borderColor: filtroEstado === e ? ACCENT + '55' : '#818cf822',
              background:  filtroEstado === e ? ACCENT + '10' : 'transparent',
              color:       filtroEstado === e ? ACCENT : '#7ec8d8',
            }}>
            {e === '' ? 'TODAS' : ESTADO_META[e]?.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#7ec8d8] text-xs tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-xs tracking-wide">SIN FACTURAS</p>
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
            const tieneRet = Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0;
            return (
              <div key={f.id}
                onClick={() => setDetalleFactura(f)}
                className="px-5 py-4 rounded-sm border transition-colors cursor-pointer hover:border-[#818cf840] hover:bg-[#818cf80a]"
                style={{ borderColor: vencida ? '#ef444433' : urgente ? '#fbbf2433' : '#818cf818', background: vencida ? '#ef444406' : '#818cf805' }}>

                {/* Fila superior: proveedor + monto */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                    {f.descripcion && (
                      <p className="text-xs text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black font-mono leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                    {tieneRet && (
                      <p className="text-[10px] text-[#7ec8d8] opacity-70 mt-0.5">neto {fmtCOP(f.monto_neto)}</p>
                    )}
                  </div>
                </div>

                {/* Fila de metadata */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <EstadoChip estado={f.estado} />
                  {f.numero_factura && (
                    <span className="text-xs font-mono text-[#a0d4e0]">{f.numero_factura}</span>
                  )}
                  {f.area_responsable && (
                    <span className="text-xs tracking-wide px-2 py-0.5 rounded-sm border border-[#818cf833] text-[#818cf8] bg-[#818cf810]">
                      {f.area_responsable.toUpperCase()}
                    </span>
                  )}
                  {f.responsable_nombre && (
                    <span className="flex items-center gap-1.5 text-xs text-[#7ec8d8]">
                      <User size={11} /> {f.responsable_nombre}
                    </span>
                  )}
                  {f.requiere_aprobacion_gerencia && !f.aprobado_gerencia_at && (
                    <span className="text-xs tracking-wide px-2 py-0.5 rounded-sm border border-[#f59e0b44] text-[#f59e0b] bg-[#f59e0b11]">
                      REQUIERE GERENCIA
                    </span>
                  )}
                </div>

                {/* Fila de fechas + acciones */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {(vencida || urgente) && f.estado !== 'pagada' && f.estado !== 'rechazada' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                        <AlertTriangle size={12} />
                        {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    ) : f.estado === 'pagada' ? (
                      <span className="text-xs text-[#7ec8d8] opacity-60">
                        {f.dias_tesoreria != null ? `Pagada en ${f.dias_tesoreria}d` : 'Pagada'}
                      </span>
                    ) : f.estado === 'rechazada' ? (
                      <span className="text-xs text-[#ef4444] opacity-80">
                        {f.rechazo_motivo ? `Rechazada · ${f.rechazo_motivo}` : 'Rechazada'}
                      </span>
                    ) : (
                      <span className="text-xs text-[#7ec8d8] opacity-50">vence {f.fecha_vencimiento}</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 items-center" onClick={e => e.stopPropagation()}>
                    {f.proveedor_id && (
                      <button
                        onClick={() => setPerfilProveedor({ id: f.proveedor_id, nombre: f.proveedor_nombre })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide rounded-sm border transition-all hover:bg-[#818cf810]"
                        style={{ borderColor: '#818cf833', color: '#7ec8d8' }}>
                        <Building2 size={11} /> PROVEEDOR
                      </button>
                    )}
                    <AdjuntoButton factura={f} onUpdated={cargar} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCrear && (
        <Modal titulo="REGISTRAR FACTURA" onClose={() => setModalCrear(false)}>
          <FormFactura proveedores={proveedores} usuarios={usuarios} onSave={registrar} onCancel={() => setModalCrear(false)} loading={saving} />
        </Modal>
      )}

      {detalleFactura && (
        <DetalleFactura
          factura={detalleFactura}
          onClose={() => setDetalleFactura(null)}
          onReenviar={reenviar}
          onComprobante={generarComprobante}
          saving={saving}
          adjuntoSlot={<AdjuntoButton factura={detalleFactura} onUpdated={() => { cargar(); setDetalleFactura(null); }} />}
        />
      )}

      {perfilProveedor && (
        <PerfilProveedor
          proveedor={perfilProveedor}
          apiBase="/contable"
          accent={ACCENT}
          onClose={() => setPerfilProveedor(null)}
        />
      )}
    </div>
  );
}
