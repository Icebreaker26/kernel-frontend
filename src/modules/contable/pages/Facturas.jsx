import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban, RefreshCw, Receipt, Search, User, ShieldCheck, Paperclip, Download, Trash2, Upload, Eye, ExternalLink, Building2, LayoutGrid, List, Calendar } from 'lucide-react';
import CalendarioFacturas from '../../../components/CalendarioFacturas.jsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  autoTable(doc, {
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

  autoTable(doc, {
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

  autoTable(doc, {
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
const inputCls  = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-3 py-2.5 text-base text-[#a0d4e0] placeholder-[#7ec8d8] focus:outline-none focus:border-[#818cf855] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-base tracking-wide text-[#7ec8d8] mb-1 block';

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
    <span className="flex items-center gap-1 text-[11px] tracking-wide px-2 py-0.5 rounded-sm border"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';

const ETAPAS = [
  { key: 'registrada',   label: 'REGISTRADA',      desc: 'Factura ingresada al sistema' },
  { key: 'area',         label: 'APROBACIÓN ÁREA',  desc: 'Responsable del área confirma la factura' },
  { key: 'ci',           label: 'VERIFICACIÓN CI',  desc: 'Control Interno valida y autoriza' },
  { key: 'tesoreria',    label: 'AUTORIZACIÓN',     desc: 'Tesorería autoriza el pago' },
  { key: 'pago',         label: 'PAGO',             desc: 'Conciliado con extracto bancario' },
];

const etapaActiva = (estado) => {
  if (estado === 'rechazada') return -1;
  return { pendiente_aprobacion: 1, aprobada: 2, verificada: 3, autorizada: 4, pagada: 5 }[estado] ?? 1;
};

const PasoFactura = ({ estado }) => {
  if (estado === 'rechazada') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-sm border border-[#ef444433] bg-[#ef444408]">
        <Ban size={13} className="text-[#ef4444] shrink-0" />
        <span className="text-base text-[#ef4444] tracking-wide">FACTURA RECHAZADA — pendiente de corrección y reenvío</span>
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
        const pendiente= num > activa;
        const ultimo   = i === ETAPAS.length - 1;
        return (
          <div key={etapa.key} className="flex items-center" style={{ flex: ultimo ? '0 0 auto' : 1, minWidth: 0 }}>
            <div className="flex flex-col items-center shrink-0" title={etapa.desc}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
                style={{
                  borderColor: hecha ? '#34d399' : actual ? ACCENT : '#818cf822',
                  background:  hecha ? '#34d39922' : actual ? ACCENT + '22' : 'transparent',
                }}>
                {hecha
                  ? <Check size={11} className="text-[#34d399]" strokeWidth={3} />
                  : <span className="text-[11px] font-bold"
                      style={{ color: actual ? ACCENT : '#6aacbc55' }}>
                      {num}
                    </span>
                }
              </div>
              <span className="text-[10px] tracking-wide mt-1 whitespace-nowrap"
                style={{ color: hecha ? '#34d399' : actual ? ACCENT : '#6aacbc44' }}>
                {etapa.label}
              </span>
            </div>
            {!ultimo && (
              <div className="h-px mx-1 transition-all" style={{ flex: 1, background: hecha ? '#34d39955' : '#818cf818' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const MiniPasoFactura = ({ estado }) => {
  if (estado === 'rechazada') {
    return (
      <span className="flex items-center gap-1 text-[12px] tracking-wide px-2 py-0.5 rounded-sm border border-[#ef444433] text-[#ef4444] bg-[#ef444411]">
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
                          : '#818cf818',
                boxShadow:  actual ? `0 0 6px ${ACCENT}88` : 'none',
              }} />
            {i < ETAPAS.length - 1 && (
              <div className="w-3 h-px" style={{ background: hecha ? '#34d39955' : '#818cf818' }} />
            )}
          </div>
        );
      })}
      {etapaActual && (
        <span className="text-[12px] tracking-wide ml-1" style={{ color: ACCENT }}>
          {etapaActual.label}
        </span>
      )}
    </div>
  );
};

const DetalleFactura = ({ factura: f, onClose, onReenviar, onComprobante, saving, adjuntoSlot }) => {
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

          {/* Stepper de progreso */}
          <div className="mb-4">
            <PasoFactura estado={f.estado} />
          </div>

          {/* Monto destacado */}
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

          {/* Retenciones */}
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

          {/* Datos generales */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {f.descripcion && (
              <div className="col-span-3">
                <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-0.5">CONCEPTO</p>
                <p className="text-base text-[#c8e8f0]">{f.descripcion}</p>
              </div>
            )}
            {f.numero_factura && <Campo label="N° FACTURA" valor={f.numero_factura} mono />}
            {f.area_responsable && <Campo label="ÁREA RESPONSABLE" valor={f.area_responsable} />}
            {f.responsable_nombre && <Campo label="RESPONSABLE" valor={f.responsable_nombre} />}
            <Campo label="FECHA RECIBIDA"    valor={fmtDate(f.fecha_recibida)} />
            <Campo label="FECHA VENCIMIENTO" valor={
              f.fecha_vencimiento
                ? <span className="flex items-center gap-2">
                    <span>{fmtDate(f.fecha_vencimiento)}</span>
                    {diasVenc !== null && f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                      <span className="text-base font-medium flex items-center gap-1" style={{
                        color: diasVenc < 0 ? '#ef4444' : diasVenc <= 5 ? '#fbbf24' : diasVenc <= 15 ? '#f97316' : '#7ec8d8',
                      }}>
                        {diasVenc < 0 ? `· vencida hace ${Math.abs(diasVenc)}d`
                          : diasVenc === 0 ? '· vence hoy'
                          : `· en ${diasVenc}d`}
                      </span>
                    )}
                  </span>
                : '—'
            } />
            {f.fecha_pago && <Campo label="FECHA DE PAGO" valor={fmtDate(f.fecha_pago)} />}
            {f.fecha_emision && <Campo label="FECHA EMISIÓN" valor={fmtDate(f.fecha_emision)} />}
            {f.cuenta_pago_nombre && <Campo label="CUENTA DE PAGO" valor={f.cuenta_pago_nombre} />}
            {f.pago_referencia && <Campo label="REFERENCIA DE PAGO" valor={f.pago_referencia} mono />}
          </div>

          {/* Trazabilidad */}
          <div className="border-t pt-4" style={{ borderColor: accentBorder }}>
            <p className="text-[11px] tracking-[3px] text-[#6aacbc] mb-3">TRAZABILIDAD</p>
            <div className="space-y-2">
              {f.registrado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Registrado por</span>
                  <span className="text-[#c8e8f0]">{f.registrado_por_nombre} · {fmtDate(f.created_at)}</span>
                </div>
              )}
              {f.aprobado_por_nombre && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#7ec8d8]">Aprobado por CI</span>
                  <span className="text-[#c8e8f0]">{f.aprobado_por_nombre} · {fmtDate(f.aprobado_at)}</span>
                </div>
              )}
              {f.estado === 'rechazada' && f.rechazo_motivo && (
                <div className="flex items-start justify-between text-base gap-4">
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
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
                style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                <Receipt size={11} /> COMPROBANTE PDF
              </button>
            )}
            {f.estado === 'rechazada' && (
              <button onClick={() => { onReenviar(f.id); onClose(); }} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-base tracking-wide rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: '#f59e0b55', background: '#f59e0b15', color: '#f59e0b' }}>
                <RefreshCw size={11} /> REENVIAR A CI
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

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-xl relative p-8 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
      <div className="flex items-center justify-between mb-6">
        <p className="text-base tracking-[3px] font-semibold" style={{ color: ACCENT }}>{titulo}</p>
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
        <p className="text-base tracking-wide text-[#818cf8] truncate max-w-[400px]">{nombre}</p>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-wide rounded-sm border transition-all"
            style={{ borderColor: '#818cf855', background: '#818cf815', color: '#818cf8' }}>
            <ExternalLink size={10} /> ABRIR EN PESTAÑA
          </a>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-wide rounded-sm border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444410] transition-all">
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
            <p className="text-base tracking-wide mb-3">Vista previa no disponible para este tipo de archivo</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] tracking-wide rounded-sm border mx-auto w-fit transition-all"
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
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
            style={{ borderColor: '#34d39955', background: '#34d39910', color: '#34d399' }}>
            {previewing ? <Upload size={10} className="animate-pulse" /> : <Eye size={10} />}
            {adjunto.nombre?.split('.').pop().toUpperCase()}
          </button>
          {canEdit && (
            <button onClick={eliminar} disabled={loading}
              className="flex items-center px-2 py-1.5 text-[12px] rounded-sm border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444410] transition-all disabled:opacity-40">
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
        className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
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
        <p className="text-base tracking-wide text-[#818cf8] mb-2 opacity-80">RETENCIONES (opcional)</p>
        <div className="grid grid-cols-3 gap-3">
          {RET_FIELDS.map(({ key, label, pctDefault }) => {
            const esPct = modoRet[key] === '%';
            const valorCOP = Number(form[key]) || 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + ' mb-0'}>{label}</label>
                  <button type="button" onClick={() => toggleModo(key)}
                    className="text-[11px] px-1.5 py-0.5 rounded-sm border transition-all"
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#818cf8] pointer-events-none">%</span>
                  </div>
                ) : (
                  <input className={inputCls} type="number" min="0" value={form[key]}
                    onChange={e => set(key, e.target.value)} placeholder="0" />
                )}
                {esPct && valorCOP > 0 && (
                  <p className="text-[11px] text-[#7ec8d8] mt-1 font-mono">{fmtCOP(valorCOP)}</p>
                )}
              </div>
            );
          })}
        </div>
        {totalRet > 0 && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-sm border border-[#818cf822] bg-[#818cf808]">
            <span className="text-base tracking-wide text-[#7ec8d8]">NETO A PAGAR</span>
            <span className="text-base font-black font-mono" style={{ color: retValida ? ACCENT : '#ef4444' }}>
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
        <button onClick={onCancel} className="px-4 py-2 text-[12px] tracking-wide border border-[#818cf822] rounded-sm text-[#7ec8d8] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)}
          disabled={loading || !form.proveedor_id || !form.monto || !form.fecha_vencimiento || !retValida}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] tracking-wide rounded-sm border transition-all disabled:opacity-40"
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

// ── Paginación ─────────────────────────────────────────────────────────────────
const Paginacion = ({ total, pagina, porPagina, onChange, accent = ACCENT }) => {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fin    = Math.min(pagina * porPagina, total);
  const nums   = [];
  if (totalPags <= 7) {
    for (let i = 1; i <= totalPags; i++) nums.push(i);
  } else {
    nums.push(1);
    if (pagina > 3) nums.push('…');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(totalPags - 1, pagina + 1); i++) nums.push(i);
    if (pagina < totalPags - 2) nums.push('…');
    nums.push(totalPags);
  }
  const Btn = ({ label, to, disabled, active }) => (
    <button onClick={() => !disabled && onChange(to)} disabled={disabled}
      className="min-w-[2rem] px-2 py-1 text-[11px] tracking-wide rounded-sm border transition-all"
      style={{
        borderColor: active ? accent + '55' : '#818cf822',
        background:  active ? accent + '15' : 'transparent',
        color:       active ? accent : disabled ? '#4a7a8a55' : '#7ec8d8',
        cursor:      disabled ? 'default' : 'pointer',
      }}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#818cf811]">
      <p className="text-[11px] text-[#4a7a8a]">{inicio}–{fin} <span className="opacity-60">de {total}</span></p>
      <div className="flex items-center gap-1">
        <Btn label="←" to={pagina - 1} disabled={pagina === 1} />
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="px-1 text-[11px] text-[#4a7a8a]">…</span>
          : <Btn key={n} label={n} to={n} active={n === pagina} />
        )}
        <Btn label="→" to={pagina + 1} disabled={pagina === totalPags} />
      </div>
    </div>
  );
};

