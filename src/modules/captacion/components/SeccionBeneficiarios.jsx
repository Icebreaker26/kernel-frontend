import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';
const sel = `${inp} appearance-none`;

const empty = () => ({
  nombre: '', cedula: '', fecha_nacimiento: '', parentesco: '', porcentaje: '',
});

const SeccionBeneficiarios = ({ defaultValues = {}, onSave, saving }) => {
  const [beneficiarios, setBenef] = useState(
    defaultValues.beneficiarios?.length ? defaultValues.beneficiarios : [empty()]
  );

  const set = (i, k, v) => setBenef(prev => prev.map((b, idx) => idx === i ? { ...b, [k]: v } : b));
  const add = () => { if (beneficiarios.length < 5) setBenef(p => [...p, empty()]); };
  const remove = (i) => setBenef(p => p.filter((_, idx) => idx !== i));

  const total = beneficiarios.reduce((s, b) => s + (Number(b.porcentaje) || 0), 0);
  const valid = total === 100 && beneficiarios.every(b => b.nombre && b.cedula && b.parentesco && b.porcentaje);

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSave({ beneficiarios }); }} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-[9px] tracking-[2px]">BENEFICIARIOS ({beneficiarios.length}/5)</p>
        {beneficiarios.length < 5 && (
          <button type="button" onClick={add}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs transition-colors">
            <Plus size={12} /> Agregar
          </button>
        )}
      </div>

      {/* Barra de porcentaje */}
      <div>
        <div className="flex justify-between text-[9px] mb-1">
          <span className="text-slate-500 tracking-[2px]">DISTRIBUCIÓN</span>
          <span className={total === 100 ? 'text-emerald-400' : total > 100 ? 'text-red-400' : 'text-amber-400'}>
            {total}% / 100%
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded overflow-hidden">
          <div
            className={`h-full transition-all rounded ${total === 100 ? 'bg-emerald-500' : total > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {total > 100 && <p className="text-red-400 text-[10px] mt-1">El total supera el 100%</p>}
        {total < 100 && total > 0 && <p className="text-amber-400 text-[10px] mt-1">Faltan {100 - total}% por asignar</p>}
      </div>

      {beneficiarios.map((b, i) => (
        <div key={i} className="border border-emerald-900/20 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400/50 text-[9px] tracking-[2px]">// BENEFICIARIO {i + 1}</span>
            {beneficiarios.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div>
            <label className={lbl}>Nombre completo</label>
            <input className={inp} value={b.nombre} onChange={e => set(i, 'nombre', e.target.value)} placeholder="Nombre y apellidos" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Cédula</label>
              <input className={inp} inputMode="numeric" value={b.cedula} onChange={e => set(i, 'cedula', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Fecha nacimiento</label>
              <input type="date" className={inp} value={b.fecha_nacimiento} onChange={e => set(i, 'fecha_nacimiento', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Parentesco</label>
              <select className={sel} value={b.parentesco} onChange={e => set(i, 'parentesco', e.target.value)}>
                <option value="">—</option>
                {['Cónyuge','Hijo/a','Padre','Madre','Hermano/a','Otro'].map(v => (
                  <option key={v} value={v.toLowerCase()}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Porcentaje (%)</label>
              <input type="number" inputMode="numeric" min={1} max={100} className={inp}
                value={b.porcentaje} onChange={e => set(i, 'porcentaje', e.target.value)}
                placeholder="100" />
            </div>
          </div>
        </div>
      ))}

      <button type="submit" disabled={saving || !valid}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        Guardar y continuar
      </button>
      {!valid && total !== 0 && (
        <p className="text-center text-slate-600 text-[10px]">
          {total !== 100 ? 'El total debe ser exactamente 100%' : 'Completa todos los campos requeridos'}
        </p>
      )}
    </form>
  );
};

export default SeccionBeneficiarios;
