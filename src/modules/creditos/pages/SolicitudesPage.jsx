import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Columns3, Download, List, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import TablaCreditos from '../components/TablaCreditos.jsx';
import KanbanCreditos from '../components/KanbanCreditos.jsx';
import FiltrosLista from '../components/FiltrosLista.jsx';
import { ESTADOS, campo, botonLinea, botonPrimario, mensajeError, moneda } from '../lib/formato.js';
import { COLUMNAS_CERRADAS, COLUMNAS_KANBAN, PARAMS_FILTRO, PARAMS_ORDEN, filasACsv, filtrosDeUrl } from '../lib/lista.js';

const ORDEN_ESTADOS = [...COLUMNAS_KANBAN, ...COLUMNAS_CERRADAS];

const CLAVE_VISTA = 'creditos:vista';
const leerVista = () => { try { return localStorage.getItem(CLAVE_VISTA) === 'kanban' ? 'kanban' : 'tabla'; } catch { return 'tabla'; } };
const guardarVista = (v) => { try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento: la vista no se recuerda */ } };

/** Lo que viaja al servidor: los filtros de la URL, con "todas" y "accion" como 1 */
const aParams = (f, { sinEstado = false, sinOrden = false } = {}) => {
  const p = {};
  for (const k of PARAMS_FILTRO) if (f[k] && !(sinEstado && k === 'estado')) p[k] = k === 'todas' || k === 'accion' ? 1 : f[k];
  if (!sinOrden) for (const k of PARAMS_ORDEN) if (f[k]) p[k] = f[k];
  return p;
};

