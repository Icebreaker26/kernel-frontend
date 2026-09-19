import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

const preguntas = [
  { key: 'pep_maneja_recursos_publicos', label: '¿Maneja, administra, controla o custodia recursos o bienes del Estado?' },
  { key: 'pep_reconocimiento_publico',   label: '¿Tiene reconocimiento público o ejerce algún grado de poder o influencia sobre comunidades o sectores?' },
  { key: 'pep_poder_publico',            label: '¿Desempeña o ha desempeñado en los últimos 3 años funciones públicas destacadas (presidente, magistrado, gobernador, alcalde, congresista, embajador, alto oficial, directivo de empresa estatal)?' },
  { key: 'pep_vinculo_expuesto',         label: '¿Tiene vínculos familiares o asociativos con personas que cumplan las condiciones anteriores?' },
];

const Toggle = ({ value, onChange }) => (
  <div className="flex gap-2 shrink-0">
    {[['Sí', true], ['No', false]].map(([label, val]) => (
      <button
        key={label}
        type="button"
        onClick={() => onChange(val)}
        className={`px-4 py-2 text-xs font-bold rounded border transition-all
          ${value === val
            ? val ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-emerald-900/30 border-emerald-600 text-emerald-300'
            : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const SeccionPep = ({ defaultValues = {}, onSave, saving }) => {
  const [d, setD] = useState({
    pep_maneja_recursos_publicos: false,
    pep_reconocimiento_publico  : false,
    pep_poder_publico           : false,
    pep_vinculo_expuesto        : false,
    ...defaultValues,
  });

  const tieneAlguno = Object.values(d).some(Boolean);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} className="space-y-5">
      <div className="bg-slate-900/40 border border-slate-700/40 rounded p-3">
        <p className="text-slate-500 text-[9px] tracking-[2px] mb-1">PREGUNTAS OBLIGATORIAS SARLAFT</p>
        <p className="text-slate-400 text-xs">La mayoría de personas responden No a las cuatro preguntas. Estas preguntas son requeridas por la Superintendencia de Economía Solidaria.</p>
      </div>

      {preguntas.map(({ key, label }) => (
        <div key={key} className="flex items-start gap-3">
          <p className="flex-1 text-slate-300 text-xs leading-relaxed">{label}</p>
          <Toggle value={d[key]} onChange={v => setD(prev => ({ ...prev, [key]: v }))} />
        </div>
      ))}

      {tieneAlguno && (
        <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded p-3">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-300/80 text-xs">
            Por una respuesta afirmativa, tu vinculación requerirá una revisión adicional de cumplimiento. Esto <strong>no impide</strong> tu afiliación.
          </p>
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

export default SeccionPep;
