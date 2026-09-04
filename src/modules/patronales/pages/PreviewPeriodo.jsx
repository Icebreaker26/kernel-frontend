import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, ChevronDown, ChevronRight, Zap,
  Building2, Loader2, AlertCircle, CheckCircle2, ExternalLink, Search, X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const periodoActual = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
};

const RUNS = [
  { id: 1,    label: 'Q1', desc: 'Quincenal 1ª quincena' },
  { id: 2,    label: 'Q2', desc: 'Quincenal 2ª quincena' },
  { id: null, label: 'MENSUAL', desc: 'Asociados mensuales' },
];

function AsociadosList({ asociados }) {
  const navigate  = useNavigate();
  const [abierto, setAbierto] = useState({});
  const toggle = (cod) => setAbierto((p) => ({ ...p, [cod]: !p[cod] }));

  return (
    <div className="divide-y divide-[#f59e0b06]">
      {asociados.map((a) => {
        const open = !!abierto[a.codigo];
        const tipo = String(a.clase_cuota).startsWith('2') ? 'QUINCENAL' : 'MENSUAL';
        return (
          <div key={a.codigo}>
            <div className="flex items-center gap-2 hover:bg-[#f59e0b04] transition-colors">
              <button
                onClick={() => toggle(a.codigo)}
                className="flex-1 flex items-center gap-3 px-5 py-3 text-left"
              >
                {open
                  ? <ChevronDown size={12} className="text-[#f59e0b66] shrink-0" />
                  : <ChevronRight size={12} className="text-[#4a6a7a] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-[#a0d4e0] text-sm font-mono">{a.nombre_completo}</span>
                  <span className="ml-3 text-[#4a6a7a] text-xs">CC {a.codigo}</span>
                </div>
                <span className="text-[9px] text-[#4a6a7a] tracking-widest shrink-0 mr-3">{tipo}</span>
                <span className="text-[#f59e0b] font-mono tabular-nums text-sm shrink-0 w-28 text-right">
                  {fmt(a.total)}
                </span>
              </button>
              <button
                onClick={() => navigate(`/asociados/${a.codigo}`)}
                title="Ver perfil"
                className="px-3 py-3 text-[#4a6a7a] hover:text-[#f59e0b] transition-colors shrink-0"
              >
                <ExternalLink size={13} />
              </button>
            </div>
            {open && (
              <div className="px-12 pb-3 pt-1 flex flex-col gap-1.5 bg-[#f59e0b03]">
                {a.conceptos?.map((c) => (
                  <div key={c.codigo} className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-[#6aacbc]">
                      {c.nombre}
                      <span className="ml-2 text-[#4a6a7a] text-[9px]">{c.codigo}</span>
                    </span>
                    <span className="text-[#a0d4e0] tabular-nums">{fmt(c.monto)}</span>
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

export default function PreviewPeriodo() {
  const navigate = useNavigate();
  const [periodo,  setPeriodo]  = useState(periodoActual());
  const [quincena, setQuincena] = useState(1);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState({});
  const [causing,  setCausing]  = useState(null); // 'lote' | empresa_codigo
  const [busqueda, setBusqueda] = useState('');

  const cargarPreview = async () => {
    if (!periodo.match(/^\d{4}-\d{2}$/)) {
      toast.error('Formato de período inválido (YYYY-MM)');
      return;
    }
    setLoading(true);
    setData(null);
    setExpanded({});
    setBusqueda('');
    try {
      const params = new URLSearchParams({ periodo });
      if (quincena != null) params.set('quincena', quincena);
      const { data: res } = await apiService.get(`/patronales/preview?${params}`);
      setData(res);
    } catch {
      toast.error('Error al cargar preview');
    } finally {
      setLoading(false);
    }
  };

  const causarLote = async () => {
    if (!data) return;
    const porCausar = data.empresas.filter((e) => !e.ya_causada).length;
    if (!porCausar) return;

    setCausing('lote');
    try {
      const body = { periodo };
      if (quincena != null) body.quincena = quincena;
      const { data: res } = await apiService.post('/patronales/causar', body);
      const creadas = res.results.filter((r) => r.created).length;
      toast.success(`${creadas} factura${creadas !== 1 ? 's' : ''} generada${creadas !== 1 ? 's' : ''}`);
      await cargarPreview();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al causar');
    } finally {
      setCausing(null);
    }
  };

  const causarEmpresa = async (codigo, nombre) => {
    setCausing(codigo);
    try {
      const body = { periodo };
      if (quincena != null) body.quincena = quincena;
      await apiService.post(`/patronales/empresas/${codigo}/causar`, body);
      toast.success(`Factura generada — ${nombre}`);
      await cargarPreview();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al causar empresa');
    } finally {
      setCausing(null);
    }
  };

  const toggleEmpresa = (codigo) =>
    setExpanded((prev) => ({ ...prev, [codigo]: !prev[codigo] }));

  const porCausar   = data?.empresas.filter((e) => !e.ya_causada).length ?? 0;
  const yaCausadas  = data?.empresas.filter((e) => e.ya_causada).length ?? 0;

  const q = busqueda.trim().toLowerCase();
  const empresasFiltradas = data?.empresas.map((emp) => {
    if (!q) return emp;
    const asocFiltrados = emp.asociados.filter(
      (a) => a.nombre_completo.toLowerCase().includes(q) || a.codigo.includes(q)
    );
    if (!asocFiltrados.length) return null;
    return { ...emp, asociados: asocFiltrados };
  }).filter(Boolean) ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[#6aacbc] text-[9px] tracking-[3px] mb-5">// PREVIEW · PROYECCIÓN EN VIVO</p>

      {/* Controles */}
      <div className="bg-[#08101e] border border-[#f59e0b22] rounded-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest mb-2 block">PERÍODO</label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-[#0d1829] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono w-40"
            />
          </div>
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest mb-2 block">TIPO DE RUN</label>
            <div className="flex gap-1">
              {RUNS.map((r) => (
                <button
                  key={String(r.id)}
                  onClick={() => setQuincena(r.id)}
                  title={r.desc}
                  className={`px-3 py-2 text-[10px] tracking-widest rounded-sm border transition-all ${
                    quincena === r.id
                      ? 'border-[#f59e0b] bg-[#f59e0b11] text-[#f59e0b]'
                      : 'border-[#f59e0b22] text-[#6aacbc] hover:border-[#f59e0b44] hover:text-[#a0d4e0]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={cargarPreview}
            disabled={loading}
            className="flex items-center gap-2 border border-[#f59e0b55] bg-[#f59e0b11] hover:bg-[#f59e0b] hover:text-black disabled:opacity-40 text-[#f59e0b] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            CARGAR PREVIEW
          </button>
        </div>
      </div>

      {/* Resultado */}
      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'TOTAL PROYECTADO', valor: fmt(data.total_global), color: '#f59e0b' },
              { label: 'EMPRESAS',         valor: data.empresas.length,   color: '#a0d4e0' },
              { label: 'POR CAUSAR',       valor: porCausar,              color: porCausar > 0 ? '#22c55e' : '#4a6a7a' },
              { label: 'YA CAUSADAS',      valor: yaCausadas,             color: '#6aacbc' },
            ].map(({ label, valor, color }) => (
              <div key={label} className="bg-[#08101e] border border-[#f59e0b11] rounded-sm px-4 py-3">
                <p className="text-[#6aacbc] text-[8px] tracking-widest mb-1">{label}</p>
                <p className="text-lg font-bold font-mono tabular-nums" style={{ color }}>{valor}</p>
              </div>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6a7a]" />
            <input
              type="text"
              placeholder="Buscar por nombre o CC..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                if (e.target.value) setExpanded(
                  Object.fromEntries((data?.empresas ?? []).map((e) => [e.empresa_codigo, true]))
                );
              }}
              className="w-full bg-[#08101e] border border-[#f59e0b22] rounded-sm pl-9 pr-9 py-2 text-sm text-[#a0d4e0] placeholder-[#4a6a7a] focus:outline-none focus:border-[#f59e0b55] font-mono"
            />
            {busqueda && (
              <button
                onClick={() => { setBusqueda(''); setExpanded({}); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6a7a] hover:text-[#a0d4e0]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Botón causar todo */}
          {porCausar > 0 && !busqueda && (
            <div className="flex justify-end mb-4">
              <button
                onClick={causarLote}
                disabled={causing === 'lote'}
                className="flex items-center gap-2 border border-[#22c55e55] bg-[#22c55e11] hover:bg-[#22c55e] hover:text-black disabled:opacity-40 text-[#22c55e] text-[10px] px-5 py-2.5 rounded-sm transition-all tracking-widest"
              >
                {causing === 'lote'
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Zap size={12} />}
                CAUSAR TODO ({porCausar} empresa{porCausar !== 1 ? 's' : ''})
              </button>
            </div>
          )}

          {/* Lista de empresas */}
          <div className="flex flex-col gap-2">
            {empresasFiltradas.map((emp) => (
              <div
                key={emp.empresa_codigo}
                className="bg-[#08101e] border rounded-sm overflow-hidden transition-colors"
                style={{ borderColor: emp.ya_causada ? '#f59e0b11' : '#22c55e22' }}
              >
                {/* Fila empresa */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f59e0b05] transition-colors"
                  onClick={() => toggleEmpresa(emp.empresa_codigo)}
                >
                  {expanded[emp.empresa_codigo]
                    ? <ChevronDown size={13} className="text-[#f59e0b] shrink-0" />
                    : <ChevronRight size={13} className="text-[#6aacbc] shrink-0" />}
                  <Building2 size={13} className="text-[#6aacbc] shrink-0" />
                  <span className="flex-1 text-[#a0d4e0] text-sm font-medium tracking-wide truncate">
                    {emp.empresa_nombre}
                  </span>
                  <span className="text-[9px] text-[#6aacbc] tracking-widest shrink-0">
                    {emp.asociados.length} asoc. · <span className="text-[#f59e0b44]">ver detalle</span>
                  </span>
                  <span className="text-[#f59e0b] font-bold font-mono tabular-nums text-sm shrink-0 w-28 text-right">
                    {fmt(emp.total_empresa)}
                  </span>
                  {emp.ya_causada ? (
                    <span className="flex items-center gap-1 text-[8px] text-[#6aacbc] tracking-widest border border-[#6aacbc22] px-2 py-0.5 rounded-sm shrink-0 ml-3">
                      <CheckCircle2 size={9} /> YA CAUSADA
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); causarEmpresa(emp.empresa_codigo, emp.empresa_nombre); }}
                      disabled={!!causing}
                      className="flex items-center gap-1.5 text-[8px] tracking-widest border border-[#22c55e44] bg-[#22c55e0a] hover:bg-[#22c55e] hover:text-black disabled:opacity-40 text-[#22c55e] px-2.5 py-1 rounded-sm transition-all shrink-0 ml-3"
                    >
                      {causing === emp.empresa_codigo
                        ? <Loader2 size={9} className="animate-spin" />
                        : <Zap size={9} />}
                      CAUSAR
                    </button>
                  )}
                </button>

                {/* Detalle asociados — renglones desplegables */}
                {expanded[emp.empresa_codigo] && (
                  <div className="border-t border-[#f59e0b0a]">
                    <AsociadosList asociados={emp.asociados} />
                    <div className="flex justify-between items-center px-5 py-2.5 bg-[#f59e0b08] border-t border-[#f59e0b22]">
                      <span className="text-[#f59e0b] text-[9px] tracking-widest">
                        SUBTOTAL — {emp.empresa_nombre.toUpperCase()}
                      </span>
                      <span className="text-[#f59e0b] font-bold font-mono tabular-nums">
                        {fmt(emp.total_empresa)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {empresasFiltradas.length === 0 && (
              <div className="flex items-center gap-3 bg-[#08101e] border border-[#f59e0b11] rounded-sm px-5 py-6">
                <AlertCircle size={16} className="text-[#6aacbc] shrink-0" />
                <p className="text-[#6aacbc] text-[10px] tracking-widest">
                  {busqueda
                    ? `SIN RESULTADOS PARA "${busqueda.toUpperCase()}"`
                    : 'SIN ASOCIADOS PARA ESTE RUN — Verifica que existan asociados con aporte configurado y clase de cuota correcta.'}
                </p>
              </div>
            )}
          </div>

          {/* Total global */}
          {empresasFiltradas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-[#08101e] border border-[#f59e0b33] rounded-sm px-6 py-3 flex items-center gap-6">
                <span className="text-[#6aacbc] text-[9px] tracking-widest">TOTAL GLOBAL</span>
                <span className="text-[#f59e0b] text-xl font-bold font-mono tabular-nums">{fmt(data.total_global)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Eye size={32} className="text-[#f59e0b22] mb-4" />
          <p className="text-[#6aacbc] text-[10px] tracking-widest">SELECCIONA UN PERÍODO Y UN RUN, LUEGO CARGA EL PREVIEW</p>
        </div>
      )}
    </div>
  );
}