// Selector de opciones excluyentes con aspecto de botones unidos (más claro que una casilla suelta)
const Segmentado = ({ etiqueta, valor, onCambiar, opciones, titulo }) => (
  <div role="group" aria-label={etiqueta} title={titulo} className="inline-flex overflow-hidden rounded-sm border border-slate-700">
    {opciones.map(([k, t, Icono]) => (
      <button key={k} type="button" aria-pressed={valor === k} onClick={() => onCambiar(k)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${valor === k ? 'bg-[#84cc1622] text-[#84cc16]' : 'text-[#6aacbc] hover:text-[#a0d4e0]'}`}>
        {Icono && <Icono size={12} />} {t}
      </button>
    ))}
  </div>
);

const SolicitudesPage = () => {
  const [sp, setSp] = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrl(sp), [sp]);
  const vista = (sp.get('vista') || leerVista()) === 'kanban' ? 'kanban' : 'tabla';
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [panel, setPanel] = useState(false);
  const [conCerradas, setConCerradas] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [opciones, setOpciones] = useState({ empresas: [], asesores: [] });

  const cambiar = useCallback((k, v) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      if (v) n.set(k, v); else n.delete(k);
      if (k === 'todas' && !v) n.delete('asesor');   // sin ver las de todos no hay asesor que filtrar
      return n;
    }, { replace: true });
  }, [setSp]);

  const limpiar = () => setSp((prev) => {
    const n = new URLSearchParams();
    for (const k of ['q', 'todas', 'vista', 'orden', 'dir']) if (prev.get(k)) n.set(k, prev.get(k));
    return n;
  }, { replace: true });

  const elegirVista = (v) => { guardarVista(v); cambiar('vista', v); };

  const ordenar = (clave) => {
    const desc = filtros.orden === clave ? filtros.dir === 'desc' : ['valor', 'dias', 'fecha'].includes(clave);
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('orden', clave); n.set('dir', filtros.orden === clave ? (desc ? 'asc' : 'desc') : (desc ? 'desc' : 'asc')); return n; }, { replace: true });
  };

  // Catálogos para los filtros
  useEffect(() => { apiService.get('/creditos/categorias').then(({ data }) => setCategorias(Array.isArray(data) ? data : [])).catch(() => {}); }, []);
  useEffect(() => {
    apiService.get('/creditos/filtros', { params: filtros.todas ? { todas: 1 } : undefined }).then(({ data }) => setOpciones({ empresas: data?.empresas ?? [], asesores: data?.asesores ?? [] })).catch(() => {});
  }, [filtros.todas]);

  // Lista y resumen (el tablero muestra todos los estados: no filtra por estado)
  const claveConsulta = JSON.stringify([aParams(filtros, { sinEstado: vista === 'kanban' }), vista]);
  useEffect(() => {
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const [lista, res] = await Promise.all([
          apiService.get('/creditos', { params: aParams(filtros, { sinEstado: vista === 'kanban' }) }),
          apiService.get('/creditos/resumen', { params: aParams(filtros, { sinEstado: true, sinOrden: true }) }),
        ]);
        setFilas(lista.data);
        setResumen(res.data);
      } catch (err) {
        if (err.response?.status === 403) toast.error('No tienes permiso para ver los créditos');
        else toast.error(mensajeError(err, 'No se pudieron cargar las solicitudes'));
      } finally { setCargando(false); }
    }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConsulta]);

  // Los estados en el orden del flujo (no en el que devuelva la base)
  const totalEstados = [...(resumen?.estados ?? [])].sort((a, b) => ORDEN_ESTADOS.indexOf(a.estado) - ORDEN_ESTADOS.indexOf(b.estado));
  // Lo que corresponde a lo que se ve: en la tabla con un estado elegido, solo ese estado; en los demás casos, todo
  const visibles = vista === 'tabla' && filtros.estado ? totalEstados.filter((e) => e.estado === filtros.estado) : totalEstados;
  const total = visibles.reduce((a, e) => a + e.n, 0);
  const valorTotal = visibles.reduce((a, e) => a + e.valor, 0);
  const truncado = resumen ? Math.max(0, total - filas.length) : 0;

  const exportar = () => {
    const blob = new Blob([filasACsv(filas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `creditos_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div>
      {/* Barra principal: búsqueda, alcance, vista y nueva solicitud */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {/* Los controles de la derecha no cambian entre tabla y tablero, así la búsqueda mantiene siempre el mismo ancho */}
        <div className="relative min-w-[260px] flex-[1_1_320px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={filtros.q ?? ''} onChange={(e) => cambiar('q', e.target.value)} placeholder="Buscar por radicado, cédula o nombre" className={`${campo} pl-8`} aria-label="Buscar solicitudes" />
        </div>
        <Segmentado etiqueta="Alcance" valor={filtros.todas ? 'todas' : 'mias'} onCambiar={(v) => cambiar('todas', v === 'todas' ? '1' : '')}
          opciones={[['mias', 'MÍAS'], ['todas', 'TODOS LOS ASESORES']]} titulo="Ver las de todos los asesores requiere administrar créditos" />
        <Segmentado etiqueta="Vista" valor={vista} onCambiar={elegirVista} opciones={[['tabla', 'TABLA', List], ['kanban', 'TABLERO', Columns3]]} />
        <Link to="/creditos/nueva" className={botonPrimario}><Plus size={13} /> NUEVA SOLICITUD</Link>
      </div>

      <FiltrosLista filtros={filtros} onCambiar={cambiar} onLimpiar={limpiar} opciones={{ categorias, ...opciones }} abierto={panel} onAbrir={setPanel} soloTabla={vista === 'kanban'} />

      {/* Resumen: en la tabla las cifras filtran por estado; en el tablero cada columna trae la suya */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]" aria-label="Resumen de la lista">
        <span className="mr-1 text-slate-400">{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'solicitud' : 'solicitudes'} · ${moneda(valorTotal)} solicitado`}</span>
        {vista === 'tabla' && totalEstados.map((e) => (
          <button key={e.estado} type="button" onClick={() => cambiar('estado', filtros.estado === e.estado ? '' : e.estado)} aria-pressed={filtros.estado === e.estado}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide ${filtros.estado === e.estado ? 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16]' : 'border-slate-700 text-[#a0d4e0] hover:border-slate-500'}`}>
            {ESTADOS[e.estado]?.t ?? e.estado} · {e.n}
          </button>
        ))}
        {vista === 'kanban' && (
          <button type="button" aria-pressed={conCerradas} onClick={() => setConCerradas((v) => !v)}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide ${conCerradas ? 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16]' : 'border-slate-700 text-[#a0d4e0] hover:border-slate-500'}`}>
            {conCerradas ? '✓ ' : '+ '}RECHAZADAS Y DESISTIDAS
          </button>
        )}
        <button type="button" onClick={exportar} disabled={!filas.length} className={`${botonLinea} ml-auto`}><Download size={12} /> EXPORTAR CSV ({filas.length})</button>
      </div>
      {truncado > 0 && (
        <p role="status" className="mb-3 rounded-sm border border-amber-700/60 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          Se muestran las {filas.length} más recientes: hay {truncado} más que no caben. Afina los filtros para verlas.
        </p>
      )}

      {vista === 'tabla'
        ? <TablaCreditos filas={filas} mostrarAsesor={!!filtros.todas} orden={filtros.orden} dir={filtros.dir} onOrden={ordenar} vacio="Aún no hay solicitudes con esos filtros" />
        : <KanbanCreditos filas={filas} resumen={resumen} mostrarAsesor={!!filtros.todas} conCerradas={conCerradas} />}
    </div>
  );
};

export default SolicitudesPage;
