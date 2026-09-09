import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, FileText, AlertTriangle, Clock, CircleCheck, Ban, RefreshCw, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import apiService from '../../../services/apiService.js';

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
const inputCls  = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf855] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_META = {
  pendiente_aprobacion: { label: 'PENDIENTE',  color: '#fbbf24', icon: Clock },
  aprobada:             { label: 'APROBADA',   color: '#34d399', icon: CircleCheck },
  pagada:               { label: 'PAGADA',     color: '#38bdf8', icon: Check },
  rechazada:            { label: 'RECHAZADA',  color: '#ef4444', icon: Ban },
};

const EstadoChip = ({ estado }) => {
  const m = ESTADO_META[estado] || {};
  const Icon = m.icon || Clock;
  return (
    <span className="flex items-center gap-1 text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border"
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '11' }}>
      <Icon size={8} /> {m.label}
    </span>
  );
};

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-lg relative p-6 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] tracking-[3px]" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={14} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AREAS_SUGERIDAS = ['Gerencia', 'Crédito', 'Comercial', 'Cartera', 'Contable', 'Control Interno', 'Seguros', 'Sistemas', 'Otro'];

const FormFactura = ({ proveedores, onSave, onCancel, loading }) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    proveedor_id: '', monto: '',
    fecha_emision: '', fecha_recibida: hoy, fecha_vencimiento: '',
    area_responsable: '', fecha_entrega_area: '',
    descripcion: '', numero_factura: '',
    retencion_fuente: '', retencion_ica: '', retencion_iva: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const monto        = Number(form.monto)            || 0;
  const retFuente    = Number(form.retencion_fuente) || 0;
  const retIca       = Number(form.retencion_ica)    || 0;
  const retIva       = Number(form.retencion_iva)    || 0;
  const totalRet     = retFuente + retIca + retIva;
  const montoNeto    = monto - totalRet;
  const retValida    = totalRet === 0 || (totalRet > 0 && totalRet < monto);

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
            onChange={e => set('monto', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Retenciones */}
      <div>
        <p className="text-[8px] tracking-[2px] text-[#818cf8] mb-2 opacity-70">RETENCIONES (opcional)</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>RET. FUENTE</label>
            <input className={inputCls} type="number" min="0" value={form.retencion_fuente}
              onChange={e => set('retencion_fuente', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>RET. ICA</label>
            <input className={inputCls} type="number" min="0" value={form.retencion_ica}
              onChange={e => set('retencion_ica', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>RET. IVA</label>
            <input className={inputCls} type="number" min="0" value={form.retencion_iva}
              onChange={e => set('retencion_iva', e.target.value)} placeholder="0" />
          </div>
        </div>
        {totalRet > 0 && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-sm border border-[#818cf822] bg-[#818cf808]">
            <span className="text-[8px] tracking-widest text-[#6aacbc]">NETO A PAGAR</span>
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
          <label className={labelCls}>ENTREGA A ÁREA RESPONSABLE</label>
          <input className={inputCls} type="date" value={form.fecha_entrega_area}
            onChange={e => set('fecha_entrega_area', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>CONCEPTO / DESCRIPCIÓN</label>
        <input className={inputCls} value={form.descripcion}
          onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Factura agosto 2026" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-[9px] tracking-widest border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)}
          disabled={loading || !form.proveedor_id || !form.monto || !form.fecha_vencimiento || !retValida}
          className="flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
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
  const [loading,     setLoading]     = useState(true);
  const [modalCrear,  setModalCrear]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

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
  }, []);

  const registrar = async (form) => {
    setSaving(true);
    try {
      await apiService.post('/contable/facturas', form);
      toast.success('Factura registrada — pendiente de aprobación por Control Interno');
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
          <p className="text-[#6aacbc] text-[9px] tracking-[3px] mt-0.5">// REGISTRO DE FACTURAS DE PROVEEDORES</p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-widest rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={12} /> REGISTRAR FACTURA
        </button>
      </div>

      {/* Filtro estado — todos visibles desde Contable */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pendiente_aprobacion', 'aprobada', 'pagada', 'rechazada'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className="px-3 py-1.5 text-[8px] tracking-widest rounded-sm border transition-all"
            style={{
              borderColor: filtroEstado === e ? ACCENT + '55' : '#818cf822',
              background:  filtroEstado === e ? ACCENT + '10' : 'transparent',
              color:       filtroEstado === e ? ACCENT : '#6aacbc',
            }}>
            {e === '' ? 'TODAS' : ESTADO_META[e]?.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-[10px] tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && facturas.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <FileText size={24} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN FACTURAS</p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="space-y-2">
          {facturas.map(f => {
            const dias    = diasParaVencer(f.fecha_vencimiento);
            const vencida = dias < 0;
            const urgente = dias >= 0 && dias <= 5;
            return (
              <div key={f.id} className="flex items-center justify-between px-4 py-3 rounded-sm border transition-colors"
                style={{ borderColor: vencida ? '#ef444422' : urgente ? '#fbbf2422' : '#818cf815', background: vencida ? '#ef444406' : '#818cf804' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-[11px] font-semibold text-[#a0d4e0]">{f.proveedor_nombre}</p>
                    <EstadoChip estado={f.estado} />
                    {(vencida || urgente) && f.estado !== 'pagada' && f.estado !== 'rechazada' && (
                      <span className="flex items-center gap-1 text-[7px] tracking-widest"
                        style={{ color: vencida ? '#ef4444' : '#fbbf24' }}>
                        <AlertTriangle size={8} />
                        {vencida ? `VENCIDA hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    )}
                    {f.requiere_aprobacion_gerencia && !f.aprobado_gerencia_at && (
                      <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#f59e0b44] text-[#f59e0b] bg-[#f59e0b11]">
                        REQUIERE GERENCIA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {f.numero_factura && <p className="text-[7px] font-mono text-[#a0d4e0] opacity-70">{f.numero_factura}</p>}
                    {f.area_responsable && (
                      <span className="text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[#818cf833] text-[#818cf8] bg-[#818cf810]">
                        {f.area_responsable.toUpperCase()}
                      </span>
                    )}
                    {f.descripcion && <p className="text-[8px] text-[#6aacbc] truncate max-w-[180px]">{f.descripcion}</p>}
                    <p className="text-[7px] text-[#6aacbc] opacity-40">vence {f.fecha_vencimiento}</p>
                    {f.estado === 'pagada' && f.dias_tesoreria != null && (
                      <p className="text-[7px] text-[#6aacbc] opacity-40">pagada en {f.dias_tesoreria}d</p>
                    )}
                    {f.estado === 'rechazada' && f.rechazo_motivo && (
                      <p className="text-[7px] text-[#ef4444] opacity-80">"{f.rechazo_motivo}"</p>
                    )}
                    {Number(f.retencion_fuente) + Number(f.retencion_ica) + Number(f.retencion_iva) > 0 && (
                      <span className="text-[7px] tracking-widest text-[#6aacbc] opacity-60">
                        neto {fmtCOP(f.monto_neto)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <p className="text-base font-black font-mono" style={{ color: ACCENT }}>{fmtCOP(f.monto)}</p>
                  {f.estado === 'pagada' && (
                    <button onClick={() => generarComprobante(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-widest rounded-sm border transition-all"
                      style={{ borderColor: '#818cf855', background: '#818cf815', color: '#818cf8' }}>
                      <Receipt size={10} /> COMPROBANTE
                    </button>
                  )}
                  {f.estado === 'rechazada' && (
                    <button onClick={() => reenviar(f.id)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-widest rounded-sm border transition-all disabled:opacity-40"
                      style={{ borderColor: '#f59e0b55', background: '#f59e0b15', color: '#f59e0b' }}>
                      <RefreshCw size={10} /> REENVIAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCrear && (
        <Modal titulo="REGISTRAR FACTURA" onClose={() => setModalCrear(false)}>
          <FormFactura proveedores={proveedores} onSave={registrar} onCancel={() => setModalCrear(false)} loading={saving} />
        </Modal>
      )}
    </div>
  );
}
