import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Play, Pause, Trophy, Loader2, ClipboardList, FileDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { exportarPDF } from '../../../services/exportService.js';
import BoletosGrid          from '../components/BoletosGrid.jsx';
import SolicitudesPanel     from '../components/SolicitudesPanel.jsx';
import EmpresasPanel        from '../components/EmpresasPanel.jsx';
import AsociadosSorteoPanel    from '../components/AsociadosSorteoPanel.jsx';
const EstadisticasSorteoPanel = lazy(() => import('../components/EstadisticasSorteoPanel.jsx'));

const TABS = ['Boletos', 'Solicitudes', 'Empresas', 'Participantes', 'Estadísticas', 'Ganadores', 'Logs'];

const ACCION_COLOR = {
  COMPRA_DIRECTA:           'bg-emerald-900/40 text-emerald-400',
  ANULACION_DIRECTA:        'bg-red-900/40 text-red-400',
  SOLICITUD_ADQUISICION:    'bg-amber-900/40 text-amber-400',
  APROBACION:               'bg-emerald-900/40 text-emerald-300',
  RECHAZO:                  'bg-red-900/40 text-red-300',
  CANCELACION_ASOCIADO:     'bg-slate-700 text-slate-400',
  SOLICITUD_RETIRO:         'bg-orange-900/40 text-orange-400',
  APROBACION_RETIRO:        'bg-emerald-900/40 text-emerald-300',
  RECHAZO_RETIRO:           'bg-red-900/40 text-red-300',
  LIBERACION_POR_RETIRO_CSV:'bg-slate-700 text-slate-400',
};

