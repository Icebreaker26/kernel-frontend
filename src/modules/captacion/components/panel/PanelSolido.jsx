import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, ShieldAlert, UploadCloud, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { fechaHora } from '../../utils/formato.js';
import EstadoAgente from '../../../rpa/components/EstadoAgente.jsx';
import { JobBadge } from '../../../rpa/components/BadgeSolido.jsx';
import { ETAPAS_JOB, etapasCompletas, infoJob, esExito, enCurso, faltanteLegible, ESTADOS_AGENTE } from '../../../rpa/estados.js';

const Etapas = ({ estado }) => {
  const hechas = etapasCompletas(estado);
  const roto = ['fallido', 'revision_humana'].includes(estado);
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label="Avance de la carga a SOLIDO">
      {ETAPAS_JOB.map((nombre, i) => {
        const hecha = i < hechas;
        const actual = i === hechas && enCurso(estado);
        const fallo = roto && i === hechas;
        return (
          <li key={nombre} className="flex flex-1 flex-col gap-1" aria-current={actual ? 'step' : undefined}>
            <span className={`h-1.5 rounded-sm ${hecha ? 'bg-emerald-500' : fallo ? 'bg-red-500' : actual ? 'animate-pulse bg-sky-400' : 'bg-slate-700'}`} />
            <span className={`text-[9px] leading-tight ${hecha ? 'text-emerald-400' : fallo ? 'text-red-400' : actual ? 'text-sky-300' : 'text-slate-600'}`}>{nombre}</span>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Botón "Subir a SOLIDO" del asesor titular, con el estado del trabajo, del visto bueno de Cumplimiento y del agente.
 * Se habilita solo cuando la solicitud está entregada y el Oficial de Cumplimiento dio su visto bueno (lo decide el servidor).
 */
const PanelSolido = ({ vinculacionId, entregada }) => {
  const [d, setD] = useState(null);
  const [oculto, setOculto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const activo = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get(`/rpa/vinculaciones/${vinculacionId}/estado`);
      if (activo.current) setD(data);
    } catch (err) {
      if (err.response?.status === 403) setOculto(true);       // sin permiso sobre esta solicitud: no se muestra el panel
    }
  }, [vinculacionId]);

  useEffect(() => {
    activo.current = true;
    if (!entregada) return undefined;
    cargar();
    return () => { activo.current = false; };
  }, [cargar, entregada]);

  // Mientras hay una carga en curso se consulta seguido; en reposo, cada 30 s (para ver si el agente se apaga o se bloquea)
  const enMarcha = d?.job && enCurso(d.job.estado);
  useEffect(() => {
    if (!entregada || oculto) return undefined;
    const t = setInterval(cargar, enMarcha ? 8000 : 30000);
    return () => clearInterval(t);
  }, [cargar, entregada, oculto, enMarcha]);

  if (!entregada || oculto || !d) return null;

  const job = d.job;
  const info = job ? infoJob(job.estado) : null;
  const exito = job && esExito(job.estado);
  const cump = d.cumplimiento;
  const agenteOk = ESTADOS_AGENTE[d.agente?.estado]?.ok;

  const subir = async () => {
    // "Subir = aprobar": el agente llena y GUARDA en SOLIDO (producción) sin una revisión previa de capturas
    if (!window.confirm('Al subir, el agente cargará y GUARDARÁ este asociado en SOLIDO (producción) sin una revisión previa.\n\n¿Confirmas que los datos de la solicitud están correctos?')) return;
    setEnviando(true);
    try {
      const { data } = await apiService.post(`/rpa/vinculaciones/${vinculacionId}/subir`);
      setD(data);
      toast.success('Enviado a SOLIDO: el agente lo cargará y guardará en unos minutos');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo enviar a SOLIDO');
      cargar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section aria-label="Subir a SOLIDO" data-testid="panel-solido" className="mb-4 overflow-hidden rounded border border-slate-800/60 bg-slate-900/20">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 px-4 py-2.5">
        <p className="flex items-center gap-2 text-[10px] tracking-[3px] text-slate-400"><UploadCloud size={13} className="text-emerald-500" /> SOLIDO</p>
        {job && <JobBadge estado={job.estado} />}
      </header>

      <div className="space-y-3 p-4">
        {exito && (
          <p data-testid="solido-exito" className={`flex items-start gap-2 rounded border p-3 text-xs ${job.estado === 'cargado' ? 'border-emerald-700/50 bg-emerald-900/15 text-emerald-300' : 'border-blue-800 bg-blue-900/20 text-blue-300'}`}>
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <span>
              {job.estado === 'cargado'
                ? <>Cargado en SOLIDO{d.vinculacion.solido_cargado_at || job.terminado_at ? <> el <strong>{fechaHora(d.vinculacion.solido_cargado_at || job.terminado_at)}</strong></> : null}. Ya no hay nada más que hacer.</>
                : 'Este asociado ya estaba registrado en SOLIDO: no se cargó de nuevo.'}
            </span>
          </p>
        )}

        {job && !exito && (
          <div>
            <p className="text-xs text-slate-300">{info.label}{info.accion ? <span className="text-slate-500"> — {info.accion}</span> : null}</p>
            <Etapas estado={job.estado} />
          </div>
        )}

        {job?.estado === 'requiere_datos' && Array.isArray(job.faltantes) && job.faltantes.length > 0 && (
          <ul data-testid="solido-faltantes" className="space-y-1 rounded border border-amber-800/40 bg-amber-900/10 p-3 text-[11px] text-amber-200">
            {job.faltantes.map((f, i) => <li key={`${f.campo}-${i}`} className="flex gap-2"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {faltanteLegible(f)}</li>)}
          </ul>
        )}

        {job && ['fallido', 'revision_humana'].includes(job.estado) && job.error && (
          <p className="rounded border border-red-900/50 bg-red-900/10 p-3 text-[11px] text-red-300">{job.error}</p>
        )}

        {/* Visto bueno del Oficial de Cumplimiento: sin él el botón no se habilita */}
        {!exito && (
          <p data-testid="solido-cumplimiento" data-estado={cump.estado}
             className={`flex items-start gap-2 text-[11px] ${cump.estado === 'validada' ? 'text-emerald-400' : 'text-amber-300'}`}>
            {cump.estado === 'validada' ? <ShieldCheck size={13} className="mt-0.5 shrink-0" /> : <ShieldAlert size={13} className="mt-0.5 shrink-0" />}
            <span>{cump.estado === 'validada' && cump.validada_at
              ? `Visto bueno del Oficial de Cumplimiento el ${fechaHora(cump.validada_at)}.`
              : cump.mensaje}</span>
          </p>
        )}

        {!exito && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={subir} disabled={!d.puede_subir || enviando} data-testid="boton-subir-solido"
                    className="flex items-center gap-2 rounded border border-emerald-600 bg-emerald-900/30 px-4 py-2 text-[11px] tracking-[2px] text-emerald-300 transition-colors hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-600">
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
              {d.reintento ? 'REVISAR Y REINTENTAR' : 'SUBIR A SOLIDO'}
            </button>
            {!d.puede_subir && d.motivo && <p data-testid="solido-motivo" className="text-[11px] text-slate-500">{d.motivo}</p>}
          </div>
        )}

        <div className="border-t border-slate-800/50 pt-3">
          <EstadoAgente agente={d.agente} />
          {!exito && d.puede_subir && !agenteOk && (
            <p className="mt-1.5 text-[11px] text-slate-500">Puedes enviarlo igual: quedará en cola y se cargará cuando el agente vuelva a estar disponible.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PanelSolido;
