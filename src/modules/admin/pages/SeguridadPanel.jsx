import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, Lock, LogOut, Eye, CheckCircle, XCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { useNotifications } from '../../../context/NotificationContext.jsx';

const ACCENT = '#a855f7';

const SEVERIDAD_CONFIG = {
  critica: { label: 'Crítica',  color: '#ef4444', bg: '#ef444415' },
  alta:    { label: 'Alta',     color: '#f97316', bg: '#f9731615' },
  media:   { label: 'Media',    color: '#eab308', bg: '#eab30815' },
  baja:    { label: 'Baja',     color: '#6b7280', bg: '#6b728015' },
};

const fmtTime = iso => iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ── Sección: Alertas ─────────────────────────────────────────────────────────
const SeccionAlertas = ({ alertasNuevas }) => {
  const [alertas, setAlertas]       = useState([]);
  const [filtro, setFiltro]         = useState('nueva');
  const [loading, setLoading]       = useState(true);
  const [detalle, setDetalle]       = useState(null);
  const [nota, setNota]             = useState('');
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get(`/seguridad/alertas?estado=${filtro}&limit=50`);
      setAlertas(data);
    } catch { } finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { setLoading(true); cargar(); }, [cargar]);

  const actualizar = async (id, estado) => {
    if (estado === 'falso_positivo' && !nota.trim()) {
      toast.error('Escribe una nota antes de marcar como falso positivo');
      return;
    }
    setProcesando(id);
    try {
      await apiService.patch(`/seguridad/alertas/${id}`, { estado, nota: nota || undefined });
      toast.success('Alerta actualizada');
      setDetalle(null);
      setNota('');
      cargar();
    } catch { toast.error('Error al actualizar alerta'); }
    finally { setProcesando(null); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {['nueva', 'reconocida', 'resuelta', 'falso_positivo', 'todas'].map(e => (
          <button key={e}
            onClick={() => setFiltro(e)}
            className="px-4 py-1.5 text-xs tracking-wider rounded-sm border transition-all"
            style={{
              borderColor: filtro === e ? `${ACCENT}55` : '#a855f722',
              background:  filtro === e ? `${ACCENT}15` : 'transparent',
              color:       filtro === e ? ACCENT : '#6aacbc',
            }}
          >
            {e.replace('_', ' ').toUpperCase()}
            {e === 'nueva' && alertasNuevas > 0 && (
              <span className="ml-2 bg-[#ef4444] text-white text-[10px] px-1.5 py-0.5 rounded-sm">{alertasNuevas}</span>
            )}
          </button>
        ))}
        <button onClick={cargar} className="ml-auto text-[#6aacbc] hover:text-[#a855f7] transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <p className="text-[#6aacbc] text-sm">Cargando alertas...</p>
      ) : alertas.length === 0 ? (
        <div className="text-center py-14 border border-[#a855f711] rounded-sm">
          <ShieldCheck size={40} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
          <p className="text-[#6aacbc] text-sm">
            Sin alertas {filtro !== 'todas' ? `con estado "${filtro.replace('_', ' ')}"` : ''} en las últimas 24 horas
          </p>
          <p className="text-[#a855f766] text-xs mt-1">Última revisión: {fmtTime(new Date().toISOString())}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alertas.map(a => {
            const sev = SEVERIDAD_CONFIG[a.severidad] ?? SEVERIDAD_CONFIG.baja;
            return (
              <div key={a.id} className="border rounded-sm p-4"
                style={{ borderColor: `${sev.color}33`, background: sev.bg }}>
                <div className="flex items-start gap-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-sm shrink-0 mt-0.5"
                    style={{ background: sev.color, color: '#000' }}>
                    {sev.label.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e2e8f0] text-sm leading-snug">{a.titulo}</p>
                    {a.usuario_nombre && (
                      <p className="text-[#6aacbc] text-xs mt-1 flex items-center gap-1">
                        <User size={12} />{a.usuario_nombre} · {a.usuario_email}
                      </p>
                    )}
                    <p className="text-[#6aacbc99] text-xs mt-1">
                      {fmtTime(a.ultima_vez_at)}
                      {a.ocurrencias > 1 && ` · ${a.ocurrencias} ocurrencias`}
                    </p>
                  </div>
                  {a.estado === 'nueva' && (
                    <button onClick={() => setDetalle(detalle?.id === a.id ? null : a)}
                      className="shrink-0 text-[#6aacbc] hover:text-[#a855f7] transition-colors p-1">
                      <Eye size={18} />
                    </button>
                  )}
                </div>

                {detalle?.id === a.id && (
                  <div className="mt-4 pt-4 border-t border-[#a855f722]">
                    {a.detalle && (
                      <details className="mb-4">
                        <summary className="text-xs text-[#6aacbc] cursor-pointer tracking-wider">DETALLE TÉCNICO</summary>
                        <pre className="mt-2 text-xs text-[#a0d4e0] bg-[#020617] p-3 rounded-sm overflow-x-auto">
                          {JSON.stringify(a.detalle, null, 2)}
                        </pre>
                      </details>
                    )}
                    <textarea
                      value={nota} onChange={e => setNota(e.target.value)}
                      placeholder="Nota (obligatoria para falso positivo)..."
                      className="w-full bg-transparent border border-[#a855f722] text-[#e2e8f0] text-sm p-3 rounded-sm resize-none h-20 focus:border-[#a855f755] outline-none"
                    />
                    <div className="flex gap-3 mt-3 flex-wrap">
                      <button onClick={() => actualizar(a.id, 'reconocida')} disabled={!!procesando}
                        className="flex items-center gap-2 px-3 py-2 text-xs border border-[#a855f744] rounded-sm text-[#a855f7] hover:bg-[#a855f715] transition-all disabled:opacity-50">
                        <CheckCircle size={14} /> Marcar como revisada
                      </button>
                      <button onClick={() => actualizar(a.id, 'resuelta')} disabled={!!procesando}
                        className="flex items-center gap-2 px-3 py-2 text-xs border border-[#22c55e44] rounded-sm text-[#22c55e] hover:bg-[#22c55e15] transition-all disabled:opacity-50">
                        <CheckCircle size={14} /> Resuelta
                      </button>
                      <button onClick={() => actualizar(a.id, 'falso_positivo')} disabled={!!procesando}
                        className="flex items-center gap-2 px-3 py-2 text-xs border border-[#6b728044] rounded-sm text-[#6b7280] hover:bg-[#6b728015] transition-all disabled:opacity-50">
                        <XCircle size={14} /> Es normal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Sección: Métricas ────────────────────────────────────────────────────────
const SeccionMetricas = ({ metricas }) => {
  if (!metricas) return <p className="text-[#6aacbc] text-sm">Calculando métricas...</p>;

  const maxReq  = Math.max(...(metricas.top_usuarios?.map(u => Number(u.requests)) || [1]), 1);
  const maxHits = Math.max(...(metricas.top_endpoints?.map(e => Number(e.hits)) || [1]), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Top usuarios */}
      <div>
        <p className="text-xs tracking-[3px] text-[#a855f7] mb-4">TOP USUARIOS — ÚLTIMA HORA</p>
        {!metricas.top_usuarios?.length
          ? <p className="text-[#6aacbc] text-sm">Sin actividad registrada</p>
          : metricas.top_usuarios.map(u => (
            <div key={u.id} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#e2e8f0] truncate max-w-[70%]">{u.nombre}</span>
                <span className="text-[#6aacbc] tabular-nums">{u.requests} req</span>
              </div>
              <div className="h-2 bg-[#a855f711] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(Number(u.requests) / maxReq) * 100}%`, background: ACCENT }} />
              </div>
            </div>
          ))
        }
      </div>

      {/* Top endpoints */}
      <div>
        <p className="text-xs tracking-[3px] text-[#a855f7] mb-4">ENDPOINTS MÁS CONSULTADOS</p>
        {metricas.top_endpoints?.map(e => (
          <div key={e.endpoint} className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#6aacbc] truncate max-w-[75%] font-mono text-xs">{e.endpoint}</span>
              <span className="text-[#6aacbc] tabular-nums">{e.hits}</span>
            </div>
            <div className="h-2 bg-[#a855f711] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(Number(e.hits) / maxHits) * 100}%`, background: '#6366f1' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tiles */}
      <div className="flex gap-6 md:col-span-2 flex-wrap">
        {[
          { label: 'Sesiones activas (últimos 15 min)', value: metricas.sesiones_activas ?? 0, color: '#22c55e' },
          { label: 'Alertas sin revisar',               value: metricas.alertas_nuevas ?? 0,   color: metricas.alertas_nuevas > 0 ? '#ef4444' : '#22c55e' },
        ].map(t => (
          <div key={t.label} className="border border-[#a855f722] rounded-sm p-6 flex-1 min-w-[160px]">
            <p className="text-[#6aacbc] text-xs tracking-wider">{t.label.toUpperCase()}</p>
            <p className="text-5xl font-bold tabular-nums mt-2" style={{ color: t.color }}>{t.value}</p>
          </div>
        ))}
        {metricas.calculado_at && (
          <p className="w-full text-xs text-[#a855f766] mt-2">
            Métricas calculadas: {fmtTime(metricas.calculado_at)}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Sección: Login fallidos ──────────────────────────────────────────────────
const SeccionLoginFallidos = ({ onAction }) => {
  const [datos, setDatos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get('/seguridad/login-fallidos');
      setDatos(data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const desbloquear = async (id, nombre) => {
    setProcesando(id);
    try {
      await apiService.post(`/seguridad/usuarios/${id}/desbloquear`);
      toast.success(`${nombre} desbloqueado`);
      cargar();
      onAction?.();
    } catch { toast.error('Error al desbloquear'); }
    finally { setProcesando(null); }
  };

  const forzarLogout = async (id, nombre) => {
    setProcesando(`logout-${id}`);
    try {
      await apiService.post(`/seguridad/usuarios/${id}/forzar-logout`);
      toast.success(`Sesión de ${nombre} revocada`);
    } catch { toast.error('Error al revocar sesión'); }
    finally { setProcesando(null); }
  };

  if (loading) return <p className="text-[#6aacbc] text-sm">Cargando...</p>;
  if (datos.length === 0) return (
    <p className="text-[#6aacbc] text-sm">Sin cuentas con intentos fallidos recientes.</p>
  );

  return (
    <div className="flex flex-col gap-3">
      {datos.map(u => (
        <div key={u.id} className="flex items-center gap-4 border border-[#a855f711] rounded-sm p-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[#e2e8f0] text-sm font-medium">{u.nombre}</p>
            <p className="text-[#6aacbc] text-xs mt-0.5">{u.email}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {u.bloqueado ? (
              <span className="px-3 py-1 bg-[#ef444415] border border-[#ef444433] text-[#ef4444] text-xs rounded-sm font-medium">
                BLOQUEADA
              </span>
            ) : (
              <span className="text-[#6aacbc] text-sm">
                {u.failed_attempts} intento{u.failed_attempts !== 1 ? 's' : ''} fallido{u.failed_attempts !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => desbloquear(u.id, u.nombre)} disabled={!!procesando}
              className="flex items-center gap-2 px-3 py-2 text-xs border border-[#22c55e44] rounded-sm text-[#22c55e] hover:bg-[#22c55e15] transition-all disabled:opacity-50">
              <Lock size={13} /> Desbloquear
            </button>
            <button onClick={() => forzarLogout(u.id, u.nombre)} disabled={!!procesando}
              className="flex items-center gap-2 px-3 py-2 text-xs border border-[#ef444444] rounded-sm text-[#ef4444] hover:bg-[#ef444415] transition-all disabled:opacity-50">
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Panel principal ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'alertas',  label: 'Alertas' },
  { id: 'metricas', label: 'Actividad' },
  { id: 'accesos',  label: 'Accesos fallidos' },
];

const SeguridadPanel = () => {
  const [tab, setTab]                     = useState('alertas');
  const [metricas, setMetricas]           = useState(null);
  const [alertasNuevas, setAlertasNuevas] = useState(0);
  const [alertaNueva, setAlertaNueva]     = useState(null);
  const pollingRef = useRef(null);
  const { socket } = useNotifications();

  const cargarMetricas = useCallback(async () => {
    try {
      const { data } = await apiService.get('/seguridad/metricas');
      setMetricas(data);
      setAlertasNuevas(data.alertas_nuevas ?? 0);
    } catch { }
  }, []);

  useEffect(() => {
    cargarMetricas();
    pollingRef.current = setInterval(cargarMetricas, 30_000);
    return () => clearInterval(pollingRef.current);
  }, [cargarMetricas]);

  useEffect(() => {
    if (!socket) return;
    const handler = (alerta) => {
      setAlertaNueva(alerta);
      setAlertasNuevas(n => n + 1);
      setTimeout(() => setAlertaNueva(null), 8_000);
    };
    socket.on('alerta_seguridad', handler);
    return () => socket.off('alerta_seguridad', handler);
  }, [socket]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden) clearInterval(pollingRef.current);
      else {
        cargarMetricas();
        pollingRef.current = setInterval(cargarMetricas, 30_000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [cargarMetricas]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <ShieldAlert size={26} style={{ color: ACCENT }} />
        <div>
          <h1 className="text-[#e2e8f0] font-bold tracking-[3px] text-xl">PANEL DE SEGURIDAD</h1>
          <p className="text-[#6aacbc] text-sm tracking-wide mt-0.5">
            Monitoreo de amenazas · Actualización automática cada 30 seg
          </p>
        </div>
      </div>

      {/* Banner alerta crítica en tiempo real */}
      {alertaNueva && (
        <div className="mb-5 border border-[#ef444455] bg-[#ef444410] rounded-sm p-4 flex items-center gap-4 animate-pulse">
          <AlertTriangle size={20} className="text-[#ef4444] shrink-0" />
          <div className="flex-1">
            <p className="text-[#ef4444] text-sm font-bold tracking-wider">ALERTA CRÍTICA</p>
            <p className="text-[#e2e8f0] text-sm mt-0.5">{alertaNueva.titulo}</p>
          </div>
          <button onClick={() => { setAlertaNueva(null); setTab('alertas'); }}
            className="text-sm px-3 py-2 border border-[#ef444444] text-[#ef4444] rounded-sm hover:bg-[#ef444415] transition-colors">
            VER
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-7 border-b border-[#a855f711]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-3 text-sm tracking-wider border-b-2 transition-all -mb-px"
            style={{
              borderBottomColor: tab === t.id ? ACCENT : 'transparent',
              color: tab === t.id ? ACCENT : '#6aacbc',
            }}>
            {t.label}
            {t.id === 'alertas' && alertasNuevas > 0 && (
              <span className="ml-2 bg-[#ef4444] text-white text-[10px] px-1.5 py-0.5 rounded-sm">{alertasNuevas}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'alertas'  && <SeccionAlertas alertasNuevas={alertasNuevas} />}
      {tab === 'metricas' && <SeccionMetricas metricas={metricas} />}
      {tab === 'accesos'  && <SeccionLoginFallidos onAction={cargarMetricas} />}
    </div>
  );
};

export default SeguridadPanel;
