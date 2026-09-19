import { useState } from 'react';
import { Check, HeartHandshake, ShieldCheck, Trophy } from 'lucide-react';
import { dinero } from '../utils/formato.js';
import { Aviso, BarraAcciones, Campo, Dinero, Grupo, Segmentado, useFormulario } from './publico/ui.jsx';
import { useTema } from './publico/tema.js';

// Tarjeta de un beneficio opcional: se activa/desactiva y muestra su costo mensual.
const Opcion = ({ icono: Icono, titulo, descripcion, precio, activo, onChange, name }) => {
  const t = useTema();
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition ${activo ? t.opcionOn : t.opcionOff}`}>
      <input type="checkbox" name={name} checked={activo} onChange={(e) => onChange(e.target.checked)}
             className={`mt-1 h-5 w-5 shrink-0 ${t.check}`} />
      <span className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${t.opcionIcono}`}><Icono size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className={`block ${t.opcionTitulo}`}>{titulo}</span>
          <span className={`block ${t.opcionDesc}`}>{descripcion}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block ${t.opcionPrecio}`}>{dinero(precio)}</span>
          <span className={`block ${t.opcionUnidad}`}>al mes</span>
        </span>
      </span>
    </label>
  );
};

const Linea = ({ texto, valor, tipo = 'linea' }) => {
  const t = useTema();
  return (
    <div className={`flex items-baseline justify-between gap-3 ${t[tipo]}`}>
      <span>{texto}</span><span className="tabular-nums">{valor}</span>
    </div>
  );
};

const SeccionAportes = ({ defaultValues = {}, onSave, saving, onBack, tarifas, etiqueta, etiquetaAtras, introduccion }) => {
  const t = useTema();
  const minimo = tarifas.aporte_minimo;
  const paso   = tarifas.aporte_paso;

  const { d, set, campo, errores, validar } = useFormulario({
    valor_aporte: String(defaultValues.valor_aporte ?? minimo),
    periodicidad: defaultValues.periodicidad ?? '',
    seguro_vida: !!defaultValues.seguro_vida,
    bono_sorteo: !!defaultValues.bono_sorteo,
  }, {
    valor_aporte: (v) => {
      const n = Number(v);
      if (!n) return 'Escribe cuánto quieres aportar';
      if (n < minimo) return `El aporte mínimo es ${dinero(minimo)}`;
      if (n % paso !== 0) return `Usa múltiplos de ${dinero(paso)} (por ejemplo ${dinero(minimo + paso)})`;
      return null;
    },
    periodicidad: (v) => (v ? null : 'Elige cada cuánto te pagan'),
  });

  const [otroValor, setOtroValor] = useState(Number(d.valor_aporte) !== minimo);

  const aporte  = Number(d.valor_aporte) || 0;
  const seguro  = d.seguro_vida ? tarifas.seguro_vida : 0;
  const bono    = d.bono_sorteo ? tarifas.bono_sorteo : 0;
  const total   = aporte + tarifas.fondo_bienestar + seguro + bono;
  const quincenal = d.periodicidad === 'quincenal';

  const enviar = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onSave({ valor_aporte: Number(d.valor_aporte), periodicidad: d.periodicidad, seguro_vida: d.seguro_vida, bono_sorteo: d.bono_sorteo });
  };

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {introduccion}
      <Grupo titulo="Tu aporte" descripcion="Es ahorro tuyo: al retirarte te devolvemos el 100% de tus aportes.">
        <Campo etiqueta="¿Cuánto quieres aportar cada mes?" requerido>
          <Segmentado
            etiqueta="Valor del aporte"
            value={otroValor ? 'otro' : 'minimo'}
            onChange={(v) => { setOtroValor(v === 'otro'); if (v === 'minimo') set('valor_aporte', String(minimo)); }}
            opciones={[['minimo', `Mínimo ${dinero(minimo)}`], ['otro', 'Otro valor']]}
          />
        </Campo>
        {otroValor && (
          <Dinero etiqueta="Tu aporte mensual" requerido placeholder={String(minimo + paso)}
                  ayuda={`Desde ${dinero(minimo)}, en múltiplos de ${dinero(paso)}.`} {...campo('valor_aporte')} />
        )}
        {!otroValor && errores.valor_aporte && <p role="alert" className={t.errorTexto}>{errores.valor_aporte}</p>}

        <Campo etiqueta="¿Cada cuánto te pagan en tu empresa?" requerido error={errores.periodicidad}
               ayuda="Así te descontaremos: una vez al mes o cada quincena.">
          <Segmentado
            name="periodicidad" etiqueta="Periodicidad del pago"
            value={d.periodicidad} onChange={(v) => set('periodicidad', v)}
            opciones={[['mensual', 'Mensual'], ['quincenal', 'Quincenal']]}
          />
        </Campo>
      </Grupo>

      <Grupo titulo="Beneficios" descripcion="El fondo de bienestar va incluido; los demás los eliges tú.">
        <div className={`flex items-start gap-3 rounded-xl border-2 p-3.5 ${t.incluido.caja}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${t.incluido.marca}`}><Check size={14} strokeWidth={3} /></span>
          <span className="flex min-w-0 flex-1 items-start gap-3">
            <span className={`mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${t.incluido.icono}`}><HeartHandshake size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className={`block ${t.opcionTitulo}`}>Fondo de bienestar <span className={`ml-1 rounded-full px-2 py-0.5 align-middle text-xs font-bold ${t.incluido.pastilla}`}>Incluido</span></span>
              <span className={`block ${t.opcionDesc}`}>Recreación, salud, auxilios e incentivos durante todo el año.</span>
            </span>
            <span className="shrink-0 text-right">
              <span className={`block ${t.opcionPrecio}`}>{dinero(tarifas.fondo_bienestar)}</span>
              <span className={`block ${t.opcionUnidad}`}>al mes</span>
            </span>
          </span>
        </div>

        <Opcion name="seguro_vida" icono={ShieldCheck} titulo="Seguro de vida (opcional)"
                descripcion="Te cubre con un seguro de $5.000.000." precio={tarifas.seguro_vida}
                activo={d.seguro_vida} onChange={(v) => set('seguro_vida', v)} />
        <Opcion name="bono_sorteo" icono={Trophy} titulo="Bono de sorteo (opcional)"
                descripcion="Participas cada mes en el sorteo. Se paga cada mes." precio={tarifas.bono_sorteo}
                activo={d.bono_sorteo} onChange={(v) => set('bono_sorteo', v)} />
      </Grupo>

      <Grupo titulo="Resumen de tu descuento">
        <div className="grid gap-2">
          <Linea texto="Aporte (ahorro tuyo)" valor={dinero(aporte)} />
          <Linea texto="Fondo de bienestar" valor={dinero(tarifas.fondo_bienestar)} />
          {d.seguro_vida && <Linea texto="Seguro de vida" valor={dinero(seguro)} />}
          {d.bono_sorteo && <Linea texto="Bono de sorteo" valor={dinero(bono)} />}
          <div className={`my-1 border-t ${t.divisor}`} />
          <Linea texto="Total al mes" valor={dinero(total)} tipo="lineaFuerte" />
          {quincenal && <Linea texto="En cada quincena (la mitad)" valor={dinero(total / 2)} tipo="lineaTenue" />}
        </div>
        <Aviso tono="info">
          Solo en el primer mes se suma la <strong>cuota de admisión de {dinero(tarifas.cuota_admision)}</strong>. Todo se descuenta directamente de la nómina.
        </Aviso>
      </Grupo>

      {Object.values(errores).some(Boolean) && <Aviso tono="error">Revisa los datos marcados para continuar.</Aviso>}
      <BarraAcciones onBack={onBack} cargando={saving} etiqueta={etiqueta} etiquetaAtras={etiquetaAtras} />
    </form>
  );
};

export default SeccionAportes;
