import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, User, Ticket, Trophy, Clock, ArrowLeft, CheckCircle, XCircle,
  Banknote, Activity, ExternalLink,
} from 'lucide-react';
import apiService from '../../../services/apiService.js';
import { labelClaseCuota } from '../../../utils/asociados.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v) => v ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : '—';

const fmtMes = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m] = dateStr.slice(0, 7).split('-');
  return new Date(y, Number(m) - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase();
};

const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const ESTADO_BONO = {
  asignado:              { label: 'ACTIVO',    color: '#00e5ff' },
  pendiente_retiro:      { label: 'RETIRANDO', color: '#ff3d3d' },
  pendiente_adquisicion: { label: 'PENDIENTE', color: '#ffb700' },
};

const ESTADO_FACTURA = {
  pendiente:    { label: 'PENDIENTE',    color: '#ffb700' },
  pago_parcial: { label: 'PAGO PARCIAL', color: '#f59e0b' },
  vencida:      { label: 'VENCIDA',      color: '#ff3d3d' },
  pagada:       { label: 'PAGADA',       color: '#10b981' },
};

const ACCION_LABEL = {
  COMPRA_DIRECTA:            'Compra directa',
  ANULACION_DIRECTA:         'Anulación directa',
  SOLICITUD_ADQUISICION:     'Solicitó número',
  APROBACION:                'Solicitud aprobada',
  RECHAZO:                   'Solicitud rechazada',
  CANCELACION_ASOCIADO:      'Canceló solicitud',
  SOLICITUD_RETIRO:          'Solicitó retiro',
  APROBACION_RETIRO:         'Retiro aprobado',
  RECHAZO_RETIRO:            'Retiro rechazado',
  LIBERACION_POR_RETIRO_CSV: 'Liberado por retiro',
};

// ── Sección con título ────────────────────────────────────────────────────────

