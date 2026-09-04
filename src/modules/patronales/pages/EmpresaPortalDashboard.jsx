import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileText, LogOut, AlertTriangle, CheckCircle,
  ChevronRight, Loader2, Key,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEmpresa } from '../../../context/EmpresaContext.jsx';
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

// ── Cambiar contraseña ──────────────────────────────────────────────────────────
function CambiarPassword({ onCerrar }) {
  const { refreshMe } = useEmpresa();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ password_actual: '', password_nueva: '', confirmar: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password_nueva !== form.confirmar) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    try {
      await apiService.put('/patronales/portal/cambiar-password', {
        password_actual: form.password_actual,
        password_nueva:  form.password_nueva,
      });
      toast.success('Contraseña actualizada');
      await refreshMe();
      if (onCerrar) onCerrar();
      else navigate('/portal-empresa');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#08101e] border border-[#f59e0b33] rounded-sm p-6 w-full max-w-sm relative" style={{ boxShadow: '0 0 40px #f59e0b11' }}>
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f59e0b]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f59e0b]" />
        <div className="flex items-center gap-2 mb-5">
          <Key size={14} className="text-[#f59e0b]" />
          <p className="text-[#f59e0b] font-bold text-sm tracking-widest">CAMBIAR CONTRASEÑA</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {['password_actual', 'password_nueva', 'confirmar'].map((field) => (
            <div key={field}>
              <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">
                {field === 'password_actual' ? 'CONTRASEÑA ACTUAL' : field === 'password_nueva' ? 'NUEVA CONTRASEÑA' : 'CONFIRMAR NUEVA'}
              </label>
              <input
                type="password"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
                minLength={field === 'password_nueva' ? 8 : 1}
                className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end mt-2">
            {onCerrar && (
              <button type="button" onClick={onCerrar} className="text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] px-4 py-2 tracking-widest">
                CANCELAR
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />} GUARDAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function EmpresaPortalDashboard() {
  const { empresa, logout } = useEmpresa();
  const [facturas,    setFacturas]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCambio,  setShowCambio]  = useState(empresa?.primer_login ?? false);
  const [detalle,     setDetalle]     = useState(null);    // id de factura expandida
  const [detalleData, setDetalleData] = useState({});      // { [id]: { ...factura, detalle[] } }
  const [loadingDet,  setLoadingDet]  = useState(null);    // id cargando

  useEffect(() => {
    apiService.get('/patronales/portal/facturas')
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, []);

  const cargarDetalle = async (id) => {
    if (detalleData[id]) return; // ya cargado
    setLoadingDet(id);
    try {
      const { data } = await apiService.get(`/patronales/portal/facturas/${id}`);
      setDetalleData((prev) => ({ ...prev, [id]: data }));
    } catch {
      toast.error('Error al cargar el detalle');
    } finally {
      setLoadingDet(null);
    }
  };

  const toggleDetalle = (id) => {
    if (detalle === id) { setDetalle(null); return; }
    setDetalle(id);
    cargarDetalle(id);
  };

  const pendientes = facturas.filter((f) => ['pendiente', 'pago_parcial', 'vencida'].includes(f.estado));
  const vencidas   = facturas.filter((f) => f.estado === 'vencida');

  return (
    <div className="min-h-screen bg-[#05080f] font-mono">
      {/* Navbar */}
      <header className="bg-[#08101e] border-b border-[#f59e0b22] px-8 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#f59e0b] font-bold tracking-[4px]" style={{ textShadow: '0 0 12px #f59e0b44' }}>KERNEL</p>
          <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">// PORTAL EMPRESAS · {empresa?.nombre?.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCambio(true)}
            className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#f59e0b] tracking-widest transition-colors"
          >
            <Key size={11} /> CAMBIAR CONTRASEÑA
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] border border-[#ff3d3d22] hover:border-[#ff3d3d55] px-2 py-1.5 rounded-sm transition-all tracking-widest"
          >
            <LogOut size={11} /> CERRAR SESIÓN
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Alertas */}
        {vencidas.length > 0 && (
          <div className="flex items-center gap-3 bg-[#ff3d3d08] border border-[#ff3d3d33] rounded-sm px-4 py-3 mb-6">
            <AlertTriangle size={14} className="text-[#ff3d3d] shrink-0" />
            <p className="text-[#ff3d3d] text-[10px] tracking-wider">
              Tienes {vencidas.length} factura{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}.
              Comunícate con la cooperativa para ponerte al día.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'FACTURAS PENDIENTES', valor: pendientes.length,  color: '#f59e0b', icon: FileText },
            { label: 'FACTURAS VENCIDAS',   valor: vencidas.length,    color: '#ff3d3d', icon: AlertTriangle, alerta: vencidas.length > 0 },
            { label: 'FACTURAS PAGADAS',    valor: facturas.filter((f) => f.estado === 'pagada').length, color: '#22c55e', icon: CheckCircle },
          ].map(({ label, valor, color, icon: Icon, alerta }) => (
            <div key={label} className="bg-[#08101e] border rounded-sm px-4 py-4" style={{ borderColor: alerta ? '#ff3d3d22' : '#f59e0b11' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color: alerta ? '#ff3d3d' : color }} />
                <p className="text-[#6aacbc] text-[9px] tracking-widest">{label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: alerta ? '#ff3d3d' : color }}>{valor}</p>
            </div>
          ))}
        </div>

        {/* Listado */}
        <p className="text-[#6aacbc] text-[9px] tracking-[3px] mb-4">// MIS FACTURAS</p>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[#f59e0b44]" /></div>
        ) : facturas.length === 0 ? (
          <p className="text-[#6aacbc] text-[10px] tracking-widest text-center py-12">SIN FACTURAS</p>
        ) : (
          <div className="flex flex-col gap-2">
            {facturas.map((f) => {
              const c      = estadoColor(f.estado);
              const abierto = detalle === f.id;
              const datos  = detalleData[f.id];
              const runLabel = f.tipo_cuota === 'quincenal' && f.quincena
                ? `QUINCENAL Q${f.quincena}`
                : f.tipo_cuota.toUpperCase();
              return (
                <div key={f.id} className="bg-[#08101e] border border-[#f59e0b11] hover:border-[#f59e0b22] rounded-sm transition-all">
                  <button
                    onClick={() => toggleDetalle(f.id)}
                    className="w-full px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <FileText size={14} className="text-[#f59e0b] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className="text-[#a0d4e0] font-mono">{f.periodo}</span>
                          <span className="text-[9px] px-1.5 py-0.5 border tracking-wider" style={{ color: c.text, borderColor: c.border, background: c.bg }}>
                            {f.estado.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-[#6aacbc] text-[9px]">{runLabel}</span>
                          {f.dias_mora > 0 && (
                            <span className="flex items-center gap-1 text-[#ff3d3d] text-[9px]">
                              <AlertTriangle size={9} /> {f.dias_mora} DÍAS MORA
                            </span>
                          )}
                        </div>
                        <div className="flex gap-5 text-[9px] text-[#6aacbc] tracking-widest">
                          <span>TOTAL: <span className="text-[#a0d4e0] tabular-nums">{fmt(f.monto_total)}</span></span>
                          <span>PAGADO: <span className="text-[#22c55e] tabular-nums">{fmt(f.total_pagado)}</span></span>
                          <span>SALDO: <span className="text-[#f59e0b] tabular-nums">{fmt(f.saldo)}</span></span>
                          <span>VTO: {f.fecha_vencimiento}</span>
                        </div>
                      </div>
                      {loadingDet === f.id
                        ? <Loader2 size={12} className="animate-spin text-[#f59e0b44] shrink-0" />
                        : <ChevronRight size={12} className={`shrink-0 transition-transform text-[#f59e0b44] ${abierto ? 'rotate-90' : ''}`} />}
                    </div>
                  </button>

                  {/* Detalle expandido */}
                  {abierto && datos && (
                    <div className="border-t border-[#f59e0b0a] overflow-x-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="bg-[#060d18] text-[#6aacbc] tracking-widest">
                            <th className="px-5 py-2 text-left">ASOCIADO</th>
                            {datos.detalle?.[0]?.conceptos
                              ? datos.detalle[0].conceptos.map((c) => (
                                  <th key={c.codigo} className="px-4 py-2 text-right">{c.codigo}</th>
                                ))
                              : <>
                                  <th className="px-4 py-2 text-right">CUOTA</th>
                                  <th className="px-4 py-2 text-right">APORTE</th>
                                </>
                            }
                            <th className="px-4 py-2 text-right">SUBTOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datos.detalle?.map((d, i) => {
                            const esV2   = d.conceptos != null;
                            const total  = esV2
                              ? d.conceptos.reduce((s, c) => s + (c.monto ?? 0), 0)
                              : parseFloat(d.valor_aporte_snapshot ?? 0) +
                                (String(d.clase_cuota_snapshot).startsWith('2')
                                  ? parseFloat(d.valor_aporte_snapshot ?? 0)
                                  : 0) +
                                parseFloat(d.bonos_monto ?? 0);
                            return (
                              <tr key={d.asociado_codigo} className={`border-t border-[#f59e0b06] ${i % 2 === 0 ? '' : 'bg-[#f59e0b03]'}`}>
                                <td className="px-5 py-2.5">
                                  <span className="text-[#a0d4e0]">{d.nombre_snapshot}</span>
                                  <span className="ml-2 text-[#4a6a7a] text-[8px]">{d.asociado_codigo}</span>
                                </td>
                                {esV2
                                  ? d.conceptos.map((c) => (
                                      <td key={c.codigo} className="px-4 py-2.5 text-right tabular-nums text-[#a0d4e0]">
                                        {fmt(c.monto)}
                                      </td>
                                    ))
                                  : <>
                                      <td className="px-4 py-2.5 text-right tabular-nums text-[#00e5ff]">
                                        {d.bonos_monto > 0 ? fmt(d.bonos_monto) : '—'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right tabular-nums text-[#a0d4e0]">
                                        {fmt(d.valor_aporte_snapshot)}
                                      </td>
                                    </>
                                }
                                <td className="px-4 py-2.5 text-right tabular-nums text-[#f59e0b] font-bold">
                                  {fmt(total)}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Total */}
                          <tr className="border-t border-[#f59e0b22] bg-[#f59e0b08]">
                            <td
                              colSpan={1 + (datos.detalle?.[0]?.conceptos?.length ?? 2)}
                              className="px-5 py-2 text-[#f59e0b] tracking-widest text-[9px]"
                            >
                              TOTAL FACTURA
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-[#f59e0b] font-bold">
                              {fmt(f.monto_total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCambio && <CambiarPassword onCerrar={empresa?.primer_login ? undefined : () => setShowCambio(false)} />}
    </div>
  );
}
