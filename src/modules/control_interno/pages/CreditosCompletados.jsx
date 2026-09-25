import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Columns3, Download, List, Loader2, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import TablaRevisiones from '../components/TablaRevisiones.jsx';
import KanbanRevisiones from '../components/KanbanRevisiones.jsx';
import FiltrosLista from '../../creditos/components/FiltrosLista.jsx';
import Segmentado from '../../creditos/components/Segmentado.jsx';
import { campo, botonLinea, mensajeError, moneda } from '../../creditos/lib/formato.js';
import { TABS, aParamsCI, filasACsv, filtrosDeUrlCI, tabDeUrl, totalesPorTab } from '../lib/bandejaCI.js';

const ACCENT = '#c084fc';
const CLAVE_VISTA = 'control_interno:vista';
const leerVista = () => { try { return localStorage.getItem(CLAVE_VISTA) === 'kanban' ? 'kanban' : 'tabla'; } catch { return 'tabla'; } };
const guardarVista = (v) => { try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento: la vista no se recuerda */ } };

/**
 * Bandeja de Control Interno para los créditos: lo que espera su validación, lo que ya aprobó (esperando pago), lo pagado y lo que devolvió.
 * Misma estructura que la de Créditos y Cartera: búsqueda, tabla o tablero, filtros con fichas, contadores reales y exportación.
 */
