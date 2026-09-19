import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Clock, Loader2, Send } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

const Campo = ({ label, value }) => (
  <div>
    <p className="text-slate-500 text-[9px] tracking-[2px] mb-0.5 uppercase">{label}</p>
    <p className="text-slate-200 text-xs">{value || <span className="text-slate-700">—</span>}</p>
  </div>
);

const SeccionCard = ({ titulo, done, at, children }) => (
  <div className="border border-slate-800/50 rounded overflow-hidden">
    <div className={`flex items-center justify-between px-4 py-2 ${done ? 'bg-emerald-900/10 border-b border-emerald-900/20' : 'bg-slate-900/30 border-b border-slate-800/40'}`}>
      <p className={`text-xs font-bold tracking-wider ${done ? 'text-emerald-400' : 'text-slate-500'}`}>{titulo}</p>
      {done
        ? <span className="flex items-center gap-1 text-emerald-400/60 text-[9px]">
            <CheckCircle2 size={10} /> {new Date(at).toLocaleDateString('es-CO')}
          </span>
        : <span className="flex items-center gap-1 text-slate-600 text-[9px]"><Clock size={10} /> Pendiente</span>
      }
    </div>
    {done && children && <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>}
    {!done && <p className="px-4 py-3 text-slate-700 text-[10px]">Sección no completada por el prospecto.</p>}
  </div>
);

