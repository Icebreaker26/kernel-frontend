import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
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

export default function FacturasList() {
  const navigate  = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState({ periodo: '', estado: '', empresa: '' });

  useEffect(() => {
    const params = {};
    if (filtro.periodo) params.periodo       = filtro.periodo;
    if (filtro.estado)  params.estado        = filtro.estado;
    if (filtro.empresa) params.empresa_codigo = filtro.empresa;

    apiService.get('/patronales/facturas', { params })
      .then(({ data }) => setFacturas(data))
      .catch(() => toast.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }, [filtro]);

  return (
    <div className="p-8">
      <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// PATRONALES</p>
      <h1 className="text-2xl font-bold text-[#f59e0b] tracking-[3px] mb-6" style={{ textShadow: '0 0 20px #f59e0b44' }}>
        FACTURAS
      </h1>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          placeholder="Período (YYYY-MM)"
          value={filtro.periodo}
          onChange={(e) => setFiltro({ ...filtro, periodo: e.target.value })}
          className="bg-[#08101e] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] font-mono w-36"
        />
        <select
          value={filtro.estado}
          onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
          className="bg-[#08101e] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#f59e0b55] font-mono"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pago_parcial">Pago parcial</option>
          <option value="vencida">Vencida</option>
          <option value="pagada">Pagada</option>
        </select>
        <input
          placeholder="Código empresa"
          value={filtro.empresa}
          onChange={(e) => setFiltro({ ...filtro, empresa: e.target.value })}
          className="bg-[#08101e] border border-[#f59e0b22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] font-mono w-44"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-[#f59e0b44]" /></div>
      ) : facturas.length === 0 ? (
        <p className="text-[#6aacbc] text-[10px] tracking-widest text-center py-12">SIN RESULTADOS</p>
      ) : (
        <div className="flex flex-col gap-2">
          {facturas.map((f) => {
            const c = estadoColor(f.estado);
            return (
              <button
                key={f.id}
                onClick={() => navigate(`/patronales/facturas/${f.id}`)}
                className="bg-[#08101e] border border-[#f59e0b11] hover:border-[#f59e0b33] rounded-sm px-5 py-4 text-left flex items-center gap-4 transition-all group"
              >
                <FileText size={14} className="text-[#f59e0b] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="text-[#a0d4e0] font-medium tracking-wider">{f.nombre_empresa}</span>
                    <span className="text-[#6aacbc] text-[9px] font-mono">{f.periodo}</span>
                    <span className="text-[9px] px-1.5 py-0.5 border tracking-wider" style={{ color: c.text, borderColor: c.border, background: c.bg }}>
                      {f.estado.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[#6aacbc] text-[9px]">{f.tipo_cuota.toUpperCase()}</span>
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
                <ChevronRight size={12} className="text-[#f59e0b44] group-hover:text-[#f59e0b] transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