const DetalleSorteo = () => {
  const { id }                      = useParams();
  const { recargarSorteos }         = useOutletContext();
  const [sorteo, setSorteo]         = useState(null);
  const [tab, setTab]               = useState('Boletos');
  const [boletos, setBoletos]       = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [ganadores, setGanadores]   = useState([]);
  const [logs, setLogs]             = useState([]);
  const [empresas, setEmpresas]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);
  const [numGanador, setNumGanador] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const cargarSorteo = useCallback(async () => {
    const [{ data: lista }] = await Promise.all([apiService.get('/sorteos')]);
    const s = lista.find((x) => x.id === id);
    if (s) setSorteo(s);
  }, [id]);

  const cargarBoletos = useCallback(async () => {
    const { data } = await apiService.get(`/sorteos/${id}/boletos`);
    setBoletos(data);
  }, [id]);

  const cargarSolicitudes = useCallback(async () => {
    const { data } = await apiService.get(`/sorteos/${id}/solicitudes`);
    setSolicitudes(data);
  }, [id]);

  const cargarGanadores = useCallback(async () => {
    const { data } = await apiService.get(`/sorteos/${id}/ganadores`);
    setGanadores(data);
  }, [id]);

  const cargarLogs = useCallback(async () => {
    const { data } = await apiService.get(`/sorteos/${id}/logs`);
    setLogs(data);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([cargarSorteo(), cargarBoletos(), cargarSolicitudes()])
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'Ganadores') cargarGanadores();
    if (tab === 'Logs')      cargarLogs();
    if (tab === 'Empresas' && !empresas) apiService.get('/empresas').then(({ data }) => setEmpresas(data));
  }, [tab]);

  const refrescarTodo = () => {
    cargarBoletos();
    cargarSolicitudes();
    cargarSorteo();
    recargarSorteos();
  };

  const toggleEstado = async () => {
    setToggling(true);
    try {
      const { data } = await apiService.put(`/sorteos/${id}/estado`);
      setSorteo((prev) => ({ ...prev, ...data }));
      recargarSorteos();
      toast.success(`Sorteo ${data.estado}`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error');
    } finally {
      setToggling(false);
    }
  };

  const registrarGanador = async (e) => {
    e.preventDefault();
    setRegistrando(true);
    try {
      const { data } = await apiService.post(`/sorteos/${id}/ganador`, { numero: Number(numGanador) });
      toast.success(`¡Ganador registrado! ${data.nombre_completo}`);
      setNumGanador('');
      cargarGanadores();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al registrar ganador');
    } finally {
      setRegistrando(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-slate-600" />
    </div>
  );

  if (!sorteo) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-600 text-sm">Sorteo no encontrado</p>
    </div>
  );

  const pendientes = solicitudes.length;
  const asignados  = boletos.filter((b) => b.estado === 'asignado').length;

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{sorteo.nombre}</h1>
          {sorteo.descripcion && <p className="text-slate-500 text-xs mt-1">{sorteo.descripcion}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span>{asignados} / 1000 boletos asignados</span>
            {pendientes > 0 && (
              <span className="text-amber-400">{pendientes} solicitud{pendientes !== 1 ? 'es' : ''} pendiente{pendientes !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <button
          onClick={toggleEstado}
          disabled={toggling}
          className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg transition-colors ${
            sorteo.estado === 'activo'
              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-800'
              : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-800'
          }`}
        >
          {toggling
            ? <Loader2 size={13} className="animate-spin" />
            : sorteo.estado === 'activo' ? <Pause size={13} /> : <Play size={13} />}
          {sorteo.estado === 'activo' ? 'Pausar sorteo' : 'Activar sorteo'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs transition-colors relative ${
              tab === t
                ? 'text-emerald-400'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            {t}
            {t === 'Solicitudes' && pendientes > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black text-[9px] px-1 py-0.5 rounded font-bold">
                {pendientes}
              </span>
            )}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {tab === 'Boletos' && (
        <BoletosGrid sorteoId={id} boletos={boletos} onRefresh={refrescarTodo} />
      )}

      {tab === 'Solicitudes' && (
        <SolicitudesPanel sorteoId={id} solicitudes={solicitudes} onRefresh={refrescarTodo} />
      )}

      {tab === 'Empresas' && (
        <EmpresasPanel
          sorteoId={id}
          empresasHabilitadas={sorteo.empresas_habilitadas ?? []}
          empresasCacheadas={empresas}
          onToggle={(codigo, habilitada) =>
            setSorteo((prev) => ({
              ...prev,
              empresas_habilitadas: habilitada
                ? [...(prev.empresas_habilitadas ?? []), codigo]
                : (prev.empresas_habilitadas ?? []).filter((c) => c !== codigo),
            }))
          }
        />
      )}

      {tab === 'Participantes' && (
        <AsociadosSorteoPanel sorteoId={id} sorteoNombre={sorteo.nombre} />
      )}

      {tab === 'Estadísticas' && (
        <Suspense fallback={<p className="text-slate-500 text-sm">Cargando estadísticas...</p>}>
          <EstadisticasSorteoPanel sorteoId={id} sorteoNombre={sorteo.nombre} />
        </Suspense>
      )}

      {tab === 'Ganadores' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <form onSubmit={registrarGanador} className="flex gap-2">
            <input
              value={numGanador}
              onChange={(e) => setNumGanador(e.target.value)}
              placeholder="Número ganador (000-999)"
              type="number" min={0} max={999}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-56"
              required
            />
            <button
              type="submit"
              disabled={registrando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              {registrando ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
              Registrar ganador
            </button>
          </form>
            {ganadores.length > 0 && (
              <button
                onClick={() => exportarPDF({
                  titulo: `Ganadores — ${sorteo.nombre}`,
                  subtitulo: `Generado el ${new Date().toLocaleDateString('es-CO')}`,
                  columnas: [
                    { campo: 'numero',               header: 'Número' },
                    { campo: 'nombre_completo',       header: 'Ganador' },
                    { campo: 'empresa_en_ese_momento',header: 'Empresa' },
                    { campo: 'fecha_premiacion',      header: 'Fecha' },
                  ],
                  datos: ganadores.map((g) => ({
                    ...g,
                    numero: `#${String(g.numero).padStart(3, '0')}`,
                    fecha_premiacion: new Date(g.fecha_premiacion).toLocaleString('es-CO'),
                  })),
                  nombreArchivo: `ganadores_${sorteo.nombre.replace(/\s+/g, '_')}`,
                })}
                className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-amber-600/60 text-slate-400 hover:text-amber-400 text-xs rounded-lg transition-colors"
              >
                <FileDown size={13} /> Exportar PDF
              </button>
            )}
          </div>

          {ganadores.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-10">Sin ganadores registrados</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ganadores.map((g) => (
                <div key={g.id} className="border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <Trophy size={20} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-white font-bold font-mono text-lg">
                      #{String(g.numero).padStart(3, '0')}
                    </p>
                    <p className="text-white text-sm">{g.nombre_completo}</p>
                    <p className="text-slate-400 text-xs">{g.empresa_en_ese_momento}</p>
                    <p className="text-slate-600 text-xs">{new Date(g.fecha_premiacion).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Logs' && (
        <div className="flex flex-col gap-2">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-600">
              <ClipboardList size={24} className="mb-2" />
              <p className="text-sm">Sin registros</p>
            </div>
          ) : logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 border border-slate-800 rounded-lg p-3 text-xs">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${ACCION_COLOR[l.accion] ?? 'bg-slate-700 text-slate-400'}`}>
                {l.accion.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {l.numero != null && <span className="text-white font-mono font-bold">#{String(l.numero).padStart(3, '0')}</span>}
                  {l.asociado_codigo && <span className="text-slate-400">{l.asociado_codigo}</span>}
                  {l.empleado_nombre && <span className="text-slate-500">· {l.empleado_nombre}</span>}
                </div>
                {l.detalle && <p className="text-slate-500 mt-0.5 truncate">{l.detalle}</p>}
              </div>
              <span className="text-slate-600 shrink-0">{new Date(l.created_at).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetalleSorteo;