const VinculacionDetalle = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [entregando, setEntr] = useState(false);

  useEffect(() => {
    apiService.get(`/captacion/vinculaciones/${id}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('No encontrado'); navigate('/captacion/vinculaciones'); })
      .finally(() => setLoad(false));
  }, [id]);

  const entregar = async () => {
    setEntr(true);
    try {
      await apiService.post(`/captacion/vinculaciones/${id}/entregar`);
      toast.success('Solicitud marcada como entregada');
      setData(prev => ({ ...prev, estado: 'entregado' }));
    } catch { toast.error('Error al entregar'); }
    finally { setEntr(false); }
  };

  if (loading) return (
    <div className="p-6 flex justify-center pt-16">
      <Loader2 className="animate-spin text-emerald-400" size={24} />
    </div>
  );
  if (!data) return null;

  const v = data;
  const p = v.personal || {};
  const l = v.laboral  || {};
  const f = v.financiera || {};
  const pep = v.pep    || {};
  const bens = v.beneficiarios || [];
  const refs = v.referencias   || [];

  const puedeEntregar = v.seccion_firma_at && v.estado !== 'entregado';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/captacion/vinculaciones')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-2 transition-colors">
            <ChevronLeft size={13} /> Vinculaciones
          </button>
          <p className="text-emerald-400/60 text-[9px] tracking-[3px] mb-1">// SOLICITUD DE VINCULACIÓN</p>
          <h1 className="text-slate-200 font-bold text-lg tracking-wider">
            {v.nombres} {v.apellidos}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">CC {v.cedula} · {v.empresa_codigo}</p>
        </div>
        {puedeEntregar && (
          <button onClick={entregar} disabled={entregando}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold tracking-wider rounded transition-all">
            {entregando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            ENTREGAR
          </button>
        )}
        {v.estado === 'entregado' && (
          <span className="px-3 py-1.5 bg-blue-900/30 text-blue-400 border border-blue-800/50 rounded text-[10px] tracking-wider">
            ENTREGADO
          </span>
        )}
      </div>

      {/* Progress pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['personal','laboral','financiera','pep','beneficiarios','referencias','firma'].map(s => {
          const at = s === 'firma' ? v.seccion_firma_at : v[`seccion_${s}_at`];
          return (
            <span key={s} className={`text-[9px] tracking-wider px-2 py-1 rounded border ${
              at ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-400' : 'border-slate-700/50 text-slate-600'
            }`}>
              {at ? '✓ ' : ''}{s.toUpperCase()}
            </span>
          );
        })}
      </div>

      <div className="space-y-4">
        {/* Personal */}
        <SeccionCard titulo="DATOS PERSONALES" done={!!v.seccion_personal_at} at={v.seccion_personal_at}>
          <Campo label="Tipo doc."       value={p.tipo_documento} />
          <Campo label="Ciudad exp."     value={p.ciudad_expedicion} />
          <Campo label="Fecha exp."      value={p.fecha_expedicion} />
          <Campo label="Nacimiento"      value={p.fecha_nacimiento} />
          <Campo label="Ciudad nac."     value={p.ciudad_nacimiento} />
          <Campo label="Dirección"       value={p.direccion_residencia} />
          <Campo label="Ciudad res."     value={p.ciudad_residencia} />
          <Campo label="Estado civil"    value={p.estado_civil} />
          <Campo label="Estrato"         value={p.estrato} />
          <Campo label="Personas a cargo" value={p.personas_a_cargo} />
          {p.conyuge_nombre && <>
            <Campo label="Cónyuge"         value={p.conyuge_nombre} />
            <Campo label="Cédula cónyuge"  value={p.conyuge_cedula} />
          </>}
        </SeccionCard>

        {/* Laboral */}
        <SeccionCard titulo="DATOS LABORALES" done={!!v.seccion_laboral_at} at={v.seccion_laboral_at}>
          <Campo label="Cargo"           value={l.cargo} />
          <Campo label="Tipo contrato"   value={l.tipo_contrato} />
          <Campo label="Fecha ingreso"   value={l.fecha_ingreso} />
          <Campo label="Ciudad trabajo"  value={l.ciudad_trabajo} />
          <Campo label="Dirección trab." value={l.direccion_trabajo} />
          <Campo label="Rec. públicos"   value={l.maneja_recursos_publicos ? 'Sí' : 'No'} />
        </SeccionCard>

        {/* Financiera */}
        <SeccionCard titulo="INFORMACIÓN FINANCIERA" done={!!v.seccion_financiera_at} at={v.seccion_financiera_at}>
          <Campo label="Actividad"       value={f.actividad_financiera} />
          <Campo label="Ingresos/mes"    value={f.ingresos_mensuales ? `$${Number(f.ingresos_mensuales).toLocaleString('es-CO')}` : ''} />
          <Campo label="Egresos/mes"     value={f.egresos_mensuales ? `$${Number(f.egresos_mensuales).toLocaleString('es-CO')}` : ''} />
          <Campo label="Total activos"   value={f.total_activos ? `$${Number(f.total_activos).toLocaleString('es-CO')}` : ''} />
          <Campo label="Total pasivos"   value={f.total_pasivos ? `$${Number(f.total_pasivos).toLocaleString('es-CO')}` : ''} />
          <Campo label="Origen fondos"   value={f.origen_fondos} />
          <Campo label="Moneda ext."     value={f.moneda_extranjera ? 'Sí' : 'No'} />
        </SeccionCard>

        {/* PEP */}
        <SeccionCard titulo="CUMPLIMIENTO SARLAFT" done={!!v.seccion_pep_at} at={v.seccion_pep_at}>
          <Campo label="Maneja rec. públicos" value={pep.pep_maneja_recursos_publicos ? 'Sí ⚠' : 'No'} />
          <Campo label="Reconocimiento público" value={pep.pep_reconocimiento_publico ? 'Sí ⚠' : 'No'} />
          <Campo label="Cargo público"         value={pep.pep_poder_publico ? 'Sí ⚠' : 'No'} />
          <Campo label="Vínculo expuesto"      value={pep.pep_vinculo_expuesto ? 'Sí ⚠' : 'No'} />
        </SeccionCard>

        {/* Beneficiarios */}
        <SeccionCard titulo="BENEFICIARIOS" done={!!v.seccion_beneficiarios_at} at={v.seccion_beneficiarios_at}>
          {bens.map((b, i) => (
            <div key={i} className="col-span-2 bg-slate-900/30 rounded p-2 grid grid-cols-3 gap-2">
              <Campo label={`Beneficiario ${i+1}`} value={b.nombre} />
              <Campo label="Parentesco"             value={b.parentesco} />
              <Campo label="Porcentaje"             value={`${b.porcentaje}%`} />
            </div>
          ))}
        </SeccionCard>

        {/* Referencias */}
        <SeccionCard titulo="REFERENCIAS" done={!!v.seccion_referencias_at} at={v.seccion_referencias_at}>
          {refs.map((r, i) => (
            <div key={i} className="col-span-2 bg-slate-900/30 rounded p-2 grid grid-cols-3 gap-2">
              <Campo label={`Referencia ${i+1}`}  value={r.nombre} />
              <Campo label="Celular"              value={r.celular} />
              <Campo label="Tipo"                 value={r.tipo} />
            </div>
          ))}
        </SeccionCard>

        {/* Firma */}
        <SeccionCard titulo="FIRMA DIGITAL" done={!!v.seccion_firma_at} at={v.seccion_firma_at}>
          {v.firma_png && (
            <div className="col-span-2">
              <p className="text-slate-500 text-[9px] tracking-[2px] mb-2 uppercase">Firma</p>
              <div className="bg-[#041a12] border border-emerald-900/30 rounded p-2 inline-block">
                <img src={v.firma_png} alt="Firma digital" className="max-h-24" />
              </div>
            </div>
          )}
        </SeccionCard>
      </div>
    </div>
  );
};

export default VinculacionDetalle;
