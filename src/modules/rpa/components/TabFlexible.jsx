import { useCallback, useEffect, useState } from 'react';
import { Loader2, FileSpreadsheet, Download, Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal, { mensajeError } from './Modal.jsx';
import { TONOS } from '../estados.js';

// Estados de la exportación del flexible del maestro de cartera de SOLIDO
const ESTADOS = {
  solicitada: { label: 'Esperando al agente', tono: 'sky', enCurso: true },
  ejecutando: { label: 'Exportando de SOLIDO', tono: 'sky', enCurso: true },
  recibida:   { label: 'Esperando tu revisión', tono: 'amber' },
  aplicando:  { label: 'Aplicando…', tono: 'sky', enCurso: true },
  aplicada:   { label: 'Aplicada al padrón', tono: 'emerald' },
  rechazada:  { label: 'Rechazada', tono: 'slate' },
  fallida:    { label: 'Falló', tono: 'red' },
  cancelada:  { label: 'Cancelada', tono: 'slate' },
};
const info = (e) => ESTADOS[e] || { label: e, tono: 'slate' };
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`);
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const num = (n) => Number(n ?? 0).toLocaleString('es-CO');

/**
 * Flexible del maestro de cartera de SOLIDO: el agente lo exporta a CSV y lo sube; NADA se aplica al padrón hasta que una persona
 * revisa el análisis de impacto y lo aprueba (es el mismo sync de CSV de asociados, con todas sus guardas).
 */
const TabFlexible = () => {
  const [lista, setLista] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [revisando, setRevisando] = useState(null);       // exportación abierta en el modal
  const [analisis, setAnalisis] = useState(null);         // { cargando, datos, error }
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState('');
  const [aplicando, setAplicando] = useState(false);

  const cargar = useCallback(() => apiService.get('/rpa/flexibles').then(({ data }) => setLista(data))
    .catch(() => setLista((l) => l ?? [])), []);
  useEffect(() => { cargar(); }, [cargar]);
  const hayEnCurso = (lista || []).some((f) => info(f.estado).enCurso);
  useEffect(() => { const t = setInterval(cargar, hayEnCurso ? 8000 : 30000); return () => clearInterval(t); }, [cargar, hayEnCurso]);

  const solicitar = async () => {
    setEnviando(true);
    try { await apiService.post('/rpa/flexibles'); toast.success('Pedido al agente: exportará el flexible de SOLIDO'); cargar(); }
    catch (err) { toast.error(mensajeError(err, 'No se pudo pedir el flexible')); }
    finally { setEnviando(false); }
  };

  const cancelar = async (f) => {
    try { await apiService.post(`/rpa/flexibles/${f.id}/cancelar`); cargar(); }
    catch (err) { toast.error(mensajeError(err, 'No se pudo cancelar')); }
  };

  const revisar = async (f) => {
    setRevisando(f); setRechazando(false); setNota('');
    setAnalisis({ cargando: true });
    try { const { data } = await apiService.get(`/rpa/flexibles/${f.id}/analisis`); setAnalisis({ datos: data }); }
    catch (err) { setAnalisis({ error: mensajeError(err, 'No se pudo analizar el archivo') }); }
  };

  const cerrar = () => { setRevisando(null); setAnalisis(null); };

  const aplicar = async () => {
    const d = analisis?.datos;
    const resumen = d ? `${num(d.impacto?.nuevos)} nuevos, ${num(d.impacto?.actualizados)} actualizados y ${num(d.impacto?.retirados)} retirados` : 'los cambios del archivo';
    if (!window.confirm(`Vas a APLICAR al padrón de asociados: ${resumen}.\n\nEsto actualiza los datos reales de Kernel. ¿Confirmas?`)) return;
    setAplicando(true);
    try {
      const { data } = await apiService.post(`/rpa/flexibles/${revisando.id}/aplicar`);
      toast.success(`Padrón actualizado: ${num(data.nuevos)} nuevos, ${num(data.actualizados)} actualizados, ${num(data.retirados)} retirados`);
      cerrar(); cargar();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo aplicar el archivo'));   // p. ej. las guardas (más del 20 % de retiros): sigue pendiente
      cargar();
    } finally { setAplicando(false); }
  };

  const rechazar = async () => {
    try {
      await apiService.post(`/rpa/flexibles/${revisando.id}/rechazar`, { nota: nota.trim() });
      toast.success('Exportación rechazada'); cerrar(); cargar();
    } catch (err) { toast.error(mensajeError(err, 'No se pudo rechazar')); }
  };

  const descargar = async (f) => {
    try {
      const { data } = await apiService.get(`/rpa/flexibles/${f.id}/archivo`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a'); a.href = url; a.download = f.nombre_archivo || 'flexible.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(mensajeError(err, 'No se pudo descargar')); }
  };

  if (lista === null) return <Loader2 className="animate-spin text-slate-500" />;
  const d = analisis?.datos;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800/60 bg-slate-900/20 p-4">
        <p className="max-w-xl text-[11px] text-slate-500">
          El agente entra a SOLIDO (<span className="text-slate-400">Cartera → Menú asociados → Consulta flexible del maestro de cartera</span>), exporta a Excel, lo guarda como
          CSV y lo sube aquí. <span className="text-slate-300">Nada se aplica al padrón hasta que lo revises y lo apruebes.</span>
        </p>
        <button type="button" onClick={solicitar} disabled={enviando || hayEnCurso} data-testid="pedir-flexible"
                className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-900/30 px-4 py-2 text-[10px] tracking-[2px] text-emerald-300 disabled:opacity-40">
          {enviando ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />} TRAER FLEXIBLE DE SOLIDO
        </button>
      </div>

      {lista.length === 0 && <p className="rounded border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">Todavía no se ha pedido ningún flexible.</p>}

      <div className="space-y-2">
        {lista.map((f) => {
          const e = info(f.estado);
          return (
            <article key={f.id} data-testid="fila-flexible" className="rounded border border-slate-800/60 bg-slate-900/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span data-testid="estado-flexible" data-estado={f.estado} className={`rounded border px-2 py-0.5 text-[10px] tracking-wider ${TONOS[e.tono]}`}>{e.label}</span>
                  <span className="text-[11px] text-slate-400">{fecha(f.created_at)}</span>
                  <span className="text-[10px] text-slate-500">pedido por {f.solicitada_por_nombre || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {e.enCurso && <Loader2 size={12} className="animate-spin text-sky-400" />}
                  {f.estado === 'solicitada' && (
                    <button type="button" onClick={() => cancelar(f)} className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200">CANCELAR</button>
                  )}
                  {f.estado === 'recibida' && (
                    <button type="button" onClick={() => revisar(f)} className="rounded border border-amber-600 bg-amber-900/20 px-3 py-1 text-[10px] tracking-wider text-amber-300">REVISAR Y APROBAR</button>
                  )}
                  {f.tiene_archivo && ['aplicada', 'rechazada', 'recibida'].includes(f.estado) && (
                    <button type="button" onClick={() => descargar(f)} aria-label="Descargar CSV" className="text-slate-500 hover:text-slate-200"><Download size={14} /></button>
                  )}
                </div>
              </div>
              {f.nombre_archivo && <p className="mt-2 text-[11px] text-slate-400">{f.nombre_archivo} · {num(f.filas)} filas · {kb(f.tamano_bytes)}</p>}
              {f.estado === 'aplicada' && f.resultado && (
                <p className="mt-1 text-[11px] text-emerald-300">Aplicada por {f.revisada_por_nombre || '—'} el {fecha(f.revisada_at)}: {num(f.resultado.nuevos)} nuevos, {num(f.resultado.actualizados)} actualizados, {num(f.resultado.retirados)} retirados.</p>
              )}
              {f.estado === 'rechazada' && <p className="mt-1 text-[11px] text-slate-400">Rechazada por {f.revisada_por_nombre || '—'}: {f.nota}</p>}
              {f.estado === 'fallida' && <p className="mt-1 text-[11px] text-red-300">{f.error}</p>}
            </article>
          );
        })}
      </div>

      {revisando && (
        <Modal titulo="Revisar el flexible de SOLIDO" onClose={cerrar} ancho="max-w-xl">
          <p className="mb-3 text-[11px] text-slate-400">{revisando.nombre_archivo} · {num(revisando.filas)} filas · {kb(revisando.tamano_bytes)} · recibido {fecha(revisando.recibida_at)}</p>
          {analisis?.cargando && <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Analizando contra el padrón…</p>}
          {analisis?.error && <p role="alert" className="rounded border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-200">{analisis.error}</p>}
          {d && (
            <>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[['NUEVOS', d.impacto.nuevos, 'text-emerald-300'], ['ACTUALIZADOS', d.impacto.actualizados, 'text-sky-300'],
                  ['RETIRADOS', d.impacto.retirados, d.advertencias?.length ? 'text-red-300' : 'text-amber-300'], ['ACTIVOS HOY', d.impacto.activos_actuales, 'text-slate-300']].map(([t, v, c]) => (
                  <div key={t} className="rounded border border-slate-800 bg-slate-900/40 p-3">
                    <p className="text-[9px] tracking-[2px] text-slate-500">{t}</p>
                    <p data-testid={`impacto-${t.toLowerCase().replace(' ', '-')}`} className={`text-lg font-bold ${c}`}>{num(v)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">{num(d.validos)} filas válidas de {num(d.total_csv)}{d.errores_formato ? ` · ${num(d.errores_formato)} con errores de formato` : ''}</p>
              {(d.advertencias || []).map((a) => (
                <p key={a.tipo} role="alert" className="mt-3 rounded border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-200">{a.mensaje}{a.bloqueante ? ' El sistema no lo dejará aplicar.' : ''}</p>
              ))}
            </>
          )}

          {rechazando ? (
            <div className="mt-4">
              <label className="text-[10px] tracking-[2px] text-slate-500" htmlFor="nota-rechazo">MOTIVO DEL RECHAZO</label>
              <textarea id="nota-rechazo" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Nota (mínimo 5 caracteres)"
                        className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setRechazando(false)} className="rounded border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400">VOLVER</button>
                <button type="button" onClick={rechazar} disabled={nota.trim().length < 5} className="rounded border border-red-700 bg-red-900/30 px-3 py-1.5 text-[10px] tracking-wider text-red-200 disabled:opacity-40">CONFIRMAR RECHAZO</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => descargar(revisando)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400"><Download size={11} /> DESCARGAR</button>
              <button type="button" onClick={() => setRechazando(true)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-3 py-1.5 text-[10px] text-slate-300"><X size={11} /> RECHAZAR</button>
              <button type="button" onClick={aplicar} disabled={!d || aplicando} data-testid="aplicar-flexible"
                      className="inline-flex items-center gap-1 rounded border border-emerald-600 bg-emerald-900/30 px-4 py-1.5 text-[10px] tracking-wider text-emerald-300 disabled:opacity-40">
                {aplicando ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} APROBAR Y APLICAR AL PADRÓN
              </button>
            </div>
          )}
        </Modal>
      )}
      <p className="mt-4 flex items-center gap-1 text-[10px] text-slate-600"><RefreshCw size={10} /> La lista se actualiza sola mientras el agente trabaja.</p>
    </div>
  );
};

export default TabFlexible;
