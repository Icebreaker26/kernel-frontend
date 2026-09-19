import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Search, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { ACCENT } from '../components/PqrsLayout.jsx';

const ESTADOS = {
  recibida:    { t: 'RECIBIDA',    c: 'border-amber-700/50 text-amber-400' },
  en_revision: { t: 'EN REVISIÓN', c: 'border-sky-700/50 text-sky-400' },
  respondida:  { t: 'RESPONDIDA',  c: 'border-emerald-700/50 text-emerald-400' },
  cerrada:     { t: 'CERRADA',     c: 'border-slate-700 text-slate-400' },
};
const EVENTOS = { creada: 'Radicada', estado: 'Estado', asignada: 'Asignación', nota: 'Nota interna', respondida: 'Respuesta enviada', respuesta_sin_correo: 'Respuesta guardada, correo NO enviado' };
const TIPOS = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia', felicitacion: 'Felicitación' };
const dia = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const hora = (v) => new Date(v).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const hoyISO = () => new Date().toISOString().slice(0, 10);
const vencida = (p) => p.vence_at && ['recibida', 'en_revision'].includes(p.estado) && String(p.vence_at).slice(0, 10) < hoyISO();

const Etiqueta = ({ estado }) => {
  const e = ESTADOS[estado] || { t: estado, c: 'border-slate-700 text-slate-400' };
  return <span className={`rounded border px-1.5 py-0.5 text-[9px] tracking-wider ${e.c}`}>{e.t}</span>;
};

const campo = 'w-full rounded border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-[#a0d4e0] outline-none focus:border-[#00e5ff]/50';
const boton = 'rounded border px-3 py-1.5 text-[10px] tracking-wider transition disabled:opacity-40';

