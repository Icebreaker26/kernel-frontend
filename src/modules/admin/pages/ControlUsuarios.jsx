import { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, AlertTriangle, BarChart2,
  X, ChevronRight, Clock, Zap, Globe, CheckCircle2, XCircle,
} from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

// ── Heatmap 12 semanas × 7 días ───────────────────────────────────────────────
// Columnas = semanas (0=más antigua, 11=esta semana)
// Filas = día de la semana (0=Dom … 6=Sáb)
const DIAS_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MES_LABEL  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function Heatmap({ data }) {
  const today  = new Date();
  const byDay  = {};
  data.forEach(d => { byDay[d.dia] = d.acciones; });
  const maxVal = Math.max(...Object.values(byDay), 1);

  // Construir 12×7 grid — [semana][diaSemana]
  // semana 0 = la más antigua (hace 11 semanas)
  const grid = [];
  const meses = [];
  for (let w = 0; w < 12; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const daysBack = (11 - w) * 7 + (6 - d);
      const date = new Date(today);
      date.setDate(today.getDate() - daysBack);
      const key = date.toISOString().slice(0, 10);
      const val = byDay[key] || 0;
      const intensity = val === 0 ? 0 : Math.max(0.18, val / maxVal);
      if (d === 0) meses.push({ mes: MES_LABEL[date.getMonth()], w });
      col.push({ key, val, intensity, date });
    }
    grid.push(col);
  }

  const CELL = 18;
  const GAP  = 3;

  return (
    <div className="select-none">
      {/* Etiquetas de mes */}
      <div className="flex mb-1 ml-10" style={{ gap: GAP }}>
        {grid.map(({ }, wi) => {
          const label = meses.find(m => m.w === wi);
          return (
            <div key={wi} style={{ width: CELL }} className="text-[9px] text-[#4a7a8a] text-center leading-none truncate">
              {label?.mes ?? ''}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {/* Etiquetas de día */}
        <div className="flex flex-col" style={{ gap: GAP }}>
          {DIAS_LABEL.map(d => (
            <div key={d} style={{ height: CELL }} className="text-[9px] text-[#4a7a8a] flex items-center justify-end pr-2 w-8">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        {grid.map((col, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
            {col.map(({ key, val, intensity, date }) => (
              <div
                key={key}
                title={`${date.toLocaleDateString('es-CO', { dateStyle: 'medium' })}: ${val} acciones`}
                style={{
                  width: CELL,
                  height: CELL,
                  backgroundColor: intensity === 0 ? '#0d1a26' : `rgba(0,229,255,${intensity})`,
                  borderRadius: 3,
                  cursor: 'default',
                  transition: 'opacity .15s',
                }}
                className="hover:opacity-70"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[9px] text-[#4a7a8a]">Menos</span>
        {[0, 0.2, 0.4, 0.65, 1].map((v, i) => (
          <div
            key={i}
            style={{
              width: 12, height: 12, borderRadius: 2,
              backgroundColor: v === 0 ? '#0d1a26' : `rgba(0,229,255,${v})`,
            }}
          />
        ))}
        <span className="text-[9px] text-[#4a7a8a]">Más</span>
      </div>
    </div>
  );
}

// ── Badge de módulo ───────────────────────────────────────────────────────────
const MODULO_COLOR = {
  tesoreria:       '#22d3ee',
  admin:           '#a855f7',
  control_interno: '#f59e0b',
  contable:        '#10b981',
  gerencia:        '#3b82f6',
  patronales:      '#ec4899',
  sorteos:         '#f97316',
  mailing:         '#8b5cf6',
};

function ModuloBadge({ nombre }) {
  const color = MODULO_COLOR[nombre] || '#6aacbc';
  return (
    <span
      className="px-2 py-0.5 rounded-[2px] text-[9px] tracking-wider font-bold whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}33` }}
    >
      {nombre?.toUpperCase()}
    </span>
  );
}

// ── Estado online ─────────────────────────────────────────────────────────────
function EstadoOnline({ lastActive }) {
  if (!lastActive) return <span className="text-[#4a5568] text-[10px]">Nunca</span>;
  const mins = Math.floor((Date.now() - new Date(lastActive)) / 60000);
  if (mins < 10)  return <span className="text-[#22c55e] text-[10px]">● En línea</span>;
  if (mins < 60)  return <span className="text-[#f59e0b] text-[10px]">● Hace {mins}m</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return <span className="text-[#f59e0b] text-[10px]">● Hace {hrs}h</span>;
  const dias = Math.floor(hrs / 24);
  return <span className="text-[#4a5568] text-[10px]">Hace {dias}d</span>;
}

// ── Modal de perfil de usuario ────────────────────────────────────────────────
function ModalUsuario({ usuario, onClose }) {
  const [tab, setTab]         = useState('actividad');
  const [datos, setDatos]     = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [toggling, setToggling] = useState(null);
  const [cargando, setCargando] = useState(true);

  const ACCIONES = ['READ', 'WRITE', 'DELETE'];

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    Promise.all([
      apiService.get(`/admin/usuarios/${usuario.id}/actividad`),
      apiService.get(`/admin/usuarios/${usuario.id}/permisos`),
      apiService.get('/admin/modulos'),
    ]).then(([act, perm, mods]) => {
      setDatos(act.data);
      setPermisos(perm.data);
      setModulos(mods.data);
    }).catch(() => {})
      .finally(() => setCargando(false));
  }, [usuario]);

  const tienePermiso = (modulo, accion) =>
    permisos.some(p => p.modulo === modulo && p.accion === accion);

  const toggle = async (modulo, accion) => {
    const key = `${modulo}:${accion}`;
    setToggling(key);
    try {
      const { data } = await apiService.patch(
        `/admin/usuarios/${usuario.id}/permisos/toggle`, { modulo, accion }
      );
      setPermisos(prev =>
        data.activo
          ? [...prev, { modulo, accion }]
          : prev.filter(p => !(p.modulo === modulo && p.accion === accion))
      );
      toast.success(data.activo ? `Permiso ${modulo}:${accion} dado` : `Permiso ${modulo}:${accion} quitado`);
    } catch {
      toast.error('Error al cambiar permiso');
    } finally {
      setToggling(null);
    }
  };

  if (!usuario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#060e1a] border border-[#00e5ff18] rounded-sm shadow-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0,229,255,0.06), 0 0 0 1px rgba(0,229,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-[#00e5ff10] shrink-0">
          <div className="flex items-center gap-6">
            {/* Avatar inicial */}
            <div
              className="w-14 h-14 rounded-sm flex items-center justify-center text-2xl font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #a855f722, #00e5ff11)',
                border: '1px solid #00e5ff22',
                color: '#a0d4e0',
              }}
            >
              {usuario.nombre?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-[#a0d4e0] text-xl font-bold tracking-wider">{usuario.nombre}</p>
              <p className="text-[#4a7a8a] text-sm mt-0.5">{usuario.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-[#a855f7] border border-[#a855f733] px-2 py-0.5 rounded-[2px] tracking-widest">
                  {usuario.rol?.toUpperCase()}
                </span>
                <EstadoOnline lastActive={usuario.last_active_at} />
                {!usuario.is_active && (
                  <span className="text-[10px] text-[#f87171] border border-[#f8717133] px-2 py-0.5 rounded-[2px]">INACTIVO</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="flex items-center gap-8 mr-8">
            {[
              { label: 'Acciones hoy',   value: usuario.acciones_hoy    ?? 0 },
              { label: 'Esta semana',     value: usuario.acciones_semana ?? 0 },
              { label: 'Min. activo hoy', value: usuario.minutos_hoy     ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[#00e5ff] text-2xl font-bold">{value}</p>
                <p className="text-[#4a7a8a] text-[9px] tracking-widest mt-0.5">{label.toUpperCase()}</p>
              </div>
            ))}
            {usuario.modulo_principal && (
              <div className="text-center">
                <ModuloBadge nombre={usuario.modulo_principal} />
                <p className="text-[#4a7a8a] text-[9px] tracking-widest mt-1.5">MÓDULO PRINCIPAL</p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="text-[#4a7a8a] hover:text-[#a0d4e0] transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-8 border-b border-[#00e5ff10] shrink-0">
          {[
            { id: 'actividad', label: 'ACTIVIDAD & HEATMAP' },
            { id: 'sesiones',  label: 'SESIONES' },
            { id: 'permisos',  label: 'PERMISOS' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 text-[10px] tracking-widest transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-[#00e5ff] border-[#00e5ff]'
                  : 'text-[#4a7a8a] border-transparent hover:text-[#6aacbc]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-8">
          {cargando ? (
            <div className="flex items-center justify-center h-40 text-[#4a7a8a] text-[10px] tracking-widest animate-pulse">
              CARGANDO...
            </div>
          ) : (
            <>
              {/* ── Actividad ─────────────────────────────────────────────── */}
              {tab === 'actividad' && datos && (
                <div className="space-y-8">
                  {/* Heatmap */}
                  <div>
                    <p className="text-[#4a7a8a] text-[9px] tracking-widest mb-4 uppercase">
                      Actividad — últimos 84 días
                    </p>
                    <div className="bg-[#040b14] border border-[#00e5ff0a] rounded-sm p-5 overflow-x-auto">
                      <Heatmap data={datos.heatmap} />
                    </div>
                  </div>

                  {/* Dos columnas: módulos + timeline */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Módulos */}
                    <div>
                      <p className="text-[#4a7a8a] text-[9px] tracking-widest mb-3 uppercase">Módulos (30 días)</p>
                      {datos.modulos.length === 0 ? (
                        <p className="text-[#2a4a5a] text-[11px] py-6 text-center">Sin actividad por módulo</p>
                      ) : (
                        <div className="space-y-2">
                          {datos.modulos.map(m => {
                            const pct = Math.round((m.total / datos.modulos[0].total) * 100);
                            return (
                              <div key={m.modulo} className="flex items-center gap-3">
                                <div className="w-28 shrink-0">
                                  <ModuloBadge nombre={m.modulo} />
                                </div>
                                <div className="flex-1 bg-[#0d1a26] rounded-full h-1.5">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: MODULO_COLOR[m.modulo] || '#00e5ff',
                                      opacity: 0.7,
                                    }}
                                  />
                                </div>
                                <span className="text-[#6aacbc] text-[11px] w-10 text-right font-bold">{m.total}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div>
                      <p className="text-[#4a7a8a] text-[9px] tracking-widest mb-3 uppercase">Últimas acciones</p>
                      {datos.timeline.length === 0 ? (
                        <p className="text-[#2a4a5a] text-[11px] py-6 text-center">Sin acciones registradas</p>
                      ) : (
                        <div className="space-y-0">
                          {datos.timeline.slice(0, 20).map((t, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-[#ffffff05]">
                              <span className="text-[#4a7a8a] text-[9px] w-8 shrink-0 font-bold">{t.metodo}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#6aacbc] text-[10px] truncate">{t.endpoint}</p>
                                <p className="text-[#2a4a5a] text-[8px] mt-0.5">
                                  {new Date(t.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              </div>
                              <ModuloBadge nombre={t.modulo} />
                              <span className={`text-[10px] w-8 text-right shrink-0 font-bold ${t.status_code >= 400 ? 'text-[#f87171]' : 'text-[#22c55e]'}`}>
                                {t.status_code}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sesiones ──────────────────────────────────────────────── */}
              {tab === 'sesiones' && datos && (
                <div>
                  <p className="text-[#4a7a8a] text-[9px] tracking-widest mb-4 uppercase">Últimos accesos al sistema</p>
                  {datos.sesiones.length === 0 ? (
                    <p className="text-[#2a4a5a] text-sm text-center py-12">Sin sesiones registradas</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {datos.sesiones.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 bg-[#040b14] border border-[#00e5ff0a] rounded-sm">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: i === 0 ? '#22c55e' : '#1e3a4a' }}
                          />
                          <div className="flex-1">
                            <p className="text-[#a0d4e0] text-sm font-bold">
                              {new Date(s.created_at).toLocaleString('es-CO', {
                                dateStyle: 'long', timeStyle: 'short',
                              })}
                            </p>
                            {s.ip && (
                              <p className="text-[#4a7a8a] text-[10px] mt-1 flex items-center gap-1.5">
                                <Globe size={10} /> {s.ip}
                              </p>
                            )}
                          </div>
                          {i === 0 && (
                            <span className="text-[9px] text-[#22c55e] border border-[#22c55e33] px-2 py-0.5 rounded-[2px]">
                              ÚLTIMO
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Permisos ──────────────────────────────────────────────── */}
              {tab === 'permisos' && (
                <div>
                  {usuario.rol === 'admin' ? (
                    <div className="flex items-center justify-center h-32 border border-[#a855f722] rounded-sm bg-[#a855f708]">
                      <p className="text-[#a855f7] text-sm">Admin — acceso total implícito, no se administran permisos individuales</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[#4a7a8a] text-[9px] tracking-widest mb-4 uppercase">Matriz de permisos — clic para toggle</p>
                      {/* Header */}
                      <div className="grid gap-2 px-4 pb-2 border-b border-[#ffffff08] mb-1"
                        style={{ gridTemplateColumns: '1fr 100px 100px 100px' }}
                      >
                        <span className="text-[9px] text-[#4a7a8a] tracking-widest">MÓDULO</span>
                        {ACCIONES.map(a => (
                          <span key={a} className="text-[9px] text-[#4a7a8a] tracking-widest text-center">{a}</span>
                        ))}
                      </div>
                      {/* Filas */}
                      <div className="space-y-0.5">
                        {modulos.map(m => (
                          <div
                            key={m.nombre}
                            className="grid gap-2 items-center px-4 py-3 hover:bg-[#00e5ff04] rounded-sm transition-colors"
                            style={{ gridTemplateColumns: '1fr 100px 100px 100px' }}
                          >
                            <ModuloBadge nombre={m.nombre} />
                            {ACCIONES.map(a => {
                              const key    = `${m.nombre}:${a}`;
                              const activo = tienePermiso(m.nombre, a);
                              return (
                                <button
                                  key={a}
                                  onClick={() => toggle(m.nombre, a)}
                                  disabled={toggling === key}
                                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-sm transition-all disabled:opacity-40 hover:bg-[#ffffff06]"
                                  title={activo ? `Quitar ${a}` : `Dar ${a}`}
                                >
                                  {activo ? (
                                    <CheckCircle2 size={18} className="text-[#22c55e]" />
                                  ) : (
                                    <XCircle size={18} className="text-[#1e3a4a]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'usuarios', label: 'USUARIOS',  icon: Users },
  { id: 'modulos',  label: 'MÓDULOS',   icon: BarChart2 },
  { id: 'alertas',  label: 'ALERTAS',   icon: AlertTriangle },
];

export default function ControlUsuarios() {
  const [tab, setTab]           = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [modulos, setModulos]   = useState([]);
  const [alertas, setAlertas]   = useState(null);
  const [modal, setModal]       = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro]     = useState('');

  const cargar = useCallback(async (t) => {
    setCargando(true);
    try {
      if (t === 'usuarios') {
        const { data } = await apiService.get('/admin/usuarios/resumen');
        setUsuarios(data);
      } else if (t === 'modulos') {
        const { data } = await apiService.get('/admin/modulos/adopcion');
        setModulos(data);
      } else if (t === 'alertas') {
        const { data } = await apiService.get('/admin/actividad/alertas');
        setAlertas(data);
      }
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(tab); }, [tab, cargar]);

  const usuariosFiltrados = usuarios.filter(u =>
    !filtro ||
    u.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    u.email?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[#a855f7] text-[8px] tracking-[4px] mb-0.5">// ADMIN</p>
        <h1 className="text-[#a0d4e0] text-lg font-bold tracking-wider">CONTROL DE USUARIOS</h1>
        <p className="text-[#4a7a8a] text-[10px] tracking-wider mt-0.5">Actividad, sesiones, permisos inline y alertas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#00e5ff10]">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[9px] tracking-widest transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-[#a855f7] border-[#a855f7]'
                  : 'text-[#4a7a8a] border-transparent hover:text-[#6aacbc]'
              }`}
            >
              <Icon size={11} /> {t.label}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <div className="text-center py-16 text-[#4a7a8a] text-[10px] tracking-widest animate-pulse">CARGANDO...</div>
      ) : (
        <>
          {/* ── Usuarios ─────────────────────────────────────────────────────── */}
          {tab === 'usuarios' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Filtrar por nombre o email…"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                className="w-full bg-[#060e1a] border border-[#00e5ff15] rounded-sm px-3 py-2 text-[10px] text-[#a0d4e0] placeholder-[#2a4a5a] focus:outline-none focus:border-[#00e5ff44]"
              />
              <div className="border border-[#00e5ff10] rounded-sm overflow-hidden">
                <div className="grid gap-3 px-5 py-2.5 bg-[#0d1a26] text-[8px] text-[#4a7a8a] tracking-widest border-b border-[#00e5ff08]"
                  style={{ gridTemplateColumns: '1fr 1fr 90px 110px 70px 120px 24px' }}
                >
                  <span>NOMBRE</span>
                  <span>EMAIL</span>
                  <span className="text-center">ESTADO</span>
                  <span className="text-center">ÚLTIMO ACCESO</span>
                  <span className="text-center">HOY</span>
                  <span className="text-center">MÓDULO PRINCIPAL</span>
                  <span />
                </div>
                {usuariosFiltrados.length === 0 && (
                  <p className="text-center py-10 text-[#4a5568] text-[11px]">Sin usuarios</p>
                )}
                {usuariosFiltrados.map(u => (
                  <div
                    key={u.id}
                    className="grid gap-3 items-center px-5 py-3.5 border-b border-[#ffffff04] hover:bg-[#00e5ff04] cursor-pointer transition-colors"
                    style={{ gridTemplateColumns: '1fr 1fr 90px 110px 70px 120px 24px' }}
                    onClick={() => setModal(u)}
                  >
                    <div>
                      <p className="text-[#a0d4e0] text-[11px] font-bold truncate">{u.nombre}</p>
                      <p className="text-[#4a7a8a] text-[9px] mt-0.5">{u.rol}</p>
                    </div>
                    <p className="text-[#4a7a8a] text-[10px] truncate">{u.email}</p>
                    <div className="text-center">
                      {u.is_active
                        ? <span className="text-[#22c55e] text-[9px]">● ACTIVO</span>
                        : <span className="text-[#f87171] text-[9px]">● INACTIVO</span>
                      }
                    </div>
                    <div className="text-center">
                      <EstadoOnline lastActive={u.last_active_at} />
                    </div>
                    <div className="text-center flex items-center justify-center gap-1">
                      <Activity size={10} className="text-[#00e5ff] opacity-60" />
                      <span className="text-[#a0d4e0] text-[11px] font-bold">{u.acciones_hoy}</span>
                    </div>
                    <div className="text-center">
                      {u.modulo_principal
                        ? <ModuloBadge nombre={u.modulo_principal} />
                        : <span className="text-[#2a4a5a] text-[9px]">—</span>
                      }
                    </div>
                    <ChevronRight size={13} className="text-[#2a4a5a]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Módulos ───────────────────────────────────────────────────────── */}
          {tab === 'modulos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modulos.length === 0 && (
                <p className="col-span-3 text-center py-12 text-[#4a5568] text-[11px]">
                  Sin datos de actividad (últimos 7 días)
                </p>
              )}
              {modulos.map(m => (
                <div key={m.modulo} className="bg-[#060e1a] border border-[#00e5ff10] rounded-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <ModuloBadge nombre={m.modulo} />
                    {m.errores > 0 && (
                      <span className="text-[9px] text-[#f87171] flex items-center gap-1">
                        <AlertTriangle size={10} /> {m.errores} errores
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'USUARIOS',   value: m.usuarios_activos },
                      { label: 'ACCIONES',   value: m.acciones_semana },
                      { label: 'PROM/DÍA',   value: m.promedio_diario },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[#00e5ff] text-xl font-bold">{value}</p>
                        <p className="text-[#4a7a8a] text-[8px] tracking-widest mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {m.ultimo_uso && (
                    <p className="text-[#2a4a5a] text-[9px] flex items-center gap-1.5">
                      <Clock size={9} />
                      {new Date(m.ultimo_uso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Alertas ───────────────────────────────────────────────────────── */}
          {tab === 'alertas' && alertas && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inactivos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} className="text-[#f59e0b]" />
                  <p className="text-[#f59e0b] text-[9px] tracking-widest font-bold">INACTIVOS +15 DÍAS</p>
                  <span className="ml-auto bg-[#f59e0b22] text-[#f59e0b] text-[9px] px-2 py-0.5 rounded-sm border border-[#f59e0b33]">
                    {alertas.inactivos.length}
                  </span>
                </div>
                {alertas.inactivos.length === 0 ? (
                  <p className="text-[#22c55e] text-[11px] text-center py-8 border border-[#22c55e15] rounded-sm bg-[#22c55e05]">
                    ✓ Sin usuarios inactivos
                  </p>
                ) : (
                  <div className="space-y-2">
                    {alertas.inactivos.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 px-4 py-3 bg-[#f59e0b05] border border-[#f59e0b15] rounded-sm cursor-pointer hover:border-[#f59e0b44] transition-colors"
                        onClick={() => setModal({ ...u, acciones_hoy: 0, acciones_semana: 0, minutos_hoy: 0 })}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[#a0d4e0] text-[11px] font-bold truncate">{u.nombre}</p>
                          <p className="text-[#4a7a8a] text-[10px] truncate">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#f59e0b] text-base font-bold">
                            {u.dias_inactivo === null ? '∞' : `${u.dias_inactivo}d`}
                          </p>
                          <p className="text-[#4a7a8a] text-[9px]">sin acceso</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Permisos zombie */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} className="text-[#f87171]" />
                  <p className="text-[#f87171] text-[9px] tracking-widest font-bold">PERMISOS ZOMBIE (+60 DÍAS SIN USO)</p>
                  <span className="ml-auto bg-[#f8717122] text-[#f87171] text-[9px] px-2 py-0.5 rounded-sm border border-[#f8717133]">
                    {alertas.zombies.length}
                  </span>
                </div>
                {alertas.zombies.length === 0 ? (
                  <p className="text-[#22c55e] text-[11px] text-center py-8 border border-[#22c55e15] rounded-sm bg-[#22c55e05]">
                    ✓ Sin permisos zombie
                  </p>
                ) : (
                  <div className="space-y-2">
                    {alertas.zombies.map((z, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 bg-[#f8717108] border border-[#f8717115] rounded-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#a0d4e0] text-[11px] font-bold truncate">{z.nombre}</p>
                          <p className="text-[#4a7a8a] text-[10px] truncate">{z.email}</p>
                        </div>
                        <ModuloBadge nombre={z.modulo} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && <ModalUsuario usuario={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