// ── Kanban ─────────────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { key: 'pendiente_aprobacion', label: 'APROBACIÓN\nÁREA',  color: '#94a3b8' },
  { key: 'aprobada',             label: 'VERIFICACIÓN\nCI',  color: '#818cf8' },
  { key: 'verificada',           label: 'AUTORIZACIÓN',      color: '#a78bfa' },
  { key: 'autorizada',           label: 'PAGO',              color: '#34d399' },
  { key: 'pagada',               label: 'PAGADA',            color: '#22d3ee' },
  { key: 'rechazada',            label: 'RECHAZADA',         color: '#ef4444' },
];

function KanbanCard({ f, onDetalle, onPerfil }) {
  const dias = f.fecha_vencimiento ? diasParaVencer(f.fecha_vencimiento) : null;
  const vencColor = dias === null ? null
    : dias < 0 ? '#ef4444' : dias <= 5 ? '#fbbf24' : dias <= 15 ? '#f97316' : '#7ec8d8';
  return (
    <button onClick={() => onDetalle(f)}
      className="w-full text-left bg-[#05080f] border border-[#818cf822] rounded-sm p-3 hover:border-[#818cf844] transition-colors cursor-pointer">
      <p className="text-base font-semibold text-[#c8e8f0] leading-snug mb-1 truncate">{f.proveedor_nombre}</p>
      <p className="text-[12px] text-[#7ec8d8] opacity-70 mb-2">{f.numero_factura ? `FAC ${f.numero_factura}` : '—'}</p>
      <p className="text-base font-bold text-[#c8e8f0] mb-2">
        {Number(f.monto).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
      </p>
      {dias !== null && f.estado !== 'pagada' && f.estado !== 'rechazada' && (
        <p className="text-[12px] font-medium flex items-center gap-1" style={{ color: vencColor }}>
          {(dias < 0 || dias <= 5) && <AlertTriangle size={9} />}
          {dias < 0 ? `Vencida hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias}d`}
        </p>
      )}
      {f.area_responsable && (
        <p className="text-[11px] text-[#7ec8d8] opacity-50 mt-1 uppercase tracking-wide">{f.area_responsable}</p>
      )}
      <div className="flex justify-end mt-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => onPerfil(f)}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] tracking-wide rounded-sm border border-[#34d39922] text-[#34d399] hover:bg-[#34d39910] transition-colors">
          <Building2 size={8} /> PROVEEDOR
        </button>
      </div>
    </button>
  );
}

function KanbanFacturas({ facturas, busqueda, filtroVencimiento, onDetalle, onPerfil }) {
  const filtered = facturas.filter(f => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!(f.proveedor_nombre?.toLowerCase().includes(q) ||
            f.numero_factura?.toLowerCase().includes(q) ||
            f.descripcion?.toLowerCase().includes(q) ||
            f.area_responsable?.toLowerCase().includes(q))) return false;
    }
    if (filtroVencimiento) {
      const d = diasParaVencer(f.fecha_vencimiento);
      if (filtroVencimiento === 'vencidas' && d >= 0) return false;
      if (filtroVencimiento === 'hoy5'     && !(d >= 0 && d <= 5))  return false;
      if (filtroVencimiento === 'hoy15'    && !(d >= 0 && d <= 15)) return false;
    }
    return true;
  });

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: `${KANBAN_COLS.length * 220}px` }}>
        {KANBAN_COLS.map(col => {
          const cards = filtered.filter(f => f.estado === col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-52">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] tracking-[2px] font-bold whitespace-pre-line leading-tight"
                  style={{ color: col.color }}>{col.label}</p>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: col.color + '22', color: col.color }}>{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.length === 0 && (
                  <div className="border border-dashed border-[#818cf815] rounded-sm py-6 text-center">
                    <p className="text-[11px] text-[#7ec8d8] opacity-30 tracking-wide">VACÍO</p>
                  </div>
                )}
                {cards.map(f => (
                  <KanbanCard key={f.id} f={f} onDetalle={onDetalle} onPerfil={onPerfil} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [vista,             setVista]             = useState('lista'); // 'lista' | 'kanban' | 'calendario'
  const [filtroVencimiento, setFiltroVencimiento] = useState('');
  const [pagina,            setPagina]            = useState(1);
  const POR_PAGINA = 10;

  const facturasVisibles = useMemo(() => facturas.filter(f => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!(f.proveedor_nombre?.toLowerCase().includes(q) ||
            f.numero_factura?.toLowerCase().includes(q) ||
            f.descripcion?.toLowerCase().includes(q) ||
            f.area_responsable?.toLowerCase().includes(q))) return false;
    }
    if (filtroVencimiento) {
      const d = diasParaVencer(f.fecha_vencimiento);
      if (filtroVencimiento === 'vencidas' && d >= 0) return false;
      if (filtroVencimiento === 'hoy5'     && !(d >= 0 && d <= 5))  return false;
      if (filtroVencimiento === 'hoy15'    && !(d >= 0 && d <= 15)) return false;
    }
    return true;
  }), [facturas, busqueda, filtroVencimiento]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado, filtroVencimiento]);

  const facturasPagina = facturasVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

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

  const exportarCSV = () => {
    const cols = [
      ['Proveedor',        f => f.proveedor_nombre],
      ['# Factura',        f => f.numero_factura],
      ['Concepto',         f => f.descripcion],
      ['Monto',            f => f.monto],
      ['Ret. Fuente',      f => f.retencion_fuente || 0],
      ['Ret. ICA',         f => f.retencion_ica    || 0],
      ['Ret. IVA',         f => f.retencion_iva    || 0],
      ['Estado',           f => ESTADO_META[f.estado]?.label || f.estado],
      ['Área',             f => f.area_responsable],
      ['Responsable',      f => f.responsable_nombre],
      ['Fecha recibida',   f => fmtDate(f.fecha_recibida)],
      ['Fecha vencimiento',f => fmtDate(f.fecha_vencimiento)],
      ['Días restantes',   f => f.estado !== 'pagada' && f.estado !== 'rechazada' ? diasParaVencer(f.fecha_vencimiento) : ''],
      ['Fecha pago',       f => fmtDate(f.fecha_pago)],
      ['Cuenta pago',      f => f.cuenta_pago_nombre],
      ['Referencia pago',  f => f.referencia_pago],
    ];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = cols.map(([h]) => esc(h)).join(',');
    const rows   = facturasVisibles.map(f => cols.map(([, fn]) => esc(fn(f))).join(','));
    const csv    = [header, ...rows].join('\n');
    const blob   = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = `facturas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    // Encabezado
    doc.setFillColor(5, 8, 15);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(129, 140, 248);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('KERNEL — CONTABLE', 14, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(126, 200, 216);
    doc.text('REPORTE DE FACTURAS', 14, 16);
    doc.text(hoy, W - 14, 16, { align: 'right' });

    // Subtítulo con filtros activos
    const filtros = [
      filtroEstado    ? `Etapa: ${ESTADO_META[filtroEstado]?.label}` : null,
      filtroVencimiento === 'vencidas' ? 'Vencidas'
        : filtroVencimiento === 'hoy5' ? 'Vence ≤5d'
        : filtroVencimiento === 'hoy15' ? 'Vence ≤15d' : null,
      busqueda ? `Búsqueda: "${busqueda}"` : null,
    ].filter(Boolean).join(' · ');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 130, 150);
    doc.text(filtros || 'Todas las facturas', 14, 26);

    // Stats resumidas
    const activas      = facturasVisibles.filter(f => f.estado !== 'pagada' && f.estado !== 'rechazada');
    const totalMonto   = facturasVisibles.reduce((s, f) => s + Number(f.monto), 0);
    const vencidas     = activas.filter(f => diasParaVencer(f.fecha_vencimiento) < 0).length;
    const fmtNum = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    doc.setFontSize(7);
    doc.setTextColor(160, 212, 224);
    doc.text(`${facturasVisibles.length} facturas  ·  Total: ${fmtNum(totalMonto)}  ·  Vencidas: ${vencidas}`, W - 14, 26, { align: 'right' });

    // Tabla
    autoTable(doc, {
      startY: 30,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', textColor: [40, 60, 70] },
      headStyles: { fillColor: [15, 23, 42], textColor: [126, 200, 216], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 2: { cellWidth: 45 }, 3: { halign: 'right' } },
      head: [['PROVEEDOR', '# FACTURA', 'CONCEPTO', 'MONTO', 'ESTADO', 'ÁREA', 'F. VENCIMIENTO', 'DÍAS REST.']],
      body: facturasVisibles.map(f => {
        const dias = diasParaVencer(f.fecha_vencimiento);
        return [
          f.proveedor_nombre,
          f.numero_factura || '—',
          f.descripcion    || '—',
          fmtNum(f.monto),
          ESTADO_META[f.estado]?.label || f.estado,
          f.area_responsable || '—',
          fmtDate(f.fecha_vencimiento),
          f.estado !== 'pagada' && f.estado !== 'rechazada'
            ? (dias < 0 ? `Vencida (${Math.abs(dias)}d)` : `${dias}d`)
            : '—',
        ];
      }),
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = data.cell.raw;
          if (typeof val === 'string' && val.startsWith('Vencida'))
            data.cell.styles.textColor = [239, 68, 68];
          else if (typeof val === 'string' && val !== '—' && parseInt(val) <= 5)
            data.cell.styles.textColor = [251, 191, 36];
        }
      },
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(6.5);
      doc.setTextColor(130, 140, 150);
      doc.text(`${COOP.nombre}  ·  NIT ${COOP.nit}`, 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(`Página ${i} de ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    }

    doc.save(`facturas_${new Date().toISOString().slice(0, 10)}.pdf`);
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
    <div className="p-8 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>FACTURAS</h1>
          <p className="text-[#7ec8d8] text-[13px] tracking-[2px] mt-0.5">// REGISTRO DE FACTURAS DE PROVEEDORES</p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 text-base tracking-wide rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> REGISTRAR FACTURA
        </button>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const activas      = facturasVisibles.filter(f => f.estado !== 'pagada' && f.estado !== 'rechazada');
        const total        = facturasVisibles.length;
        const monto        = facturasVisibles.reduce((s, f) => s + Number(f.monto), 0);
        const vencidas     = activas.filter(f => diasParaVencer(f.fecha_vencimiento) < 0).length;
        const urgentes     = activas.filter(f => { const d = diasParaVencer(f.fecha_vencimiento); return d >= 0 && d <= 5; }).length;
        const montoVencido = activas.filter(f => diasParaVencer(f.fecha_vencimiento) < 0).reduce((s, f) => s + Number(f.monto), 0);
        const fmt = n => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`;
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#818cf81a] rounded-sm overflow-hidden">
            {[
              { label: 'FACTURAS',  value: total,           color: '#c8e8f0'  },
              { label: 'TOTAL',     value: fmt(monto),      color: '#c8e8f0'  },
              { label: 'VENCIDAS',  value: vencidas,        color: vencidas  > 0 ? '#ef4444' : '#4a7a8a' },
              { label: '≤ 5 DÍAS',  value: urgentes,        color: urgentes  > 0 ? '#fbbf24' : '#4a7a8a' },
              ...(montoVencido > 0 ? [{ label: 'MONTO VENCIDO', value: fmt(montoVencido), color: '#ef4444' }] : []),
            ].map(({ label, value, color }, i) => (
              <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
                <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Búsqueda + toggle vista */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar proveedor, # factura, concepto, área..."
            className="w-full bg-[#05080f] border border-[#818cf822] rounded-sm pl-8 pr-3 py-2 text-base text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#818cf855] transition-colors"
          />
        </div>
        <button onClick={exportarCSV}
          title="Exportar CSV"
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] tracking-wide rounded-sm border border-[#818cf822] text-[#7ec8d8] hover:border-[#818cf844] hover:text-[#a0d4e0] transition-all">
          <Download size={12} /> CSV
        </button>
        <button onClick={exportarPDF}
          title="Exportar PDF"
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] tracking-wide rounded-sm border border-[#818cf822] text-[#7ec8d8] hover:border-[#818cf844] hover:text-[#a0d4e0] transition-all">
          <FileText size={12} /> PDF
        </button>
        {['lista', 'kanban', 'calendario'].map(v => {
          const active = vista === v;
          const Icon = v === 'lista' ? List : v === 'kanban' ? LayoutGrid : Calendar;
          const label = v.toUpperCase();
          return (
            <button key={v}
              onClick={() => { setVista(v); if (v !== 'lista') { setFiltroEstado(''); setFiltroVencimiento(''); } }}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] tracking-wide rounded-sm border transition-all"
              style={{
                borderColor: active ? ACCENT + '55' : '#818cf822',
                background:  active ? ACCENT + '10' : 'transparent',
                color:       active ? ACCENT : '#7ec8d8',
              }}>
              <Icon size={12} /> {label}
            </button>
          );
        })}
      </div>

      {/* Filtros — ocultos en kanban y calendario */}
      {vista === 'lista' && (
        <div className="flex items-center gap-0 mb-5 border border-[#818cf81a] rounded-sm overflow-hidden">
          {/* Etapa */}
          {['', 'pendiente_aprobacion', 'aprobada', 'verificada', 'autorizada', 'pagada', 'rechazada'].map(e => {
            const active = filtroEstado === e;
            return (
              <button key={e} onClick={() => setFiltroEstado(e)}
                className="px-3 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap border-r border-[#818cf81a]"
                style={{
                  background: active ? ACCENT + '18' : 'transparent',
                  color:      active ? ACCENT : '#4a7a8a',
                  fontWeight: active ? 700 : 400,
                  borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}>
                {e === '' ? 'TODAS' : ESTADO_META[e]?.label}
              </button>
            );
          })}

          {/* Separador */}
          <div className="w-px self-stretch bg-[#818cf833] mx-1" />

          {/* Vencimiento */}
          {[
            { key: '',         label: 'CUALQUIER FECHA', color: null      },
            { key: 'vencidas', label: 'VENCIDAS',        color: '#ef4444' },
            { key: 'hoy5',     label: '≤ 5 DÍAS',        color: '#fbbf24' },
            { key: 'hoy15',    label: '≤ 15 DÍAS',       color: '#f97316' },
          ].map(({ key, label, color }) => {
            const active = filtroVencimiento === key;
            const c = color || ACCENT;
            return (
              <button key={key} onClick={() => setFiltroVencimiento(key)}
                className="px-3 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap"
                style={{
                  background: active ? c + '18' : 'transparent',
                  color:      active ? c : '#4a7a8a',
                  fontWeight: active ? 700 : 400,
                  borderBottom: active ? `2px solid ${c}` : '2px solid transparent',
                }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {loading && <p className="text-center text-[#7ec8d8] text-base tracking-wide animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturasVisibles.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#7ec8d8] text-base tracking-wide">SIN FACTURAS</p>
        </div>
      )}

      {!loading && facturasVisibles.length > 0 && vista === 'kanban' && (
        <KanbanFacturas
          facturas={facturasVisibles}
          busqueda=""
          filtroVencimiento=""
          onDetalle={f => setDetalleFactura(f)}
          onPerfil={f => setPerfilProveedor({ id: f.proveedor_id, nombre: f.proveedor_nombre })}
        />
      )}

      {!loading && facturasVisibles.length > 0 && vista === 'calendario' && (
        <CalendarioFacturas
          facturas={facturasVisibles}
          accent={ACCENT}
          onDetalle={f => setDetalleFactura(f)}
        />
      )}

      {!loading && facturasVisibles.length > 0 && vista === 'lista' && (
        <div className="space-y-2">
          {facturasPagina.map(f => {
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
                    <p className="text-lg font-semibold text-[#c8e8f0] leading-tight">{f.proveedor_nombre}</p>
                    {f.descripcion && (
                      <p className="text-base text-[#7ec8d8] mt-0.5 truncate max-w-[340px]">{f.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black font-mono leading-tight" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                    {tieneRet && (
                      <p className="text-[12px] text-[#7ec8d8] opacity-70 mt-0.5">neto {fmtCOP(f.monto_neto)}</p>
                    )}
                  </div>
                </div>

                {/* Stepper — línea propia */}
                <div className="mb-3">
                  <MiniPasoFactura estado={f.estado} />
                </div>

                {/* Fila de metadata */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {f.numero_factura && (
                    <span className="text-base font-mono text-[#a0d4e0]">{f.numero_factura}</span>
                  )}
                  {f.area_responsable && (
                    <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border border-[#818cf833] text-[#818cf8] bg-[#818cf810]">
                      {f.area_responsable.toUpperCase()}
                    </span>
                  )}
                  {f.responsable_nombre && (
                    <span className="flex items-center gap-1.5 text-base text-[#7ec8d8]">
                      <User size={11} /> {f.responsable_nombre}
                    </span>
                  )}
                  {f.requiere_aprobacion_gerencia && !f.aprobado_gerencia_at && (
                    <span className="text-base tracking-wide px-2 py-0.5 rounded-sm border border-[#f59e0b44] text-[#f59e0b] bg-[#f59e0b11]">
                      REQUIERE GERENCIA
                    </span>
                  )}
                </div>

                {/* Fila de fechas + acciones */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {f.estado === 'pagada' ? (
                      <span className="text-base text-[#7ec8d8] opacity-60">
                        {f.dias_tesoreria != null ? `Pagada en ${f.dias_tesoreria}d` : 'Pagada'}
                      </span>
                    ) : f.estado === 'rechazada' ? (
                      <span className="text-base text-[#ef4444] opacity-80">
                        {f.rechazo_motivo ? `Rechazada · ${f.rechazo_motivo}` : 'Rechazada'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-base font-medium"
                        style={{
                          color: vencida        ? '#ef4444'
                               : dias <= 5      ? '#fbbf24'
                               : dias <= 15     ? '#f97316'
                               : '#7ec8d8',
                        }}>
                        {(vencida || dias <= 5) && <AlertTriangle size={11} />}
                        {vencida
                          ? `VENCIDA hace ${Math.abs(dias)}d`
                          : dias === 0 ? 'Vence hoy'
                          : `Vence en ${dias}d · ${f.fecha_vencimiento}`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 items-center" onClick={e => e.stopPropagation()}>
                    {f.proveedor_id && (
                      <button
                        onClick={() => setPerfilProveedor({ id: f.proveedor_id, nombre: f.proveedor_nombre })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-base tracking-wide rounded-sm border transition-all hover:bg-[#818cf810]"
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
          <Paginacion total={facturasVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
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
