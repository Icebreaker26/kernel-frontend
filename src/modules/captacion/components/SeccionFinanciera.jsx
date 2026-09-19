import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';

const MoneyInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className={lbl}>{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
      <input
        type="text" inputMode="numeric"
        className={`${inp} pl-6`}
        value={value ? Number(value).toLocaleString('es-CO') : ''}
        placeholder={placeholder || '0'}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  </div>
);

const SeccionFinanciera = ({ defaultValues = {}, onSave, saving, isStand }) => {
  const [d, setD] = useState({
    actividad_financiera: '', ingresos_mensuales: '', egresos_mensuales: '',
    otros_ingresos: '', otros_ingresos_desc: '', total_activos: '', total_pasivos: '',
    origen_fondos: '', moneda_extranjera: false, moneda_extranjera_detalle: [],
    ...defaultValues,
  });
  const [privado, setPrivado] = useState(isStand);
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...d,
      ingresos_mensuales: d.ingresos_mensuales ? Number(d.ingresos_mensuales) : undefined,
      egresos_mensuales:  d.egresos_mensuales  ? Number(d.egresos_mensuales)  : undefined,
      otros_ingresos:     d.otros_ingresos     ? Number(d.otros_ingresos)     : undefined,
      total_activos:      d.total_activos      ? Number(d.total_activos)      : undefined,
      total_pasivos:      d.total_pasivos      ? Number(d.total_pasivos)      : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isStand && (
        <div className="flex items-center justify-between bg-slate-900/40 border border-slate-700/40 rounded p-3">
          <span className="text-slate-400 text-xs">Esta sección es privada</span>
          <button type="button" onClick={() => setPrivado(!privado)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors">
            {privado ? <Eye size={14} /> : <EyeOff size={14} />}
            {privado ? 'Mostrar para llenar' : 'Ocultar'}
          </button>
        </div>
      )}

      {!privado && (
        <>
          <div>
            <label className={lbl}>Actividad económica principal</label>
            <input className={inp} value={d.actividad_financiera}
              onChange={e => set('actividad_financiera', e.target.value)}
              placeholder="Empleado / Independiente / Comerciante..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Ingresos mensuales" value={d.ingresos_mensuales} onChange={v => set('ingresos_mensuales', v)} placeholder="2.500.000" />
            <MoneyInput label="Egresos mensuales"  value={d.egresos_mensuales}  onChange={v => set('egresos_mensuales', v)}  placeholder="1.800.000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Otros ingresos" value={d.otros_ingresos} onChange={v => set('otros_ingresos', v)} placeholder="0" />
            <div>
              <label className={lbl}>Descripción otros ingresos</label>
              <input className={inp} value={d.otros_ingresos_desc}
                onChange={e => set('otros_ingresos_desc', e.target.value)}
                placeholder="Arriendo, honorarios..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Total activos" value={d.total_activos} onChange={v => set('total_activos', v)} placeholder="15.000.000" />
            <MoneyInput label="Total pasivos" value={d.total_pasivos} onChange={v => set('total_pasivos', v)} placeholder="3.000.000" />
          </div>

          <div>
            <label className={lbl}>Origen de los fondos</label>
            <input className={inp} value={d.origen_fondos}
              onChange={e => set('origen_fondos', e.target.value)}
              placeholder="Salario como empleado, ventas de comercio..." />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={d.moneda_extranjera}
              onChange={e => set('moneda_extranjera', e.target.checked)}
              className="accent-emerald-500 w-4 h-4" />
            <span className="text-slate-400 text-xs">Manejo cuentas o transacciones en moneda extranjera</span>
          </label>

          {d.moneda_extranjera && (
            <div className="border border-emerald-900/30 rounded p-3">
              <p className="text-emerald-400/60 text-[9px] tracking-[2px] mb-2">// DETALLE MONEDA EXTRANJERA</p>
              <div className="grid grid-cols-2 gap-2">
                {['banco','ciudad','pais','moneda'].map(k => (
                  <div key={k}>
                    <label className={lbl}>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                    <input className={inp}
                      value={d.moneda_extranjera_detalle?.[0]?.[k] || ''}
                      onChange={e => set('moneda_extranjera_detalle', [{ ...(d.moneda_extranjera_detalle?.[0] || {}), [k]: e.target.value }])} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!privado && (
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Guardar y continuar
        </button>
      )}
      {privado && (
        <p className="text-center text-slate-600 text-xs">Muestra la sección para poder llenarla</p>
      )}
    </form>
  );
};

export default SeccionFinanciera;
