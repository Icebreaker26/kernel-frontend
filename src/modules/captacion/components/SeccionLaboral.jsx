import { Area, Aviso, BarraAcciones, Casilla, DEPARTAMENTOS, Entrada, Fila, Grupo, Lista, limpiar, obligatorio, useFormulario } from './publico/ui.jsx';

const hoy = () => new Date().toISOString().slice(0, 10);
const req = obligatorio();

const CONTRATOS = [['indefinido', 'Término indefinido'], ['fijo', 'Término fijo'],
                   ['prestacion_servicios', 'Prestación de servicios'], ['otro', 'Otro']];

const SeccionLaboral = ({ defaultValues = {}, onSave, saving, onBack }) => {
  const { d, set, campo, errores, validar } = useFormulario({
    cargo: '', fecha_ingreso: '', tipo_contrato: '',
    direccion_trabajo: '', telefono_trabajo: '', ciudad_trabajo: '', departamento_trabajo: '',
    maneja_recursos_publicos: false, maneja_recursos_desc: '',
    ...defaultValues,
  }, {
    cargo: req,
    tipo_contrato: req,
    fecha_ingreso: (v) => (v && v > hoy() ? 'La fecha no puede ser futura' : null),
  });

  const enviar = (e) => {
    e.preventDefault();
    if (!validar()) return;
    const datos = { ...d };
    if (!datos.maneja_recursos_publicos) delete datos.maneja_recursos_desc;
    onSave(limpiar(datos));
  };

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Grupo titulo="Tu trabajo" descripcion="Con estos datos configuramos el descuento por nómina.">
        <Fila>
          <Entrada etiqueta="Cargo" requerido placeholder="Operario, analista…" autoComplete="organization-title" {...campo('cargo')} />
          <Entrada etiqueta="Fecha de ingreso" type="date" max={hoy()} {...campo('fecha_ingreso')} />
        </Fila>
        <Lista etiqueta="Tipo de contrato" requerido opciones={CONTRATOS} {...campo('tipo_contrato')} />
      </Grupo>

      <Grupo titulo="Dónde trabajas">
        <Entrada etiqueta="Dirección" placeholder="Calle 10 # 20-30" {...campo('direccion_trabajo')} />
        <Fila>
          <Entrada etiqueta="Ciudad" placeholder="Pereira" {...campo('ciudad_trabajo')} />
          <Lista etiqueta="Departamento" opciones={DEPARTAMENTOS} {...campo('departamento_trabajo')} />
        </Fila>
        <Entrada etiqueta="Teléfono del trabajo" type="tel" inputMode="tel" placeholder="6061234567" {...campo('telefono_trabajo')} />
      </Grupo>

      <Grupo>
        <Casilla checked={d.maneja_recursos_publicos} onChange={(v) => set('maneja_recursos_publicos', v)}>
          Tengo a cargo el manejo, administración, control o custodia de recursos públicos
        </Casilla>
        {d.maneja_recursos_publicos && (
          <Area etiqueta="Cuéntanos brevemente tu rol" placeholder="Por ejemplo: superviso el presupuesto de…" {...campo('maneja_recursos_desc')} />
        )}
      </Grupo>

      {Object.values(errores).some(Boolean) && <Aviso tono="error">Revisa los campos marcados en rojo para continuar.</Aviso>}
      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionLaboral;
