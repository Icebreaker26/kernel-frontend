import { useState } from 'react';
import { Eye, Lock } from 'lucide-react';
import { Aviso, BarraAcciones, BotonPrimario, Casilla, Dinero, Entrada, Fila, Grupo, limpiar, obligatorio, useFormulario } from './publico/ui.jsx';

const req = obligatorio();
const num = (v) => (v ? Number(v) : undefined);

const DETALLE = [['banco', 'Banco'], ['ciudad', 'Ciudad'], ['pais', 'País'], ['moneda', 'Moneda']];

const SeccionFinanciera = ({ defaultValues = {}, onSave, saving, onBack, isStand }) => {
  // En el stand la pantalla es compartida: pedimos confirmar que nadie más mira antes de mostrar cifras.
  const [visible, setVisible] = useState(!isStand);

  const { d, set, campo, errores, validar } = useFormulario({
    actividad_financiera: '', ingresos_mensuales: '', egresos_mensuales: '',
    otros_ingresos: '', otros_ingresos_desc: '', total_activos: '', total_pasivos: '',
    origen_fondos: '', moneda_extranjera: false, moneda_extranjera_detalle: [{}],
    ...defaultValues,
  }, {
    ingresos_mensuales: (v) => (!v ? 'Cuéntanos tus ingresos mensuales' : null),
    origen_fondos: req,
  });

  const detalle = d.moneda_extranjera_detalle?.[0] || {};
  const setDetalle = (k, v) => set('moneda_extranjera_detalle', [{ ...detalle, [k]: v }]);

  const enviar = (e) => {
    e.preventDefault();
    if (!validar()) return;
    const { moneda_extranjera_detalle, ...resto } = d;
    const detalleLimpio = limpiar(detalle);
    onSave(limpiar({
      ...resto,
      ingresos_mensuales: num(d.ingresos_mensuales),
      egresos_mensuales:  num(d.egresos_mensuales),
      otros_ingresos:     num(d.otros_ingresos),
      total_activos:      num(d.total_activos),
      total_pasivos:      num(d.total_pasivos),
      moneda_extranjera_detalle: d.moneda_extranjera && Object.keys(detalleLimpio).length ? [detalleLimpio] : undefined,
    }));
  };

  if (!visible) {
    return (
      <Grupo>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F1F7] text-[#065B8E]"><Lock size={26} /></span>
          <h3 className="text-lg font-extrabold text-slate-900">Esta sección es privada</h3>
          <p className="max-w-sm text-slate-600">Vas a escribir tus ingresos y tu patrimonio. Asegúrate de que nadie más esté viendo la pantalla.</p>
          <BotonPrimario type="button" onClick={() => setVisible(true)}><Eye size={18} /> Continuar, estoy solo(a)</BotonPrimario>
        </div>
      </Grupo>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Grupo titulo="Tus ingresos" descripcion="Es un requisito de la Superintendencia de Economía Solidaria. Solo lo ve el equipo de la cooperativa.">
        <Entrada etiqueta="¿A qué te dedicas?" placeholder="Empleado, independiente, comerciante…" {...campo('actividad_financiera')} />
        <Fila>
          <Dinero etiqueta="Ingresos mensuales" requerido placeholder="2.500.000" inputMode="numeric" {...campo('ingresos_mensuales')} />
          <Dinero etiqueta="Egresos mensuales" placeholder="1.800.000" {...campo('egresos_mensuales')} />
        </Fila>
        <Fila>
          <Dinero etiqueta="Otros ingresos" placeholder="0" {...campo('otros_ingresos')} />
          <Entrada etiqueta="¿De dónde vienen?" placeholder="Arriendo, honorarios…" {...campo('otros_ingresos_desc')} />
        </Fila>
      </Grupo>

      <Grupo titulo="Tu patrimonio">
        <Fila>
          <Dinero etiqueta="Total de lo que tienes (activos)" placeholder="15.000.000" {...campo('total_activos')} />
          <Dinero etiqueta="Total de lo que debes (pasivos)" placeholder="3.000.000" {...campo('total_pasivos')} />
        </Fila>
        <Entrada etiqueta="Origen de tus fondos" requerido placeholder="Salario como empleado, ventas del negocio…" {...campo('origen_fondos')} />
      </Grupo>

      <Grupo>
        <Casilla checked={d.moneda_extranjera} onChange={(v) => set('moneda_extranjera', v)}>
          Manejo cuentas o transacciones en moneda extranjera
        </Casilla>
        {d.moneda_extranjera && (
          <Fila>
            {DETALLE.map(([k, l]) => (
              <Entrada key={k} etiqueta={l} name={`detalle_${k}`} value={detalle[k] || ''} onChange={(e) => setDetalle(k, e.target.value)} />
            ))}
          </Fila>
        )}
      </Grupo>

      {Object.values(errores).some(Boolean) && <Aviso tono="error">Revisa los campos marcados en rojo para continuar.</Aviso>}
      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionFinanciera;
