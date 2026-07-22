import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Play, Pause, Trophy, Loader2, ClipboardList, FileDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { exportarPDF } from '../../../services/exportService.js';
import BoletosGrid          from '../components/BoletosGrid.jsx';
import SolicitudesPanel     from '../components/SolicitudesPanel.jsx';
import EmpresasPanel        from '../components/EmpresasPanel.jsx';
import AsociadosSorteoPanel from '../components/AsociadosSorteoPanel.jsx';
const EstadisticasSorteoPanel = lazy(() => import('../components/EstadisticasSorteoPanel.jsx'));

const TABS = [
  { key: 'Boletos',       icon: 'ti-grid-dots' },
  { key: 'Solicitudes',   icon: 'ti-inbox' },
  { key: 'Empresas',      icon: 'ti-building' },
  { key: 'Participantes', icon: 'ti-users' },
  { key: 'Estadísticas',  icon: 'ti-chart-bar' },
  { key: 'Ganadores',     icon: 'ti-trophy' },
  { key: 'Logs',          icon: 'ti-list' },
];

const ACCION_COLOR = {
  COMPRA_DIRECTA:            'border-[#00e5ff33] text-[#00e5ff] bg-[#00e5ff0a]',
  ANULACION_DIRECTA:         'border-[#ff3d3d33] text-[#ff3d3d] bg-[#ff3d3d0a]',
  SOLICITUD_ADQUISICION:     'border-[#ffb70033] text-[#ffb700] bg-[#ffb7000a]',
  APROBACION:                'border-[#00e5ff33] text-[#00e5ff] bg-[#00e5ff0a]',
  RECHAZO:                   'border-[#ff3d3d33] text-[#ff3d3d] bg-[#ff3d3d0a]',
  CANCELACION_ASOCIADO:      'border-[#00e5ff11] text-[#6aacbc] bg-transparent',
  SOLICITUD_RETIRO:          'border-[#ff6b0033] text-orange-400 bg-[#ff6b000a]',
  APROBACION_RETIRO:         'border-[#00e5ff33] text-[#00e5ff] bg-[#00e5ff0a]',
  RECHAZO_RETIRO:            'border-[#ff3d3d33] text-[#ff3d3d] bg-[#ff3d3d0a]',
  LIBERACION_POR_RETIRO_CSV: 'border-[#00e5ff11] text-[#6aacbc] bg-transparent',
};

const StatCard = ({ label, value, color, barPct, barColor }) => (
  <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-3 relative overflow-hidden">
    <div
      className="absolute top-0 left-0 h-[2px] w-1/3"
      style={{ background: barColor, boxShadow: `0 0 8px ${barColor}` }}
    />
    <p className="text-[8px] text-[#6aacbc] tracking-[2px] mb-2 uppercase">{label}</p>
    <p className="text-2xl font-bold leading-none" style={{ color, textShadow: `0 0 12px ${color}66` }}>
      {value}
    </p>
    <div className="h-[1px] bg-[#0d1829] mt-3">
      <div
        className="h-[1px] transition-all"
        style={{ width: `${barPct}%`, background: barColor }}
      />
    </div>
  </div>
);