const Detalle = ({ id, asignables, onCerrar, onCambio }) => {
  const [p, setP] = useState(null);
  const [nota, setNota] = useState('');
  const [resp, setResp] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await apiService.get(`/pqrs/${id}`);
    setP(data);
  }, [id]);
  useEffect(() => { cargar().catch(() => { toast.error('No se pudo cargar la solicitud'); onCerrar(); }); }, [cargar, onCerrar]);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && !ocupado && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar, ocupado]);

  // Ejecuta una acción, recarga el detalle y la lista. Devuelve la respuesta, o null si falló.
  const accion = async (fn, ok) => {
    setOcupado(true);
    try {
      const r = await fn();
      await cargar();
      onCambio();
      if (ok) toast.success(ok);
      return r;
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción');
      return null;
    } finally { setOcupado(false); }
  };

  const responder = async () => {
    const r = await accion(() => apiService.post(`/pqrs/${id}/responder`, { respuesta: resp }));
    if (!r) return;
    setResp('');
    if (r.data.correo_enviado) toast.success('Respuesta enviada por correo');
    else toast.error('La respuesta quedó guardada, pero el correo NO salió. Comunícala al ciudadano por otro medio.', { duration: 9000 });
  };

  const abierta = p && p.estado !== 'cerrada';
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && !ocupado && onCerrar()}>
      <div className="my-6 w-full max-w-3xl rounded-lg border border-slate-800 bg-[#020617] p-5 font-mono text-[#a0d4e0] shadow-2xl">
        {!p ? <p className="flex items-center gap-2 py-10 text-xs"><Loader2 className="animate-spin" size={14} /> Cargando…</p> : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] tracking-widest text-[#6aacbc]">{p.radicado} · {p.tipo_nombre.toUpperCase()}</p>
                <h2 className="mt-1 break-words text-base font-bold text-white">{p.asunto}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Etiqueta estado={p.estado} />
                  {vencida(p) && <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle size={12} /> VENCIDA</span>}
                </div>
              </div>
              <button onClick={onCerrar} aria-label="Cerrar" className="text-[#6aacbc] hover:text-white"><X size={18} /></button>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              {[['Nombre', p.nombre], ['Correo', p.email], ['Teléfono', p.telefono || '—'], ['Empresa', p.empresa || '—'], ['Radicada', dia(p.created_at)], ['Vence', dia(p.vence_at)]].map(([k, v]) => (
                <div key={k}><dt className="text-[9px] tracking-widest text-[#6aacbc]">{k.toUpperCase()}</dt><dd className="break-words text-white">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 whitespace-pre-line break-words rounded border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-white">{p.mensaje}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[9px] tracking-widest text-[#6aacbc]">RESPONSABLE
                <select className={`${campo} mt-1`} disabled={ocupado} value={p.asignado_a || ''}
                        onChange={(e) => accion(() => apiService.put(`/pqrs/${id}/asignar`, { usuario_uuid: e.target.value || null }), 'Asignación actualizada')}>
                  <option value="">Sin asignar</option>
                  {asignables.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-end gap-2">
                {p.estado === 'cerrada'
                  ? <button className={`${boton} border-sky-700/60 text-sky-300`} disabled={ocupado} onClick={() => accion(() => apiService.put(`/pqrs/${id}/estado`, { estado: 'en_revision' }), 'Reabierta')}>REABRIR</button>
                  : <>
                      {p.estado === 'recibida' && <button className={`${boton} border-sky-700/60 text-sky-300`} disabled={ocupado} onClick={() => accion(() => apiService.put(`/pqrs/${id}/estado`, { estado: 'en_revision' }), 'En revisión')}>PASAR A REVISIÓN</button>}
                      <button className={`${boton} border-slate-700 text-slate-300`} disabled={ocupado} onClick={() => accion(() => apiService.put(`/pqrs/${id}/estado`, { estado: 'cerrada' }), 'Cerrada')}>CERRAR</button>
                    </>}
              </div>
            </div>

            {abierta && (
              <div className="mt-5">
                <p className="text-[9px] tracking-widest text-[#6aacbc]">{p.respuesta ? 'RESPONDER DE NUEVO' : 'RESPUESTA AL CIUDADANO'} · SE ENVÍA POR CORREO A {p.email.toUpperCase()}</p>
                <textarea className={`${campo} mt-1`} rows={5} value={resp} onChange={(e) => setResp(e.target.value)} maxLength={5000} placeholder="Mínimo 10 caracteres" />
                <button className={`${boton} mt-2 inline-flex items-center gap-2`} style={{ borderColor: `${ACCENT}99`, color: ACCENT }}
                        disabled={ocupado || resp.trim().length < 10} onClick={responder}><Send size={12} /> ENVIAR RESPUESTA</button>
              </div>
            )}
            {p.respuesta && (
              <div className="mt-5 rounded border border-emerald-900/60 bg-emerald-950/20 p-3">
                <p className="text-[9px] tracking-widest text-emerald-400">ÚLTIMA RESPUESTA{p.respondida_at ? ` · ${hora(p.respondida_at)}` : ''}{p.respondida_por_nombre ? ` · ${p.respondida_por_nombre}` : ''}</p>
                <p className="mt-1 whitespace-pre-line break-words text-xs text-white">{p.respuesta}</p>
              </div>
            )}

            <div className="mt-5">
              <p className="text-[9px] tracking-widest text-[#6aacbc]">NOTA INTERNA (el ciudadano no la ve)</p>
              <div className="mt-1 flex gap-2">
                <input className={campo} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={2000} />
                <button className={`${boton} border-slate-700`} disabled={ocupado || !nota.trim()}
                        onClick={async () => { const r = await accion(() => apiService.post(`/pqrs/${id}/notas`, { nota }), 'Nota agregada'); if (r) setNota(''); }}>AGREGAR</button>
              </div>
            </div>

            <ol className="mt-5 grid gap-2 border-l border-slate-800 pl-4">
              {p.eventos.map((e) => (
                <li key={e.id} className="text-[11px]">
                  <span className={e.tipo === 'respuesta_sin_correo' ? 'text-red-400' : 'text-[#6aacbc]'}>{hora(e.created_at)} · {EVENTOS[e.tipo] || e.tipo}{e.autor ? ` · ${e.autor}` : ''}</span>
                  {e.detalle && <p className="break-words text-slate-300">{e.detalle}</p>}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>, document.body);
};

const BandejaPage = () => {
  const [filtros, setFiltros] = useState({ estado: '', tipo: '', asignado: '', q: '', vencidas: false });
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [asignables, setAsignables] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { pagina };
      Object.entries(filtros).forEach(([k, v]) => { if (v) params[k] = v === true ? 1 : v; });
      const { data } = await apiService.get('/pqrs', { params });
      setDatos(data);
    } catch { toast.error('No se pudo cargar la bandeja'); }
    finally { setCargando(false); }
  }, [filtros, pagina]);

  useEffect(() => { const t = setTimeout(cargar, filtros.q ? 300 : 0); return () => clearTimeout(t); }, [cargar, filtros.q]);
  useEffect(() => { apiService.get('/pqrs/asignables').then(({ data }) => setAsignables(data)).catch(() => {}); }, []);

  const set = (k, v) => { setPagina(1); setFiltros((f) => ({ ...f, [k]: v })); };
  const r = datos?.resumen;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.limite)) : 1;
  const tarjeta = (titulo, n, estado, venc) => (
    <button key={titulo} onClick={() => { setPagina(1); setFiltros((f) => ({ ...f, estado, vencidas: !!venc })); }}
            className={`rounded border p-3 text-left transition hover:border-[#00e5ff]/40 ${(filtros.estado === estado && !!filtros.vencidas === !!venc) ? 'border-[#00e5ff]/60 bg-slate-900/60' : 'border-slate-800 bg-slate-950/50'}`}>
      <p className="text-[9px] tracking-widest text-[#6aacbc]">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${venc && n ? 'text-red-400' : 'text-white'}`}>{n ?? '–'}</p>
    </button>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tarjeta('RECIBIDAS', r?.recibida, 'recibida')}
        {tarjeta('EN REVISIÓN', r?.en_revision, 'en_revision')}
        {tarjeta('RESPONDIDAS', r?.respondida, 'respondida')}
        {tarjeta('CERRADAS', r?.cerrada, 'cerrada')}
        {tarjeta('VENCIDAS', r?.vencidas, '', true)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={13} className="absolute left-3 top-2.5 text-[#6aacbc]" />
          <input className={`${campo} pl-8`} placeholder="Buscar radicado, nombre, correo, asunto…" value={filtros.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <select className={`${campo} w-auto`} value={filtros.tipo} onChange={(e) => set('tipo', e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <select className={`${campo} w-auto`} value={filtros.asignado} onChange={(e) => set('asignado', e.target.value)}>
          <option value="">Todas</option><option value="yo">Asignadas a mí</option><option value="sin">Sin asignar</option>
        </select>
        {(filtros.estado || filtros.vencidas) && <button className={`${boton} border-slate-700`} onClick={() => { setPagina(1); setFiltros((f) => ({ ...f, estado: '', vencidas: false })); }}>QUITAR FILTRO</button>}
      </div>

      <div className="mt-4 overflow-x-auto rounded border border-slate-800">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-slate-950/70 text-[9px] tracking-widest text-[#6aacbc]">
            <tr><th className="p-3">RADICADO</th><th className="p-3">TIPO</th><th className="p-3">ASUNTO</th><th className="p-3">ESTADO</th><th className="p-3">VENCE</th><th className="p-3">RESPONSABLE</th></tr>
          </thead>
          <tbody>
            {(datos?.items || []).map((p) => (
              <tr key={p.id} onClick={() => setAbierta(p.id)} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/50">
                <td className="whitespace-nowrap p-3 text-white">{p.radicado}</td>
                <td className="p-3">{TIPOS[p.tipo] || p.tipo}</td>
                <td className="max-w-[280px] truncate p-3 text-white">{p.asunto}<span className="block truncate text-[10px] text-[#6aacbc]">{p.nombre}</span></td>
                <td className="p-3"><Etiqueta estado={p.estado} /></td>
                <td className={`whitespace-nowrap p-3 ${vencida(p) ? 'font-bold text-red-400' : ''}`}>{dia(p.vence_at)}</td>
                <td className="p-3">{p.asignado_nombre || <span className="text-slate-600">—</span>}</td>
              </tr>
            ))}
            {datos && !datos.items.length && <tr><td colSpan={6} className="p-8 text-center text-[#6aacbc]">No hay solicitudes con esos filtros.</td></tr>}
          </tbody>
        </table>
        {cargando && !datos && <p className="flex items-center justify-center gap-2 p-8 text-xs"><Loader2 className="animate-spin" size={14} /> Cargando…</p>}
      </div>

      {totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px]">
          <button className={`${boton} border-slate-700`} disabled={pagina <= 1} onClick={() => setPagina((n) => n - 1)}>ANTERIOR</button>
          <span>{pagina} / {totalPaginas}</span>
          <button className={`${boton} border-slate-700`} disabled={pagina >= totalPaginas} onClick={() => setPagina((n) => n + 1)}>SIGUIENTE</button>
        </div>
      )}
      {abierta && <Detalle id={abierta} asignables={asignables} onCerrar={() => setAbierta(null)} onCambio={cargar} />}
    </div>
  );
};

export default BandejaPage;
