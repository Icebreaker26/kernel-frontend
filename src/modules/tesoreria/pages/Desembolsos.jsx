import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Columns3, Download, LayoutGrid, List, Loader2, RefreshCw, Search } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import Segmentado from '../../creditos/components/Segmentado.jsx';
import { campo, botonLinea, moneda } from '../../creditos/lib/formato.js';
import FiltrosDesembolsos from '../components/FiltrosDesembolsos.jsx';
import TarjetaDesembolso from '../components/TarjetaDesembolso.jsx';
import TablaDesembolsos from '../components/TablaDesembolsos.jsx';
import KanbanDesembolsos from '../components/KanbanDesembolsos.jsx';
import { ModalDevolver, ModalPagar } from '../components/ModalesDesembolso.jsx';
import { TABS, aParamsTes, filasACsv, filtrosDeUrlTes, tabDeUrl, totalesPorEstado } from '../lib/desembolsos.js';

const ACCENT = '#34d399';
const VISTAS = ['tarjetas', 'tabla', 'kanban'];
const CLAVE_VISTA = 'tesoreria:vista';
const leerVista = () => { try { const v = localStorage.getItem(CLAVE_VISTA); return VISTAS.includes(v) ? v : 'tarjetas'; } catch { return 'tarjetas'; } };
const guardarVista = (v) => { try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento: la vista no se recuerda */ } };

/**
 * Desembolsos de crédito: una orden de pago por crédito aprobado por Control Interno, con a quién, cuánto y a qué cuenta.
 * Misma estructura que Créditos, Cartera y Control Interno (búsqueda, vistas, filtros con fichas, contadores reales y exportación); la vista de
 * tarjetas es la de origen porque para pagar importa ver cada orden completa y sin confusión.
 */
