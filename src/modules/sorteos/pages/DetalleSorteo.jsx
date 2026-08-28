import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Play, Pause, Trophy, Loader2, ClipboardList, FileDown, Calendar, Trash2, Clock, AlertTriangle, X, CheckCircle, Search, UserSearch } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { exportarPDF } from '../../../services/exportService.js';
import BoletosGrid          from '../components/BoletosGrid.jsx';
import SolicitudesPanel     from '../components/SolicitudesPanel.jsx';
import EmpresasPanel        from '../components/EmpresasPanel.jsx';
import AsociadosSorteoPanel from '../components/AsociadosSorteoPanel.jsx';
import { coincideBusqueda } from '../../../utils/asociados.js';
const EstadisticasSorteoPanel = lazy(() => import('../components/EstadisticasSorteoPanel.jsx'));

// ── Buscador de asociado para override de ganador ────────────────────────────
const BuscadorAsociadoInline = ({ todos, onSelect }) => {
  const [q, setQ]           = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref                 = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    return todos.filter((a) => coincideBusqueda(q, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '')).slice(0, 6);
  }, [q, todos]);

  const seleccionar = (a) => { onSelect(a); setQ(''); setAbierto(false); };

  return (
    <div ref={ref} className="relative mt-3">
      <div className="flex items-center gap-2 bg-[#0d1829] border border-[#ffb70033] rounded-sm px-3 py-2 focus-within:border-[#ffb70077] transition-colors">
        <Search size={12} className="text-[#ffb700] shrink-0 opacity-60" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar por nombre, CC o empresa..."
          className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono tracking-wider"
        />
        {q && <button onClick={() => { setQ(''); setAbierto(false); }} className="text-[#6aacbc] hover:text-[#a0d4e0]"><X size={10} /></button>}
      </div>
      {abierto && resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#08101e] border border-[#ffb70033] rounded-sm overflow-hidden z-50" style={{ boxShadow: '0 0 20px #ffb70011' }}>
          {resultados.map((a) => (
            <button key={a.codigo} onMouseDown={() => seleccionar(a)} className="w-full text-left px-3 py-2.5 hover:bg-[#ffb7000a] transition-colors border-b border-[#ffb70011] last:border-0">
              <p className="text-[10px] text-[#a0d4e0]">{a.nombre} {a.apellido}</p>
              <p className="text-[9px] text-[#6aacbc] mt-0.5 font-mono">{a.codigo} · {a.nombre_empresa ?? '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TABS = [
  { key: 'Boletos',        icon: 'ti-grid-dots' },
  { key: 'Solicitudes',    icon: 'ti-inbox' },
  { key: 'Empresas',       icon: 'ti-building' },
  { key: 'Participantes',  icon: 'ti-users' },
  { key: 'Estadísticas',   icon: 'ti-chart-bar' },
  { key: 'Cobertura',      icon: 'ti-target' },
  { key: 'Ganadores',      icon: 'ti-trophy' },
  { key: 'Logs',           icon: 'ti-list' },
  { key: 'Programación',   icon: 'ti-calendar-event' },
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
  AUTO_CIERRE:               'border-[#ffb70033] text-[#ffb700] bg-[#ffb7000a]',
  AUTO_APERTURA:             'border-[#00ff9033] text-[#00ff90] bg-[#00ff900a]',
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

// ── Panel de Programación ────────────────────────────────────────────────────

const fmtLocal = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const estadoProg = (p) => {
  if (p.ejecutado_apertura) return { label: 'COMPLETADO', color: 'text-[#6aacbc] border-[#6aacbc33]' };
  if (p.ejecutado_cierre)   return { label: 'PAUSADO · ESPERANDO APERTURA', color: 'text-[#ffb700] border-[#ffb70033]' };
  return { label: 'PENDIENTE', color: 'text-[#00e5ff] border-[#00e5ff33]' };
};

const ProgramacionPanel = ({ sorteoId }) => {
  const [lista, setLista]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [guardando, setGuardando]   = useState(false);
  const [cierre, setCierre]         = useState('');
  const [apertura, setApertura]     = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    apiService.get(`/sorteos/${sorteoId}/programaciones`)
      .then(({ data }) => setLista(data))
      .catch(() => toast.error('Error cargando programaciones'))
      .finally(() => setLoading(false));
  }, [sorteoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!cierre || !apertura) return toast.error('Completa ambas fechas');
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/programaciones`, {
        fecha_cierre:   new Date(cierre).toISOString(),
        fecha_apertura: new Date(apertura).toISOString(),
      });
      toast.success('Programación guardada');
      setCierre(''); setApertura('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const eliminar = async (pid) => {
    try {
      await apiService.delete(`/sorteos/${sorteoId}/programaciones/${pid}`);
      toast.success('Programación eliminada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al eliminar');
    }
  };

  const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="space-y-8">
      {/* Formulario */}
      <div className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-5">
        <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-5 flex items-center gap-2">
          <Calendar size={11} /> AGREGAR PROGRAMACIÓN
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest block mb-2">FECHA DE CIERRE</label>
            <input
              type="datetime-local"
              value={cierre}
              min={minDatetime}
              onChange={e => {
                setCierre(e.target.value);
                if (apertura && e.target.value >= apertura) setApertura('');
              }}
              className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#00e5ff55]"
              style={{ colorScheme: 'dark' }}
            />
            <p className="text-[#6aacbc] text-[9px] mt-1">El sorteo se pausará automáticamente</p>
          </div>
          <div>
            <label className="text-[#6aacbc] text-[9px] tracking-widest block mb-2">FECHA DE APERTURA</label>
            <input
              type="datetime-local"
              value={apertura}
              min={cierre || minDatetime}
              onChange={e => setApertura(e.target.value)}
              className="w-full bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#00e5ff55]"
              style={{ colorScheme: 'dark' }}
            />
            <p className="text-[#6aacbc] text-[9px] mt-1">El sorteo se reactivará automáticamente</p>
          </div>
        </div>
        <button
          onClick={guardar}
          disabled={guardando || !cierre || !apertura}
          className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest border border-[#00e5ff33] text-[#00e5ff] bg-[#00e5ff11] hover:bg-[#00e5ff22] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Calendar size={12} />
          {guardando ? 'GUARDANDO...' : 'PROGRAMAR'}
        </button>
      </div>

      {/* Lista */}
      <div>
        <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-4">
          PROGRAMACIONES <span className="text-[#00e5ff]">({lista.length})</span>
        </p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#6aacbc]" /></div>
        ) : lista.length === 0 ? (
          <p className="text-[#6aacbc] text-sm tracking-widest text-center py-10">SIN PROGRAMACIONES</p>
        ) : (
          <div className="space-y-3">
            {lista.map((p) => {
              const est = estadoProg(p);
              return (
                <div key={p.id} className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] px-2 py-0.5 border tracking-widest ${est.color}`}>
                          {est.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Pause size={11} className="text-[#ffb700] shrink-0" />
                          <div>
                            <p className="text-[#6aacbc] text-[8px] tracking-widest">CIERRE</p>
                            <p className="text-[#a0d4e0] text-xs font-mono">{fmtLocal(p.fecha_cierre)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Play size={11} className="text-[#00ff90] shrink-0" />
                          <div>
                            <p className="text-[#6aacbc] text-[8px] tracking-widest">APERTURA</p>
                            <p className="text-[#a0d4e0] text-xs font-mono">{fmtLocal(p.fecha_apertura)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!p.ejecutado_cierre && (
                      <button
                        onClick={() => eliminar(p.id)}
                        className="text-[#ff3d3d66] hover:text-[#ff3d3d] transition-colors shrink-0 mt-1"
                        title="Eliminar programación"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [numGanador, setNumGanador]       = useState('');
  const [mesGanador, setMesGanador]       = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [previewGanador, setPreviewGanador]     = useState(null);
  const [loadingPreview, setLoadingPreview]     = useState(false);
  const [registrando, setRegistrando]           = useState(false);
  const [asociadoOverride, setAsociadoOverride] = useState(null);
  const [mostrarOverride, setMostrarOverride]   = useState(false);
  const [todosAsociados, setTodosAsociados]     = useState([]);
  const [editandoPrecio, setEditandoPrecio]   = useState(false);
  const [precioInput, setPrecioInput]         = useState('');
  const [toggleandoPago, setToggleandoPago]   = useState(false);
  const [editandoPremio, setEditandoPremio]   = useState(false);
  const [premioInput, setPremioInput]         = useState('');
  const [editandoLinea, setEditandoLinea]     = useState(false);
  const [lineaInput, setLineaInput]           = useState('');
  const [cobertura, setCobertura]             = useState(null);

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
    if (tab === 'Ganadores') {
      cargarGanadores();
      if (todosAsociados.length === 0) apiService.get('/asociados').then(({ data }) => setTodosAsociados(data)).catch(() => {});
    }
    if (tab === 'Logs')      cargarLogs();
    if (tab === 'Empresas' && !empresas) apiService.get('/empresas').then(({ data }) => setEmpresas(data));
    if (tab === 'Cobertura' && !cobertura) apiService.get(`/sorteos/${id}/cobertura`).then(({ data }) => setCobertura(data)).catch(() => setCobertura([]));
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

  const guardarPrecio = async (e) => {
    e.preventDefault();
    try {
      const { data } = await apiService.put(`/sorteos/${id}`, { precio_boleto: Number(precioInput) });
      setSorteo((prev) => ({ ...prev, precio_boleto: data.precio_boleto }));
      setEditandoPrecio(false);
      toast.success('Precio actualizado');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar precio');
    }
  };

  const guardarPremio = async (e) => {
    e.preventDefault();
    try {
      const { data } = await apiService.put(`/sorteos/${id}`, { premio: premioInput.trim() || null });
      setSorteo((prev) => ({ ...prev, premio: data.premio }));
      setEditandoPremio(false);
      toast.success('Premio actualizado');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar premio');
    }
  };

  const guardarLinea = async (e) => {
    e.preventDefault();
    const valor = lineaInput.trim() || null;
    try {
      const { data } = await apiService.put(`/sorteos/${id}`, { linea_reconciliacion: valor });
      setSorteo((prev) => ({ ...prev, linea_reconciliacion: data.linea_reconciliacion }));
      setEditandoLinea(false);
      toast.success(valor ? `Línea CSV ${valor} configurada` : 'Línea CSV eliminada');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar línea CSV');
    }
  };

  const toggleTipoPago = async () => {
    setToggleandoPago(true);
    const nuevo = sorteo.tipo_pago === 'unico' ? 'recurrente' : 'unico';
    try {
      const { data } = await apiService.put(`/sorteos/${id}`, { tipo_pago: nuevo });
      setSorteo((prev) => ({ ...prev, tipo_pago: data.tipo_pago }));
      toast.success(nuevo === 'unico' ? 'Sorteo marcado como pago único' : 'Sorteo marcado como recurrente');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al cambiar tipo de pago');
    } finally {
      setToggleandoPago(false);
    }
  };

  const buscarPreview = async (e) => {
    e.preventDefault();
    if (!numGanador) return;
    setLoadingPreview(true);
    setAsociadoOverride(null);
    setMostrarOverride(false);
    try {
      const { data } = await apiService.get(`/sorteos/${id}/boletos/${numGanador}/preview-ganador`);
      setPreviewGanador({ ...data, mes_premiacion: mesGanador });
      if (!data.nombre_completo) setMostrarOverride(true);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Número no encontrado');
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmarGanador = async () => {
    const ganadorFinal = asociadoOverride ?? previewGanador;
    if (!ganadorFinal.nombre_completo && !asociadoOverride) return;
    setRegistrando(true);
    try {
      const body = {
        numero:         previewGanador.numero,
        mes_premiacion: previewGanador.mes_premiacion,
      };
      if (asociadoOverride) body.asociado_codigo = asociadoOverride.codigo;
      const { data } = await apiService.post(`/sorteos/${id}/ganador`, body);
      toast.success(`¡Ganador registrado! ${data.nombre_completo ?? `#${String(data.numero).padStart(3, '0')}`}`);
      setPreviewGanador(null);
      setAsociadoOverride(null);
      setMostrarOverride(false);
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
      <div className="px-4 sm:px-8 pt-5 sm:pt-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
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
            {/* Precio bono — se usa en facturación de patronales */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[8px] text-[#4a6a7a] tracking-[2px]">PRECIO BONO</span>
              {editandoPrecio ? (
                <form onSubmit={guardarPrecio} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={precioInput}
                    onChange={(e) => setPrecioInput(e.target.value)}
                    className="bg-[#0d1829] border border-[#00e5ff55] text-[#00e5ff] text-[11px] px-2 py-0.5 w-28 rounded-sm font-mono focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="text-[9px] px-2 py-0.5 border border-[#00e5ff44] bg-[#00e5ff11] text-[#00e5ff] rounded-sm hover:bg-[#00e5ff22] tracking-wider">
                    OK
                  </button>
                  <button type="button" onClick={() => setEditandoPrecio(false)} className="text-[9px] text-[#6aacbc] hover:text-[#a0d4e0] px-1">
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setPrecioInput(sorteo.precio_boleto ?? 0); setEditandoPrecio(true); }}
                  className="text-[#00e5ff] text-[11px] font-bold hover:underline tracking-wide"
                  title="Clic para editar"
                >
                  ${Number(sorteo.precio_boleto ?? 0).toLocaleString('es-CO')}
                </button>
              )}
            </div>
            {/* Línea CSV para reconciliación */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[8px] text-[#4a6a7a] tracking-[2px]">LÍNEA CSV</span>
              {editandoLinea ? (
                <form onSubmit={guardarLinea} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    value={lineaInput}
                    onChange={(e) => setLineaInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 15"
                    className="bg-[#0d1829] border border-[#00e5ff55] text-[#00e5ff] text-[11px] px-2 py-0.5 w-20 rounded-sm font-mono focus:outline-none placeholder:text-[#4a6a7a]"
                    autoFocus
                  />
                  <button type="submit" className="text-[9px] px-2 py-0.5 border border-[#00e5ff44] bg-[#00e5ff11] text-[#00e5ff] rounded-sm hover:bg-[#00e5ff22] tracking-wider">
                    OK
                  </button>
                  <button type="button" onClick={() => setEditandoLinea(false)} className="text-[9px] text-[#6aacbc] hover:text-[#a0d4e0] px-1">
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setLineaInput(sorteo.linea_reconciliacion ?? ''); setEditandoLinea(true); }}
                  className="text-[11px] font-bold hover:underline tracking-wide"
                  style={{ color: sorteo.linea_reconciliacion ? '#00e5ff' : '#4a6a7a' }}
                  title="Clic para editar — número de línea del CSV para auditoría de cobros"
                >
                  {sorteo.linea_reconciliacion ? `L${sorteo.linea_reconciliacion}` : '—'}
                </button>
              )}
            </div>
            {/* Tipo de pago */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[8px] text-[#4a6a7a] tracking-[2px]">TIPO PAGO</span>
              <button
                onClick={toggleTipoPago}
                disabled={toggleandoPago}
                className={`text-[9px] px-2 py-0.5 border rounded-sm tracking-widest font-bold transition-all ${
                  sorteo.tipo_pago === 'unico'
                    ? 'border-[#ffb70055] bg-[#ffb70011] text-[#ffb700] hover:bg-[#ffb70022]'
                    : 'border-[#00e5ff33] bg-transparent text-[#6aacbc] hover:text-[#a0d4e0]'
                }`}
                title="Clic para alternar"
              >
                {sorteo.tipo_pago === 'unico' ? 'PAGO ÚNICO' : 'RECURRENTE'}
              </button>
            </div>
            {/* Premio */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[8px] text-[#4a6a7a] tracking-[2px]">PREMIO</span>
              {editandoPremio ? (
                <form onSubmit={guardarPremio} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={200}
                    value={premioInput}
                    onChange={(e) => setPremioInput(e.target.value)}
                    placeholder="Ej: Televisor 55&quot;"
                    className="bg-[#0d1829] border border-[#00e5ff55] text-[#00e5ff] text-[11px] px-2 py-0.5 w-48 rounded-sm font-mono focus:outline-none placeholder:text-[#4a6a7a]"
                    autoFocus
                  />
                  <button type="submit" className="text-[9px] px-2 py-0.5 border border-[#00e5ff44] bg-[#00e5ff11] text-[#00e5ff] rounded-sm hover:bg-[#00e5ff22] tracking-wider">
                    OK
                  </button>
                  <button type="button" onClick={() => setEditandoPremio(false)} className="text-[9px] text-[#6aacbc] hover:text-[#a0d4e0] px-1">
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setPremioInput(sorteo.premio ?? ''); setEditandoPremio(true); }}
                  className="text-[11px] font-bold hover:underline tracking-wide"
                  style={{ color: sorteo.premio ? '#ffd700' : '#4a6a7a' }}
                  title="Clic para editar"
                >
                  {sorteo.premio ?? '— SIN PREMIO DEFINIDO'}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={toggleEstado}
            disabled={toggling}
            className={`flex items-center gap-2 text-[10px] px-4 py-2 border transition-all tracking-widest rounded-sm shrink-0 self-start sm:self-auto ${
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <StatCard label="Asignados"  value={asignados} color="#00e5ff" barPct={ocupPct}      barColor="#00e5ff" />
          <StatCard label="Disponibles" value={libres}   color="#3b82f6" barPct={libres / 10}  barColor="#3b82f6" />
          <StatCard label="Pendientes" value={pendAdq + pendientes} color="#ffb700" barPct={(pendAdq + pendientes) / 10} barColor="#ffb700" />
          <StatCard label="Ocupación"  value={`${ocupPct}%`} color="#a855f7" barPct={ocupPct} barColor="#a855f7" />
        </div>
      </div>

      {/* Tabs */}
      <div className="relative">
        <div
          className="flex border-b border-[#00e5ff11] px-4 sm:px-8 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
        {TABS.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] transition-all relative tracking-wider border-none bg-none shrink-0 ${
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
        {/* Gradiente derecho — indica más tabs */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-[1px] w-12"
          style={{ background: 'linear-gradient(to right, transparent, #05080f)' }}
        />
      </div>

      {/* Contenido */}
      <div className="px-4 sm:px-8 pt-5 pb-8">
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

        {tab === 'Cobertura' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#6aacbc] text-[9px] tracking-[3px]">// COBERTURA POR EMPRESA — BONOS ASIGNADOS VS ASOCIADOS ACTIVOS</p>
              <p className="text-[#6aacbc] text-[9px] tracking-widest">ORDENADO: MENOR COBERTURA PRIMERO</p>
            </div>
            {!cobertura ? (
              <p className="text-[#6aacbc] text-[10px] tracking-widest text-center py-12">CARGANDO...</p>
            ) : cobertura.length === 0 ? (
              <p className="text-[#6aacbc] text-[10px] tracking-widest text-center py-12">SIN DATOS DE COBERTURA</p>
            ) : (
              <div className="space-y-2">
                {cobertura.map((row) => {
                  const pct = row.asociados_activos > 0
                    ? Math.round((row.bonos_asignados / row.asociados_activos) * 100)
                    : 0;
                  const barColor = pct >= 80 ? '#00e5ff' : pct >= 50 ? '#ffb700' : '#ff3d3d';
                  return (
                    <div key={row.codigo} className="bg-[#08101e] border border-[#00e5ff11] rounded-sm p-4">
                      {/* Nombre — fila propia para que pueda hacer salto de línea */}
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[8px] tracking-widest text-[#6aacbc] shrink-0 font-mono mt-0.5">{row.codigo}</span>
                        <span className="text-[#a0d4e0] text-xs leading-snug">{row.nombre}</span>
                      </div>
                      {/* Métricas + barra */}
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <p className="text-[8px] text-[#6aacbc] tracking-widest">BONOS</p>
                          <p className="text-[#a0d4e0] text-sm font-bold">{row.bonos_asignados}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-[#6aacbc] tracking-widest">ASOCIADOS</p>
                          <p className="text-[#a0d4e0] text-sm font-bold">{row.asociados_activos}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-[8px] text-[#6aacbc] tracking-widest">COBERTURA</p>
                          <p className="text-sm font-bold" style={{ color: barColor }}>{pct}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#0d1829] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%`, background: barColor, boxShadow: `0 0 6px ${barColor}66` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'Ganadores' && (
          <div>
            {/* Formulario de búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <form onSubmit={buscarPreview} className="flex gap-2 flex-wrap">
                <input
                  value={numGanador}
                  onChange={(e) => setNumGanador(e.target.value)}
                  placeholder="Número (000-999)"
                  type="number" min={0} max={999}
                  className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] w-40 font-mono"
                  required
                />
                <input
                  type="month"
                  value={mesGanador}
                  onChange={(e) => setMesGanador(e.target.value)}
                  className="bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] focus:outline-none focus:border-[#00e5ff55] font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={loadingPreview}
                  className="flex items-center gap-2 border border-[#ffb70055] bg-[#ffb70011] hover:bg-[#ffb70022] disabled:opacity-40 text-[#ffb700] text-[10px] px-4 py-2 rounded-sm transition-all tracking-widest"
                >
                  {loadingPreview ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
                  VERIFICAR
                </button>
              </form>
              {ganadores.length > 0 && (
                <button
                  onClick={() => exportarPDF({
                    titulo: `Ganadores — ${sorteo.nombre}`,
                    subtitulo: `Generado el ${new Date().toLocaleDateString('es-CO')}`,
                    columnas: [
                      { campo: 'mes_str',              header: 'Mes' },
                      { campo: 'numero',               header: 'Número' },
                      { campo: 'nombre_completo',       header: 'Ganador' },
                      { campo: 'asociado_cc',           header: 'CC' },
                      { campo: 'empresa_en_ese_momento',header: 'Empresa' },
                    ],
                    datos: ganadores.map((g) => ({
                      ...g,
                      mes_str: g.mes_premiacion
                        ? new Date(g.mes_premiacion.slice(0, 7) + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
                        : '—',
                      numero: `#${String(g.numero).padStart(3, '0')}`,
                    })),
                    nombreArchivo: `ganadores_${sorteo.nombre.replace(/\s+/g, '_')}`,
                  })}
                  className="flex items-center gap-2 px-4 py-2 border border-[#00e5ff22] hover:border-[#00e5ff55] text-[#6aacbc] hover:text-[#00e5ff] text-[10px] rounded-sm transition-all tracking-widest"
                >
                  <FileDown size={13} /> EXPORTAR PDF
                </button>
              )}
            </div>

            {/* Modal de confirmación */}
            {previewGanador && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-[#08101e] border border-[#ffb70044] rounded-sm p-6 w-full max-w-sm mx-4 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#ffb700] text-[10px] tracking-[3px] font-mono">// CONFIRMAR GANADOR</p>
                    <button onClick={() => setPreviewGanador(null)} className="text-[#6aacbc] hover:text-[#a0d4e0]">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="border border-[#ffb70022] bg-[#ffb7000a] rounded-sm p-4 mb-4">
                    <p className="text-[#ffb700] font-bold font-mono text-3xl mb-2" style={{ textShadow: '0 0 14px #ffb70066' }}>
                      #{String(previewGanador.numero).padStart(3, '0')}
                    </p>
                    <p className="text-[9px] text-[#6aacbc] tracking-[2px] mb-3">
                      MES: {new Date(previewGanador.mes_premiacion + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </p>

                    {/* Titular actual del boleto */}
                    {previewGanador.nombre_completo && !mostrarOverride ? (
                      <>
                        <p className="text-[#a0d4e0] font-semibold">{previewGanador.nombre_completo}</p>
                        <p className="text-[#6aacbc] text-xs tracking-wider">{previewGanador.nombre_empresa}</p>
                        {!previewGanador.is_active && (
                          <div className="flex items-center gap-1.5 mt-2 text-[#ffb700] text-[10px]">
                            <AlertTriangle size={12} />
                            <span>Este asociado está retirado actualmente</span>
                          </div>
                        )}
                        {previewGanador.estado !== 'asignado' && previewGanador.is_active && (
                          <div className="flex items-center gap-1.5 mt-2 text-[#ffb700] text-[10px]">
                            <AlertTriangle size={12} />
                            <span>Boleto en estado: {previewGanador.estado}</span>
                          </div>
                        )}
                        <button
                          onClick={() => { setMostrarOverride(true); setAsociadoOverride(null); }}
                          className="flex items-center gap-1 mt-3 text-[9px] text-[#6aacbc] hover:text-[#ffb700] transition-colors tracking-wider"
                        >
                          <UserSearch size={11} /> No es el correcto, seleccionar manualmente
                        </button>
                      </>
                    ) : (
                      <>
                        {!previewGanador.nombre_completo && (
                          <div className="flex items-center gap-2 text-[#ffb700] text-[10px] mb-2">
                            <AlertTriangle size={12} />
                            <span>Boleto sin titular actual — selecciona el ganador</span>
                          </div>
                        )}
                        {asociadoOverride ? (
                          <div className="mt-1">
                            <p className="text-[#a0d4e0] font-semibold">{asociadoOverride.nombre} {asociadoOverride.apellido}</p>
                            <p className="text-[#6aacbc] text-xs">{asociadoOverride.codigo} · {asociadoOverride.nombre_empresa ?? '—'}</p>
                            <button onClick={() => setAsociadoOverride(null)} className="text-[9px] text-[#6aacbc] hover:text-[#ffb700] mt-2 tracking-wider transition-colors">
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <BuscadorAsociadoInline todos={todosAsociados} onSelect={(a) => setAsociadoOverride(a)} />
                        )}
                        {previewGanador.nombre_completo && (
                          <button
                            onClick={() => { setMostrarOverride(false); setAsociadoOverride(null); }}
                            className="text-[9px] text-[#6aacbc] hover:text-[#a0d4e0] mt-3 tracking-wider transition-colors"
                          >
                            ← Usar titular actual
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-[#6aacbc] text-[11px] mb-4">
                    ¿Confirmas que <strong className="text-[#a0d4e0]">
                      {asociadoOverride
                        ? `${asociadoOverride.nombre} ${asociadoOverride.apellido}`
                        : (previewGanador.nombre_completo ?? 'este boleto')}
                    </strong> es el ganador del sorteo para este mes?
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPreviewGanador(null); setAsociadoOverride(null); setMostrarOverride(false); }}
                      className="flex-1 border border-[#00e5ff22] text-[#6aacbc] text-[10px] py-2 rounded-sm hover:border-[#00e5ff44] transition-all tracking-widest"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={confirmarGanador}
                      disabled={registrando || (!previewGanador.nombre_completo && !asociadoOverride) || (mostrarOverride && !asociadoOverride)}
                      className="flex-1 flex items-center justify-center gap-2 border border-[#ffb70055] bg-[#ffb70011] hover:bg-[#ffb70022] disabled:opacity-40 disabled:cursor-not-allowed text-[#ffb700] text-[10px] py-2 rounded-sm transition-all tracking-widest"
                    >
                      {registrando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      CONFIRMAR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de ganadores */}
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
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-0.5">
                        <p className="text-[#ffb700] font-bold font-mono text-xl" style={{ textShadow: '0 0 10px #ffb70044' }}>
                          #{String(g.numero).padStart(3, '0')}
                        </p>
                        {g.mes_premiacion && (
                          <span className="text-[9px] border border-[#ffb70033] text-[#ffb700] px-2 py-0.5 tracking-widest">
                            {new Date(g.mes_premiacion.slice(0, 7) + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[#a0d4e0] text-sm">{g.nombre_completo ?? '—'}</p>
                      {g.asociado_cc && (
                        <p className="text-[#6aacbc] text-[10px] tracking-wider">CC {g.asociado_cc}</p>
                      )}
                      <p className="text-[#6aacbc] text-xs tracking-wider">{g.empresa_en_ese_momento ?? (g.nombre_empresa ?? '—')}</p>
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
                <span className="text-[#6aacbc] shrink-0 whitespace-nowrap">{new Date(l.created_at).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Programación' && <ProgramacionPanel sorteoId={id} />}
      </div>
    </div>
  );
};

export default DetalleSorteo;
