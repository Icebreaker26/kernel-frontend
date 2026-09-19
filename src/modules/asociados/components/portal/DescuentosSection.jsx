import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, CreditCard, Heart, LayoutList, ShieldCheck } from 'lucide-react';
import apiService from '../../../../services/apiService.js';
import { ACCENTS, Cargando } from '../PortalUI.jsx';

const fmtCOP = (v) => `$${Number(v).toLocaleString('es-CO')}`;
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : null);

// Los cuatro grupos usan los colores de la cooperativa
const GRUPOS = [
  { key: 'seguros',   label: 'Seguros y pólizas',      icon: ShieldCheck, accent: 'verde',
    lineas: new Set([4, 5, 10, 11, 12, 13, 16, 18, 19, 23, 24, 1007, 1011, 1012, 1018, 1019, 1027, 1032, 1033, 1034, 1040, 1041]) },
  { key: 'creditos',  label: 'Créditos y préstamos',   icon: CreditCard,  accent: 'azul',
    lineas: new Set([1002, 1003, 1004, 1005, 1006, 1008, 1009, 1010, 1013, 1015, 1016, 1021, 1023, 1025, 1028, 1029, 1030, 1036, 1039]) },
  { key: 'bienestar', label: 'Servicios de bienestar', icon: Heart,       accent: 'dorado',
    lineas: new Set([17, 20, 22, 1014]) },
  { key: 'otros',     label: 'Otros descuentos',       icon: LayoutList,  accent: 'bosque',
    lineas: new Set([3, 14, 21, 1017, 1020, 1024, 1031, 1035]) },
];

const hoyPeriodo = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const periodoLabel = (yyyymm) => {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};
const shiftMes = (yyyymm, delta) => {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// 'activa' | 'antes' | 'despues' | null (sin datos suficientes)
const estadoLineaEnMes = (d, periodo) => {
  if (!d.fecha_pri_descuento) return null;
  const [ty, tm] = periodo.split('-').map(Number);
  const target = new Date(ty, tm - 1, 1);
  const inicio = new Date(d.fecha_pri_descuento);
  if (target < new Date(inicio.getFullYear(), inicio.getMonth(), 1)) return 'antes';
  if (d.fecha_vencimiento) {
    const venc = new Date(d.fecha_vencimiento);
    if (target > new Date(venc.getFullYear(), venc.getMonth(), 1)) return 'despues';
  }
  return 'activa';
};

export const useDescuentos = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.get('/asociados/descuentos')
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  const total = items.reduce((s, d) => s + Number(d.valor ?? 0), 0);
  return { items, loading, total };
};

const Dato = ({ etiqueta, valor, color }) => (
  <div>
    <p className="text-sm text-slate-500">{etiqueta}</p>
    <p className="mt-0.5 text-lg font-extrabold" style={{ color: color ?? '#0f172a' }}>{valor}</p>
  </div>
);

// Detalle de un crédito: cuota, avance de pago y saldo
const CreditoCard = ({ d }) => {
  const pagado = d.valor_obligacion != null && d.saldo_credito != null ? Math.max(0, Number(d.valor_obligacion) - Number(d.saldo_credito)) : null;
  const pct = pagado != null && Number(d.valor_obligacion) > 0 ? Math.min(100, (pagado / Number(d.valor_obligacion)) * 100) : null;
  return (
    <div className="border-b border-slate-100 bg-slate-50 p-4 last:border-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-base font-bold leading-snug text-slate-900">{d.nombre_linea}</p>
        <div className="shrink-0 text-right">
          <p className="text-xl font-extrabold text-[#065B8E]">{fmtCOP(d.valor)}</p>
          <p className="text-sm text-slate-500">cuota mensual</p>
        </div>
      </div>

      {pct != null && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-bold text-[#3F7A25]">{pct.toFixed(0)}% pagado</span>
            <span className="text-slate-500">{(100 - pct).toFixed(0)}% pendiente</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: '#5B9C3C' }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {d.valor_obligacion != null && <Dato etiqueta="Obligación" valor={fmtCOP(d.valor_obligacion)} />}
        {pagado != null && <Dato etiqueta="Pagado" valor={fmtCOP(pagado)} color="#3F7A25" />}
        {d.saldo_credito != null && <Dato etiqueta="Saldo pendiente" valor={fmtCOP(d.saldo_credito)} color={Number(d.saldo_credito) > 0 ? '#B91C1C' : '#3F7A25'} />}
        {d.num_cuotas != null && <Dato etiqueta="N.° de cuotas" valor={d.num_cuotas} />}
      </div>

      {(d.tasa_interes != null || d.fecha_vencimiento) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-3 text-sm text-slate-600">
          {d.tasa_interes != null && <span>Tasa <strong className="text-slate-900">{Number(d.tasa_interes).toFixed(2)}% M.V.</strong></span>}
          {d.fecha_vencimiento && <span>Vence <strong className="text-slate-900">{fmtFecha(d.fecha_vencimiento)}</strong></span>}
        </div>
      )}
    </div>
  );
};

