import { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, AlertTriangle, BarChart2,
  X, ChevronRight, Clock, Zap, Globe, CheckCircle2, XCircle,
} from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

// ── Heatmap 12×7 ─────────────────────────────────────────────────────────────
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function Heatmap({ data }) {
  const today = new Date();
  const byDay = {};
  data.forEach(d => { byDay[d.dia] = d.acciones; });

  const maxVal = Math.max(...Object.values(byDay), 1);
  const cells = [];

  for (let w = 11; w >= 0; w--) {
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + d));
      const key = date.toISOString().slice(0, 10);
      const val = byDay[key] || 0;
      const intensity = val === 0 ? 0 : Math.max(0.15, val / maxVal);
      cells.push({ key, val, intensity, dow: date.getDay() });
    }
  }

  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        {DIAS.map(d => (
          <div key={d} className="w-[13px] text-center text-[7px] text-[#4a7a8a] leading-none">{d}</div>
        ))}
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(84, 13px)', gridTemplateRows: '13px' }}>
        {cells.map(({ key, val, intensity }) => (
          <div
            key={key}
            title={`${key}: ${val} acciones`}
            className="w-[13px] h-[13px] rounded-[2px] cursor-default transition-opacity hover:opacity-80"
            style={{
              backgroundColor: intensity === 0
                ? '#0d1a26'
                : `rgba(0,229,255,${intensity})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Badge de módulo ───────────────────────────────────────────────────────────
const MODULO_COLOR = {
  tesoreria:      '#22d3ee',
  admin:          '#a855f7',
  control_interno:'#f59e0b',
  contable:       '#10b981',
  gerencia:       '#3b82f6',
  patronales:     '#ec4899',
  sorteos:        '#f97316',
  mailing:        '#8b5cf6',
};

function ModuloBadge({ nombre }) {
  const color = MODULO_COLOR[nombre] || '#6aacbc';
  return (
    <span
      className="px-1.5 py-0.5 rounded-[2px] text-[8px] tracking-wider font-bold"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}33` }}
    >
      {nombre?.toUpperCase()}
    </span>
  );
}

// ── Estado online ─────────────────────────────────────────────────────────────
function EstadoOnline({ lastActive }) {
  if (!lastActive) return <span className="text-[#4a5568] text-[9px]">Nunca</span>;
  const mins = Math.floor((Date.now() - new Date(lastActive)) / 60000);
  if (mins < 10)  return <span className="text-[#22c55e] text-[9px]">● En línea</span>;
  if (mins < 60)  return <span className="text-[#f59e0b] text-[9px]">● Hace {mins}m</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return <span className="text-[#f59e0b] text-[9px]">● Hace {hrs}h</span>;
  const dias = Math.floor(hrs / 24);
  return <span className="text-[#4a5568] text-[9px]">Hace {dias}d</span>;
}

// ── Drawer de perfil de usuario ───────────────────────────────────────────────
function DrawerUsuario({ usuario, onClose }) {
  const [tab, setTab] = useState('actividad');
  const [datos, setDatos] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [toggling, setToggling] = useState(null);

  const ACCIONES = ['READ', 'WRITE', 'DELETE'];

  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      apiService.get(`/admin/usuarios/${usuario.id}/actividad`),
      apiService.get(`/admin/usuarios/${usuario.id}/permisos`),
      apiService.get('/admin/modulos'),
    ]).then(([act, perm, mods]) => {
      setDatos(act.data);
      setPermisos(perm.data);
      setModulos(mods.data);
    }).catch(() => {});
  }, [usuario]);

  const tienePermiso = (modulo, accion) =>
    permisos.some(p => p.modulo === modulo && p.accion === accion);

  const toggle = async (modulo, accion) => {
    const key = `${modulo}:${accion}`;
    setToggling(key);
    try {
      const { data } = await apiService.patch(`/admin/usuarios/${usuario.id}/permisos/toggle`, { modulo, accion });
      if (data.activo) {
        setPermisos(prev => [...prev, { modulo, accion }]);
      } else {
        setPermisos(prev => prev.filter(p => !(p.modulo === modulo && p.accion === accion)));
      }
    } catch {
      toast.error('Error al cambiar permiso');
    } finally {
      setToggling(null);
    }
  };

  if (!usuario) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#060e1a] border-l border-[#00e5ff15] flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#00e5ff10]">
          <div>
            <p className="text-[#a0d4e0] text-sm font-bold tracking-wider">{usuario.nombre?.toUpperCase()}</p>
            <p className="text-[#4a7a8a] text-[10px] mt-0.5">{usuario.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] text-[#a855f7] border border-[#a855f733] px-1.5 py-0.5 rounded-[2px] tracking-wider">
                {usuario.rol?.toUpperCase()}
              </span>
              <EstadoOnline lastActive={usuario.last_active_at} />
            </div>
          </div>
          <button onClick={onClose} className="text-[#4a7a8a] hover:text-[#a0d4e0] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-px bg-[#00e5ff08] border-b border-[#00e5ff10]">
          {[
            { label: 'HOY', value: usuario.acciones_hoy },
            { label: '7 DÍAS', value: usuario.acciones_semana },
            { label: 'MIN HOY', value: usuario.minutos_hoy },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#060e1a] px-4 py-3 text-center">
              <p className="text-[#00e5ff] text-lg font-bold">{value ?? 0}</p>
              <p className="text-[#4a7a8a] text-[8px] tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#00e5ff10] px-4">
          {[
            { id: 'actividad', label: 'ACTIVIDAD' },
            { id: 'sesiones',  label: 'SESIONES' },
            { id: 'permisos',  label: 'PERMISOS' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-[9px] tracking-widest transition-colors border-b-2 ${
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
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'actividad' && datos && (
            <div className="space-y-6">
              {/* Heatmap */}
              <div>
                <p className="text-[#4a7a8a] text-[8px] tracking-widest mb-3">ACTIVIDAD — ÚLTIMOS 84 DÍAS</p>
                <div className="overflow-x-auto pb-1">
                  <Heatmap data={datos.heatmap} />
                </div>
              </div>

              {/* Módulos */}
              {datos.modulos.length > 0 && (
                <div>
                  <p className="text-[#4a7a8a] text-[8px] tracking-widest mb-2">MÓDULOS (30 DÍAS)</p>
                  <div className="space-y-1.5">
                    {datos.modulos.map(m => {
                      const pct = Math.round((m.total / datos.modulos[0].total) * 100);
                      return (
                        <div key={m.modulo} className="flex items-center gap-3">
                          <ModuloBadge nombre={m.modulo} />
                          <div className="flex-1 bg-[#0d1a26] rounded-full h-1">
                            <div
                              className="h-full rounded-full bg-[#00e5ff]"
                              style={{ width: `${pct}%`, opacity: 0.6 }}
                            />
                          </div>
                          <span className="text-[#4a7a8a] text-[9px] w-8 text-right">{m.total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {datos.timeline.length > 0 && (
                <div>
                  <p className="text-[#4a7a8a] text-[8px] tracking-widest mb-2">ÚLTIMAS ACCIONES</p>
                  <div className="space-y-1">
                    {datos.timeline.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-[#ffffff05]">
                        <ModuloBadge nombre={t.modulo} />
                        <span className="text-[#4a7a8a] text-[9px] font-bold w-10">{t.metodo}</span>
                        <span className="text-[#6aacbc] text-[9px] flex-1 truncate">{t.endpoint}</span>
                        <span className={`text-[9px] w-8 text-right ${t.status_code >= 400 ? 'text-[#f87171]' : 'text-[#4a7a8a]'}`}>
                          {t.status_code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'sesiones' && datos && (
            <div>
              <p className="text-[#4a7a8a] text-[8px] tracking-widest mb-3">ÚLTIMOS ACCESOS</p>
              {datos.sesiones.length === 0 ? (
                <p className="text-[#4a5568] text-[10px] text-center py-8">Sin sesiones registradas</p>
              ) : (
                <div className="space-y-2">
                  {datos.sesiones.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[#ffffff05]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] opacity-60" />
                      <div className="flex-1">
                        <p className="text-[#a0d4e0] text-[9px]">
                          {new Date(s.created_at).toLocaleString('es-CO', {
                            dateStyle: 'medium', timeStyle: 'short',
                          })}
                        </p>
                        {s.ip && <p className="text-[#4a7a8a] text-[8px] mt-0.5 flex items-center gap-1"><Globe size={8} />{s.ip}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'permisos' && (
            <div>
              <p className="text-[#4a7a8a] text-[8px] tracking-widest mb-3">MATRIZ DE PERMISOS</p>
              {usuario.rol === 'admin' ? (
                <p className="text-[#a855f7] text-[10px] text-center py-6 border border-[#a855f722] rounded-sm bg-[#a855f708]">
                  Admin — acceso total implícito
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 pb-1 border-b border-[#ffffff08]">
                    <span className="text-[8px] text-[#4a7a8a] tracking-widest">MÓDULO</span>
                    {ACCIONES.map(a => (
                      <span key={a} className="text-[8px] text-[#4a7a8a] tracking-widest w-10 text-center">{a}</span>
                    ))}
                  </div>
                  {modulos.map(m => (
                    <div key={m.nombre} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-1.5 hover:bg-[#00e5ff05] rounded-sm">
                      <ModuloBadge nombre={m.nombre} />
                      {ACCIONES.map(a => {
                        const key = `${m.nombre}:${a}`;
                        const activo = tienePermiso(m.nombre, a);
                        return (
                          <button
                            key={a}
                            onClick={() => toggle(m.nombre, a)}
                            disabled={toggling === key}
                            className="w-10 flex justify-center transition-opacity disabled:opacity-40"
                            title={activo ? `Quitar ${a}` : `Dar ${a}`}
                          >
                            {activo
                              ? <CheckCircle2 size={14} className="text-[#22c55e]" />
                              : <XCircle size={14} className="text-[#1e3a4a]" />
                            }
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'usuarios',  label: 'USUARIOS',  icon: Users },
  { id: 'modulos',   label: 'MÓDULOS',   icon: BarChart2 },
  { id: 'alertas',   label: 'ALERTAS',   icon: AlertTriangle },
];

export default function ControlUsuarios() {
  const [tab, setTab]           = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [modulos, setModulos]   = useState([]);
  const [alertas, setAlertas]   = useState(null);
  const [drawer, setDrawer]     = useState(null);
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
                {/* Header tabla */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2 bg-[#0d1a26] text-[8px] text-[#4a7a8a] tracking-widest border-b border-[#00e5ff08]">
                  <span>NOMBRE</span>
                  <span>EMAIL</span>
                  <span className="w-16 text-center">ESTADO</span>
                  <span className="w-20 text-center">ÚLTIMO ACCESO</span>
                  <span className="w-12 text-center">HOY</span>
                  <span className="w-16 text-center">MÓDULO PRINCIPAL</span>
                  <span className="w-6" />
                </div>
                {usuariosFiltrados.length === 0 && (
                  <p className="text-center py-8 text-[#4a5568] text-[10px]">Sin usuarios</p>
                )}
                {usuariosFiltrados.map(u => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-[#ffffff05] hover:bg-[#00e5ff04] cursor-pointer transition-colors"
                    onClick={() => setDrawer(u)}
                  >
                    <div>
                      <p className="text-[#a0d4e0] text-[10px] font-bold truncate">{u.nombre}</p>
                      <p className="text-[#4a7a8a] text-[9px]">{u.rol}</p>
                    </div>
                    <p className="text-[#4a7a8a] text-[9px] truncate">{u.email}</p>
                    <div className="w-16 text-center">
                      {u.is_active
                        ? <span className="text-[#22c55e] text-[8px]">● ACTIVO</span>
                        : <span className="text-[#f87171] text-[8px]">● INACTIVO</span>
                      }
                    </div>
                    <div className="w-20 text-center">
                      <EstadoOnline lastActive={u.last_active_at} />
                    </div>
                    <div className="w-12 text-center flex items-center justify-center gap-1">
                      <Activity size={10} className="text-[#00e5ff] opacity-60" />
                      <span className="text-[#a0d4e0] text-[10px]">{u.acciones_hoy}</span>
                    </div>
                    <div className="w-16 text-center">
                      {u.modulo_principal
                        ? <ModuloBadge nombre={u.modulo_principal} />
                        : <span className="text-[#2a4a5a] text-[8px]">—</span>
                      }
                    </div>
                    <ChevronRight size={12} className="text-[#2a4a5a]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Módulos ───────────────────────────────────────────────────────── */}
          {tab === 'modulos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modulos.length === 0 && (
                <p className="col-span-3 text-center py-12 text-[#4a5568] text-[10px]">
                  Sin datos de actividad (últimos 7 días)
                </p>
              )}
              {modulos.map(m => (
                <div key={m.modulo} className="bg-[#060e1a] border border-[#00e5ff10] rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <ModuloBadge nombre={m.modulo} />
                    {m.errores > 0 && (
                      <span className="text-[8px] text-[#f87171] flex items-center gap-1">
                        <AlertTriangle size={9} /> {m.errores} err
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[#00e5ff] text-base font-bold">{m.usuarios_activos}</p>
                      <p className="text-[#4a7a8a] text-[7px] tracking-wider">USUARIOS</p>
                    </div>
                    <div>
                      <p className="text-[#a0d4e0] text-base font-bold">{m.acciones_semana}</p>
                      <p className="text-[#4a7a8a] text-[7px] tracking-wider">ACCIONES</p>
                    </div>
                    <div>
                      <p className="text-[#a0d4e0] text-base font-bold">{m.promedio_diario}</p>
                      <p className="text-[#4a7a8a] text-[7px] tracking-wider">PROM/DÍA</p>
                    </div>
                  </div>
                  {m.ultimo_uso && (
                    <p className="text-[#2a4a5a] text-[8px] flex items-center gap-1">
                      <Clock size={8} />
                      Último uso: {new Date(m.ultimo_uso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
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
                  <span className="ml-auto bg-[#f59e0b22] text-[#f59e0b] text-[9px] px-2 py-0.5 rounded-sm">{alertas.inactivos.length}</span>
                </div>
                {alertas.inactivos.length === 0 ? (
                  <p className="text-[#22c55e] text-[10px] text-center py-6">✓ Sin usuarios inactivos</p>
                ) : (
                  <div className="space-y-1.5">
                    {alertas.inactivos.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2 bg-[#f59e0b08] border border-[#f59e0b15] rounded-sm cursor-pointer hover:border-[#f59e0b33] transition-colors"
                        onClick={() => setDrawer({ ...u, acciones_hoy: 0, acciones_semana: 0, minutos_hoy: 0 })}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[#a0d4e0] text-[10px] font-bold truncate">{u.nombre}</p>
                          <p className="text-[#4a7a8a] text-[9px] truncate">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#f59e0b] text-[10px] font-bold">
                            {u.dias_inactivo === null ? '∞' : `${u.dias_inactivo}d`}
                          </p>
                          <p className="text-[#4a7a8a] text-[8px]">sin acceso</p>
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
                  <span className="ml-auto bg-[#f8717122] text-[#f87171] text-[9px] px-2 py-0.5 rounded-sm">{alertas.zombies.length}</span>
                </div>
                {alertas.zombies.length === 0 ? (
                  <p className="text-[#22c55e] text-[10px] text-center py-6">✓ Sin permisos zombie</p>
                ) : (
                  <div className="space-y-1.5">
                    {alertas.zombies.map((z, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 bg-[#f8717108] border border-[#f8717115] rounded-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#a0d4e0] text-[10px] truncate">{z.nombre}</p>
                          <p className="text-[#4a7a8a] text-[9px] truncate">{z.email}</p>
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

      {/* Drawer */}
      {drawer && <DrawerUsuario usuario={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
