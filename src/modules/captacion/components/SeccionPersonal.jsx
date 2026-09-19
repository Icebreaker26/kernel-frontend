import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';
const sel = `${inp} appearance-none`;

const SeccionPersonal = ({ defaultValues = {}, onSave, saving }) => {
  const [d, setD] = useState({
    tipo_documento: '', ciudad_expedicion: '', fecha_expedicion: '',
    fecha_nacimiento: '', ciudad_nacimiento: '', departamento_nacimiento: '',
    direccion_residencia: '', ciudad_residencia: '', departamento_residencia: '',
    telefono_fijo: '', genero: '', nivel_academico: '', profesion: '',
    estado_civil: '', tipo_vivienda: '', estrato: '',
    cabeza_de_hogar: false, personas_a_cargo: '',
    instruccion_cooperativa: false, declarante_de_renta: false,
    conyuge_nombre: '', conyuge_cedula: '',
    conyuge_fecha_nacimiento: '', conyuge_actividad: '',
    ...defaultValues,
  });

  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const tieneConyuge = ['casado', 'union_libre'].includes(d.estado_civil);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(d);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Tipo documento</label>
          <select className={sel} value={d.tipo_documento} onChange={e => set('tipo_documento', e.target.value)}>
            <option value="">— Selecciona —</option>
            {['CC','TI','CE','PAS'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Ciudad expedición</label>
          <input className={inp} value={d.ciudad_expedicion} onChange={e => set('ciudad_expedicion', e.target.value)} placeholder="Pereira" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Fecha expedición</label>
          <input type="date" className={inp} value={d.fecha_expedicion} onChange={e => set('fecha_expedicion', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Fecha nacimiento</label>
          <input type="date" className={inp} value={d.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Ciudad nacimiento</label>
          <input className={inp} value={d.ciudad_nacimiento} onChange={e => set('ciudad_nacimiento', e.target.value)} placeholder="Manizales" />
        </div>
        <div>
          <label className={lbl}>Departamento nacimiento</label>
          <input className={inp} value={d.departamento_nacimiento} onChange={e => set('departamento_nacimiento', e.target.value)} placeholder="Caldas" />
        </div>
      </div>

      <div>
        <label className={lbl}>Dirección residencia</label>
        <input className={inp} value={d.direccion_residencia} onChange={e => set('direccion_residencia', e.target.value)} placeholder="Calle 123 # 45-67" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Ciudad residencia</label>
          <input className={inp} value={d.ciudad_residencia} onChange={e => set('ciudad_residencia', e.target.value)} placeholder="Pereira" />
        </div>
        <div>
          <label className={lbl}>Departamento</label>
          <input className={inp} value={d.departamento_residencia} onChange={e => set('departamento_residencia', e.target.value)} placeholder="Risaralda" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Teléfono fijo</label>
          <input className={inp} inputMode="tel" value={d.telefono_fijo} onChange={e => set('telefono_fijo', e.target.value)} placeholder="6071234567" />
        </div>
        <div>
          <label className={lbl}>Género</label>
          <select className={sel} value={d.genero} onChange={e => set('genero', e.target.value)}>
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Nivel académico</label>
          <input className={inp} value={d.nivel_academico} onChange={e => set('nivel_academico', e.target.value)} placeholder="Universitario" />
        </div>
        <div>
          <label className={lbl}>Profesión</label>
          <input className={inp} value={d.profesion} onChange={e => set('profesion', e.target.value)} placeholder="Ingeniero" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Estado civil</label>
          <select className={sel} value={d.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
            <option value="">—</option>
            {[['soltero','Soltero/a'],['casado','Casado/a'],['union_libre','Unión libre'],
              ['separado','Separado/a'],['divorciado','Divorciado/a'],['viudo','Viudo/a']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Tipo vivienda</label>
          <select className={sel} value={d.tipo_vivienda} onChange={e => set('tipo_vivienda', e.target.value)}>
            <option value="">—</option>
            {[['propia','Propia'],['arrendada','Arrendada'],['familiar','Familiar']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Estrato</label>
          <input type="number" inputMode="numeric" min={1} max={6} className={inp} value={d.estrato} onChange={e => set('estrato', e.target.value)} placeholder="3" />
        </div>
        <div>
          <label className={lbl}>Personas a cargo</label>
          <input type="number" inputMode="numeric" min={0} className={inp} value={d.personas_a_cargo} onChange={e => set('personas_a_cargo', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.cabeza_de_hogar} onChange={e => set('cabeza_de_hogar', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          <span className="text-slate-400 text-xs">Cabeza de hogar</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.declarante_de_renta} onChange={e => set('declarante_de_renta', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          <span className="text-slate-400 text-xs">Declara renta</span>
        </label>
      </div>

      {tieneConyuge && (
        <div className="border border-emerald-900/30 rounded p-3 space-y-3">
          <p className="text-emerald-400/60 text-[9px] tracking-[2px]">// DATOS CÓNYUGE</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Nombre completo</label>
              <input className={inp} value={d.conyuge_nombre} onChange={e => set('conyuge_nombre', e.target.value)} /></div>
            <div><label className={lbl}>Cédula</label>
              <input className={inp} inputMode="numeric" value={d.conyuge_cedula} onChange={e => set('conyuge_cedula', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Fecha nacimiento</label>
              <input type="date" className={inp} value={d.conyuge_fecha_nacimiento} onChange={e => set('conyuge_fecha_nacimiento', e.target.value)} /></div>
            <div><label className={lbl}>Actividad económica</label>
              <input className={inp} value={d.conyuge_actividad} onChange={e => set('conyuge_actividad', e.target.value)} /></div>
          </div>
        </div>
      )}

      <button type="submit" disabled={saving}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        Guardar y continuar
      </button>
    </form>
  );
};

export default SeccionPersonal;