const DescuentosSection = ({ items, loading }) => {
  const [abierto, setAbierto] = useState(null);
  const [periodo, setPeriodo] = useState(hoyPeriodo);
  const hoy = hoyPeriodo();
  const esHoy = periodo === hoy;

  if (loading) return <Cargando texto="Cargando tus descuentos…" />;
  if (items.length === 0) return <p className="py-6 text-center text-base text-slate-500">Todavía no tenemos descuentos registrados para ti.</p>;

  const conEstado = items.map((d) => ({ ...d, _estado: estadoLineaEnMes(d, periodo) }));
  const totalPeriodo = conEstado.filter((d) => d._estado !== 'antes').reduce((s, d) => s + Number(d.valor ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setPeriodo((p) => shiftMes(p, -1))} aria-label="Mes anterior" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <p className="text-base font-extrabold capitalize text-slate-900">{periodoLabel(periodo)}</p>
          {!esHoy && <button type="button" onClick={() => setPeriodo(hoy)} className="text-sm font-bold text-[#065B8E] hover:underline">Ir al mes actual</button>}
        </div>
        <button type="button" onClick={() => setPeriodo((p) => shiftMes(p, 1))} disabled={periodo >= hoy} aria-label="Mes siguiente" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={20} /></button>
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-base text-slate-600">{esHoy ? 'Total de descuentos' : 'Estimado para este mes'}</p>
        <p className="text-xl font-extrabold text-slate-900">{fmtCOP(totalPeriodo)}</p>
      </div>

      {GRUPOS.map((grupo) => {
        const filas = conEstado.filter((d) => grupo.lineas.has(d.linea_id));
        if (filas.length === 0) return null;
        const activas = filas.filter((d) => d._estado !== 'antes');
        const totalGrupo = activas.reduce((s, d) => s + Number(d.valor ?? 0), 0);
        const abiertaEsta = abierto === grupo.key;
        const ac = activas.length > 0 ? ACCENTS[grupo.accent] : { main: '#94a3b8', ink: '#64748b', soft: '#f1f5f9' };
        const Icon = grupo.icon;

        return (
          <div key={grupo.key} className="overflow-hidden rounded-2xl border border-slate-200">
            <button type="button" onClick={() => setAbierto(abiertaEsta ? null : grupo.key)} aria-expanded={abiertaEsta}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition" style={{ background: abiertaEsta ? ac.soft : '#fff' }}>
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: ac.soft, color: ac.ink }}><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-base font-extrabold text-slate-900">{grupo.label}</span>
                  <span className="text-sm text-slate-500">{activas.length} de {filas.length}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-base font-extrabold" style={{ color: ac.ink }}>{fmtCOP(totalGrupo)}</span>
                <ChevronDown size={18} className="text-slate-400 transition-transform" style={{ transform: abiertaEsta ? 'rotate(180deg)' : 'none' }} />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {abiertaEsta && (
                <motion.div key="detalle" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="border-t border-slate-100">
                    {filas.map((d) => {
                      const aunNo = d._estado === 'antes';
                      if (grupo.key === 'creditos' && !aunNo) return <CreditoCard key={d.linea_id} d={d} />;
                      return (
                        <div key={d.linea_id} className={`flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 last:border-0 ${aunNo ? 'opacity-60' : ''}`}>
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-base text-slate-700">{d.nombre_linea}</p>
                            {!esHoy && !aunNo && <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">aprox.</span>}
                          </div>
                          <p className="shrink-0 text-base font-extrabold" style={{ color: aunNo ? '#94a3b8' : ac.ink }}>{aunNo ? 'Aún no inicia' : fmtCOP(d.valor)}</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default DescuentosSection;
export { fmtCOP };
