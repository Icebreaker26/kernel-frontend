import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { mensajeError } from './Modal.jsx';

// Solo estos dos catálogos se usan hoy: ciudad (códigos DANE) y empresa. Profesión y cargo quedan en su valor por defecto de SOLIDO.
const CATALOGOS = [['ciudad', 'Ciudad'], ['empresa', 'Empresa']];
const VACIO = { catalogo: 'ciudad', texto: '', departamento: '', codigo_solido: '', descripcion: '' };

/** Equivalencias texto de Kernel → código de SOLIDO. Las que faltan (de los trabajos detenidos) se ofrecen para completar con un clic. */
const TabEquivalencias = () => {
  const [lista, setLista] = useState(null);
  const [faltan, setFaltan] = useState([]);
  const [f, setF] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [catalogo, setCatalogo] = useState('todos');

  const cargar = useCallback(async () => {
    try {
      const [eq, jobs] = await Promise.all([apiService.get('/rpa/equivalencias'), apiService.get('/rpa/jobs?estado=requiere_datos')]);
      setLista(eq.data);
      const vistos = new Map();
      for (const j of jobs.data) {
        // El listado no trae los faltantes: se pide cada trabajo detenido (son pocos)
        const { data } = await apiService.get(`/rpa/jobs/${j.id}`);
        for (const x of data.faltantes || []) {
          if (x.motivo === 'sin_equivalencia') vistos.set(`${x.catalogo}|${x.texto}|${x.departamento || ''}`, x);
        }
      }
      setFaltan([...vistos.values()]);
    } catch { setLista((l) => l ?? []); toast.error('No se pudieron cargar las equivalencias'); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await apiService.post('/rpa/equivalencias', {
        catalogo: f.catalogo, texto: f.texto.trim(), codigo_solido: f.codigo_solido.trim(),
        ...(f.catalogo === 'ciudad' && f.departamento.trim() ? { departamento: f.departamento.trim() } : {}),
        ...(f.descripcion.trim() ? { descripcion: f.descripcion.trim() } : {}),
      });
      toast.success('Equivalencia guardada: reevalúa los trabajos que esperaban este dato');
      setF(VACIO);
      cargar();
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')); }
    finally { setGuardando(false); }
  };

  const eliminar = async (x) => {
    if (!window.confirm(`¿Quitar la equivalencia de "${x.texto_original}"?`)) return;
    try { await apiService.delete(`/rpa/equivalencias/${x.id}`); cargar(); } catch (err) { toast.error(mensajeError(err, 'No se pudo eliminar')); }
  };

  const visibles = useMemo(() => (lista || []).filter((x) => catalogo === 'todos' || x.catalogo === catalogo), [lista, catalogo]);
  const campo = 'mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200';

  return (
    <div>
      {faltan.length > 0 && (
        <div data-testid="equivalencias-faltantes" className="mb-4 rounded border border-amber-800/40 bg-amber-900/10 p-3">
          <p className="mb-2 text-[10px] tracking-[2px] text-amber-300">FALTAN ESTAS EQUIVALENCIAS (hay trabajos detenidos por ellas)</p>
          <div className="flex flex-wrap gap-2">
            {faltan.map((x) => (
              <button key={`${x.catalogo}${x.texto}${x.departamento}`} type="button"
                      onClick={() => setF({ ...VACIO, catalogo: x.catalogo, texto: x.texto, departamento: x.departamento || '' })}
                      className="rounded border border-amber-700 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-900/30">
                {x.catalogo}: {x.texto}{x.departamento ? ` (${x.departamento})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={guardar} className="mb-5 grid gap-3 rounded border border-slate-800/60 bg-slate-900/20 p-4 md:grid-cols-5">
        <label className="text-[10px] tracking-[2px] text-slate-500">CATÁLOGO
          <select value={f.catalogo} onChange={(e) => setF({ ...f, catalogo: e.target.value })} className={campo}>{CATALOGOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="text-[10px] tracking-[2px] text-slate-500">TEXTO EN KERNEL
          <input required value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder={f.catalogo === 'ciudad' ? 'Pereira' : 'Código de la empresa en Kernel'} className={campo} /></label>
        <label className="text-[10px] tracking-[2px] text-slate-500">DEPARTAMENTO
          <input value={f.departamento} disabled={f.catalogo !== 'ciudad'} onChange={(e) => setF({ ...f, departamento: e.target.value })} placeholder="Risaralda" className={`${campo} disabled:opacity-40`} /></label>
        <label className="text-[10px] tracking-[2px] text-slate-500">CÓDIGO EN SOLIDO
          <input required value={f.codigo_solido} onChange={(e) => setF({ ...f, codigo_solido: e.target.value })} placeholder={f.catalogo === 'ciudad' ? '66001' : '0101'} className={campo} /></label>
        <div className="flex items-end"><button type="submit" disabled={guardando || !f.texto.trim() || !f.codigo_solido.trim()}
             className="inline-flex w-full items-center justify-center gap-1 rounded border border-emerald-600 bg-emerald-900/30 px-4 py-2 text-[10px] tracking-[2px] text-emerald-300 disabled:opacity-40">
          {guardando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} GUARDAR</button></div>
      </form>

      <div className="mb-2 flex gap-2 text-[10px]">
        {[['todos', 'Todos'], ...CATALOGOS].map(([v, t]) => (
          <button key={v} type="button" onClick={() => setCatalogo(v)} aria-pressed={catalogo === v}
                  className={`rounded border px-3 py-1 ${catalogo === v ? 'border-emerald-600 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{t}</button>
        ))}
      </div>
      {lista === null ? <Loader2 className="animate-spin text-slate-500" /> : (
        <div className="overflow-x-auto rounded border border-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[9px] tracking-[2px] text-slate-500"><tr><th className="px-3 py-2">CATÁLOGO</th><th className="px-3 py-2">TEXTO</th><th className="px-3 py-2">CÓDIGO</th><th className="px-3 py-2" /></tr></thead>
            <tbody>
              {visibles.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No hay equivalencias en esta vista.</td></tr>}
              {visibles.map((x) => (
                <tr key={x.id} className="border-b border-slate-800/40">
                  <td className="px-3 py-2 text-slate-400">{x.catalogo}</td><td className="px-3 py-2 text-slate-200">{x.texto_original}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{x.codigo_solido}</td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => eliminar(x)} aria-label={`Quitar ${x.texto_original}`} className="text-slate-600 hover:text-red-400"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabEquivalencias;
