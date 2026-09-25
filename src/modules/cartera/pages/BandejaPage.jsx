import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Columns3, Download, List, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import TablaCreditos from '../../creditos/components/TablaCreditos.jsx';
import KanbanCreditos from '../../creditos/components/KanbanCreditos.jsx';
import FiltrosLista from '../../creditos/components/FiltrosLista.jsx';
import Segmentado from '../../creditos/components/Segmentado.jsx';
import { campo, botonLinea, mensajeError, moneda } from '../../creditos/lib/formato.js';
import { filasACsv } from '../../creditos/lib/lista.js';
import { COLUMNAS_BANDEJA, TABS, aParamsCartera, filtrosDeUrlCartera, tabDeUrl, totalesPorTab } from '../lib/bandeja.js';

const CLAVE_VISTA = 'cartera:vista';
const leerVista = () => { try { return localStorage.getItem(CLAVE_VISTA) === 'kanban' ? 'kanban' : 'tabla'; } catch { return 'tabla'; } };
const guardarVista = (v) => { try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento: la vista no se recuerda */ } };

const BandejaPage = () => {
  const [sp, setSp] = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrlCartera(sp), [sp]);
  const tab = tabDeUrl(sp.get('tab'));
  const vista = (sp.get('vista') || leerVista()) === 'kanban' ? 'kanban' : 'tabla';
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [panel, setPanel] = useState(false);
  const [opciones, setOpciones] = useState({ categorias: [], empresas: [], asesores: [] });
  const [sinPermiso, setSinPermiso] = useState(false);

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
    const desc = filtros.orden === clave ? filtros.dir === 'desc' : ['valor', 'dias', 'fecha'].includes(clave);
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('orden', clave); n.set('dir', filtros.orden === clave ? (desc ? 'asc' : 'desc') : (desc ? 'desc' : 'asc')); return n; }, { replace: true });
  };

  useEffect(() => { apiService.get('/cartera/filtros').then(({ data }) => setOpciones({ categorias: data?.categorias ?? [], empresas: data?.empresas ?? [], asesores: data?.asesores ?? [] })).catch(() => {}); }, []);

  // El tablero muestra todas las pestañas a la vez; la tabla, la elegida. El resumen (contadores) no depende de la pestaña.
  const pestana = vista === 'kanban' ? 'todas' : tab;
  const claveConsulta = JSON.stringify([aParamsCartera(filtros, { tab: pestana }), vista]);
  useEffect(() => {
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const [lista, res] = await Promise.all([
          apiService.get('/cartera', { params: aParamsCartera(filtros, { tab: pestana }) }),
          apiService.get('/cartera/resumen', { params: aParamsCartera(filtros, { sinOrden: true }) }),
        ]);
        setFilas(lista.data);
        setResumen(res.data);
        setSinPermiso(false);
      } catch (err) {
        if (err.response?.status === 403) setSinPermiso(true); else toast.error(mensajeError(err, 'No se pudo cargar la bandeja'));
      } finally { setCargando(false); }
    }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConsulta]);

  if (sinPermiso) return <p className="text-xs text-amber-300">No tienes permiso para ver la bandeja de Cartera.</p>;

  const totales = totalesPorTab(resumen);
  const activa = TABS.find((t) => t.clave === tab);
  const visibles = vista === 'kanban' ? Object.values(totales) : [totales[tab]];
  const total = visibles.reduce((a, t) => a + t.n, 0);
  const valorTotal = visibles.reduce((a, t) => a + t.valor, 0);
  const truncado = resumen ? Math.max(0, total - filas.length) : 0;

  const exportar = () => {
    const blob = new Blob([filasACsv(filas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cartera_${vista === 'kanban' ? 'todas' : tab}_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div>
      {/* Los controles de la derecha no cambian entre tabla y tablero, así la búsqueda mantiene siempre el mismo ancho */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-[1_1_320px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={filtros.q ?? ''} onChange={(e) => cambiar('q', e.target.value)} placeholder="Buscar por radicado, cédula o nombre" className={`${campo} pl-8`} aria-label="Buscar en la bandeja" />
        </div>
        <Segmentado etiqueta="Vista" acento="ambar" valor={vista} onCambiar={elegirVista} opciones={[['tabla', 'TABLA', List], ['kanban', 'TABLERO', Columns3]]} />
      </div>

      <FiltrosLista filtros={filtros} onCambiar={cambiar} onLimpiar={limpiar} opciones={opciones} abierto={panel} onAbrir={setPanel} soloTabla conAsesor sinAccion />

      {/* Pestañas por estado con lo que hay en cada una; en el tablero cada columna trae la suya */}
      {vista === 'tabla' && (
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Estados">
          {TABS.map((t) => (
            <button key={t.clave} type="button" title={t.ayuda} aria-pressed={tab === t.clave} onClick={() => cambiar('tab', t.clave === 'entregadas' ? '' : t.clave)}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${tab === t.clave ? 'border-[#fbbf2488] bg-[#fbbf2414] text-[#fbbf24]' : 'border-slate-800 text-[#6aacbc] hover:border-slate-600 hover:text-[#a0d4e0]'}`}>
              {t.titulo}
              <span className={`min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[10px] ${tab === t.clave ? 'bg-[#fbbf2433]' : 'bg-slate-800'}`} aria-label={`${totales[t.clave].n} expedientes`}>{totales[t.clave].n}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]" aria-label="Resumen de la bandeja">
        <span className="text-slate-400">{cargando && !resumen ? 'Cargando…' : `${total} ${total === 1 ? 'expediente' : 'expedientes'} · ${moneda(valorTotal)} solicitado`}</span>
        {vista === 'tabla' && <span className="text-slate-600">· {activa.ayuda}</span>}
        <button type="button" onClick={exportar} disabled={!filas.length} className={`${botonLinea} ml-auto`}><Download size={12} /> EXPORTAR CSV ({filas.length})</button>
      </div>
      {truncado > 0 && (
        <p role="status" className="mb-3 rounded-sm border border-amber-700/60 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          Se muestran los {filas.length} más antiguos: hay {truncado} más que no caben. Afina los filtros para verlos.
        </p>
      )}

      {vista === 'tabla'
        ? <TablaCreditos filas={filas} base="/cartera" mostrarAsesor orden={filtros.orden} dir={filtros.dir} onOrden={ordenar} vacio="No hay expedientes en esta bandeja" />
        : <KanbanCreditos filas={filas} resumen={resumen} base="/cartera" mostrarAsesor columnas={COLUMNAS_BANDEJA} deCartera />}
    </div>
  );
};

export default BandejaPage;
