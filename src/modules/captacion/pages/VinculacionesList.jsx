import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2, RefreshCcw, Search, ShieldAlert, User, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { ESTADOS_VINCULACION, dinero, fecha, tiempoRelativo } from '../utils/formato.js';
import { Chip, Kpi, Paginacion, ProgresoSecciones } from '../components/panel/indicadores.jsx';

const POR_PAGINA = 25;

const FILTROS = [
  ['todas', 'Todas'], ['por_entregar', 'Por entregar'], ['en_proceso', 'En proceso'], ['entregadas', 'Entregadas'],
];
const ESTADO_DE_FILTRO = { por_entregar: 'solicitud_completa', en_proceso: 'borrador', entregadas: 'entregada' };

// Lo que le falta a una solicitud para poder entregarse (mismas reglas que el backend)
const faltantes = (v) => [
  !v.seccion_firma_at && 'firma',
  !v.seccion_pep_at && 'cumplimiento',
  !v.seccion_documentos_at && 'cédula',
  (v.valor_aporte === null || v.valor_aporte === undefined) && 'aporte',
].filter(Boolean);

const EstadoBadge = ({ estado }) => {
  const { label, cls } = ESTADOS_VINCULACION[estado] || ESTADOS_VINCULACION.borrador;
  return <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[9px] tracking-[1.5px] ${cls}`}>{label.toUpperCase()}</span>;
};

const Etiquetas = ({ v }) => {
  const falta = v.estado === 'entregada' ? [] : faltantes(v);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {v.debida_diligencia_ampliada && v.estado !== 'entregada' && (
        <span title="Respondió “Sí” en alguna pregunta de cumplimiento (PEP)"
              className="flex items-center gap-1 rounded border border-amber-700/50 bg-amber-900/20 px-1.5 py-0.5 text-[9px] tracking-wider text-amber-300">
          <ShieldAlert size={10} /> REVISAR PEP
        </span>
      )}
      {falta.length > 0 && v.estado !== 'entregada' && (
        <span className="text-[10px] text-slate-500">Falta: <span className="text-slate-400">{falta.join(', ')}</span></span>
      )}
    </div>
  );
};

const Identidad = ({ v }) => (
  <div className="min-w-0">
    <p className="truncate text-xs font-medium text-slate-200">{v.nombres} {v.apellidos}</p>
    <p className="truncate text-[10px] text-slate-500">CC {v.cedula} · {v.empresa_nombre || v.empresa_codigo}{v.asesor_nombre && <span className="ml-1.5 text-slate-400">· Asesor: {v.asesor_nombre}</span>}</p>
  </div>
);

const Aporte = ({ v }) => (
  v.valor_aporte === null || v.valor_aporte === undefined
    ? <span className="text-[10px] text-slate-700">—</span>
    : <div>
        <p className="text-xs tabular-nums text-slate-300">{dinero(v.valor_aporte)}</p>
        {v.periodicidad_descuento && <p className="text-[9px] capitalize text-slate-600">{v.periodicidad_descuento}</p>}
      </div>
);

const VinculacionesList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';
  const [deTodos, setDeTodos]   = useState(esAdmin);   // el admin ya ve las de todos por defecto
  const [lista, setLista]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(false);
  const [filtro, setFiltro]     = useState('todas');
  const [mes, setMes]           = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina]     = useState(1);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(false);
    apiService.get('/captacion/vinculaciones', { params: { alcance: deTodos ? 'todos' : 'mias' } })
      .then(({ data }) => setLista(data))
      .catch(() => { setError(true); toast.error('Error cargando vinculaciones'); })
      .finally(() => setCargando(false));
  }, [deTodos]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [filtro, mes, busqueda, deTodos]);

  const conteo = useMemo(() => ({
    por_entregar: lista.filter(v => v.estado === 'solicitud_completa').length,
    en_proceso:   lista.filter(v => v.estado === 'borrador').length,
    entregadas:   lista.filter(v => v.estado === 'entregada').length,
    pep:          lista.filter(v => v.debida_diligencia_ampliada && v.estado !== 'entregada').length,
  }), [lista]);

  const meses = useMemo(() => [...new Set(lista.map(v => String(v.created_at).slice(0, 7)))].sort().reverse(), [lista]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return lista.filter(v => {
      if (filtro !== 'todas' && v.estado !== ESTADO_DE_FILTRO[filtro]) return false;
      if (mes && !String(v.created_at).startsWith(mes)) return false;
      if (!q) return true;
      return `${v.nombres} ${v.apellidos}`.toLowerCase().includes(q) || (digitos && `${v.cedula}`.includes(digitos));
    });
  }, [lista, filtro, mes, busqueda]);

  const visibles = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  // El detalle solo lo abre el asesor dueño (o el admin); las ajenas se ven en el listado pero no se abren
  const puedeAbrir = (v) => esAdmin || v.asesor_uuid === user?.id;
  const ir = (v) => { if (puedeAbrir(v)) navigate(`/captacion/vinculaciones/${v.id}`); };
  const nombreMes = (m) => { const t = fecha(`${m}-15`, { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[9px] tracking-[3px] text-emerald-400/60">// CAPTACIÓN</p>
          <h1 className="text-lg font-bold tracking-wider text-slate-200">VINCULACIONES</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDeTodos(t => !t)} aria-pressed={deTodos}
                  title={deTodos ? 'Ver solo las vinculaciones que yo capté' : 'Ver las vinculaciones de todos los asesores'}
                  className={`flex items-center gap-1.5 rounded border px-3 py-2 text-[10px] font-bold tracking-wider transition-colors ${deTodos
                    ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300 hover:text-emerald-200'
                    : 'border-slate-700/50 text-slate-400 hover:border-emerald-700/50 hover:text-emerald-400'}`}>
            {deTodos ? <><User size={13} /> VER SOLO LAS MÍAS</> : <><Users size={13} /> VER LAS DE TODOS</>}
          </button>
          <button onClick={cargar} aria-label="Actualizar" title="Actualizar"
                  className="rounded border border-slate-700/50 p-2 text-slate-500 transition-colors hover:border-emerald-700/50 hover:text-emerald-400">
            <RefreshCcw size={14} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alerta: lo que espera acción del asesor */}
      {conteo.por_entregar > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-emerald-700/30 bg-emerald-900/10 p-3">
          <p className="text-xs text-emerald-200">
            <strong>{conteo.por_entregar}</strong> solicitud{conteo.por_entregar > 1 ? 'es' : ''} lista{conteo.por_entregar > 1 ? 's' : ''} para entregar a procesamiento.
          </p>
          {filtro !== 'por_entregar' && (
            <button onClick={() => setFiltro('por_entregar')} className="text-[11px] font-bold tracking-wider text-emerald-300 hover:text-emerald-200">VER →</button>
          )}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi etiqueta="Por entregar" valor={conteo.por_entregar} tono="emerald" activo={filtro === 'por_entregar'} onClick={() => setFiltro('por_entregar')} />
        <Kpi etiqueta="En proceso" valor={conteo.en_proceso} tono="amber" activo={filtro === 'en_proceso'} onClick={() => setFiltro('en_proceso')} />
        <Kpi etiqueta="Entregadas" valor={conteo.entregadas} tono="blue" activo={filtro === 'entregadas'} onClick={() => setFiltro('entregadas')} />
        <Kpi etiqueta="Revisar PEP" valor={conteo.pep} tono="amber" />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o cédula…" aria-label="Buscar vinculaciones"
                   className="w-full rounded border border-slate-700/50 bg-slate-900/40 py-2.5 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-600 transition-colors focus:border-emerald-600 focus:outline-none" />
            {busqueda && <button onClick={() => setBusqueda('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"><X size={12} /></button>}
          </div>
          {meses.length > 1 && (
            <select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Filtrar por mes"
                    className="rounded border border-slate-700/50 bg-slate-900/40 px-3 py-2.5 text-xs text-slate-300 focus:border-emerald-600 focus:outline-none sm:w-52">
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map(([k, l]) => <Chip key={k} activo={filtro === k} onClick={() => setFiltro(k)}>{l.toUpperCase()}</Chip>)}
        </div>
      </div>

      {cargando && lista.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-400" size={22} /></div>
      ) : error ? (
        <div className="rounded border border-red-900/40 bg-red-900/10 py-12 text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs text-red-300"><AlertTriangle size={14} /> No se pudieron cargar las vinculaciones.</p>
          <button onClick={cargar} className="text-xs text-emerald-400 hover:text-emerald-300">Reintentar</button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded border border-slate-800/40 py-14 text-center">
          <p className="text-xs tracking-widest text-slate-500">{lista.length === 0 ? 'SIN VINCULACIONES' : 'SIN RESULTADOS'}</p>
          <p className="mt-2 text-[11px] text-slate-600">
            {lista.length === 0 ? 'Aparecen cuando un prospecto empieza a llenar su formulario.'
              : <button onClick={() => { setFiltro('todas'); setMes(''); setBusqueda(''); }} className="text-emerald-400 hover:text-emerald-300">Limpiar filtros</button>}
          </p>
        </div>
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-hidden rounded border border-slate-800/50 md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  {['ASOCIADO', 'PROGRESO', 'APORTE', 'ESTADO', ''].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-left text-[9px] font-normal tracking-[2px] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map(v => (
                  <tr key={v.id} onClick={() => ir(v)} title={puedeAbrir(v) ? undefined : 'Captada por otro asesor'}
                      className={`group border-b ${puedeAbrir(v) ? 'cursor-pointer' : 'cursor-default opacity-80'} border-slate-800/40 transition-colors hover:bg-emerald-900/5`}>
                    <td className="px-4 py-3"><Identidad v={v} /><div className="mt-1"><Etiquetas v={v} /></div></td>
                    <td className="px-4 py-3"><ProgresoSecciones fila={v} /></td>
                    <td className="px-4 py-3"><Aporte v={v} /></td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={v.estado} />
                      <p className="mt-1 text-[10px] text-slate-600">
                        {v.estado === 'entregada' ? `Entregada ${tiempoRelativo(v.entregada_at)}`
                          : v.seccion_firma_at ? `Firmó ${tiempoRelativo(v.seccion_firma_at)}` : `Actualizada ${tiempoRelativo(v.updated_at)}`}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-slate-700 group-hover:text-slate-400">{puedeAbrir(v) && <ChevronRight size={14} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Móvil */}
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 md:hidden">
            {visibles.map(v => (
              <li key={v.id} className="min-w-0">
                <button onClick={() => ir(v)} disabled={!puedeAbrir(v)} className="block w-full disabled:cursor-default rounded border border-slate-800/60 bg-slate-900/30 p-3 text-left transition-colors hover:border-emerald-800/50">
                  <div className="flex items-start justify-between gap-2"><Identidad v={v} /><EstadoBadge estado={v.estado} /></div>
                  <div className="mt-2.5"><ProgresoSecciones fila={v} ancho="w-full" /></div>
                  <div className="mt-2.5 flex items-end justify-between gap-2">
                    <Etiquetas v={v} />
                    <Aporte v={v} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Paginacion pagina={pagina} total={filtradas.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </>
      )}
    </div>
  );
};

export default VinculacionesList;
