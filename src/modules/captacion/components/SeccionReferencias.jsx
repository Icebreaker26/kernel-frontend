import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Aviso, BarraAcciones, BotonSecundario, Campo, Entrada, Fila, Grupo, Segmentado } from './publico/ui.jsx';

const MAX = 2;
const TIPOS = [['personal', 'Personal'], ['familiar', 'Familiar']];
const vacio = (tipo = 'personal') => ({ nombres: '', celular: '', tipo });

const SeccionReferencias = ({ defaultValues = {}, onSave, saving, onBack }) => {
  const [lista, setLista] = useState(defaultValues.referencias?.length ? defaultValues.referencias : [vacio('personal')]);
  const [intentado, setIntentado] = useState(false);

  const cambiar = (i, k, v) => setLista(p => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const agregar = () => lista.length < MAX && setLista(p => [...p, vacio('familiar')]);
  const quitar  = (i) => setLista(p => p.filter((_, idx) => idx !== i));

  const celularValido = (c) => c.replace(/\D/g, '').length >= 7;
  const invalido = lista.some(r => !r.nombres.trim() || !celularValido(r.celular));

  const enviar = (e) => {
    e.preventDefault();
    setIntentado(true);
    if (invalido) return;
    onSave({ referencias: lista.map(r => ({ tipo: r.tipo, nombres: r.nombres.trim(), celular: r.celular.trim() })) });
  };

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="Personas que te conocen">
        Pueden ser un amigo, un compañero o un familiar que pueda confirmar que te conoce. No tienen que vivir contigo.
      </Aviso>

      {lista.map((r, i) => (
        <Grupo key={i} titulo={`Referencia ${i + 1}`} className="relative">
          {lista.length > 1 && (
            <button type="button" onClick={() => quitar(i)} aria-label={`Quitar referencia ${i + 1}`}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={18} />
            </button>
          )}
          <Campo etiqueta="Tipo de referencia">
            <Segmentado etiqueta="Tipo de referencia" value={r.tipo} onChange={(v) => cambiar(i, 'tipo', v)} opciones={TIPOS} />
          </Campo>
          <Fila>
            <Entrada etiqueta="Nombre completo" requerido placeholder="Nombre y apellidos" name={`r${i}_nombres`}
                     value={r.nombres} onChange={(e) => cambiar(i, 'nombres', e.target.value)}
                     error={intentado && !r.nombres.trim() ? 'Este dato es obligatorio' : undefined} />
            <Entrada etiqueta="Celular" requerido type="tel" inputMode="tel" placeholder="300 000 0000" name={`r${i}_celular`}
                     value={r.celular} onChange={(e) => cambiar(i, 'celular', e.target.value)}
                     error={intentado && !celularValido(r.celular) ? 'Escribe un número válido' : undefined} />
          </Fila>
        </Grupo>
      ))}

      {lista.length < MAX && (
        <BotonSecundario onClick={agregar} className="border-dashed"><Plus size={18} /> Agregar una segunda referencia</BotonSecundario>
      )}

      {intentado && invalido && <Aviso tono="error">Completa el nombre y el celular de cada referencia.</Aviso>}
      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionReferencias;