const Desembolsos = () => {
  const [sp, setSp] = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrlTes(sp), [sp]);
  const tab = tabDeUrl(sp.get('tab'));
  const pedida = sp.get('vista') || leerVista();
  const vista = VISTAS.includes(pedida) ? pedida : 'tarjetas';
  const [filas, setFilas] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [claveDatos, setClaveDatos] = useState(null);   // a qué consulta pertenecen las filas y el resumen que se ven
  const [cuentas, setCuentas] = useState([]);
  const [opciones, setOpciones] = useState({ empresas: [], aprobadores: [], cuentas: [] });
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(false);
  const [modal, setModal] = useState(null);   // { tipo: 'pagar' | 'devolver', orden }
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
    const desc = filtros.orden === clave ? filtros.dir === 'desc' : ['monto', 'dias'].includes(clave);
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('orden', clave); n.set('dir', filtros.orden === clave ? (desc ? 'asc' : 'desc') : (desc ? 'desc' : 'asc')); return n; }, { replace: true });
  };

  useEffect(() => { apiService.get('/tesoreria/cuentas').then(({ data }) => setCuentas(data)).catch(() => {}); }, []);
  useEffect(() => {
    apiService.get('/tesoreria/desembolsos/filtros').then(({ data }) => setOpciones({ empresas: data?.empresas ?? [], aprobadores: data?.aprobadores ?? [], cuentas: data?.cuentas ?? [] })).catch(() => {});
  }, [recarga]);

  // El tablero muestra todos los estados a la vez; las tarjetas y la tabla, el elegido. Los contadores no dependen de la pestaña.
  const estado = vista === 'kanban' ? 'todas' : tab;
  const claveConsulta = JSON.stringify([aParamsTes(filtros, { estado }), vista, recarga]);
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const [lista, res] = await Promise.all([
          apiService.get('/tesoreria/desembolsos', { params: aParamsTes(filtros, { estado }) }),
          apiService.get('/tesoreria/desembolsos/resumen', { params: aParamsTes(filtros, { sinOrden: true }) }),
        ]);
        setFilas(lista.data);
        setResumen(res.data);
        setClaveDatos(claveConsulta);
        setError('');
      } catch (err) { setError(err.response?.status === 403 ? 'No tienes permiso para ver los desembolsos.' : 'No se pudieron cargar los desembolsos.'); }
    }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConsulta]);

  const exportar = () => {
    const blob = new Blob([filasACsv(filas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `desembolsos_${vista === 'kanban' ? 'todos' : tab}_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const totales = totalesPorEstado(resumen);
  const activa = TABS.find((t) => t.clave === tab);
  const visibles = vista === 'kanban' ? Object.values(totales) : [totales[tab]];
  const total = visibles.reduce((a, t) => a + t.n, 0);
  const monto = visibles.reduce((a, t) => a + t.valor, 0);
  const truncado = resumen && filas && claveDatos === claveConsulta ? Math.max(0, total - filas.length) : 0;
  const alRecargar = () => { setModal(null); setRecarga((n) => n + 1); };

  return (
    <div className="p-6 font-mono text-[#a0d4e0]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[3px]" style={{ color: ACCENT }}>DESEMBOLSOS DE CRÉDITO</h2>
          <p className="mt-1 text-[11px] text-slate-500">Créditos aprobados por Control Interno. Cada orden dice a quién, cuánto y a qué cuenta se paga.</p>
        </div>
        <button type="button" onClick={() => setRecarga((n) => n + 1)} aria-label="Actualizar" className="rounded-sm border border-slate-700 p-2 hover:text-[#34d399]"><RefreshCw size={14} /></button>
      </div>

      {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}

      {/* Los controles de la derecha no cambian entre vistas, así la búsqueda mantiene siempre el mismo ancho */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-[1_1_320px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={filtros.q ?? ''} onChange={(e) => cambiar('q', e.target.value)} placeholder="Buscar por radicado, cédula, nombre, titular o referencia" className={`${campo} pl-8`} aria-label="Buscar desembolsos" />
        </div>
        <Segmentado etiqueta="Vista" acento="esmeralda" valor={vista} onCambiar={elegirVista} opciones={[['tarjetas', 'TARJETAS', LayoutGrid], ['tabla', 'TABLA', List], ['kanban', 'TABLERO', Columns3]]} />
      </div>

      <FiltrosDesembolsos filtros={filtros} onCambiar={cambiar} onLimpiar={limpiar} opciones={opciones} abierto={panel} onAbrir={setPanel} />

      {vista !== 'kanban' && (
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Estado de los desembolsos">
          {TABS.map((t) => (
            <button key={t.clave} type="button" title={t.ayuda} aria-pressed={tab === t.clave} onClick={() => cambiar('tab', t.clave === 'pendiente' ? '' : t.clave)}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${tab === t.clave ? 'border-[#34d39988] bg-[#34d39914] text-[#34d399]' : 'border-slate-800 text-[#6aacbc] hover:border-slate-600 hover:text-[#a0d4e0]'}`}>
              {t.titulo}
              <span className={`min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[10px] ${tab === t.clave ? 'bg-[#34d39933]' : 'bg-slate-800'}`} aria-label={`${totales[t.clave].n} desembolsos`}>{totales[t.clave].n}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]" aria-label="Resumen de desembolsos">
        <span className="text-slate-400">{!resumen ? 'Cargando…' : `${total} ${total === 1 ? 'desembolso' : 'desembolsos'} · ${moneda(monto)}`}</span>
        {vista !== 'kanban' && <span className="text-slate-600">· {activa.ayuda}</span>}
        <button type="button" onClick={exportar} disabled={!filas?.length} className={`${botonLinea} ml-auto`}><Download size={12} /> EXPORTAR CSV ({filas?.length ?? 0})</button>
      </div>
      {truncado > 0 && (
        <p role="status" className="mb-3 rounded-sm border border-amber-700/60 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          Se muestran los {filas.length} primeros: hay {truncado} más que no caben. Afina los filtros para verlos.
        </p>
      )}

      {!filas && !error && <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>}
      {filas && vista === 'tarjetas' && (
        filas.length === 0
          ? <p className="text-xs text-slate-500">{activa.vacio}</p>
          : <div className="grid gap-4 xl:grid-cols-2">{filas.map((o) => <TarjetaDesembolso key={o.id} o={o} onPagar={(x) => setModal({ tipo: 'pagar', orden: x })} onDevolver={(x) => setModal({ tipo: 'devolver', orden: x })} />)}</div>
      )}
      {filas && vista === 'tabla' && (
        <TablaDesembolsos filas={filas} orden={filtros.orden} dir={filtros.dir} onOrden={ordenar} vacio={activa.vacio}
          onPagar={(x) => setModal({ tipo: 'pagar', orden: x })} onDevolver={(x) => setModal({ tipo: 'devolver', orden: x })} />
      )}
      {filas && vista === 'kanban' && <KanbanDesembolsos filas={filas} totales={totales} onPagar={(x) => setModal({ tipo: 'pagar', orden: x })} />}

      {modal?.tipo === 'pagar' && <ModalPagar orden={modal.orden} cuentas={cuentas} onClose={() => setModal(null)} onPagado={alRecargar} />}
      {modal?.tipo === 'devolver' && <ModalDevolver orden={modal.orden} onClose={() => setModal(null)} onDevuelto={alRecargar} />}
    </div>
  );
};

export default Desembolsos;
