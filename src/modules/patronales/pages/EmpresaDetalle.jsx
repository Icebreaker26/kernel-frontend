import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Building2, Users, FileText, Settings, Globe,
  Loader2, Save, Key, AlertCircle, CheckCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#f59e0b';

const estadoColor = (estado) => ({
  pendiente:    { border: '#f59e0b44', text: '#f59e0b',  bg: '#f59e0b11' },
  pago_parcial: { border: '#3b82f644', text: '#3b82f6',  bg: '#3b82f611' },
  vencida:      { border: '#ff3d3d44', text: '#ff3d3d',  bg: '#ff3d3d11' },
  pagada:       { border: '#22c55e44', text: '#22c55e',  bg: '#22c55e11' },
  anulada:      { border: '#6b728044', text: '#6b7280',  bg: '#6b728011' },
}[estado] ?? { border: '#6b728044', text: '#6b7280', bg: '#6b728011' });

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const TabBtn = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-widest border-b-2 transition-all ${
      active
        ? 'border-[#f59e0b] text-[#f59e0b]'
        : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0]'
    }`}
  >
    {label}
    {count != null && (
      <span className={`text-[8px] px-1.5 py-0.5 rounded-sm ${active ? 'bg-[#f59e0b22] text-[#f59e0b]' : 'bg-[#0d1829] text-[#6aacbc]'}`}>
        {count}
      </span>
    )}
  </button>
);

// ── Tab Asociados ──────────────────────────────────────────────────────────────
const TabAsociados = ({ asociados, empresaCodigo, onAporteActualizado }) => {
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState({ valor_aporte: '', fecha_desde: '', motivo: '', soporte: '' });
  const [saving, setSaving]     = useState(false);

  const guardarAporte = async (codigo) => {
    setSaving(true);
    try {
      await apiService.put(`/patronales/asociados/${codigo}/aporte`, {
        valor_aporte: parseFloat(form.valor_aporte),
        fecha_desde:  form.fecha_desde,
        motivo:       form.motivo,
        soporte:      form.soporte || undefined,
      });
      toast.success('Aporte actualizado');
      setEditando(null);
      onAporteActualizado();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {asociados.map((a) => (
        <div key={a.codigo} className="bg-[#08101e] border border-[#f59e0b11] rounded-sm px-4 py-3">
          {editando === a.codigo ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[#a0d4e0] text-sm font-medium">{a.nombre_completo}</span>
                <span className="text-[#6aacbc] text-[9px] tracking-widest">{a.codigo}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1 block">APORTE MENSUAL (COP) *</label>
                  <input
                    type="number"
                    value={form.valor_aporte}
                    onChange={(e) => setForm({ ...form, valor_aporte: e.target.value })}
                    className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-1.5 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1 block">APLICA DESDE *</label>
                  <input
                    type="date"
                    value={form.fecha_desde}
                    onChange={(e) => setForm({ ...form, fecha_desde: e.target.value })}
                    className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-1.5 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1 block">MOTIVO *</label>
                  <input
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-1.5 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1 block">SOPORTE</label>
                  <input
                    value={form.soporte}
                    onChange={(e) => setForm({ ...form, soporte: e.target.value })}
                    placeholder="Ref. documento"
                    className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-1.5 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => guardarAporte(a.codigo)}
                  disabled={saving || !form.valor_aporte || !form.fecha_desde || !form.motivo}
                  className="flex items-center gap-1.5 text-[10px] tracking-widest border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] px-3 py-1.5 rounded-sm transition-all"
                >
                  {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} GUARDAR
                </button>
                <button onClick={() => setEditando(null)} className="text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] tracking-widest px-3">
                  CANCELAR
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[#a0d4e0] text-sm">{a.nombre_completo}</span>
                  <span className="text-[#6aacbc] text-[9px]">{a.codigo}</span>
                  <span className="text-[#6aacbc] text-[9px] border border-[#6aacbc22] px-1.5 py-0.5">
                    {a.clase_cuota === '1' ? 'QUINCENAL' : 'MENSUAL'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[#f59e0b] text-sm font-bold tabular-nums">
                    {a.valor_aporte != null ? fmt(a.valor_aporte) : <span className="text-[#ff3d3d] text-[9px]">SIN APORTE</span>}
                  </span>
                  {a.valor_aporte_desde && (
                    <span className="text-[#6aacbc] text-[9px] tracking-widest">desde {a.valor_aporte_desde}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setEditando(a.codigo); setForm({ valor_aporte: a.valor_aporte ?? '', fecha_desde: a.valor_aporte_desde ?? '', motivo: '', soporte: '' }); }}
                className="text-[9px] text-[#6aacbc] hover:text-[#f59e0b] tracking-widest border border-[#f59e0b11] hover:border-[#f59e0b33] px-2 py-1 rounded-sm transition-all"
              >
                EDITAR
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Tab Config ─────────────────────────────────────────────────────────────────
const TabConfig = ({ empresa, onActualizado }) => {
  const [form,   setForm]   = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!empresa) return;
    setForm({
      facturacion:      empresa.facturacion      ?? 'unica',
      dias_vencimiento: empresa.dias_vencimiento ?? 30,
      email_contacto:   empresa.email_contacto   ?? '',
      activa:           empresa.activa           ?? true,
    });
  }, [empresa]);

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.put(`/patronales/empresas/${empresa.codigo}/config`, {
        ...form,
        dias_vencimiento: parseInt(form.dias_vencimiento),
        activa: Boolean(form.activa),
      });
      toast.success('Configuración guardada');
      onActualizado();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <form onSubmit={guardar} className="max-w-md flex flex-col gap-4">
      <div>
        <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">TIPO DE FACTURACIÓN</label>
        <select
          value={form.facturacion}
          onChange={(e) => setForm({ ...form, facturacion: e.target.value })}
          className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
        >
          <option value="unica">Factura única (mixta)</option>
          <option value="separada">Separada por tipo de cuota</option>
        </select>
      </div>
      <div>
        <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">DÍAS PARA VENCIMIENTO</label>
        <input
          type="number" min={1} max={365}
          value={form.dias_vencimiento}
          onChange={(e) => setForm({ ...form, dias_vencimiento: e.target.value })}
          className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
        />
      </div>
      <div>
        <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">EMAIL DE CONTACTO</label>
        <input
          type="email"
          value={form.email_contacto}
          onChange={(e) => setForm({ ...form, email_contacto: e.target.value })}
          className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="activa"
          checked={form.activa}
          onChange={(e) => setForm({ ...form, activa: e.target.checked })}
          className="accent-[#f59e0b]"
        />
        <label htmlFor="activa" className="text-[#a0d4e0] text-[10px] tracking-widest cursor-pointer">
          ACTIVA PARA FACTURACIÓN
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 self-start border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        GUARDAR CONFIG
      </button>
    </form>
  );
};

// ── Tab Portal ─────────────────────────────────────────────────────────────────
const TabPortal = ({ empresa, onActualizado }) => {
  const [email,    setEmail]   = useState('');
  const [saving,   setSaving]  = useState(false);
  const [creds,    setCreds]   = useState(null);

  const activar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiService.post(`/patronales/empresas/${empresa.codigo}/portal`, { email });
      setCreds(data);
      toast.success('Portal activado');
      onActualizado();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al activar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      {empresa.portal_activo && !creds && (
        <div className="flex items-center gap-2 mb-5 bg-[#22c55e11] border border-[#22c55e33] rounded-sm px-4 py-3">
          <CheckCircle size={14} className="text-[#22c55e]" />
          <div>
            <p className="text-[#22c55e] text-[10px] tracking-widest font-bold">PORTAL ACTIVO</p>
            <p className="text-[#6aacbc] text-[9px] mt-0.5">Email: {empresa.portal_email}</p>
          </div>
        </div>
      )}

      {creds && (
        <div className="mb-5 bg-[#f59e0b11] border border-[#f59e0b33] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-[#f59e0b]" />
            <p className="text-[#f59e0b] text-[10px] tracking-widest font-bold">CREDENCIALES GENERADAS</p>
          </div>
          <div className="flex flex-col gap-2 text-[10px] font-mono">
            <div><span className="text-[#6aacbc] tracking-widest">EMAIL:</span> <span className="text-[#a0d4e0]">{creds.email}</span></div>
            <div><span className="text-[#6aacbc] tracking-widest">CONTRASEÑA:</span> <span className="text-[#f59e0b] font-bold">{creds.password}</span></div>
          </div>
          <p className="text-[#6aacbc] text-[9px] mt-3">Comparte estas credenciales con la empresa. La contraseña no se volverá a mostrar.</p>
        </div>
      )}

      <form onSubmit={activar} className="flex flex-col gap-4">
        <div>
          <label className="text-[#6aacbc] text-[9px] tracking-widest mb-1.5 block">
            {empresa.portal_activo ? 'REACTIVAR / CAMBIAR EMAIL' : 'EMAIL DE ACCESO'}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            required
            className="w-full bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] font-mono"
          />
        </div>
        <div className="flex items-start gap-2 bg-[#ff3d3d08] border border-[#ff3d3d22] rounded-sm p-3">
          <AlertCircle size={12} className="text-[#ff3d3d] mt-0.5 shrink-0" />
          <p className="text-[#6aacbc] text-[9px] tracking-wider">
            {empresa.portal_activo
              ? 'Reactivar genera una nueva contraseña. El acceso anterior queda invalidado.'
              : 'Se generará una contraseña temporal. La empresa debe cambiarla en su primer ingreso.'}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 self-start border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
          {empresa.portal_activo ? 'REACTIVAR PORTAL' : 'ACTIVAR PORTAL'}
        </button>
      </form>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EmpresaDetalle() {
  const { codigo } = useParams();
  const navigate   = useNavigate();
  const [empresa,  setEmpresa]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('asociados');

  const cargar = () =>
    apiService.get(`/patronales/empresas/${codigo}`)
      .then(({ data }) => setEmpresa(data))
      .catch(() => toast.error('Error al cargar empresa'))
      .finally(() => setLoading(false));

  useEffect(() => { cargar(); }, [codigo]);

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-[#f59e0b44]" /></div>
  );
  if (!empresa) return (
    <div className="p-8 text-[#ff3d3d] text-sm tracking-widest">EMPRESA NO ENCONTRADA</div>
  );

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/patronales/empresas')}
        className="flex items-center gap-1.5 text-[#6aacbc] hover:text-[#f59e0b] text-[9px] tracking-widest mb-5 transition-colors"
      >
        <ChevronLeft size={11} /> EMPRESAS
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-[#08101e] border border-[#f59e0b22] rounded-sm">
          <Building2 size={20} className="text-[#f59e0b]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#a0d4e0] tracking-wider">{empresa.nombre}</h1>
          <div className="flex items-center gap-3 mt-1 text-[9px] tracking-widest text-[#6aacbc]">
            <span>{empresa.codigo}</span>
            {empresa.portal_activo && (
              <span className="flex items-center gap-1 text-[#22c55e]"><Globe size={9} /> PORTAL ACTIVO</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#f59e0b11] flex gap-1 mb-6">
        <TabBtn label="ASOCIADOS"   active={tab === 'asociados'} onClick={() => setTab('asociados')} count={empresa.asociados?.length} />
        <TabBtn label="FACTURAS"    active={tab === 'facturas'}  onClick={() => setTab('facturas')}  count={empresa.facturas?.length} />
        <TabBtn label="CONFIG"      active={tab === 'config'}    onClick={() => setTab('config')} />
        <TabBtn label="PORTAL"      active={tab === 'portal'}    onClick={() => setTab('portal')} />
      </div>

      {/* Tab content */}
      {tab === 'asociados' && (
        empresa.asociados?.length === 0
          ? <p className="text-[#6aacbc] text-[10px] tracking-widest py-8">SIN ASOCIADOS ACTIVOS</p>
          : <TabAsociados asociados={empresa.asociados} empresaCodigo={codigo} onAporteActualizado={cargar} />
      )}

      {tab === 'facturas' && (
        empresa.facturas?.length === 0
          ? <p className="text-[#6aacbc] text-[10px] tracking-widest py-8">SIN FACTURAS</p>
          : (
            <div className="flex flex-col gap-2">
              {empresa.facturas.map((f) => {
                const c = estadoColor(f.estado);
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/patronales/facturas/${f.id}`)}
                    className="bg-[#08101e] border border-[#f59e0b11] hover:border-[#f59e0b33] rounded-sm px-4 py-3 text-left flex items-center gap-4 transition-all group"
                  >
                    <FileText size={14} className="text-[#f59e0b] shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[#a0d4e0] text-sm font-mono">{f.periodo}</span>
                        <span className="text-[9px] px-1.5 py-0.5 border tracking-wider" style={{ color: c.text, borderColor: c.border, background: c.bg }}>
                          {f.estado.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[#6aacbc] text-[9px]">{f.tipo_cuota.toUpperCase()}</span>
                        {f.dias_mora > 0 && <span className="text-[#ff3d3d] text-[9px]">{f.dias_mora} DÍAS MORA</span>}
                      </div>
                      <div className="flex gap-4 text-[9px] text-[#6aacbc] tracking-widest">
                        <span>TOTAL: <span className="text-[#a0d4e0] tabular-nums">{Number(f.monto_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span></span>
                        <span>PAGADO: <span className="text-[#22c55e] tabular-nums">{Number(f.total_pagado).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span></span>
                        <span>VTO: {f.fecha_vencimiento}</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-[#f59e0b44] group-hover:text-[#f59e0b] transition-colors" />
                  </button>
                );
              })}
            </div>
          )
      )}

      {tab === 'config' && <TabConfig empresa={empresa} onActualizado={cargar} />}
      {tab === 'portal' && <TabPortal empresa={empresa} onActualizado={cargar} />}
    </div>
  );
}
