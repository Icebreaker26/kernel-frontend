import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, FileDown, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { descargarPdf } from '../utils/descargarPdf.js';
import { fechaHora } from '../utils/formato.js';
import ResumenConsulta, { Insignia } from '../components/panel/ResumenConsulta.jsx';

const PESTANAS = [
  { clave: 'cerrada',   etiqueta: 'PENDIENTES' },
  { clave: 'observada', etiqueta: 'OBSERVADAS' },
  { clave: 'validada',  etiqueta: 'VALIDADAS' },
];
const entrada = 'w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-700/50 focus:outline-none';

const Interruptor = ({ id, etiqueta, ayuda, activo, onCambio, deshabilitado }) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-2">
    <input id={id} type="checkbox" checked={activo} disabled={deshabilitado} onChange={e => onCambio(e.target.checked)} className="mt-1" />
    <span>
      <span className="block text-xs font-semibold text-slate-200">{etiqueta}</span>
      <span className="block text-[10px] leading-relaxed text-slate-500">{ayuda}</span>
    </span>
  </label>
);

// Pantalla del Oficial de Cumplimiento: valida que el asesor hizo las consultas pertinentes en listas restrictivas y fuentes abiertas.
const Cumplimiento = () => {
  const [pestana, setPestana]   = useState('cerrada');
  const [lista, setLista]       = useState(null);
  const [fuentes, setFuentes]   = useState([]);
  const [reglas, setReglas]     = useState(null);
  const [abierta, setAbierta]   = useState(null);   // detalle de la consulta elegida
  const [obs, setObs]           = useState('');
  const [ocupado, setOcupado]   = useState('');

  const cargarLista = useCallback(() => apiService.get('/captacion/cumplimiento/consultas', { params: { estado: pestana } })
    .then(({ data }) => setLista(data)).catch(() => setLista([])), [pestana]);
  const cargarFuentes = useCallback(() => apiService.get('/captacion/cumplimiento/listas').then(({ data }) => setFuentes(data.fuentes)).catch(() => {}), []);

  useEffect(() => { cargarLista(); }, [cargarLista]);
  useEffect(() => {
    cargarFuentes();
    apiService.get('/captacion/config/reglas-entrega').then(({ data }) => setReglas(data)).catch(() => setReglas(null));
  }, [cargarFuentes]);

  const abrir = async (id) => {
    setObs('');
    try { const { data } = await apiService.get(`/captacion/cumplimiento/consultas/${id}`); setAbierta(data); } catch { toast.error('No se pudo abrir la consulta'); }
  };

  const validar = async (resultado) => {
    setOcupado(resultado);
    try {
      const { data } = await apiService.post(`/captacion/cumplimiento/consultas/${abierta.id}/validar`, { resultado, ...(obs.trim() && { observaciones: obs.trim() }) });
      toast.success(resultado === 'validada' ? 'Consulta validada' : 'Consulta observada: el asesor la corregirá');
      setAbierta(data);
      cargarLista();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo registrar'); } finally { setOcupado(''); }
  };

  const actualizarListas = async () => {
    try {
      await apiService.post('/captacion/cumplimiento/listas/actualizar');
      toast.success('Actualizando en segundo plano; puede tardar un par de minutos');
      setTimeout(cargarFuentes, 45000);
    } catch { toast.error('No se pudo iniciar la actualización'); }
  };

  const cambiarRegla = async (campo, valor) => {
    try {
      const { data } = await apiService.put('/captacion/config/reglas-entrega', { [campo]: valor });
      setReglas(r => ({ ...r, validacion_voz: data.validacion_voz, consulta_listas: data.consulta_listas }));
      toast.success('Regla actualizada');
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo cambiar la regla'); }
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-sm font-bold tracking-[3px] text-emerald-400"><ShieldCheck size={16} /> CUMPLIMIENTO</h1>
        <p className="mt-1 text-[11px] text-slate-500">
          Consultas en listas restrictivas y fuentes abiertas que hacen los asesores antes de vincular. Tú validas que se hicieron bien; queda constancia en PDF.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <nav className="flex gap-1" aria-label="Estado de las consultas">
            {PESTANAS.map(p => (
              <button key={p.clave} onClick={() => { setPestana(p.clave); setAbierta(null); }} aria-current={pestana === p.clave ? 'page' : undefined}
                className={`rounded-sm border px-3 py-1.5 text-[10px] tracking-wider ${pestana === p.clave ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                {p.etiqueta}
              </button>
            ))}
          </nav>

          <section className="overflow-hidden rounded border border-slate-800/60 bg-slate-900/20">
            {lista === null && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-400" size={18} /></div>}
            {lista?.length === 0 && <p className="p-6 text-center text-xs text-slate-500">No hay consultas en este estado.</p>}
            <ul className="divide-y divide-slate-800/60">
              {lista?.map(c => (
                <li key={c.id}>
                  <button onClick={() => abrir(c.id)} className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-800/30 ${abierta?.id === c.id ? 'bg-emerald-900/10' : ''}`}>
                    <p className="text-xs font-semibold text-slate-100">{c.nombres} {c.apellidos} <span className="font-normal text-slate-500">· CC {c.cedula}</span></p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      Asesor: {c.asesor_nombre} · cerrada {fechaHora(c.cerrada_at)}
                      {c.conclusion === 'con_hallazgos' ? <Insignia tono="rojo">CON HALLAZGOS</Insignia> : <Insignia tono="verde">SIN HALLAZGOS</Insignia>}
                      {c.confirmadas > 0 && <Insignia tono="rojo">{c.confirmadas} CONFIRMADA(S)</Insignia>}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded border border-slate-800/60 bg-slate-900/20 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">Estado de las listas</h2>
              <button onClick={actualizarListas} className="flex items-center gap-1 rounded border border-slate-700/60 px-2 py-1 text-[10px] tracking-wider text-slate-300 hover:text-emerald-400">
                <RefreshCcw size={10} /> ACTUALIZAR AHORA
              </button>
            </div>
            <ul className="divide-y divide-slate-800/60">
              {fuentes.map(f => (
                <li key={f.codigo} className="flex flex-wrap items-center justify-between gap-1 py-1.5 text-[11px]">
                  <span className="text-slate-300">{f.nombre.split(' — ')[0]} {f.vinculante && <Insignia tono="ambar">VINCULANTE</Insignia>}</span>
                  <span className={f.disponible && !f.desactualizada ? 'text-slate-500' : 'text-red-400'}>
                    {f.disponible ? `${f.registros} reg. · verificada ${fechaHora(f.verificada_at)}` : 'sin descargar'}{f.desactualizada && f.disponible ? ' · desactualizada' : ''}
                  </span>
                  {f.ultimo_error && <span className="w-full text-[10px] text-red-400">Último error: {f.ultimo_error}</span>}
                </li>
              ))}
            </ul>
          </section>

          {reglas?.puede_configurar && (
            <section className="rounded border border-slate-800/60 bg-slate-900/20 p-4">
              <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-slate-500">Reglas para entregar una solicitud</h2>
              <Interruptor id="regla-listas" etiqueta="Exigir consulta en listas validada por el Oficial" activo={reglas.consulta_listas}
                ayuda="Sin una consulta validada, con los mismos datos de identidad, la solicitud no se puede entregar." onCambio={v => cambiarRegla('consulta_listas', v)} />
              <Interruptor id="regla-voz" etiqueta="Exigir validación de identidad por llamada de voz" activo={reglas.validacion_voz}
                ayuda="Sin una llamada validada después de la firma, la solicitud no se puede entregar." onCambio={v => cambiarRegla('validacion_voz', v)} />
            </section>
          )}
        </div>

        <section className="rounded border border-slate-800/60 bg-slate-900/20 p-4">
          {!abierta && <p className="p-8 text-center text-xs text-slate-500">Elige una consulta de la lista para revisarla.</p>}
          {abierta && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold tracking-wider text-slate-200">{abierta.nombres} {abierta.apellidos}</h2>
                {abierta.tiene_pdf && (
                  <button onClick={() => descargarPdf(`/captacion/cumplimiento/consultas/${abierta.id}/pdf`, `consulta-listas-${abierta.cedula}.pdf`).catch(() => toast.error('No se pudo descargar'))}
                    className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40">
                    <FileDown size={12} /> DESCARGAR PDF
                  </button>
                )}
              </div>
              <ResumenConsulta c={abierta} />

              {abierta.estado === 'cerrada' && (
                <div className="space-y-3 border-t border-slate-800/60 pt-4">
                  <p className="text-[11px] text-slate-400">Revisa que el asesor hizo las consultas pertinentes y que sus decisiones sobre las coincidencias están justificadas.</p>
                  <div>
                    <label htmlFor="obs-oficial" className="mb-1 block text-[9px] uppercase tracking-[2px] text-slate-500">Observaciones (obligatorias si observas)</label>
                    <textarea id="obs-oficial" rows={3} value={obs} onChange={e => setObs(e.target.value)} maxLength={1000} className={entrada} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => validar('validada')} disabled={!!ocupado}
                      className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40">
                      {ocupado === 'validada' ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />} VALIDAR
                    </button>
                    <button onClick={() => validar('observada')} disabled={!!ocupado || obs.trim().length < 10}
                      title={obs.trim().length < 10 ? 'Explica qué debe corregir el asesor' : ''}
                      className="rounded border border-amber-700/50 px-3 py-1.5 text-[11px] font-bold tracking-wider text-amber-300 hover:bg-amber-900/20 disabled:cursor-not-allowed disabled:opacity-40">
                      OBSERVAR
                    </button>
                  </div>
                </div>
              )}
              {abierta.estado === 'validada' && (
                <p className="border-t border-slate-800/60 pt-3 text-[11px] text-emerald-400">Validada por {abierta.oficial_nombre} el {fechaHora(abierta.validada_at)}.</p>
              )}
              {abierta.estado === 'observada' && (
                <p className="border-t border-slate-800/60 pt-3 text-[11px] text-amber-400">Observada: {abierta.observaciones_oficial}. Queda a la espera de que el asesor la corrija.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Cumplimiento;
