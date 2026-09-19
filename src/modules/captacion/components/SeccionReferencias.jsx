import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';
const sel = `${inp} appearance-none`;

const empty = () => ({ nombre: '', celular: '', tipo: '', parentesco_o_relacion: '' });

const SeccionReferencias = ({ defaultValues = {}, onSave, saving }) => {
  const [refs, setRefs] = useState(
    defaultValues.referencias?.length ? defaultValues.referencias : [empty()]
  );

  const set = (i, k, v) => setRefs(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const add = () => { if (refs.length < 2) setRefs(p => [...p, empty()]); };
  const remove = (i) => setRefs(p => p.filter((_, idx) => idx !== i));

  const valid = refs.every(r => r.nombre && r.celular && r.tipo);

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSave({ referencias: refs }); }} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-[9px] tracking-[2px]">REFERENCIAS ({refs.length}/2)</p>
        {refs.length < 2 && (
          <button type="button" onClick={add}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs transition-colors">
            <Plus size={12} /> Agregar segunda referencia
          </button>
        )}
      </div>

      {refs.map((r, i) => (
        <div key={i} className="border border-emerald-900/20 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400/50 text-[9px] tracking-[2px]">// REFERENCIA {i + 1}</span>
            {refs.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div>
            <label className={lbl}>Nombre completo</label>
            <input className={inp} value={r.nombre} onChange={e => set(i, 'nombre', e.target.value)} placeholder="Nombre y apellidos" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Celular</label>
              <input className={inp} inputMode="tel" value={r.celular} onChange={e => set(i, 'celular', e.target.value)} placeholder="300 000 0000" />
            </div>
            <div>
              <label className={lbl}>Tipo</label>
              <select className={sel} value={r.tipo} onChange={e => set(i, 'tipo', e.target.value)}>
                <option value="">—</option>
                <option value="personal">Personal</option>
                <option value="familiar">Familiar</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>{r.tipo === 'familiar' ? 'Parentesco' : 'Relación'}</label>
            <input className={inp} value={r.parentesco_o_relacion}
              onChange={e => set(i, 'parentesco_o_relacion', e.target.value)}
              placeholder={r.tipo === 'familiar' ? 'Hermano, tío...' : 'Amigo, compañero de trabajo...'} />
          </div>
        </div>
      ))}

      <button type="submit" disabled={saving || !valid}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        Guardar y continuar
      </button>
    </form>
  );
};

export default SeccionReferencias;
