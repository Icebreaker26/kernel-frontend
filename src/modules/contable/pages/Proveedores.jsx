import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Check, Building2, Search, Clock, AlertTriangle, Paperclip, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../../../services/apiService.js';
import PerfilProveedor from '../../../components/PerfilProveedor.jsx';

const ACCENT = '#818cf8';
const inputCls  = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-4 py-3 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf855] transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls  = 'text-xs tracking-widest text-[#6aacbc] mb-1.5 block';

const FRECUENCIAS = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];
const CATEGORIAS  = ['Servicios públicos', 'Suscripción', 'Arriendo', 'Nómina', 'Mantenimiento', 'Seguros', 'Otro'];

const Modal = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-xl relative p-8 max-h-[90vh] overflow-y-auto">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm tracking-[3px] font-semibold" style={{ color: ACCENT }}>{titulo}</p>
        <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const FormProveedor = ({ inicial, onSave, onCancel, loading }) => {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    nit: inicial?.nit || '',
    email: inicial?.email || '',
    telefono: inicial?.telefono || '',
    tipo_pago: inicial?.tipo_pago || 'unico',
    frecuencia: inicial?.frecuencia || '',
    categoria: inicial?.categoria || '',
    notas: inicial?.notas || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>NOMBRE *</label>
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: EPM S.A." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>NIT</label>
          <input className={inputCls} value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="900.000.000-1" />
        </div>
        <div>
          <label className={labelCls}>TELÉFONO</label>
          <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+57 300 000 0000" />
        </div>
      </div>
      <div>
        <label className={labelCls}>EMAIL</label>
        <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="pagos@proveedor.com" />
      </div>
      <div>
        <label className={labelCls}>TIPO DE PAGO *</label>
        <div className="flex gap-2">
          {['unico', 'recurrente'].map(t => (
            <button key={t} onClick={() => { set('tipo_pago', t); if (t === 'unico') set('frecuencia', ''); }}
              className="flex-1 py-2.5 text-xs tracking-widest rounded-sm border transition-all"
              style={{
                borderColor: form.tipo_pago === t ? ACCENT + '88' : '#818cf822',
                background:  form.tipo_pago === t ? ACCENT + '15' : 'transparent',
                color:       form.tipo_pago === t ? ACCENT : '#6aacbc',
              }}>
              {t === 'unico' ? 'PAGO ÚNICO' : 'RECURRENTE'}
            </button>
          ))}
        </div>
      </div>
      {form.tipo_pago === 'recurrente' && (
        <div>
          <label className={labelCls}>FRECUENCIA *</label>
          <select className={selectCls} value={form.frecuencia} onChange={e => set('frecuencia', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {FRECUENCIAS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={labelCls}>CATEGORÍA</label>
        <select className={selectCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
          <option value="">— Sin categoría —</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>NOTAS</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.notas}
          onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel} className="px-5 py-2.5 text-xs tracking-widest border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">CANCELAR</button>
        <button onClick={() => onSave(form)} disabled={loading || !form.nombre}
          className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
          <Check size={12} /> {loading ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
};

/* ── Modal de datos bancarios (Contable) ───────────────────────────────── */
const BANCOS_CO = [
  'Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Banco Popular',
  'Banco de Occidente', 'Banco Caja Social', 'AV Villas', 'Nequi', 'Daviplata',
  'Lulo Bank', 'Nu Colombia', 'Otro',
];

function DatosBancariosModal({ proveedor, onClose }) {
  const [estado,       setEstado]      = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [archivoCert,  setArchivoCert] = useState(null); // File object
  const [form, setForm] = useState({ banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '', titular_cuenta: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    apiService.get(`/contable/proveedores/${proveedor.id}/datos-bancarios`)
      .then(({ data }) => {
        setEstado(data);
        if (data.activos?.banco) setForm({
          banco:          data.activos.banco,
          tipo_cuenta:    data.activos.tipo_cuenta || 'ahorros',
          numero_cuenta:  data.activos.numero_cuenta,
          titular_cuenta: data.activos.titular_cuenta,
        });
      })
      .catch(() => toast.error('Error al cargar datos bancarios'))
      .finally(() => setLoading(false));
  }, [proveedor.id]);

  const enviar = async () => {
    setSaving(true);
    try {
      // 1. Crear la solicitud
      const { data: solicitud } = await apiService.post(
        `/contable/proveedores/${proveedor.id}/datos-bancarios`, form
      );

      // 2. Si hay certificado, subirlo a S3
      if (archivoCert) {
        const { data: presign } = await apiService.post(
          `/contable/proveedores/${proveedor.id}/datos-bancarios/${solicitud.id}/certificado`,
          { nombre: archivoCert.name, mime: archivoCert.type, size: archivoCert.size }
        );
        await fetch(presign.uploadUrl, {
          method: 'PUT',
          body: archivoCert,
          headers: { 'Content-Type': archivoCert.type },
        });
        await apiService.patch(
          `/contable/proveedores/${proveedor.id}/datos-bancarios/${solicitud.id}/certificado`,
          { key: presign.key, nombre: archivoCert.name, mime: archivoCert.type, size: archivoCert.size }
        );
      }

      toast.success('Solicitud enviada — pendiente de verificación por Control Interno');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al enviar solicitud');
    } finally { setSaving(false); }
  };

  const inputCls2 = 'w-full bg-[#05080f] border border-[#818cf822] rounded-sm px-4 py-3 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#818cf855] transition-colors';
  const lbl = 'text-xs tracking-widest text-[#6aacbc] mb-1.5 block';

  const hayPendiente = estado?.pendiente != null;
  const estadoBancario = estado?.activos?.datos_bancarios_estado;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#08101e] border border-[#818cf833] rounded-sm w-full max-w-xl relative p-8 max-h-[90vh] overflow-y-auto">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#818cf8]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#818cf8]" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm tracking-[3px] font-semibold" style={{ color: ACCENT }}>DATOS BANCARIOS</p>
            <p className="text-xs text-[#6aacbc] mt-1">{proveedor.nombre}</p>
          </div>
          <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={16} /></button>
        </div>

        {loading && <p className="text-center text-[#6aacbc] text-sm animate-pulse py-8">CARGANDO...</p>}

        {!loading && (
          <div className="space-y-5">
            {/* Estado actual */}
            {estadoBancario === 'verificado' && (
              <div className="p-5 border border-[#22c55e22] rounded-sm bg-[#22c55e08]">
                <p className="text-xs tracking-widest text-[#22c55e] mb-3">✓ DATOS VERIFICADOS POR CONTROL INTERNO</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-[#6aacbc]">Banco: </span><span className="text-[#c8e8f0] font-medium">{estado.activos.banco}</span></div>
                  <div><span className="text-[#6aacbc]">Tipo: </span><span className="text-[#c8e8f0] font-medium">{estado.activos.tipo_cuenta?.toUpperCase()}</span></div>
                  <div><span className="text-[#6aacbc]">Cuenta: </span><span className="text-[#c8e8f0] font-mono font-medium">{estado.activos.numero_cuenta}</span></div>
                  <div><span className="text-[#6aacbc]">Titular: </span><span className="text-[#c8e8f0] font-medium">{estado.activos.titular_cuenta}</span></div>
                </div>
              </div>
            )}

            {/* Solicitud pendiente */}
            {hayPendiente && (
              <div className="p-4 border border-[#fbbf2422] rounded-sm bg-[#fbbf2408] flex items-start gap-3">
                <Clock size={16} color="#fbbf24" className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs tracking-widest text-[#fbbf24] mb-1.5">SOLICITUD EN REVISIÓN POR CI</p>
                  <p className="text-sm text-[#c8e8f0]">{estado.pendiente.banco} · {estado.pendiente.tipo_cuenta?.toUpperCase()} · {estado.pendiente.numero_cuenta}</p>
                  <p className="text-xs text-[#6aacbc] mt-1">Solicitado por {estado.pendiente.solicitado_por_nombre}</p>
                </div>
              </div>
            )}

            {/* Formulario — solo si no hay pendiente */}
            {!hayPendiente && (
              <>
                <div className="border-t border-[#818cf811] pt-5">
                  <p className="text-xs tracking-[3px] text-[#6aacbc] mb-4">
                    {estadoBancario === 'verificado' ? 'ACTUALIZAR DATOS BANCARIOS' : 'REGISTRAR DATOS BANCARIOS'}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className={lbl}>BANCO *</label>
                      <select className={inputCls2 + ' cursor-pointer'} value={form.banco} onChange={e => set('banco', e.target.value)}>
                        <option value="">— Seleccionar banco —</option>
                        {BANCOS_CO.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>TIPO DE CUENTA *</label>
                      <div className="flex gap-2">
                        {['ahorros', 'corriente'].map(t => (
                          <button key={t} onClick={() => set('tipo_cuenta', t)}
                            className="flex-1 py-2.5 text-xs tracking-widest rounded-sm border transition-all"
                            style={{
                              borderColor: form.tipo_cuenta === t ? ACCENT + '88' : '#818cf822',
                              background:  form.tipo_cuenta === t ? ACCENT + '15' : 'transparent',
                              color:       form.tipo_cuenta === t ? ACCENT : '#6aacbc',
                            }}>
                            {t.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>NÚMERO DE CUENTA *</label>
                      <input className={inputCls2} value={form.numero_cuenta}
                        onChange={e => set('numero_cuenta', e.target.value)}
                        placeholder="000-000000-00" />
                    </div>
                    <div>
                      <label className={lbl}>TITULAR DE LA CUENTA *</label>
                      <input className={inputCls2} value={form.titular_cuenta}
                        onChange={e => set('titular_cuenta', e.target.value)}
                        placeholder="Nombre del titular" />
                    </div>

                    {/* Certificado bancario */}
                    <div>
                      <label className={lbl}>CERTIFICADO BANCARIO (PDF)</label>
                      {archivoCert ? (
                        <div className="flex items-center gap-3 p-3 border border-[#818cf833] rounded-sm bg-[#818cf808]">
                          <Paperclip size={14} color={ACCENT} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[#c8e8f0] truncate">{archivoCert.name}</p>
                            <p className="text-xs text-[#6aacbc]">{(archivoCert.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button onClick={() => setArchivoCert(null)}
                            className="text-[#6aacbc] hover:text-[#ef4444] transition-colors shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 p-3 border border-dashed border-[#818cf833] rounded-sm bg-[#818cf805] cursor-pointer hover:border-[#818cf866] hover:bg-[#818cf80d] transition-colors">
                          <Paperclip size={14} color="#6aacbc" />
                          <span className="text-sm text-[#6aacbc]">Adjuntar certificado bancario...</span>
                          <input type="file" accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            onChange={e => setArchivoCert(e.target.files[0] || null)} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-[#fbbf2415] rounded-sm bg-[#fbbf2408] flex items-start gap-2.5">
                  <AlertTriangle size={14} color="#fbbf24" className="shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6aacbc] leading-relaxed">
                    Los datos bancarios requieren verificación de Control Interno antes de activarse.
                    Una vez enviada la solicitud, no podrás modificarla hasta que CI la revise.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={onClose}
                    className="px-5 py-2.5 text-xs tracking-widest border border-[#818cf822] rounded-sm text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
                    CANCELAR
                  </button>
                  <button onClick={enviar} disabled={saving || !form.banco || !form.numero_cuenta || !form.titular_cuenta}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest rounded-sm border transition-all disabled:opacity-40"
                    style={{ borderColor: ACCENT + '55', background: ACCENT + '15', color: ACCENT }}>
                    <Check size={12} /> {saving ? 'ENVIANDO...' : 'ENVIAR A CI'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const TIPO_CHIP = {
  recurrente: { label: 'RECURRENTE', color: '#38bdf8' },
  unico:      { label: 'ÚNICO',      color: '#a78bfa' },
};

// ── Paginación ─────────────────────────────────────────────────────────────────
const Paginacion = ({ total, pagina, porPagina, onChange }) => {
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
        borderColor: active ? ACCENT + '55' : '#818cf822',
        background:  active ? ACCENT + '15' : 'transparent',
        color:       active ? ACCENT : disabled ? '#4a7a8a55' : '#7ec8d8',
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

const DB_META = {
  sin_datos:   { label: 'SIN DATOS',   color: '#6aacbc44', text: '#6aacbc' },
  pendiente_ci:{ label: 'PEND. CI',    color: '#fbbf2488', text: '#fbbf24' },
  verificado:  { label: 'VERIFICADO',  color: '#34d39988', text: '#34d399' },
};

export default function ContableProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [perfil,      setPerfil]      = useState(null);
  const [bancario,    setBancario]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroTipo,  setFiltroTipo]  = useState('');
  const [filtroCat,   setFiltroCat]   = useState('');
  const [filtroBanco, setFiltroBanco] = useState('');
  const [orden,       setOrden]       = useState('');
  const [pagina,      setPagina]      = useState(1);
  const POR_PAGINA = 12;

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get('/contable/proveedores')
      .then(({ data }) => setProveedores(data))
      .catch(() => toast.error('Error al cargar proveedores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const categorias = useMemo(() =>
    [...new Set(proveedores.map(p => p.categoria).filter(Boolean))].sort()
  , [proveedores]);

  const proveedoresVisibles = useMemo(() => {
    const filtered = proveedores.filter(p => {
      if (filtroTipo && p.tipo_pago !== filtroTipo) return false;
      if (filtroCat  && p.categoria !== filtroCat)  return false;
      if (filtroBanco && (p.datos_bancarios_estado || 'sin_datos') !== filtroBanco) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return p.nombre?.toLowerCase().includes(q) ||
               p.nit?.toLowerCase().includes(q) ||
               p.categoria?.toLowerCase().includes(q) ||
               p.email?.toLowerCase().includes(q);
      }
      return true;
    });
    if (orden === 'facturas_desc')
      return [...filtered].sort((a, b) => (Number(b.facturas_pendientes) || 0) - (Number(a.facturas_pendientes) || 0));
    if (orden === 'monto_desc')
      return [...filtered].sort((a, b) => (Number(b.monto_pendiente) || Number(b.facturas_pendientes) || 0)
                                        - (Number(a.monto_pendiente) || Number(a.facturas_pendientes) || 0));
    if (orden === 'nombre_asc')
      return [...filtered].sort((a, b) => a.nombre?.localeCompare(b.nombre, 'es'));
    return filtered;
  }, [proveedores, filtroTipo, filtroCat, filtroBanco, busqueda, orden]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroTipo, filtroCat, filtroBanco, orden]);

  const proveedoresPagina = proveedoresVisibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const guardar = async (form) => {
    setSaving(true);
    try {
      if (modal === 'crear') {
        await apiService.post('/contable/proveedores', form);
        toast.success('Proveedor creado');
        setModal(null); cargar();
      } else {
        const { nombre: _, ...editable } = form;
        const { data: actualizado } = await apiService.put(`/contable/proveedores/${modal.id}`, editable);
        toast.success('Proveedor actualizado');
        setModal(null); cargar();
        if (perfil?.id === modal.id) setPerfil(actualizado);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const exportarCSV = () => {
    const cols = [
      ['Nombre',          p => p.nombre],
      ['NIT',             p => p.nit],
      ['Email',           p => p.email],
      ['Teléfono',        p => p.telefono],
      ['Tipo de pago',    p => p.tipo_pago],
      ['Frecuencia',      p => p.frecuencia],
      ['Categoría',       p => p.categoria],
      ['Datos bancarios', p => DB_META[p.datos_bancarios_estado || 'sin_datos']?.label],
      ['Fact. pendientes',p => p.facturas_pendientes || 0],
      ['Notas',           p => p.notas],
    ];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      cols.map(([h]) => esc(h)).join(','),
      ...proveedoresVisibles.map(p => cols.map(([, fn]) => esc(fn(p))).join(',')),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `proveedores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFillColor(5, 8, 15);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(129, 140, 248);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('KERNEL — CONTABLE', 14, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(126, 200, 216);
    doc.text('DIRECTORIO DE PROVEEDORES', 14, 16);
    doc.text(hoy, W - 14, 16, { align: 'right' });

    doc.setFontSize(7); doc.setTextColor(160, 212, 224);
    doc.text(`${proveedoresVisibles.length} proveedores`, W - 14, 24, { align: 'right' });

    autoTable(doc, {
      startY: 28,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: [40, 60, 70] },
      headStyles: { fillColor: [15, 23, 42], textColor: [126, 200, 216], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      head: [['PROVEEDOR', 'NIT', 'CATEGORÍA', 'TIPO', 'BANCO', 'FACT. PEND.']],
      body: proveedoresVisibles.map(p => [
        p.nombre,
        p.nit || '—',
        p.categoria || '—',
        p.tipo_pago === 'recurrente' ? `Recurrente${p.frecuencia ? ` · ${p.frecuencia}` : ''}` : 'Único',
        DB_META[p.datos_bancarios_estado || 'sin_datos']?.label,
        p.facturas_pendientes || 0,
      ]),
    });

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(6.5); doc.setTextColor(130, 140, 150);
      doc.text('COOPERATIVA PROGRESEMOS · NIT 891.408.345-1', 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(`Página ${i} de ${pages}`, W - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    }
    doc.save(`proveedores_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-8 h-full">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[6px]" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>PROVEEDORES</h1>
          <p className="text-[#6aacbc] text-[11px] tracking-[3px] mt-0.5">// RECURRENTES · ÚNICOS</p>
        </div>
        <button onClick={() => setModal('crear')}
          className="flex items-center gap-2 px-4 py-2 text-sm tracking-wide rounded-sm border transition-all"
          style={{ borderColor: ACCENT + '55', background: ACCENT + '10', color: ACCENT }}>
          <Plus size={13} /> NUEVO PROVEEDOR
        </button>
      </div>

      {/* Stats */}
      {!loading && (() => {
        const recurrentes = proveedoresVisibles.filter(p => p.tipo_pago === 'recurrente').length;
        const unicos      = proveedoresVisibles.filter(p => p.tipo_pago === 'unico').length;
        const sinBanco    = proveedoresVisibles.filter(p => !p.datos_bancarios_estado || p.datos_bancarios_estado === 'sin_datos').length;
        const verificados = proveedoresVisibles.filter(p => p.datos_bancarios_estado === 'verificado').length;
        const pendFact    = proveedoresVisibles.reduce((s, p) => s + (Number(p.facturas_pendientes) || 0), 0);
        return (
          <div className="flex items-stretch gap-px mb-4 border border-[#818cf81a] rounded-sm overflow-hidden">
            {[
              { label: 'PROVEEDORES', value: proveedoresVisibles.length, color: '#c8e8f0' },
              { label: 'RECURRENTES', value: recurrentes,                color: '#38bdf8' },
              { label: 'ÚNICOS',      value: unicos,                     color: '#a78bfa' },
              { label: 'SIN BANCO',   value: sinBanco,   color: sinBanco   > 0 ? '#fbbf24' : '#4a7a8a' },
              { label: 'VERIFICADOS', value: verificados, color: verificados > 0 ? '#34d399' : '#4a7a8a' },
              { label: 'FACT. PEND.', value: pendFact,   color: pendFact   > 0 ? '#f97316' : '#4a7a8a' },
            ].map(({ label, value, color }, i) => (
              <div key={i} className="flex-1 px-4 py-2.5 bg-[#05080f] flex flex-col gap-0.5">
                <p className="text-[10px] tracking-[2px] text-[#4a7a8a]">{label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Búsqueda + exportar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7ec8d8] opacity-50" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, NIT, categoría, email..."
            className="w-full bg-[#05080f] border border-[#818cf822] rounded-sm pl-8 pr-3 py-2 text-sm text-[#a0d4e0] placeholder-[#7ec8d8]/40 focus:outline-none focus:border-[#818cf855] transition-colors"
          />
        </div>
        <button onClick={exportarCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] tracking-wide rounded-sm border border-[#818cf822] text-[#7ec8d8] hover:border-[#818cf844] hover:text-[#a0d4e0] transition-all">
          <Download size={12} /> CSV
        </button>
        <button onClick={exportarPDF}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] tracking-wide rounded-sm border border-[#818cf822] text-[#7ec8d8] hover:border-[#818cf844] hover:text-[#a0d4e0] transition-all">
          <FileText size={12} /> PDF
        </button>
      </div>

      {/* Barra de filtros integrada */}
      <div className="flex items-center gap-0 mb-5 border border-[#818cf81a] rounded-sm overflow-hidden">
        {/* Tipo */}
        {[['', 'TODOS'], ['recurrente', 'RECURRENTE'], ['unico', 'ÚNICO']].map(([val, lbl]) => {
          const active = filtroTipo === val;
          return (
            <button key={val} onClick={() => setFiltroTipo(val)}
              className="px-3 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap border-r border-[#818cf81a]"
              style={{
                background:   active ? ACCENT + '18' : 'transparent',
                color:        active ? ACCENT : '#4a7a8a',
                fontWeight:   active ? 700 : 400,
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              {lbl}
            </button>
          );
        })}

        <div className="w-px self-stretch bg-[#818cf833] mx-1" />

        {/* Datos bancarios */}
        {[['', 'CUALQUIER BANCO'], ['sin_datos', 'SIN DATOS'], ['pendiente_ci', 'PEND. CI'], ['verificado', 'VERIFICADO']].map(([val, lbl]) => {
          const active = filtroBanco === val;
          const c = val === 'sin_datos' ? '#fbbf24' : val === 'pendiente_ci' ? '#f97316' : val === 'verificado' ? '#34d399' : ACCENT;
          return (
            <button key={val} onClick={() => setFiltroBanco(val)}
              className="px-3 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap border-r border-[#818cf81a]"
              style={{
                background:   active ? c + '18' : 'transparent',
                color:        active ? c : '#4a7a8a',
                fontWeight:   active ? 700 : 400,
                borderBottom: active ? `2px solid ${c}` : '2px solid transparent',
              }}>
              {lbl}
            </button>
          );
        })}

        <div className="w-px self-stretch bg-[#818cf833] mx-1" />

        {/* Categoría */}
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
          className="px-3 py-2.5 text-[11px] tracking-widest bg-transparent transition-all border-0 outline-none cursor-pointer border-r border-[#818cf81a]"
          style={{ color: filtroCat ? ACCENT : '#4a7a8a', borderBottom: filtroCat ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
          <option value="">TODAS LAS CATEGORÍAS</option>
          {categorias.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>

        <div className="w-px self-stretch bg-[#818cf833] mx-1" />

        {/* Orden */}
        {[
          { key: '',             label: 'SIN ORDEN' },
          { key: 'facturas_desc',label: '↓ FACT. PEND.' },
          { key: 'monto_desc',   label: '↓ MONTO PEND.' },
          { key: 'nombre_asc',   label: 'A → Z' },
        ].map(({ key, label }) => {
          const active = orden === key;
          return (
            <button key={key} onClick={() => setOrden(key)}
              className="px-3 py-2.5 text-[11px] tracking-widest transition-all whitespace-nowrap border-r border-[#818cf81a]"
              style={{
                background:   active ? ACCENT + '18' : 'transparent',
                color:        active ? ACCENT : '#4a7a8a',
                fontWeight:   active ? 700 : 400,
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-center text-[#6aacbc] text-sm tracking-widest animate-pulse py-16">CARGANDO...</p>}

      {!loading && proveedoresVisibles.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#818cf822] rounded-sm">
          <Building2 size={28} color={ACCENT} className="mx-auto mb-3 opacity-40" />
          <p className="text-[#6aacbc] text-sm tracking-widest">SIN RESULTADOS</p>
        </div>
      )}

      {!loading && proveedoresVisibles.length > 0 && (
        <div className="space-y-2">
          {proveedoresPagina.map(p => {
            const chip    = TIPO_CHIP[p.tipo_pago];
            const dbKey   = p.datos_bancarios_estado || 'sin_datos';
            const db      = DB_META[dbKey];
            const pendientes = Number(p.facturas_pendientes) || 0;
            return (
              <button key={p.id} onClick={() => setPerfil(p)}
                className="w-full text-left px-5 py-4 rounded-sm border border-[#818cf818] bg-[#818cf805] hover:border-[#818cf840] hover:bg-[#818cf80a] transition-all cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-base font-semibold text-[#c8e8f0] leading-tight">{p.nombre}</span>
                      <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border shrink-0"
                        style={{ color: chip.color, borderColor: chip.color + '44', background: chip.color + '11' }}>
                        {chip.label}{p.tipo_pago === 'recurrente' && p.frecuencia ? ` · ${p.frecuencia.toUpperCase()}` : ''}
                      </span>
                      {pendientes > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#f9731622] text-[#f97316] shrink-0">
                          {pendientes} pend.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.categoria && <span className="text-xs text-[#7ec8d8]">{p.categoria}</span>}
                      {p.nit       && <span className="text-xs text-[#7ec8d8] opacity-50">NIT {p.nit}</span>}
                      {p.email     && <span className="text-xs text-[#7ec8d8] opacity-40">{p.email}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-sm border shrink-0"
                    style={{ color: db.text, borderColor: db.color, background: db.color + '22' }}>
                    {db.label}
                  </span>
                </div>
              </button>
            );
          })}
          <Paginacion total={proveedoresVisibles.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
        </div>
      )}

      {modal && (
        <Modal titulo={modal === 'crear' ? 'NUEVO PROVEEDOR' : 'EDITAR PROVEEDOR'} onClose={() => setModal(null)}>
          <FormProveedor inicial={modal !== 'crear' ? modal : null} onSave={guardar} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}

      {perfil && (
        <PerfilProveedor proveedor={perfil} apiBase="/contable" accent={ACCENT}
          onClose={() => setPerfil(null)} onEdit={p => { setPerfil(null); setModal(p); }} onDatosBancarios={p => setBancario(p)} />
      )}

      {bancario && (
        <DatosBancariosModal proveedor={bancario} onClose={() => setBancario(null)} />
      )}
    </div>
  );
}
