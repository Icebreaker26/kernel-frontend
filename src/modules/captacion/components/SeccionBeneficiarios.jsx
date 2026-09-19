import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Aviso, BarraAcciones, BotonSecundario, Entrada, Fila, Grupo, Lista } from './publico/ui.jsx';

const MAX = 5;
const PARENTESCOS = ['Cónyuge o compañero(a)', 'Hijo(a)', 'Padre', 'Madre', 'Hermano(a)', 'Otro'];
const hoy = () => new Date().toISOString().slice(0, 10);

const vacio = () => ({ nombres: '', identificacion: '', fecha_nacimiento: '', parentesco: '', porcentaje: '' });

const SeccionBeneficiarios = ({ defaultValues = {}, onSave, saving, onBack }) => {
  const [lista, setLista] = useState(defaultValues.beneficiarios?.length ? defaultValues.beneficiarios : [{ ...vacio(), porcentaje: '100' }]);
  const [intentado, setIntentado] = useState(false);

  const cambiar = (i, k, v) => setLista(p => p.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));
  const agregar = () => lista.length < MAX && setLista(p => [...p, vacio()]);
  const quitar  = (i) => setLista(p => p.filter((_, idx) => idx !== i));

  const repartir = () => {
    const n = lista.length;
    const base = Math.floor(100 / n);
    setLista(p => p.map((b, i) => ({ ...b, porcentaje: String(i === 0 ? base + (100 - base * n) : base) })));
  };

  const total = lista.reduce((s, b) => s + (Number(b.porcentaje) || 0), 0);
  const incompletos = lista.some(b => !b.nombres.trim() || !b.parentesco || !b.porcentaje);
  const totalOk = total === 100;

  const enviar = (e) => {
    e.preventDefault();
    setIntentado(true);
    if (!totalOk || incompletos) return;
    onSave({
      beneficiarios: lista.map((b, i) => ({
        orden: i + 1,
        nombres: b.nombres.trim(),
        identificacion: b.identificacion || undefined,
        fecha_nacimiento: b.fecha_nacimiento || undefined,
        parentesco: b.parentesco || undefined,
        porcentaje: Number(b.porcentaje),
      })),
    });
  };

  const colorBarra = totalOk ? '#5B9C3C' : total > 100 ? '#dc2626' : '#F6AD18';

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="¿Quién recibiría tus aportes y beneficios si tú faltas?">
        Puedes registrar hasta {MAX} personas. Los porcentajes deben sumar 100%.
      </Aviso>

      <Grupo>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
            <span className="text-slate-600">Distribución</span>
            <span style={{ color: colorBarra }}>{total}% de 100%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(total, 100)}%`, background: colorBarra }} />
          </div>
          {total > 100 && <p className="mt-1 text-sm font-medium text-red-600">Te pasaste por {total - 100}%.</p>}
          {total < 100 && total > 0 && <p className="mt-1 text-sm text-slate-500">Faltan {100 - total}% por asignar.</p>}
        </div>
        {lista.length > 1 && (
          <BotonSecundario onClick={repartir} className="justify-self-start !py-2 text-sm">Repartir en partes iguales</BotonSecundario>
        )}
      </Grupo>

      {lista.map((b, i) => {
        const err = (campo) => (intentado && !b[campo] ? 'Este dato es obligatorio' : undefined);
        return (
          <Grupo key={i} titulo={`Beneficiario ${i + 1}`} className="relative">
            {lista.length > 1 && (
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar beneficiario ${i + 1}`}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={18} />
              </button>
            )}
            <Entrada etiqueta="Nombre completo" requerido placeholder="Nombre y apellidos" name={`b${i}_nombres`}
                     value={b.nombres} onChange={(e) => cambiar(i, 'nombres', e.target.value)} error={err('nombres')} />
            <Fila>
              <Lista etiqueta="Parentesco" requerido opciones={PARENTESCOS} name={`b${i}_parentesco`}
                     value={b.parentesco} onChange={(e) => cambiar(i, 'parentesco', e.target.value)} error={err('parentesco')} />
              <Entrada etiqueta="Porcentaje (%)" requerido type="number" inputMode="numeric" min={1} max={100} placeholder="50" name={`b${i}_porcentaje`}
                       value={b.porcentaje} onChange={(e) => cambiar(i, 'porcentaje', e.target.value)} error={err('porcentaje')} />
            </Fila>
            <Fila>
              <Entrada etiqueta="Documento" inputMode="numeric" name={`b${i}_id`}
                       value={b.identificacion} onChange={(e) => cambiar(i, 'identificacion', e.target.value)} />
              <Entrada etiqueta="Fecha de nacimiento" type="date" max={hoy()} name={`b${i}_nac`}
                       value={b.fecha_nacimiento} onChange={(e) => cambiar(i, 'fecha_nacimiento', e.target.value)} />
            </Fila>
          </Grupo>
        );
      })}

      {lista.length < MAX && (
        <BotonSecundario onClick={agregar} className="border-dashed"><Plus size={18} /> Agregar otro beneficiario</BotonSecundario>
      )}

      {intentado && !totalOk && <Aviso tono="error">Los porcentajes deben sumar exactamente 100%.</Aviso>}
      {intentado && totalOk && incompletos && <Aviso tono="error">Completa nombre, parentesco y porcentaje de cada beneficiario.</Aviso>}

      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionBeneficiarios;
