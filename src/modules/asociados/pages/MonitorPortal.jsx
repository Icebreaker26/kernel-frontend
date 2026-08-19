import { useEffect, useState } from 'react';
import { Users, Mail, AlertTriangle, Activity, CheckCircle2, XCircle, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#10b981';

const fmt = (d) => new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

const StatCard = ({ label, value, icon: Icon, accent, sub }) => (
  <div className="bg-[#08101e] border border-[#10b98122] rounded-sm p-4 flex flex-col gap-1">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={13} style={{ color: accent ?? ACCENT }} />
      <span className="text-[#6aacbc] text-[8px] tracking-[2px] uppercase">{label}</span>
    </div>
    <span className="text-2xl font-bold" style={{ color: accent ?? ACCENT, textShadow: `0 0 16px ${accent ?? ACCENT}44` }}>
      {value ?? '—'}
    </span>
    {sub && <span className="text-[#6aacbc] text-[8px] mt-1">{sub}</span>}
  </div>
);

const MiniBarChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <p className="text-[#6aacbc] text-[9px] py-6 text-center">Sin activaciones en los últimos 14 días</p>
  );
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 60;
  return (
    <div className="flex items-end gap-1 h-[80px] overflow-x-auto pb-4">
      {data.map((d) => {
        const barH = Math.max(2, (d.total / max) * H);
        const label = String(d.dia).slice(5);
        return (
          <div key={d.dia} className="flex flex-col items-center gap-1 min-w-[28px]" title={`${d.dia}: ${d.total}`}>
            <span className="text-[#10b981] text-[7px]">{d.total}</span>
            <div style={{ height: barH, background: ACCENT, opacity: 0.7 }} className="w-5 rounded-sm" />
            <span className="text-[#6aacbc] text-[7px]">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

const EmailBadge = ({ estado, errorMsg }) => {
  if (estado === 'enviado') return (
    <span className="flex items-center gap-1 text-[#10b981] text-[8px]">
      <CheckCircle2 size={10} /> Enviado
    </span>
  );
  if (estado === 'error') return (
    <span className="flex items-center gap-1 text-[#ef4444] text-[8px]" title={errorMsg ?? ''}>
      <XCircle size={10} /> Error
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[#f59e0b] text-[8px]">
      <Clock size={10} /> Sin envío
    </span>
  );
};

const MonitorPortal = () => {
  const [metricas, setMetricas] = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [emails,   setEmails]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [enviando, setEnviando] = useState({});
  const [tabActivo, setTabActivo] = useState('activaciones');

  const cargar = async () => {
    try {
      const [m, i, e] = await Promise.all([
        apiService.get('/monitor/metricas'),
        apiService.get('/monitor/ingresos'),
        apiService.get('/monitor/emails'),
      ]);
      setMetricas(m.data);
      setIngresos(i.data);
      setEmails(e.data);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'Sin permiso para ver el monitor. Solicita acceso READ en el módulo "monitor".'
        : 'No se pudo cargar el monitor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const reenviar = async (codigo) => {
    setEnviando((s) => ({ ...s, [codigo]: true }));
    try {
      const { data } = await apiService.post(`/asociados/${codigo}/reenviar-credenciales`);
      toast.success(data.mensaje ?? 'Credenciales enviadas');
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al reenviar');
    } finally {
      setEnviando((s) => ({ ...s, [codigo]: false }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[#6aacbc] text-[9px] tracking-widest">CARGANDO...</div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
      <p className="text-[#6aacbc] text-[10px] tracking-wider text-center max-w-xs">{error}</p>
    </div>
  );

  const tasaError = metricas && (metricas.emails_enviados + metricas.emails_error) > 0
    ? ((metricas.emails_error / (metricas.emails_enviados + metricas.emails_error)) * 100).toFixed(1)
    : '0.0';

  // Separar en grupos para el resumen
  const conError    = ingresos.filter((r) => r.email_estado === 'error');
  const sinEnvio    = ingresos.filter((r) => r.email && !r.email_estado);
  const pendientes  = conError.length + sinEnvio.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#6aacbc] text-[8px] tracking-[3px]">// MONITOR · PORTAL ASOCIADOS</p>
        <h1 className="text-[#a0d4e0] text-sm tracking-widest mt-0.5">Dashboard de actividad</h1>
      </div>

      {/* Alerta si hay pendientes de reenvío */}
      {pendientes > 0 && (
        <div className="flex items-center gap-3 bg-[#f59e0b11] border border-[#f59e0b44] rounded-sm px-4 py-3">
          <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
          <p className="text-[#f59e0b] text-[10px] tracking-wider">
            {pendientes} asociado{pendientes > 1 ? 's' : ''} con credenciales pendientes de envío — usa el botón REENVIAR en cada fila.
          </p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total con acceso"   value={metricas?.total_activos}       icon={Users} />
        <StatCard label="Activaciones hoy"   value={metricas?.activaciones_hoy}    icon={Activity} />
        <StatCard label="Esta semana"        value={metricas?.activaciones_semana} icon={Activity} />
        <StatCard label="Emails enviados"    value={metricas?.emails_enviados}     icon={Mail} />
        <StatCard label="Emails con error"   value={metricas?.emails_error}        icon={AlertTriangle} accent="#f59e0b"
          sub={metricas?.emails_error > 0 ? `Tasa de error: ${tasaError}%` : null} />
      </div>

      {/* Gráfica */}
      <div className="bg-[#08101e] border border-[#10b98122] rounded-sm p-4">
        <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-4">// ACTIVACIONES ÚLTIMOS 14 DÍAS</p>
        <MiniBarChart data={metricas?.por_dia} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#10b98122]">
        {[
          { id: 'activaciones', label: `Activaciones (${ingresos.length})` },
          { id: 'emails',       label: `Log de emails (${emails.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTabActivo(t.id)}
            className={`px-4 py-2 text-[9px] tracking-[2px] border-b-2 transition-colors ${
              tabActivo === t.id
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0]'
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab: Activaciones */}
      {tabActivo === 'activaciones' && (
        <div className="overflow-x-auto">
          {ingresos.length === 0 ? (
            <p className="text-[#6aacbc] text-[9px] py-6 text-center">Sin registros</p>
          ) : (
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#10b98122]">
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">CÉDULA</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">NOMBRE</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">EMAIL</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">ACTIVADO</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">CORREO</th>
                  <th className="text-left py-2 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map((r) => {
                  const necesitaReenvio = r.email && (r.email_estado === 'error' || !r.email_estado);
                  return (
                    <tr key={r.codigo}
                      className={`border-b border-[#10b98111] hover:bg-[#10b9810a] ${necesitaReenvio ? 'bg-[#f59e0b05]' : ''}`}
                    >
                      <td className="py-2 pr-4 text-[#a0d4e0] font-mono">{r.codigo}</td>
                      <td className="py-2 pr-4 text-[#a0d4e0]">{r.apellido} {r.nombre}</td>
                      <td className="py-2 pr-4 text-[#6aacbc]">{r.email ?? <span className="text-[#475569]">Sin email</span>}</td>
                      <td className="py-2 pr-4 text-[#6aacbc]">{r.portal_activado_at ? fmt(r.portal_activado_at) : '—'}</td>
                      <td className="py-2 pr-4">
                        {r.email
                          ? <EmailBadge estado={r.email_estado} errorMsg={r.error_msg} />
                          : <span className="text-[#475569] text-[8px]">—</span>
                        }
                      </td>
                      <td className="py-2">
                        {necesitaReenvio && (
                          <button
                            onClick={() => reenviar(r.codigo)}
                            disabled={enviando[r.codigo]}
                            className="flex items-center gap-1 text-[#f59e0b] hover:text-[#fbbf24] text-[8px] tracking-wider disabled:opacity-40 transition-colors border border-[#f59e0b44] hover:border-[#f59e0b88] rounded-sm px-2 py-1"
                          >
                            <Send size={9} />
                            {enviando[r.codigo] ? 'ENVIANDO...' : 'REENVIAR'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Log de emails */}
      {tabActivo === 'emails' && (
        <div className="overflow-x-auto">
          {emails.length === 0 ? (
            <p className="text-[#6aacbc] text-[9px] py-6 text-center">Sin emails registrados</p>
          ) : (
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#10b98122]">
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">CÉDULA</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">DESTINATARIO</th>
                  <th className="text-left py-2 pr-4 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">FECHA</th>
                  <th className="text-left py-2 text-[#6aacbc] text-[8px] tracking-[2px] font-normal">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((r) => (
                  <tr key={r.id} className="border-b border-[#10b98111] hover:bg-[#10b9810a]">
                    <td className="py-2 pr-4 text-[#a0d4e0] font-mono">{r.asociado_codigo ?? '—'}</td>
                    <td className="py-2 pr-4 text-[#6aacbc]">{r.destinatario}</td>
                    <td className="py-2 pr-4 text-[#6aacbc]">{fmt(r.created_at)}</td>
                    <td className="py-2">
                      {r.estado === 'enviado'
                        ? <span className="flex items-center gap-1 text-[#10b981] text-[8px]"><CheckCircle2 size={10} />Enviado</span>
                        : <span title={r.error_msg ?? ''} className="flex items-center gap-1 text-[#ef4444] text-[8px] cursor-help"><XCircle size={10} />Error</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default MonitorPortal;