const CreditosCompletados = () => {
  const [sp, setSp] = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrlCI(sp), [sp]);
  const tab = tabDeUrl(sp.get('tab'));
  const vista = (sp.get('vista') || leerVista()) === 'kanban' ? 'kanban' : 'tabla';
  const [filas, setFilas] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [claveDatos, setClaveDatos] = useState(null);   // a qué consulta pertenecen las filas y el resumen que se ven
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(false);
  const [opciones, setOpciones] = useState({ categorias: [], empresas: [], asesores: [] });
  const [bajando, setBajando] = useState(null);
  const [recarga, setRecarga] = useState(0);

  const cambiar = useCallback((k, v) => {
    setSp((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  }, [setSp]);

  const limpiar = () => setSp((prev) => {
    const n = new URLSearchParams();
    for (const k of ['q', 'tab', 'vista', 'orden', 'dir']) if (prev.get(k)) n.set(k, prev.get(k));
    return n;
  }, { replace: true });

  const elegirVista = (v) => { guardarVista(v); cambiar('vista', v); };

  const ordenar = (clave) => {
    const desc = filtros.orden === clave ? filtros.dir === 'desc' : ['valor', 'desembolso', 'dias', 'fecha'].includes(clave);
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('orden', clave); n.set('dir', filtros.orden === clave ? (desc ? 'asc' : 'desc') : (desc ? 'desc' : 'asc')); return n; }, { replace: true });
  };

  useEffect(() => {
    apiService.get('/control_interno/creditos/filtros').then(({ data }) => setOpciones({ categorias: data?.categorias ?? [], empresas: data?.empresas ?? [], asesores: data?.asesores ?? [] })).catch(() => {});
  }, [recarga]);

  // El tablero muestra todas las pestañas a la vez; la tabla, la elegida. Los contadores no dependen de la pestaña.
  const pestana = vista === 'kanban' ? 'todas' : tab;
  const claveConsulta = JSON.stringify([aParamsCI(filtros, { tab: pestana }), vista, recarga]);
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const [lista, res] = await Promise.all([
          apiService.get('/control_interno/creditos', { params: aParamsCI(filtros, { tab: pestana }) }),
          apiService.get('/control_interno/creditos/resumen', { params: aParamsCI(filtros, { sinOrden: true }) }),
        ]);
        setFilas(lista.data);
        setResumen(res.data);
        setClaveDatos(claveConsulta);
        setError('');
      } catch (err) {
        setError(err.response?.status === 403 ? 'No tienes permiso para ver esta bandeja.' : 'No se pudo cargar la bandeja.');
      }
    }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConsulta]);

  const descargar = async (f) => {
    setBajando(f.id);
    try {
      const { data } = await apiService.get(`/control_interno/creditos/${f.id}/pdf-final`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `credito_${f.radicado}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      let msg = 'No se pudo generar el PDF final';
      try { msg = JSON.parse(await err.response.data.text()).error ?? msg; } catch { /* sin detalle */ }
      toast.error(msg);
    } finally { setBajando(null); }
  };

  const exportar = () => {
    const blob = new Blob([filasACsv(filas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `control_interno_${vista === 'kanban' ? 'todos' : tab}_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const totales = totalesPorTab(resumen);
  const activa = TABS.find((t) => t.clave === tab);
  const visibles = vista === 'kanban' ? Object.values(totales) : [totales[tab]];
  const total = visibles.reduce((a, t) => a + t.n, 0);
  const neto = visibles.reduce((a, t) => a + t.valor, 0);
  const truncado = resumen && filas && claveDatos === claveConsulta ? Math.max(0, total - filas.length) : 0;

  return (
    <div className="p-6 font-mono text-[#a0d4e0]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[3px]" style={{ color: ACCENT }}>CRÉDITOS</h2>
          <p className="mt-1 text-[11px] text-slate-500">Créditos que Cartera terminó. Ábrelos para verificarlos: si todo está bien pasan a Tesorería; si no, los devuelves con el motivo.</p>
        </div>
        <button type="button" onClick={() => setRecarga((n) => n + 1)} aria-label="Actualizar" className="rounded-sm border border-slate-700 p-2 text-[#7ec8d8] hover:text-[#c084fc]"><RefreshCw size={14} /></button>
      </div>

      {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}

      {/* Los controles de la derecha no cambian entre tabla y tablero, así la búsqueda mantiene siempre el mismo ancho */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-[1_1_320px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={filtros.q ?? ''} onChange={(e) => cambiar('q', e.target.value)} placeholder="Buscar por radicado, cédula o nombre" className={`${campo} pl-8`} aria-label="Buscar en la bandeja" />
        </div>
        <Segmentado etiqueta="Vista" acento="violeta" valor={vista} onCambiar={elegirVista} opciones={[['tabla', 'TABLA', List], ['kanban', 'TABLERO', Columns3]]} />
      </div>

      <FiltrosLista filtros={filtros} onCambiar={cambiar} onLimpiar={limpiar} opciones={opciones} abierto={panel} onAbrir={setPanel} soloTabla conAsesor sinAccion etiquetaDias="DÍAS EN CONTROL INTERNO (MÍNIMO)" />

      {vista === 'tabla' && (
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Estados">
          {TABS.map((t) => (
            <button key={t.clave} type="button" title={t.ayuda} aria-pressed={tab === t.clave} onClick={() => cambiar('tab', t.clave === 'por_revisar' ? '' : t.clave)}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${tab === t.clave ? 'border-[#c084fc88] bg-[#c084fc14] text-[#c084fc]' : 'border-slate-800 text-[#6aacbc] hover:border-slate-600 hover:text-[#a0d4e0]'}`}>
              {t.titulo}
              <span className={`min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[10px] ${tab === t.clave ? 'bg-[#c084fc33]' : 'bg-slate-800'}`} aria-label={`${totales[t.clave].n} créditos`}>{totales[t.clave].n}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]" aria-label="Resumen de la bandeja">
        <span className="text-slate-400">{!resumen ? 'Cargando…' : `${total} ${total === 1 ? 'crédito' : 'créditos'} · ${moneda(neto)} a desembolsar`}</span>
        {vista === 'tabla' && <span className="text-slate-600">· {activa.ayuda}</span>}
        <button type="button" onClick={exportar} disabled={!filas?.length} className={`${botonLinea} ml-auto`}><Download size={12} /> EXPORTAR CSV ({filas?.length ?? 0})</button>
      </div>
      {truncado > 0 && (
        <p role="status" className="mb-3 rounded-sm border border-amber-700/60 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          Se muestran los {filas.length} más antiguos: hay {truncado} más que no caben. Afina los filtros para verlos.
        </p>
      )}

      {!filas && !error && <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>}
      {filas && (vista === 'tabla'
        ? <TablaRevisiones filas={filas} tab={tab} orden={filtros.orden} dir={filtros.dir} onOrden={ordenar} onPdf={descargar} bajando={bajando} vacio={activa.vacio} />
        : <KanbanRevisiones filas={filas} totales={totales} />)}
    </div>
  );
};

export default CreditosCompletados;
