import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, ExternalLink, FileDown, Loader2, RefreshCcw, ScanSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { descargarPdf } from '../../utils/descargarPdf.js';
import { fechaHora } from '../../utils/formato.js';
import ResumenConsulta, { DetalleCoincidencia, Insignia } from './ResumenConsulta.jsx';

const editable = (c) => c && ['en_curso', 'observada'].includes(c.estado);
const ESTADO = {
  en_curso:  { texto: 'EN CURSO', tono: 'text-slate-400' },
  observada: { texto: 'OBSERVADA POR EL OFICIAL', tono: 'text-amber-400' },
  cerrada:   { texto: 'PENDIENTE DE VALIDACIÓN DEL OFICIAL', tono: 'text-amber-400' },
  validada:  { texto: 'VALIDADA POR EL OFICIAL', tono: 'text-emerald-400' },
};
const entrada = 'w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-700/50 focus:outline-none';

// Consulta en listas restrictivas y fuentes abiertas (SARLAFT): la hace el asesor tras verificar la cédula; el Oficial de Cumplimiento
// valida después que se hizo bien. Al cerrarla queda una constancia en PDF anexa al expediente.
const PanelConsultaListas = ({ vinculacionId, entregada, refrescar, onInfo }) => {
  const [info, setInfo]         = useState(null);
  const [borrador, setBorrador] = useState({ decisiones: {}, manual: {} });
  const [ocupado, setOcupado]   = useState('');

  const cargar = useCallback(() => apiService.get(`/captacion/vinculaciones/${vinculacionId}/consulta-listas`)
    .then(({ data }) => { setInfo(data); onInfo?.(data); return data; })
    .catch(() => setInfo(null)), [vinculacionId, onInfo]);
  useEffect(() => { cargar(); }, [cargar, refrescar]);

  const a = info?.actual;
  // Al abrir (o cambiar) una consulta editable, el borrador parte de lo ya guardado
  useEffect(() => {
    if (!editable(a)) return;
    setBorrador({
      decisiones: Object.fromEntries(a.coincidencias.filter(x => x.decision).map(x => [x.id, { decision: x.decision, motivo: x.decision_motivo || '' }])),
      manual: { ...a.manual },
    });
  }, [a?.id, a?.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!info) return null;
  if (entregada && !a) return null;

  const setDecision = (x, decision) => setBorrador(b => ({
    ...b, decisiones: { ...b.decisiones, [x.id]: { decision, motivo: b.decisiones[x.id]?.motivo || (decision === 'descartada' && x.sugerencia === 'descartar' ? x.motivo_sugerencia : '') } },
  }));
  const setMotivo = (x, motivo) => setBorrador(b => ({ ...b, decisiones: { ...b.decisiones, [x.id]: { ...b.decisiones[x.id], motivo } } }));
  const setManual = (clave, campo, valor) => setBorrador(b => ({ ...b, manual: { ...b.manual, [clave]: { ...b.manual[clave], [campo]: valor } } }));

  const error = (err, defecto) => toast.error(err.response?.data?.error || defecto);

  const iniciar = async (repetir = false) => {
    if (repetir && editable(a) && !window.confirm('Se anula esta consulta y se hace una nueva con las listas de hoy. Lo que decidiste se pierde. ¿Continuar?')) return;
    setOcupado('iniciar');
    try {
      await apiService.post(`/captacion/vinculaciones/${vinculacionId}/consulta-listas`, { repetir });
      await cargar();
    } catch (err) { error(err, 'No se pudo hacer la consulta'); } finally { setOcupado(''); }
  };

  const cuerpo = () => ({
    decisiones: Object.entries(borrador.decisiones).filter(([, d]) => d.decision && (d.motivo || '').trim().length >= 10)
      .map(([id, d]) => ({ id, decision: d.decision, motivo: d.motivo.trim() })),
    manual: Object.fromEntries(Object.entries(borrador.manual).filter(([, m]) => m?.resultado).map(([k, m]) => [k, {
      resultado: m.resultado, ...(m.observaciones?.trim() && { observaciones: m.observaciones.trim() }),
      ...(m.terminos?.trim() && { terminos: m.terminos.trim() }), ...(m.motor?.trim() && { motor: m.motor.trim() }),
    }])),
  });

  const guardar = async () => {
    setOcupado('guardar');
    try {
      await apiService.put(`/captacion/consultas-listas/${a.id}`, cuerpo());
      toast.success('Avance guardado');
      await cargar();
      return true;
    } catch (err) { error(err, 'No se pudo guardar'); return false; } finally { setOcupado(''); }
  };

  const cerrar = async () => {
    setOcupado('cerrar');
    try {
      await apiService.put(`/captacion/consultas-listas/${a.id}`, cuerpo());
      await apiService.post(`/captacion/consultas-listas/${a.id}/cerrar`);
      toast.success('Consulta cerrada: la constancia en PDF quedó guardada');
      await cargar();
    } catch (err) { error(err, 'No se pudo cerrar la consulta'); } finally { setOcupado(''); }
  };

  const pdf = async () => {
    try { await descargarPdf(`/captacion/consultas-listas/${a.id}/pdf`, `consulta-listas-${a.cedula}.pdf`); } catch { toast.error('No se pudo descargar el PDF'); }
  };

  const fuentesMal = info.fuentes.filter(f => !f.disponible || f.desactualizada);
  const decididas = a ? a.coincidencias.filter(x => borrador.decisiones[x.id]?.decision && (borrador.decisiones[x.id].motivo || '').trim().length >= 10).length : 0;
  const obligatoriasOk = a ? a.checklist.filter(i => i.obligatoria).every(i => borrador.manual[i.clave]?.resultado && (!i.pide_terminos || (borrador.manual[i.clave].terminos?.trim() && borrador.manual[i.clave].motor?.trim()))) : false;
  const puedeCerrar = a && decididas === a.coincidencias.length && obligatoriasOk;
  const verde = a?.estado === 'validada';

  return (
    <section className={`overflow-hidden rounded border bg-slate-900/20 ${verde ? 'border-emerald-900/40' : 'border-slate-800/60'}`}>
      <header className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${verde ? 'border-emerald-900/20 bg-emerald-900/10' : 'border-slate-800/40 bg-slate-900/40'}`}>
        <h2 className={`flex items-center gap-2 text-xs font-bold tracking-wider ${verde ? 'text-emerald-400' : 'text-slate-500'}`}>
          {verde ? <BadgeCheck size={14} /> : <ScanSearch size={14} />} CONSULTA EN LISTAS RESTRICTIVAS
        </h2>
        <span className={`text-[10px] tracking-wider ${a ? ESTADO[a.estado]?.tono : 'text-slate-500'}`}>
          {a ? ESTADO[a.estado]?.texto : (info.exigida ? 'OBLIGATORIA PARA ENTREGAR' : 'PENDIENTE')}
        </span>
      </header>

      <div className="space-y-4 p-4">
        {info.desactualizada_por_identidad && (
          <p className="flex items-start gap-2 rounded border border-amber-800/50 bg-amber-900/10 px-3 py-2 text-[11px] text-amber-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Después de esta consulta cambió el nombre o la cédula: hay que consultar de nuevo.
          </p>
        )}

        {/* Sin consulta */}
        {!a && !entregada && (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Consulta al asociado en las listas de sanciones (ONU, OFAC, Unión Europea, Reino Unido), en la lista de PEP de Colombia y en las sanciones
              disciplinarias de la Procuraduría. Después registras la búsqueda en fuentes abiertas. Queda una constancia en PDF para el expediente.
            </p>
            {!info.identidad_verificada && <p className="text-[11px] text-amber-400">Primero confirma en “Verificación contra la cédula” que el número y el nombre son los del documento.</p>}
            {fuentesMal.length > 0 && (
              <p className="text-[10px] text-slate-500">Listas sin actualizar: {fuentesMal.map(f => f.nombre).join('; ')}. Se actualizan solas cada día.</p>
            )}
            <button onClick={() => iniciar(false)} disabled={ocupado === 'iniciar' || !info.identidad_verificada}
              className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40">
              {ocupado === 'iniciar' ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />} CONSULTAR EN LISTAS
            </button>
          </div>
        )}

        {/* En curso u observada: se decide y se registra */}
        {a && editable(a) && (
          <div className="space-y-5">
            {a.estado === 'observada' && a.observaciones_oficial && (
              <p className="rounded border border-amber-800/50 bg-amber-900/10 px-3 py-2 text-[11px] text-amber-300">
                <strong>El Oficial de Cumplimiento observó:</strong> {a.observaciones_oficial}
              </p>
            )}
            <p className="text-[10px] text-slate-500">
              Consultado {fechaHora(a.created_at)} con las listas de ese momento. Decide cada coincidencia y registra las búsquedas manuales.
            </p>

            <div>
              <p className="mb-1.5 text-[9px] uppercase tracking-[2px] text-slate-500">Coincidencias ({decididas} de {a.coincidencias.length} decididas)</p>
              {a.coincidencias.length === 0 && <p className="text-xs text-emerald-400">Sin coincidencias por cédula ni por nombre en ninguna lista.</p>}
              <ul className="space-y-3">
                {a.coincidencias.map(x => {
                  const d = borrador.decisiones[x.id] || {};
                  return (
                    <li key={x.id} className="space-y-2 rounded border border-slate-800/60 p-3">
                      <p className="text-xs font-semibold text-slate-100">
                        {x.fuente} · {x.nombre} {a.versiones[x.fuente]?.vinculante && <Insignia tono="ambar">VINCULANTE</Insignia>}
                        <span className="ml-2 font-normal text-slate-500">{x.tipo === 'documento' ? 'misma cédula' : `similitud ${Math.round(x.score * 100)}%`}</span>
                      </p>
                      {x.nombre_coincidente !== x.nombre && <p className="text-[10px] text-slate-500">Coincide con el alias: {x.nombre_coincidente}</p>}
                      <DetalleCoincidencia x={x} />
                      <p className={`text-[10px] ${x.sugerencia === 'descartar' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {x.sugerencia === 'descartar' ? 'Sugerencia: descartar. ' : 'Requiere revisión. '}{x.motivo_sugerencia}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setDecision(x, 'descartada')}
                          className={`rounded border px-2.5 py-1 text-[10px] font-bold tracking-wider ${d.decision === 'descartada' ? 'border-emerald-600/60 bg-emerald-900/30 text-emerald-300' : 'border-slate-700/60 text-slate-400 hover:text-slate-200'}`}>
                          NO ES LA MISMA PERSONA
                        </button>
                        <button onClick={() => setDecision(x, 'confirmada')}
                          className={`rounded border px-2.5 py-1 text-[10px] font-bold tracking-wider ${d.decision === 'confirmada' ? 'border-red-600/60 bg-red-900/30 text-red-300' : 'border-slate-700/60 text-slate-400 hover:text-slate-200'}`}>
                          SÍ ES LA MISMA PERSONA
                        </button>
                      </div>
                      {d.decision && (
                        <div>
                          <label htmlFor={`mot-${x.id}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Motivo de tu decisión</label>
                          <input id={`mot-${x.id}`} value={d.motivo || ''} onChange={e => setMotivo(x, e.target.value)} maxLength={500} className={entrada}
                            placeholder="Explica en qué te basas (mínimo 10 caracteres)" />
                        </div>
                      )}
                      {d.decision === 'confirmada' && a.versiones[x.fuente]?.vinculante && (
                        <p className="text-[10px] font-bold text-red-400">Coincidencia con una lista vinculante de la ONU: corresponde reporte inmediato a la UIAF y a la Fiscalía; no se puede vincular.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {a.declaracion_pep && (
              <p className="text-xs text-slate-300">
                Declaración PEP del asociado en el formulario:{' '}
                <strong className={a.declaracion_pep.declara_pep ? 'text-amber-400' : 'text-emerald-400'}>{a.declaracion_pep.declara_pep ? 'declara vínculo PEP' : 'no declara ser PEP'}</strong>
                {a.declaracion_pep.detalle && <span className="text-slate-500"> ({a.declaracion_pep.detalle})</span>}
              </p>
            )}

            <div className="space-y-4">
              <p className="text-[9px] uppercase tracking-[2px] text-slate-500">Búsquedas que haces tú</p>
              {a.checklist.map(item => {
                const m = borrador.manual[item.clave] || {};
                return (
                  <div key={item.clave} className="space-y-2 rounded border border-slate-800/60 p-3">
                    <p className="text-xs font-semibold text-slate-100">{item.titulo} {item.obligatoria ? <Insignia tono="rojo">OBLIGATORIA</Insignia> : <Insignia>OPCIONAL</Insignia>}</p>
                    <p className="text-[10px] leading-relaxed text-slate-500">{item.ayuda}</p>
                    {item.clave === 'fuentes_abiertas' && (
                      <div className="flex flex-wrap gap-1.5">
                        {a.enlaces.map(l => (
                          <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener"
                            className="flex items-center gap-1 rounded border border-slate-700/60 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-700/50 hover:text-emerald-400">
                            <ExternalLink size={10} /> {l.etiqueta}
                          </a>
                        ))}
                      </div>
                    )}
                    <div>
                      <label htmlFor={`res-${item.clave}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Resultado</label>
                      <select id={`res-${item.clave}`} value={m.resultado || ''} onChange={e => setManual(item.clave, 'resultado', e.target.value)} className={entrada}>
                        <option value="">Sin registrar</option>
                        <option value="sin_hallazgos">Sin hallazgos</option>
                        <option value="hallazgo">Con hallazgo</option>
                        {!item.obligatoria && <option value="no_aplica">No aplica / no se consultó</option>}
                      </select>
                    </div>
                    {item.pide_terminos && m.resultado && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`ter-${item.clave}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Qué buscaste</label>
                          <input id={`ter-${item.clave}`} value={m.terminos || ''} onChange={e => setManual(item.clave, 'terminos', e.target.value)} maxLength={500} className={entrada} />
                        </div>
                        <div>
                          <label htmlFor={`mot-${item.clave}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Motor o fuente</label>
                          <input id={`mot-${item.clave}`} value={m.motor || ''} onChange={e => setManual(item.clave, 'motor', e.target.value)} maxLength={120} className={entrada} placeholder="Ej.: Google, noticias" />
                        </div>
                      </div>
                    )}
                    {m.resultado && (
                      <div>
                        <label htmlFor={`obs-${item.clave}`} className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">
                          Observaciones{m.resultado === 'hallazgo' ? ' (describe el hallazgo)' : ''}
                        </label>
                        <textarea id={`obs-${item.clave}`} rows={2} maxLength={1500} value={m.observaciones || ''} onChange={e => setManual(item.clave, 'observaciones', e.target.value)} className={entrada} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={cerrar} disabled={!!ocupado || !puedeCerrar}
                title={puedeCerrar ? '' : 'Decide todas las coincidencias y registra la búsqueda obligatoria'}
                className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40">
                {ocupado === 'cerrar' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} CERRAR Y GENERAR PDF
              </button>
              <button onClick={guardar} disabled={!!ocupado}
                className="rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-300 hover:text-slate-100 disabled:opacity-40">
                {ocupado === 'guardar' ? 'GUARDANDO…' : 'GUARDAR AVANCE'}
              </button>
              <button onClick={() => iniciar(true)} disabled={!!ocupado}
                className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-400 hover:text-slate-200 disabled:opacity-40">
                <RefreshCcw size={11} /> REPETIR CON LAS LISTAS DE HOY
              </button>
            </div>
          </div>
        )}

        {/* Cerrada o validada: resumen y PDF */}
        {a && !editable(a) && (
          <div className="space-y-4">
            <ResumenConsulta c={a} />
            {a.estado === 'validada' && (
              <p className="text-[11px] text-emerald-400">
                Validada por {a.oficial_nombre || 'el Oficial de Cumplimiento'} el {fechaHora(a.validada_at)}.{a.observaciones_oficial && <span className="text-slate-400"> {a.observaciones_oficial}</span>}
              </p>
            )}
            {a.estado === 'cerrada' && <p className="text-[11px] text-amber-400">Cerrada {fechaHora(a.cerrada_at)}. El Oficial de Cumplimiento la revisará y la validará.</p>}
            <div className="flex flex-wrap gap-2">
              {a.tiene_pdf && (
                <button onClick={pdf} className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40">
                  <FileDown size={12} /> DESCARGAR PDF
                </button>
              )}
              {!entregada && (
                <button onClick={() => iniciar(true)} disabled={!!ocupado}
                  className="flex items-center gap-1.5 rounded border border-slate-700/60 px-3 py-1.5 text-[11px] tracking-wider text-slate-400 hover:text-slate-200 disabled:opacity-40">
                  <RefreshCcw size={11} /> CONSULTAR DE NUEVO
                </button>
              )}
            </div>
          </div>
        )}

        {info.historial.length > 1 && (
          <p className="text-[10px] text-slate-600">{info.historial.length} consultas en el historial de esta solicitud.</p>
        )}
      </div>
    </section>
  );
};

export default PanelConsultaListas;
