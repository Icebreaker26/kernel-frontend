import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, UserMinus, FileText, AlertCircle, ShieldCheck, KeyRound, UserCheck, UserX, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const fmt = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ── Tab Sincronizaciones ────────────────────────────────────────────────────

const Chip = ({ icon: Icon, valor, color }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${color}`}>
    <Icon size={11} /> {valor}
  </span>
);

const TabSincronizaciones = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get('/asociados/sincronizaciones')
      .then(({ data }) => setHistorial(data))
      .catch(() => toast.error('Error cargando sincronizaciones'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!historial.length) return <p className="text-slate-600 text-sm">No hay sincronizaciones registradas.</p>;

  return (
    <div className="space-y-3">
      {historial.map((s, i) => (
        <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={13} className="text-slate-500 shrink-0" />
                <p className="text-slate-200 text-sm font-medium truncate">{s.archivo}</p>
              </div>
              <p className="text-slate-500 text-xs">{s.usuario} · {fmt(s.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Chip icon={FileText}    valor={`${s.total} total`}          color="text-slate-400 bg-slate-800" />
              <Chip icon={UserPlus}    valor={`${s.nuevos} nuevos`}        color="text-emerald-400 bg-emerald-500/10" />
              <Chip icon={RefreshCw}   valor={`${s.actualizados} act.`}    color="text-blue-400 bg-blue-500/10" />
              <Chip icon={UserMinus}   valor={`${s.retirados} retirados`}  color="text-amber-400 bg-amber-500/10" />
              {s.errores > 0 && <Chip icon={AlertCircle} valor={`${s.errores} errores`} color="text-red-400 bg-red-500/10" />}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ── Tab Acciones Admin ──────────────────────────────────────────────────────

const ACCION_CONFIG = {
  APROBAR_USUARIO:   { label: 'Aprobó usuario',       icon: UserCheck,   color: 'text-emerald-400 bg-emerald-500/10' },
  DESACTIVAR_USUARIO:{ label: 'Desactivó usuario',    icon: UserX,       color: 'text-red-400 bg-red-500/10' },
  REACTIVAR_USUARIO: { label: 'Reactivó usuario',     icon: UserCheck,   color: 'text-blue-400 bg-blue-500/10' },
  CAMBIAR_ROL:       { label: 'Cambió rol',            icon: Settings,    color: 'text-amber-400 bg-amber-500/10' },
  RESET_PASSWORD:    { label: 'Reseteó contraseña',   icon: KeyRound,    color: 'text-violet-400 bg-violet-500/10' },
  ASIGNAR_PERMISOS:  { label: 'Asignó permisos',      icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-500/10' },
};

const TabAcciones = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get('/admin/logs')
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Error cargando acciones'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!logs.length) return <p className="text-slate-600 text-sm">No hay acciones registradas aún.</p>;

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="text-left px-4 py-3">Acción</th>
            <th className="text-left px-4 py-3">Objetivo</th>
            <th className="text-left px-4 py-3">Detalle</th>
            <th className="text-left px-4 py-3">Admin</th>
            <th className="text-left px-4 py-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => {
            const cfg = ACCION_CONFIG[l.accion] ?? { label: l.accion, icon: Settings, color: 'text-slate-400 bg-slate-800' };
            const Icon = cfg.icon;
            return (
              <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs ${cfg.color}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-200">{l.objetivo_nombre}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5 capitalize">{l.objetivo_tipo}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{l.detalle ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{l.admin_nombre}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(l.created_at)}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Página principal ────────────────────────────────────────────────────────

const TABS = [
  { key: 'sincronizaciones', label: 'Sincronizaciones CSV' },
  { key: 'acciones',         label: 'Acciones admin' },
];

const Auditoria = () => {
  const [tab, setTab] = useState('sincronizaciones');

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-6">Auditoría</h1>

      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-violet-400 border-violet-500'
                : 'text-slate-500 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sincronizaciones' ? <TabSincronizaciones /> : <TabAcciones />}
    </div>
  );
};

export default Auditoria;
