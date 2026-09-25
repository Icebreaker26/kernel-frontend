import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pause, Play, Copy, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal, { mensajeError } from './Modal.jsx';
import EstadoAgente from './EstadoAgente.jsx';
import { hace } from '../estados.js';

const CONFIRMACION = 'GUARDAR';

const TabAgentes = ({ agentes, onCambio }) => {
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [token, setToken] = useState(null);                 // se muestra UNA vez
  const [habilitando, setHabilitando] = useState(null);     // agente al que se le va a permitir guardar
  const [escrito, setEscrito] = useState('');

  const actualizar = async (id, cuerpo, ok) => {
    try { await apiService.put(`/rpa/agentes/${id}`, cuerpo); toast.success(ok); onCambio(); }
    catch (err) { toast.error(mensajeError(err, 'No se pudo actualizar el agente')); }
  };

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      const { data } = await apiService.post('/rpa/agentes', { nombre: nombre.trim() });
      setToken({ nombre: data.nombre, valor: data.token });
      setNombre('');
      onCambio();
    } catch (err) { toast.error(mensajeError(err, 'No se pudo crear el agente')); }
    finally { setCreando(false); }
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(token.valor); toast.success('Token copiado'); }
    catch { toast.error('No se pudo copiar: selecciónalo y cópialo a mano'); }
  };

  if (agentes === null) return <Loader2 className="animate-spin text-slate-500" />;

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {agentes.length === 0 && <p className="rounded border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500 md:col-span-2">Todavía no hay agentes. Crea el del PC de SOLIDO abajo.</p>}
        {agentes.map((a) => (
          <article key={a.id} data-testid="tarjeta-agente" className="rounded border border-slate-800/60 bg-slate-900/30 p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-200">{a.nombre}</h4>
              <span className="text-[10px] text-slate-600">v{a.version || '—'}</span>
            </div>
            <EstadoAgente agente={a} />
            <dl className="mt-3 space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between"><dt>Última señal</dt><dd className="text-slate-300">{a.segundos_sin_latido === null ? 'nunca' : hace(a.segundos_sin_latido)}</dd></div>
              <div className="flex justify-between"><dt>Guardado en SOLIDO</dt>
                <dd className={a.permite_guardar ? 'font-bold text-red-300' : 'text-slate-300'}>{a.permite_guardar ? 'HABILITADO' : 'Solo llenado en seco'}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => actualizar(a.id, { pausado: !a.pausado }, a.pausado ? 'Agente reanudado' : 'Agente pausado')}
                      className="inline-flex items-center gap-1 rounded border border-slate-700 px-3 py-1.5 text-[10px] tracking-wider text-slate-300 hover:border-slate-500">
                {a.pausado ? <><Play size={11} /> REANUDAR</> : <><Pause size={11} /> PAUSAR</>}
              </button>
              {a.permite_guardar
                ? <button type="button" onClick={() => actualizar(a.id, { permite_guardar: false }, 'Guardado deshabilitado')} className="rounded border border-red-800 px-3 py-1.5 text-[10px] tracking-wider text-red-300 hover:bg-red-900/20">DESHABILITAR GUARDADO</button>
                : <button type="button" onClick={() => { setHabilitando(a); setEscrito(''); }} className="rounded border border-amber-700 px-3 py-1.5 text-[10px] tracking-wider text-amber-300 hover:bg-amber-900/20">HABILITAR GUARDADO…</button>}
            </div>
          </article>
        ))}
      </div>

      <form onSubmit={crear} className="mt-5 flex flex-wrap items-end gap-2 rounded border border-slate-800/60 bg-slate-900/20 p-4">
        <label className="flex-1 text-[10px] tracking-[2px] text-slate-500">NUEVO AGENTE
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="p. ej. pc-solido-03" minLength={3} maxLength={80}
                 className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
        </label>
        <button type="submit" disabled={creando || nombre.trim().length < 3} className="inline-flex items-center gap-1 rounded border border-emerald-600 bg-emerald-900/30 px-4 py-2 text-[10px] tracking-[2px] text-emerald-300 disabled:opacity-40">
          {creando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} CREAR
        </button>
      </form>

      {token && (
        <Modal titulo={`Token del agente ${token.nombre}`} onClose={() => setToken(null)}>
          <p className="mb-3 text-[11px] text-amber-200">Se muestra <strong>una sola vez</strong>: en Kernel solo queda su huella. Cópialo y pégalo en <code>KERNEL_AGENT_TOKEN</code> del archivo <code>.env</code> del PC de SOLIDO.</p>
          <input readOnly value={token.valor} aria-label="Token del agente" onFocus={(e) => e.target.select()} className="w-full rounded border border-slate-700 bg-slate-950 p-3 text-xs text-white" />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copiar} className="inline-flex items-center gap-1 rounded border border-sky-700 bg-sky-900/30 px-4 py-2 text-[10px] tracking-[2px] text-sky-300"><Copy size={12} /> COPIAR</button>
            <button type="button" onClick={() => setToken(null)} className="rounded border border-slate-700 px-4 py-2 text-[10px] tracking-[2px] text-slate-300">CERRAR</button>
          </div>
        </Modal>
      )}

      {habilitando && (
        <Modal titulo="Habilitar el guardado en SOLIDO" onClose={() => setHabilitando(null)}>
          <p className="mb-2 flex gap-2 text-[11px] text-amber-200"><ShieldAlert size={16} className="shrink-0" /> SOLIDO es producción y no tiene ambiente de pruebas: con esto el agente <strong>guardará asociados reales</strong> cuando una persona apruebe cada trabajo.</p>
          <p className="mb-3 text-[11px] text-slate-400">Además de esto, el PC de SOLIDO debe tener <code>SOLIDO_PERMITIR_GUARDAR=true</code> en su <code>.env</code>. Escribe <strong>{CONFIRMACION}</strong> para confirmar.</p>
          <input value={escrito} onChange={(e) => setEscrito(e.target.value)} aria-label="Confirmación" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
          <button type="button" disabled={escrito !== CONFIRMACION} onClick={async () => { await actualizar(habilitando.id, { permite_guardar: true }, 'Guardado habilitado'); setHabilitando(null); }}
                  className="mt-3 rounded border border-red-700 bg-red-900/30 px-4 py-2 text-[10px] tracking-[2px] text-red-200 disabled:opacity-40">HABILITAR</button>
        </Modal>
      )}
    </div>
  );
};

export default TabAgentes;
