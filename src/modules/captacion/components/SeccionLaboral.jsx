import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';
const sel = `${inp} appearance-none`;

const SeccionLaboral = ({ defaultValues = {}, onSave, saving }) => {
  const [d, setD] = useState({
    cargo: '', fecha_ingreso: '', tipo_contrato: '',
    direccion_trabajo: '', telefono_trabajo: '',
    ciudad_trabajo: '', departamento_trabajo: '',
    maneja_recursos_publicos: false, maneja_recursos_desc: '',
    ...defaultValues,
  });
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Cargo</label>
          <input className={inp} value={d.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Operario / Analista..." />
        </div>
        <div>
          <label className={lbl}>Fecha de ingreso</label>
          <input type="date" className={inp} value={d.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={lbl}>Tipo de contrato</label>
        <select className={sel} value={d.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}>
          <option value="">— Selecciona —</option>
          <option value="indefinido">Término indefinido</option>
          <option value="fijo">Término fijo</option>
          <option value="prestacion_servicios">Prestación de servicios</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label className={lbl}>Dirección del trabajo</label>
        <input className={inp} value={d.direccion_trabajo} onChange={e => set('direccion_trabajo', e.target.value)} placeholder="Calle 10 # 20-30, Bodega 5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Teléfono trabajo</label>
          <input className={inp} inputMode="tel" value={d.telefono_trabajo} onChange={e => set('telefono_trabajo', e.target.value)} placeholder="6071234567" />
        </div>
        <div>
          <label className={lbl}>Ciudad trabajo</label>
          <input className={inp} value={d.ciudad_trabajo} onChange={e => set('ciudad_trabajo', e.target.value)} placeholder="Pereira" />
        </div>
      </div>

      <div>
        <label className={lbl}>Departamento trabajo</label>
        <input className={inp} value={d.departamento_trabajo} onChange={e => set('departamento_trabajo', e.target.value)} placeholder="Risaralda" />
      </div>

      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={d.maneja_recursos_publicos}
            onChange={e => set('maneja_recursos_publicos', e.target.checked)}
            className="accent-emerald-500 w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-slate-400 text-xs leading-relaxed">
            Tengo a cargo el manejo, administración, control o custodia de recursos públicos
          </span>
        </label>
        {d.maneja_recursos_publicos && (
          <textarea className={`${inp} mt-2 resize-none`} rows={2}
            value={d.maneja_recursos_desc}
            onChange={e => set('maneja_recursos_desc', e.target.value)}
            placeholder="Describe brevemente tu rol con los recursos públicos..." />
        )}
      </div>

      <button type="submit" disabled={saving}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        Guardar y continuar
      </button>
    </form>
  );
};

export default SeccionLaboral;
