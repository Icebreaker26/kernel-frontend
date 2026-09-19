import { ACCENTS, BRAND } from '../compartido.js';

/**
 * Organigrama de la cooperativa, dibujado en código (antes era una imagen): se lee bien en celular, se puede
 * seleccionar y es accesible. Para cambiar un cargo o un comité se edita la estructura de abajo.
 */
const ORGANOS_CONTROL = ['Revisoría Fiscal', 'Junta de Vigilancia', 'Comité de Apelaciones'];
const COMITES = ['Comité Financiero', 'Comité de Crédito', 'Comité de Educación', 'Comité de Solidaridad', 'Comité de Bienestar Social'];

const AREAS = [
  { nombre: 'Área Comercial',        cargos: ['Jefe Comercial', 'Asesor Comercial y fidelización', 'Asesor Comercial y de Seguros'] },
  { nombre: 'Área de Crédito y Cartera', cargos: ['Jefe de Crédito y Cartera', 'Asesor de Crédito'] },
  { nombre: 'Área Financiera',       cargos: ['Jefe Financiero', 'Auxiliar Contable'] },
  { nombre: 'Área Administrativa',   cargos: ['Auditor Interno', 'Auxiliar Administrativo', 'Servicios Generales', { t: 'Asesor de SGSST', externo: true }] },
];

const Nodo = ({ children, className = '', style }) => (
  <div className={`rounded-2xl border px-4 py-3 text-center font-bold shadow-sm ${className}`} style={style}>{children}</div>
);
const Linea = () => <span className="mx-auto block h-6 w-0.5 bg-slate-300" aria-hidden />;

const Organigrama = () => (
  <div className="mx-auto max-w-6xl" role="group" aria-label="Organigrama de la cooperativa">
    {/* Dirección y gobierno */}
    <div className="grid items-start gap-3 lg:grid-cols-[1fr_1.1fr_1fr]">
      <div className="hidden lg:block" />
      <Nodo className="border-2 bg-white text-xl text-slate-900 md:text-2xl" style={{ borderColor: BRAND.azul }}>Asamblea General</Nodo>
      <div className="hidden lg:block" />
    </div>
    <Linea />
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-center">
      <div>
        <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-wider text-slate-400">Control y vigilancia</p>
        <div className="grid gap-2">{ORGANOS_CONTROL.map((o) => <Nodo key={o} className="border-slate-200 bg-white text-sm text-slate-700">{o}</Nodo>)}</div>
      </div>
      <div>
        <Nodo className="border-2 bg-white text-lg text-slate-900 md:text-xl" style={{ borderColor: BRAND.azul }}>Consejo de Administración</Nodo>
        <Linea />
        <Nodo className="text-white" style={{ background: BRAND.azul, borderColor: BRAND.azul }}>Gerente</Nodo>
      </div>
      <div>
        <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-wider text-slate-400">Comités</p>
        <div className="grid gap-2">{COMITES.map((c) => <Nodo key={c} className="border-slate-200 bg-white text-sm text-slate-700">{c}</Nodo>)}</div>
      </div>
    </div>

    <Linea />
    {/* Áreas */}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {AREAS.map((a) => (
        <div key={a.nombre}>
          <Nodo style={{ background: ACCENTS.azul.soft, borderColor: '#B9D6EA', color: BRAND.azul }} className="text-base">{a.nombre}</Nodo>
          <ul className="mt-2 grid gap-2">
            {a.cargos.map((c) => {
              const cargo = typeof c === 'string' ? { t: c } : c;
              return (
                <li key={cargo.t}>
                  <Nodo className={`text-sm ${cargo.externo ? 'border-dashed border-slate-400 bg-white text-slate-600' : 'text-slate-800'}`}
                        style={cargo.externo ? undefined : { background: ACCENTS.dorado.soft, borderColor: '#F3DFA8' }}>
                    {cargo.t}{cargo.externo && <span className="block text-xs font-medium text-slate-500">Servicio externo</span>}
                  </Nodo>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
    <p className="mt-6 text-center text-sm text-slate-500">Vigilada por la Superintendencia de Economía Solidaria.</p>
  </div>
);

export default Organigrama;
