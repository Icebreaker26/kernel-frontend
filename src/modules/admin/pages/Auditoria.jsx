import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, UserMinus, FileText, AlertCircle, ShieldCheck, KeyRound, UserCheck, UserX, Settings, ChevronDown, ChevronRight, Ticket, TriangleAlert, Download, PlusCircle, Loader2, CheckCircle, RotateCcw, TriangleAlert as WarnIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const fmt = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ── Discrepancias línea 15 ──────────────────────────────────────────────────

const TIPO_CFG = {
  COBRO_A_RETIRADO:  { label: 'Cobro a retirado',    color: 'text-red-400',    bg: 'bg-red-900/10' },
  COBRO_SIN_BOLETO:  { label: 'Cobro sin boleto',     color: 'text-amber-400',  bg: 'bg-amber-900/10' },
  MONTO_INCORRECTO:  { label: 'Monto incorrecto',     color: 'text-orange-400', bg: 'bg-orange-900/10' },
  SIN_COBRO_EXTERNO: { label: 'Sin cobro en externo', color: 'text-cyan-400',   bg: 'bg-cyan-900/10' },
};

const fmtCOP = (v) =>
  (v ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const exportarDiscrepancias = (items, archivo) => {
  const cols = ['tipo', 'codigo', 'nombre', 'empresa', 'cuota_externa', 'cuota_kernel', 'diferencia'];
  const esc  = (v) => { const s = String(v ?? ''); return s.includes(',') ? `"${s}"` : s; };
  const csv  = [cols.join(','), ...items.map((d) => cols.map((c) => esc(d[c] ?? '')).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `discrepancias_${archivo ?? 'sync'}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const SubsanadaCell = ({ data }) => (
  <div className="text-center">
    <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
      <CheckCircle size={10} /> SUBSANADO
    </span>
    {data?.numeros?.length > 0 && (
      <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
        {data.numeros.map((n) => (
          <span key={n} className="px-1 rounded bg-emerald-900/30 text-emerald-400 text-[9px] font-mono">#{n}</span>
        ))}
      </div>
    )}
    {data?.sorteo_nombre && (
      <p className="text-[9px] text-slate-600 mt-0.5">{data.sorteo_nombre}</p>
    )}
  </div>
);

const DetalleDiscrepancias = ({ items, archivo, sincId }) => {
  const [filtro, setFiltro]   = useState(null);
  const [asignando,    setAsignando]    = useState({});
  const [subsanadasData, setSubsanadasData] = useState({}); // codigo → { numeros, sorteo_nombre }
  const [cargandoLote, setCargandoLote] = useState(false);
  const vista = filtro ? items.filter((d) => d.tipo === filtro) : items;

  const handleAsignar = async (d, silent = false) => {
    setAsignando(prev => ({ ...prev, [d.codigo]: 'loading' }));
    try {
      const { data } = await apiService.post('/sorteos/asignar-por-discrepancia', {
        asociado_codigo: d.codigo,
        cantidad: d.bonos_sugeridos,
      });
      if (!silent) toast.success(`${data.asignados.length} bonos asignados — ${data.sorteo_nombre}`);
      setAsignando(prev => ({ ...prev, [d.codigo]: 'done' }));
      setSubsanadasData(prev => ({ ...prev, [d.codigo]: { numeros: data.asignados, sorteo_nombre: data.sorteo_nombre } }));
      if (sincId) {
        apiService.patch(`/asociados/sincronizaciones/${sincId}/subsanar/${d.codigo}`, {
          numeros: data.asignados,
          sorteo_id: data.sorteo_id,
          sorteo_nombre: data.sorteo_nombre,
        }).catch(() => {});
      }
      return true;
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.error || 'Error al asignar bonos');
      setAsignando(prev => ({ ...prev, [d.codigo]: 'idle' }));
      return false;
    }
  };

  const handleLote = async () => {
    const pendientes = items.filter(
      (d) => d.tipo === 'COBRO_SIN_BOLETO' && d.bonos_sugeridos > 0
            && d.subsanada !== true && asignando[d.codigo] !== 'done'
    );
    if (!pendientes.length) return;
    setCargandoLote(true);
    try {
      const { data } = await apiService.post('/sorteos/asignar-discrepancias-lote', {
        items:   pendientes.map((d) => ({ codigo: d.codigo, cantidad: d.bonos_sugeridos })),
        sync_id: sincId,
      });
      setAsignando((prev) => {
        const next = { ...prev };
        data.exitosos.forEach((e) => { next[e.codigo] = 'done'; });
        return next;
      });
      setSubsanadasData((prev) => {
        const next = { ...prev };
        data.exitosos.forEach((e) => { next[e.codigo] = { numeros: e.numeros, sorteo_nombre: e.sorteo_nombre }; });
        return next;
      });
      data.fallidos.length > 0
        ? toast(`${data.exitosos.length} subsanadas · ${data.fallidos.length} con error`, { icon: '⚠️' })
        : toast.success(`${data.exitosos.length} discrepancias subsanadas`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al asignar bonos');
    } finally {
      setCargandoLote(false);
    }
  };

  if (!items.length) return (
    <div className="md:col-span-2">
      <p className="text-xs font-semibold text-cyan-400 mb-1">Discrepancias línea 15 <span className="text-slate-600">(0)</span></p>
      <p className="text-slate-600 text-xs">Sin discrepancias — los cobros externos coinciden con Kernel.</p>
    </div>
  );

  const pendientesCount = items.filter(
    (d) => d.tipo === 'COBRO_SIN_BOLETO' && d.bonos_sugeridos > 0
          && d.subsanada !== true && asignando[d.codigo] !== 'done'
  ).length;

  return (
    <div className="md:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-amber-400">
          Discrepancias línea 15 <span className="text-slate-600">({items.length})</span>
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {pendientesCount > 0 && (
            <button
              onClick={handleLote}
              disabled={cargandoLote}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-[10px] font-semibold transition-colors disabled:opacity-50"
            >
              {cargandoLote
                ? <Loader2 size={10} className="animate-spin" />
                : <PlusCircle size={10} />}
              Asignar todos ({pendientesCount})
            </button>
          )}
          <button
            onClick={() => exportarDiscrepancias(items, archivo)}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Download size={10} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Barra indeterminada durante lote */}
      {cargandoLote && (
        <div className="mb-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
            <span>Asignando {pendientesCount} asociados en un solo lote...</span>
            <span className="text-slate-600">no cierre esta página</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="h-1 rounded-full bg-amber-400"
              style={{ width: '40%', animation: 'indeterminate 1.4s ease-in-out infinite' }} />
          </div>
          <style>{`@keyframes indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
        </div>
      )}

      {/* Contadores por tipo */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(TIPO_CFG).map(([tipo, cfg]) => {
          const count  = items.filter((d) => d.tipo === tipo).length;
          const activo = filtro === tipo;
          return (
            <button
              key={tipo}
              disabled={count === 0}
              onClick={() => setFiltro(activo ? null : tipo)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-colors disabled:opacity-30
                ${activo ? `${cfg.bg} border-current ${cfg.color}` : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
            >
              <span className={activo ? cfg.color : ''}>{count}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
        {filtro && (
          <button onClick={() => setFiltro(null)} className="text-[10px] text-slate-600 hover:text-slate-400 px-1">
            × todos
          </button>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="sm:hidden flex flex-col gap-2 max-h-72 overflow-y-auto">
        {vista.map((d, i) => {
          const cfg = TIPO_CFG[d.tipo] ?? { label: d.tipo, color: 'text-slate-400', bg: 'bg-slate-800' };
          const subsanada = d.subsanada === true || asignando[d.codigo] === 'done';
          return (
            <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-slate-400 font-mono text-[10px]">{d.codigo}</span>
              </div>
              <p className="text-slate-200 text-xs mb-0.5">{d.nombre}</p>
              {d.empresa && <p className="text-slate-500 text-[10px] mb-1.5">{d.empresa}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] mb-2">
                <span className="text-slate-500">
                  Externo: <span className="text-slate-300">{d.cuota_externa ? fmtCOP(d.cuota_externa) : '—'}</span>
                  {d.periodo && <span className="text-slate-600 ml-1">({d.periodo})</span>}
                </span>
                <span className="text-slate-500">
                  Kernel: <span className="text-slate-300">{d.cuota_kernel ? fmtCOP(d.cuota_kernel) : '—'}</span>
                  {d.boletos_count > 0 && <span className="text-slate-600 ml-1">· {d.boletos_count} bonos</span>}
                </span>
                {d.diferencia != null && d.diferencia !== 0 && (
                  <span className={`font-mono ${d.diferencia > 0 ? 'text-orange-400' : 'text-cyan-400'}`}>
                    Δ {fmtCOP(d.diferencia)}
                  </span>
                )}
              </div>
              {d.tipo === 'COBRO_SIN_BOLETO' && d.bonos_sugeridos > 0 && (
                subsanada ? (
                  <SubsanadaCell data={subsanadasData[d.codigo] ?? { numeros: d.numeros_asignados, sorteo_nombre: d.sorteo_nombre }} />
                ) : (
                  <button
                    onClick={() => handleAsignar(d)}
                    disabled={asignando[d.codigo] === 'loading'}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors text-[10px] font-semibold"
                  >
                    {asignando[d.codigo] === 'loading'
                      ? <Loader2 size={10} className="animate-spin" />
                      : <PlusCircle size={10} />}
                    ASIGNAR {d.bonos_sugeridos} {d.bonos_sugeridos === 1 ? 'BONO' : 'BONOS'}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
              <tr className="text-slate-500">
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Código</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Empresa</th>
                <th className="px-3 py-2 text-right font-medium">Externo</th>
                <th className="px-3 py-2 text-right font-medium">Kernel</th>
                <th className="px-3 py-2 text-right font-medium">Δ</th>
                <th className="px-3 py-2 text-center font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {vista.map((d, i) => {
                const cfg = TIPO_CFG[d.tipo] ?? { label: d.tipo, color: 'text-slate-400' };
                return (
                  <tr key={i} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20">
                    <td className={`px-3 py-2 text-[10px] font-mono ${cfg.color}`}>{cfg.label}</td>
                    <td className="px-3 py-2 text-slate-300 font-mono">{d.codigo}</td>
                    <td className="px-3 py-2 text-slate-200 max-w-[120px] truncate">{d.nombre}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{d.empresa || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-slate-300">{d.cuota_externa ? fmtCOP(d.cuota_externa) : '—'}</span>
                      {d.periodo && <span className="block text-[9px] text-slate-600 mt-0.5">{d.periodo}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-slate-300">{d.cuota_kernel ? fmtCOP(d.cuota_kernel) : '—'}</span>
                      {d.boletos_count > 0 && (
                        <span className="flex items-center justify-end gap-1 text-[9px] text-slate-500 mt-0.5">
                          <Ticket size={9} />{d.boletos_count} {d.boletos_count === 1 ? 'bono' : 'bonos'}
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${d.diferencia > 0 ? 'text-orange-400' : d.diferencia < 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                      {d.diferencia != null && d.diferencia !== 0 ? fmtCOP(d.diferencia) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {d.tipo === 'COBRO_SIN_BOLETO' && d.bonos_sugeridos > 0 ? (
                        (d.subsanada === true || asignando[d.codigo] === 'done') ? (
                          <SubsanadaCell data={subsanadasData[d.codigo] ?? { numeros: d.numeros_asignados, sorteo_nombre: d.sorteo_nombre }} />
                        ) : (
                          <button
                            onClick={() => handleAsignar(d)}
                            disabled={asignando[d.codigo] === 'loading'}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors text-[10px] font-semibold whitespace-nowrap"
                          >
                            {asignando[d.codigo] === 'loading'
                              ? <Loader2 size={10} className="animate-spin" />
                              : <PlusCircle size={10} />}
                            ASIGNAR {d.bonos_sugeridos} {d.bonos_sugeridos === 1 ? 'BONO' : 'BONOS'}
                          </button>
                        )
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Tab Sincronizaciones ────────────────────────────────────────────────────

const Chip = ({ icon: Icon, valor, color }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${color}`}>
    <Icon size={11} /> {valor}
  </span>
);

const SeccionDetalle = ({ titulo, color, items, renderItem, vacio }) => {
  const [pagina, setPagina] = useState(0);
  const POR_PAG = 50;
  const total   = items.length;
  const slice   = items.slice(pagina * POR_PAG, (pagina + 1) * POR_PAG);
  const paginas = Math.ceil(total / POR_PAG);

  if (!total) return (
    <div>
      <p className={`text-xs font-semibold mb-2 ${color}`}>{titulo} <span className="text-slate-600">(0)</span></p>
      <p className="text-slate-600 text-xs">{vacio}</p>
    </div>
  );

  return (
    <div>
      <p className={`text-xs font-semibold mb-2 ${color}`}>{titulo} <span className="text-slate-600">({total})</span></p>
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {slice.map((item, i) => (
                <tr key={i} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20">
                  {renderItem(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {paginas > 1 && (
        <div className="flex items-center gap-2 mt-2 justify-end">
          <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}
            className="text-xs text-slate-500 disabled:opacity-30 hover:text-white px-2 py-0.5">← Ant</button>
          <span className="text-slate-600 text-xs">{pagina + 1} / {paginas}</span>
          <button disabled={pagina >= paginas - 1} onClick={() => setPagina(p => p + 1)}
            className="text-xs text-slate-500 disabled:opacity-30 hover:text-white px-2 py-0.5">Sig →</button>
        </div>
      )}
    </div>
  );
};

const DetallePanel = ({ sincId, archivo }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get(`/asociados/sincronizaciones/${sincId}`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Error cargando detalle'))
      .finally(() => setLoading(false));
  }, [sincId]);

  if (loading) return <p className="text-slate-500 text-xs py-3">Cargando detalle...</p>;
  if (!data)   return <p className="text-slate-600 text-xs py-3">Sin detalle disponible.</p>;

  const renderAsociado = (a) => (
    <>
      <td className="px-3 py-2 text-slate-300 font-mono">{a.codigo}</td>
      <td className="px-3 py-2 text-slate-200">{a.apellido}, {a.nombre}</td>
      <td className="px-3 py-2 text-slate-500">{a.empresa ?? '—'}</td>
    </>
  );

  const renderBoleto = (b) => (
    <>
      <td className="px-3 py-2 text-slate-300 font-mono">#{b.numero}</td>
      <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{b.codigo}</td>
    </>
  );

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
      <SeccionDetalle titulo="Nuevos" color="text-emerald-400"
        items={data.nuevos ?? []} renderItem={renderAsociado} vacio="Ningún asociado nuevo." />
      <SeccionDetalle titulo="Retirados" color="text-amber-400"
        items={data.retirados ?? []} renderItem={renderAsociado} vacio="Ningún asociado retirado." />
      <SeccionDetalle titulo="Boletos liberados" color="text-violet-400"
        items={data.boletos_liberados ?? []} renderItem={renderBoleto} vacio="Ningún boleto liberado." />
      {(data.errores?.length > 0) && (
        <div className="md:col-span-2">
          <SeccionDetalle titulo="Errores" color="text-red-400"
            items={data.errores}
            renderItem={(e) => (
              <>
                <td className="px-3 py-2 text-slate-300 font-mono">{e.fila}</td>
                <td className="px-3 py-2 text-red-400 text-[10px]">{JSON.stringify(e.error)}</td>
              </>
            )}
            vacio="" />
        </div>
      )}
      {data.discrepancias !== null && data.discrepancias !== undefined && (
        <DetalleDiscrepancias items={data.discrepancias} archivo={archivo} sincId={sincId} />
      )}
    </div>
  );
};

const BotonRevertir = ({ sinc, onRevertido }) => {
  const [fase, setFase]       = useState('idle'); // idle | confirm | loading | done
  const puedeRevertir = (sinc.retirados > 0 || sinc.boletos_liberados > 0) && !sinc.revertido_at;

  if (!puedeRevertir) {
    if (sinc.revertido_at) return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
        <RotateCcw size={10} /> Revertido · {sinc.revertido_por_nombre ?? ''}
      </span>
    );
    return null;
  }

  const handleRevertir = async () => {
    setFase('loading');
    try {
      const { data } = await apiService.post(`/asociados/sincronizaciones/${sinc.id}/revertir`);
      toast.success(`Revertido: ${data.asociados_restaurados} asociados y ${data.boletos_restaurados} boletos restaurados`);
      setFase('done');
      onRevertido?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al revertir');
      setFase('idle');
    }
  };

  if (fase === 'done') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
      <CheckCircle size={10} /> Revertido
    </span>
  );

  if (fase === 'confirm') return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
        <WarnIcon size={10} /> ¿Revertir {sinc.retirados} retirados y {sinc.boletos_liberados} boletos?
      </span>
      <button
        onClick={handleRevertir}
        className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Sí, revertir
      </button>
      <button
        onClick={() => setFase('idle')}
        className="text-[10px] text-slate-500 hover:text-white"
      >
        Cancelar
      </button>
    </div>
  );

  if (fase === 'loading') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
      <Loader2 size={10} className="animate-spin" /> Revirtiendo...
    </span>
  );

  return (
    <button
      onClick={() => setFase('confirm')}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
    >
      <RotateCcw size={10} /> Revertir sync
    </button>
  );
};

const FilaSincronizacion = ({ s, delay, onRevertido, esMasReciente }) => {
  const [abierta, setAbierta] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-slate-900 border border-slate-800 rounded-xl px-3 sm:px-5 py-3 sm:py-4"
    >
      <div className="flex items-start gap-3">
        <button onClick={() => setAbierta(v => !v)}
          className="mt-0.5 text-slate-500 hover:text-white transition-colors shrink-0">
          {abierta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={13} className="text-slate-500 shrink-0" />
                <p className="text-slate-200 text-sm font-medium truncate">{s.archivo}</p>
              </div>
              <p className="text-slate-500 text-xs">{s.usuario} · {fmt(s.created_at)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Chip icon={FileText}    valor={`${s.total} total`}                color="text-slate-400 bg-slate-800" />
                <Chip icon={UserPlus}    valor={`${s.nuevos} nuevos`}              color="text-emerald-400 bg-emerald-500/10" />
                <Chip icon={RefreshCw}   valor={`${s.actualizados} act.`}          color="text-blue-400 bg-blue-500/10" />
                <Chip icon={UserMinus}   valor={`${s.retirados} retirados`}        color="text-amber-400 bg-amber-500/10" />
                {(s.boletos_liberados > 0) && <Chip icon={Ticket} valor={`${s.boletos_liberados} boletos`} color="text-violet-400 bg-violet-500/10" />}
                {s.errores > 0 && <Chip icon={AlertCircle} valor={`${s.errores} errores`} color="text-red-400 bg-red-500/10" />}
                {s.discrepancias_count > 0 && <Chip icon={TriangleAlert} valor={`${s.discrepancias_count} discrepancias`} color="text-amber-400 bg-amber-500/10" />}
                {s.discrepancias_count === 0 && <Chip icon={TriangleAlert} valor="sin discrepancias" color="text-slate-600 bg-slate-800" />}
              </div>
              {esMasReciente && <BotonRevertir sinc={s} onRevertido={onRevertido} />}
            </div>
          </div>
          <AnimatePresence>
            {abierta && (
              <motion.div key="detalle"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <DetallePanel sincId={s.id} archivo={s.archivo} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const TabSincronizaciones = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);

  const cargar = () => {
    setLoading(true);
    apiService.get('/asociados/sincronizaciones')
      .then(({ data }) => setHistorial(data))
      .catch(() => toast.error('Error cargando sincronizaciones'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!historial.length) return <p className="text-slate-600 text-sm">No hay sincronizaciones registradas.</p>;

  return (
    <div className="space-y-3">
      {historial.map((s, i) => (
        <FilaSincronizacion key={s.id} s={s} delay={i * 0.03} onRevertido={cargar} esMasReciente={i === 0} />
      ))}
    </div>
  );
};

// ── Tab Acciones Admin ──────────────────────────────────────────────────────

const ACCION_CONFIG = {
  APROBAR_USUARIO:   { label: 'Aprobó usuario',       icon: UserCheck,   color: 'text-emerald-400 bg-emerald-500/10' },
  DESACTIVAR_USUARIO:{ label: 'Desactivó usuario',    icon: UserX,       color: 'text-red-400 bg-red-500/10' },
  REACTIVAR_USUARIO: { label: 'Reactivó usuario',     icon: UserCheck,   color: 'text-blue-400 bg-blue-500/10' },
  CAMBIAR_ROL:       { label: 'Cambió rol',            icon: Settings,    color: 'text-amber-400 bg-amber-500/10' },
  RESET_PASSWORD:    { label: 'Reseteó contraseña',   icon: KeyRound,    color: 'text-violet-400 bg-violet-500/10' },
  ASIGNAR_PERMISOS:  { label: 'Asignó permisos',      icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-500/10' },
};

const TabAcciones = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get('/admin/logs')
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Error cargando acciones'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!logs.length) return <p className="text-slate-600 text-sm">No hay acciones registradas aún.</p>;

  return (
    <>
      {/* Mobile: tarjetas */}
      <div className="sm:hidden flex flex-col gap-2">
        {logs.map((l, i) => {
          const cfg = ACCION_CONFIG[l.accion] ?? { label: l.accion, icon: Settings, color: 'text-slate-400 bg-slate-800' };
          const Icon = cfg.icon;
          return (
            <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs ${cfg.color}`}>
                  <Icon size={11} /> {cfg.label}
                </span>
                <p className="text-slate-600 text-[10px] whitespace-nowrap">{fmt(l.created_at)}</p>
              </div>
              <p className="text-slate-200 text-xs">{l.objetivo_nombre}</p>
              <p className="text-slate-600 text-[10px] capitalize mb-1">{l.objetivo_tipo}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                {l.detalle && <span>{l.detalle}</span>}
                <span>por {l.admin_nombre}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="text-left px-4 py-3">Acción</th>
              <th className="text-left px-4 py-3">Objetivo</th>
              <th className="text-left px-4 py-3">Detalle</th>
              <th className="text-left px-4 py-3">Admin</th>
              <th className="text-left px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => {
              const cfg = ACCION_CONFIG[l.accion] ?? { label: l.accion, icon: Settings, color: 'text-slate-400 bg-slate-800' };
              const Icon = cfg.icon;
              return (
                <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs ${cfg.color}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-200">{l.objetivo_nombre}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5 capitalize">{l.objetivo_tipo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{l.detalle ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{l.admin_nombre}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(l.created_at)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Página principal ────────────────────────────────────────────────────────

const TABS = [
  { key: 'sincronizaciones', label: 'Sincronizaciones CSV' },
  { key: 'acciones',         label: 'Acciones admin' },
];

const Auditoria = () => {
  const [tab, setTab] = useState('sincronizaciones');

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-6">Auditoría</h1>

      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-violet-400 border-violet-500'
                : 'text-slate-500 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sincronizaciones' ? <TabSincronizaciones /> : <TabAcciones />}
    </div>
  );
};

export default Auditoria;