const DetalleSorteo = () => {
  const { id }                        = useParams();
  const { recargarSorteos }           = useOutletContext();
  const [sorteo, setSorteo]           = useState(null);
  const [tab, setTab]                 = useState('Boletos');
  const [boletos, setBoletos]         = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [ganadores, setGanadores]     = useState([]);
  const [logs, setLogs]               = useState([]);
  const [empresas, setEmpresas]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [toggling, setToggling]       = useState(false);
  const [numGanador, setNumGanador]   = useState('');
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
      <Loader2 size={24} className="animate-spin text-[#00e5ff44]" />
    </div>
  );

  if (!sorteo) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[#6aacbc] text-sm tracking-widest">SORTEO NO ENCONTRADO</p>
    </div>
  );

  const pendientes = solicitudes.length;
  const asignados  = boletos.filter((b) => b.estado === 'asignado').length;
  const libres     = boletos.filter((b) => b.estado === 'libre').length;
  const pendAdq    = boletos.filter((b) => b.estado === 'pendiente_adquisicion').length;
  const ocupPct    = Math.round((asignados / 1000) * 100);

  return (
    <div className="text-[#a0d4e0]">
      {/* Header */}
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[8px] text-[#6aacbc] tracking-[3px] mb-1">// MÓDULO SORTEOS · SECTOR 01</p>
            <h1
              className="text-xl font-bold text-[#00e5ff] tracking-[2px]"
              style={{ textShadow: '0 0 20px #00e5ff55' }}
            >
              {sorteo.nombre.toUpperCase()}
            </h1>
            {sorteo.descripcion && (
              <p className="text-[#6aacbc] text-[10px] mt-1 tracking-widest">{sorteo.descripcion.toUpperCase()}</p>
            )}
          </div>
          <button
            onClick={toggleEstado}
            disabled={toggling}
            className={`flex items-center gap-2 text-[10px] px-4 py-2 border transition-all tracking-widest rounded-sm ${
              sorteo.estado === 'activo'
                ? 'border-[#00e5ff55] bg-[#00e5ff11] text-[#00e5ff] hover:bg-[#00e5ff22]'
                : 'border-[#ff3d3d55] bg-[#ff3d3d11] text-[#ff3d3d] hover:bg-[#ff3d3d22]'
            }`}
          >
            {toggling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : sorteo.estado === 'activo' ? (
              <>
                <span
                  className="w-[6px] h-[6px] rounded-full bg-[#00e5ff] animate-pulse"
                  style={{ boxShadow: '0 0 8px #00e5ff' }}
                />
                ACTIVO · PAUSAR
              </>
            ) : (
              <>
                <Play size={12} />
                PAUSADO · ACTIVAR
              </>
            )}
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <StatCard label="Asignados"  value={asignados} color="#00e5ff" barPct={ocupPct}      barColor="#00e5ff" />
          <StatCard label="Disponibles" value={libres}   color="#3b82f6" barPct={libres / 10}  barColor="#3b82f6" />
          <StatCard label="Pendientes" value={pendAdq + pendientes} color="#ffb700" barPct={(pendAdq + pendientes) / 10} barColor="#ffb700" />
          <StatCard label="Ocupación"  value={`${ocupPct}%`} color="#a855f7" barPct={ocupPct} barColor="#a855f7" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#00e5ff11] px-8">
        {TABS.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] transition-all relative tracking-wider border-none bg-none ${
              tab === key ? 'text-[#00e5ff]' : 'text-[#6aacbc] hover:text-[#a0d4e0]'
            }`}
          >
            <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: 13 }} />
            {key === 'Boletos' || key === 'Logs' ? `[ ${key.toUpperCase()} ]` : key.toUpperCase()}
            {key === 'Solicitudes' && pendientes > 0 && (
              <span className="bg-[#ffb700] text-black text-[8px] px-1 py-0.5 rounded-sm font-bold">
                {pendientes}
              </span>
            )}
            {tab === key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[1px]"
                style={{ background: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-8 pt-5 pb-8">
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
          <Suspense fallback={<p className="text-[#6aacbc] text-sm tracking-widest">CARGANDO ESTADÍSTICAS...</p>}>
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
                  className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] w-56 font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={registrando}
                  className="flex items-center gap-2 border border-[#ffb70055] bg-[#ffb70011] hover:bg-[#ffb70022] disabled:opacity-40 text-[#ffb700] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
                >
                  {registrando ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
                  REGISTRAR GANADOR
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
                  className="flex items-center gap-2 px-4 py-2 border border-[#00e5ff22] hover:border-[#00e5ff55] text-[#6aacbc] hover:text-[#00e5ff] text-[10px] rounded-sm transition-all tracking-widest"
                >
                  <FileDown size={13} /> EXPORTAR PDF
                </button>
              )}
            </div>

            {ganadores.length === 0 ? (
              <p className="text-[#6aacbc] text-sm text-center py-10 tracking-widest">SIN GANADORES REGISTRADOS</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ganadores.map((g) => (
                  <div
                    key={g.id}
                    className="border border-[#ffb70033] bg-[#ffb70008] rounded-sm p-4 flex items-center gap-4"
                  >
                    <Trophy
                      size={20}
                      className="text-[#ffb700] shrink-0"
                      style={{ filter: 'drop-shadow(0 0 6px #ffb70066)' }}
                    />
                    <div>
                      <p className="text-[#ffb700] font-bold font-mono text-xl" style={{ textShadow: '0 0 10px #ffb70044' }}>
                        #{String(g.numero).padStart(3, '0')}
                      </p>
                      <p className="text-[#a0d4e0] text-sm">{g.nombre_completo}</p>
                      <p className="text-[#6aacbc] text-xs tracking-wider">{g.empresa_en_ese_momento}</p>
                      <p className="text-[#6aacbc] text-[10px] mt-0.5">{new Date(g.fecha_premiacion).toLocaleString('es-CO')}</p>
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
              <div className="flex flex-col items-center py-10 text-[#6aacbc]">
                <ClipboardList size={24} className="mb-2" />
                <p className="text-sm tracking-widest">SIN REGISTROS</p>
              </div>
            ) : logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 border border-[#00e5ff11] bg-[#08101e] rounded-sm p-3 text-[10px]">
                <span className={`px-2 py-0.5 border text-[9px] font-medium shrink-0 tracking-wider ${ACCION_COLOR[l.accion] ?? 'border-[#00e5ff11] text-[#6aacbc]'}`}>
                  {l.accion.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {l.numero != null && (
                      <span className="text-[#00e5ff] font-mono font-bold" style={{ textShadow: '0 0 8px #00e5ff44' }}>
                        #{String(l.numero).padStart(3, '0')}
                      </span>
                    )}
                    {l.asociado_codigo && <span className="text-[#a0d4e0]">{l.asociado_codigo}</span>}
                    {l.empleado_nombre && <span className="text-[#6aacbc]">· {l.empleado_nombre}</span>}
                  </div>
                  {l.detalle && <p className="text-[#6aacbc] mt-0.5 truncate">{l.detalle}</p>}
                </div>
                <span className="text-[#6aacbc] shrink-0">{new Date(l.created_at).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleSorteo;