const Seccion = ({ icon: Icon, titulo, color = '#10b981', onNav, children }) => (
  <div className="bg-[#08101e] border border-[#10b98111] rounded-sm overflow-hidden">
    <div
      className={`flex items-center justify-between gap-3 px-5 py-3 border-b border-[#10b98111] ${onNav ? 'cursor-pointer hover:bg-[#ffffff05] transition-colors' : ''}`}
      onClick={onNav}
    >
      <div className="flex items-center gap-3">
        <Icon size={13} style={{ color }} />
        <p className="text-[9px] tracking-[3px] uppercase" style={{ color }}>{titulo}</p>
      </div>
      {onNav && <ExternalLink size={11} style={{ color, opacity: 0.5 }} />}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Campo = ({ label, valor }) => (
  <div className="flex items-baseline justify-between py-2 border-b border-[#10b98108] last:border-0">
    <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">{label}</p>
    <p className="text-[#a0d4e0] text-[11px] text-right">{valor || <span className="text-[#6aacbc] italic text-[10px]">—</span>}</p>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

const AsociadoPerfil = () => {
  const { codigo } = useParams();
  const navigate   = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    apiService.get(`/asociados/${codigo}/perfil`)
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 size={24} className="animate-spin text-[#10b981]" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-32">
      <p className="text-[#ff3d3d] text-sm tracking-widest">ASOCIADO NO ENCONTRADO</p>
      <button onClick={() => navigate('/asociados')} className="mt-4 text-[#6aacbc] text-[10px] hover:text-[#10b981] transition-colors tracking-widest">
        ← VOLVER AL LISTADO
      </button>
    </div>
  );

  const { asociado, bonosActivos, premios, historial, cuotas } = data;

  // Agrupar bonos por sorteo
  const bonesPorSorteo = bonosActivos.reduce((acc, b) => {
    const key = b.sorteo_id;
    if (!acc[key]) acc[key] = { sorteo_id: b.sorteo_id, sorteo_nombre: b.sorteo_nombre, sorteo_estado: b.sorteo_estado, precio_boleto: b.precio_boleto, boletos: [] };
    acc[key].boletos.push(b);
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => navigate('/asociados')} className="mt-1 text-[#6aacbc] hover:text-[#10b981] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-1">CC {asociado.codigo}</p>
          <h1 className="text-2xl font-bold text-[#a0d4e0] tracking-wider">
            {asociado.nombre.toUpperCase()} {asociado.apellido.toUpperCase()}
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-1">{asociado.nombre_empresa ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {asociado.is_active
            ? <span className="flex items-center gap-1 text-[#10b981] text-[9px] tracking-widest"><CheckCircle size={11} /> ACTIVO</span>
            : <span className="flex items-center gap-1 text-[#ff3d3d] text-[9px] tracking-widest"><XCircle size={11} /> INACTIVO</span>
          }
          {asociado.portal_activo && (
            <span className="text-[8px] px-2 py-0.5 border border-[#00e5ff22] text-[#00e5ff] rounded-sm tracking-widest">PORTAL ACTIVO</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Datos personales ── */}
        <Seccion icon={User} titulo="Datos personales">
          <Campo label="Cédula"       valor={asociado.codigo} />
          <Campo label="Nombre"       valor={`${asociado.nombre} ${asociado.apellido}`} />
          <Campo label="Móvil"        valor={asociado.movil} />
          <Campo label="Dirección"    valor={asociado.direccion} />
          <Campo label="Ciudad"       valor={asociado.ciudad} />
          <Campo label="Clase cuota"  valor={labelClaseCuota(asociado.clase_cuota)} />
          <Campo label="Empresa"      valor={asociado.nombre_empresa} />
          <Campo label="Empresa dsto" valor={asociado.empresa_dsto} />
        </Seccion>

        {/* ── Aporte patronal ── */}
        <Seccion icon={Banknote} titulo="Aporte patronal" color="#f59e0b">
          <Campo label="Cuota de aporte"      valor={fmt(asociado.valor_aporte)} />
          <Campo label="Fecha crédito"        valor={fmtFecha(asociado.fecha_credito)} />
          <Campo label="Primer descuento"     valor={fmtFecha(asociado.fecha_pri_descuento)} />
          <Campo label="Fecha ingreso"        valor={fmtFecha(asociado.fecha_ingreso)} />
          <Campo label="Fecha reingreso"      valor={fmtFecha(asociado.fecha_reingreso)} />

          {/* Saldo con indicador visual */}
          <div className="flex items-baseline justify-between py-2 border-b border-[#10b98108]">
            <p className="text-[#6aacbc] text-[9px] tracking-widest uppercase shrink-0 mr-4">Saldo aporte</p>
            {asociado.saldo_aporte != null ? (
              <div className="text-right">
                <p className={`text-[11px] font-bold ${Number(asociado.saldo_aporte) < 0 ? 'text-[#10b981]' : Number(asociado.saldo_aporte) > 0 ? 'text-[#ff3d3d]' : 'text-[#a0d4e0]'}`}>
                  {fmt(Math.abs(asociado.saldo_aporte))}
                </p>
                <p className="text-[8px] tracking-widest mt-0.5" style={{ color: Number(asociado.saldo_aporte) < 0 ? '#10b981' : Number(asociado.saldo_aporte) > 0 ? '#ff3d3d' : '#6aacbc' }}>
                  {Number(asociado.saldo_aporte) < 0 ? 'A FAVOR DEL ASOCIADO' : Number(asociado.saldo_aporte) > 0 ? 'DEBE A LA COOPERATIVA' : 'AL DÍA'}
                </p>
              </div>
            ) : (
              <span className="text-[#6aacbc] italic text-[10px]">—</span>
            )}
          </div>

          {cuotas.length > 0 && (
            <div className="mt-4">
              <p className="text-[9px] text-[#6aacbc] tracking-[2px] mb-2">ÚLTIMAS CUOTAS PATRONALES</p>
              <div className="flex flex-col">
                {cuotas.map((c, i) => {
                  const est = ESTADO_FACTURA[c.factura_estado] ?? { label: c.factura_estado, color: '#6aacbc' };
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/patronales/facturas/${c.factura_id}`)}
                      className="flex items-center justify-between text-[10px] py-2 border-b border-[#f59e0b08] last:border-0 hover:bg-[#f59e0b05] -mx-5 px-5 transition-colors group"
                    >
                      <div className="text-left">
                        <span className="text-[#a0d4e0] font-mono">{c.periodo}</span>
                        <span className="text-[#6aacbc] ml-2 text-[9px]">{c.empresa_nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#a0d4e0]">{fmt(c.valor_aporte_snapshot)}</span>
                        {c.bonos_monto > 0 && (
                          <span className="text-[#00e5ff] text-[9px]">+{fmt(c.bonos_monto)} bonos</span>
                        )}
                        <span className="text-[8px] px-1.5 py-0.5 border rounded-sm" style={{ borderColor: est.color + '44', color: est.color }}>
                          {est.label}
                        </span>
                        <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cuotas.length === 0 && (
            <p className="text-[#6aacbc] text-[10px] tracking-widest mt-4">SIN CUOTAS REGISTRADAS</p>
          )}
        </Seccion>

        {/* ── Bonos en sorteos ── */}
        <Seccion icon={Ticket} titulo="Bonos en sorteos" color="#00e5ff">
          {Object.values(bonesPorSorteo).length === 0 ? (
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN BONOS ACTIVOS</p>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.values(bonesPorSorteo).map((s) => (
                <div key={s.sorteo_id}>
                  <button
                    onClick={() => navigate(`/sorteos/${s.sorteo_id}`)}
                    className="flex items-center justify-between w-full mb-2 group"
                  >
                    <p className="text-[#a0d4e0] text-[10px] font-semibold tracking-wider group-hover:text-[#00e5ff] transition-colors">
                      {s.sorteo_nombre}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-[#6aacbc] tracking-widest">{fmt(s.precio_boleto)}/bono</span>
                      <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {s.boletos.map((b) => {
                      const est = ESTADO_BONO[b.estado] ?? { label: b.estado, color: '#6aacbc' };
                      return (
                        <div
                          key={b.numero}
                          className="flex flex-col items-center px-2.5 py-2 rounded-sm border text-center"
                          style={{ borderColor: est.color + '44', background: est.color + '0d' }}
                        >
                          <span className="font-mono font-bold text-sm" style={{ color: est.color }}>
                            {String(b.numero).padStart(3, '0')}
                          </span>
                          <span className="text-[7px] tracking-widest mt-0.5" style={{ color: est.color, opacity: 0.7 }}>
                            {est.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        {/* ── Premios ganados ── */}
        <Seccion icon={Trophy} titulo="Premios ganados" color="#ffb700">
          {premios.length === 0 ? (
            <p className="text-[#6aacbc] text-[10px] tracking-widest">SIN PREMIOS REGISTRADOS</p>
          ) : (
            <div className="flex flex-col gap-2">
              {premios.map((p, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/sorteos/${p.sorteo_id}`)}
                  className="flex items-center gap-4 py-2 border-b border-[#ffb70011] last:border-0 hover:bg-[#ffb7000a] -mx-5 px-5 transition-colors group"
                >
                  <p className="text-[#ffb700] font-bold font-mono text-lg" style={{ textShadow: '0 0 8px #ffb70044' }}>
                    #{String(p.numero).padStart(3, '0')}
                  </p>
                  <div className="flex-1 text-left">
                    <p className="text-[#a0d4e0] text-[10px]">{p.sorteo_nombre}</p>
                    <p className="text-[#6aacbc] text-[9px] tracking-widest">{fmtMes(p.mes_premiacion)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#6aacbc] text-[9px]">{fmtFecha(p.fecha_premiacion)}</p>
                    <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Seccion>

        {/* ── Historial de movimientos ── */}
        {historial.length > 0 && (
          <div className="md:col-span-2">
            <Seccion icon={Activity} titulo="Últimos movimientos en sorteos" color="#a855f7">
              <div className="flex flex-col">
                {historial.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/sorteos/${h.sorteo_id}`)}
                    className="flex items-center gap-4 py-2.5 border-b border-[#a855f708] last:border-0 hover:bg-[#a855f70a] -mx-5 px-5 transition-colors group"
                  >
                    <Clock size={11} className="shrink-0 text-[#6aacbc]" />
                    <div className="flex-1 text-left">
                      <span className="text-[#a0d4e0] text-[10px]">{ACCION_LABEL[h.accion] ?? h.accion}</span>
                      {h.numero != null && (
                        <span className="text-[#a855f7] font-mono text-[10px] ml-2">#{String(h.numero).padStart(3, '0')}</span>
                      )}
                      <span className="text-[#6aacbc] text-[9px] ml-2">· {h.sorteo_nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-[#6aacbc] text-[9px]">
                        {new Date(h.created_at).toLocaleDateString('es-CO')}
                      </p>
                      <ExternalLink size={10} className="text-[#6aacbc] opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </Seccion>
          </div>
        )}
      </div>
    </>
  );
};

export default AsociadoPerfil;
