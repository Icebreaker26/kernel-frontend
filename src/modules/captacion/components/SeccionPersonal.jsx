import { Aviso, BarraAcciones, Casilla, DEPARTAMENTOS, Entrada, Fila, Grupo, Lista, limpiar, obligatorio, useFormulario } from './publico/ui.jsx';

const hoy = () => new Date().toISOString().slice(0, 10);
const req = obligatorio();
const soloDigitos = (v) => String(v || '').replace(/\D/g, '');
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NIVELES = ['Primaria', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Posgrado'];
const CIVIL = [['soltero', 'Soltero/a'], ['casado', 'Casado/a'], ['union_libre', 'Unión libre'],
               ['separado', 'Separado/a'], ['divorciado', 'Divorciado/a'], ['viudo', 'Viudo/a']];

const SeccionPersonal = ({ defaultValues = {}, onSave, saving, onBack, pideIdentidad = false, pideCelular = false, pideCorreo = false }) => {
  const { d, set, campo, errores, validar } = useFormulario({
    nombres: '', apellidos: '', cedula: '', celular: '', correo: '',
    tipo_documento: 'CC', ciudad_expedicion: '', fecha_expedicion: '',
    fecha_nacimiento: '', ciudad_nacimiento: '', departamento_nacimiento: '',
    direccion_residencia: '', ciudad_residencia: '', departamento_residencia: '',
    telefono_fijo: '', genero: '', nivel_academico: '', profesion: '',
    estado_civil: '', tipo_vivienda: '', estrato: '', personas_a_cargo: '',
    cabeza_de_hogar: false, declarante_de_renta: false,
    conyuge_nombre: '', conyuge_cedula: '', conyuge_fecha_nacimiento: '', conyuge_actividad: '',
    ...defaultValues,
  }, {
    ...(pideIdentidad ? {
      nombres:   req,
      apellidos: req,
      cedula:    (v) => (!v || String(v).replace(/\D/g, '').length < 5 ? 'Escribe tu número de documento' : null),
    } : {}),
    ...(pideCelular ? {
      celular: (v) => (soloDigitos(v).length < 10 ? 'Escribe tu celular de 10 dígitos' : null),
    } : {}),
    ...(pideCorreo ? {
      correo: (v) => (!v ? 'Este dato es obligatorio' : !CORREO.test(String(v).trim()) ? 'Escribe un correo válido, por ejemplo nombre@correo.com' : null),
    } : {}),
    tipo_documento:       req,
    fecha_nacimiento:     (v) => (!v ? 'Este dato es obligatorio' : v > hoy() ? 'La fecha no puede ser futura' : null),
    direccion_residencia: req,
    ciudad_residencia:    req,
  });

  const tieneConyuge = ['casado', 'union_libre'].includes(d.estado_civil);

  const enviar = (e) => {
    e.preventDefault();
    if (!validar()) return;
    const datos = { ...d };
    // Solo se envía el contacto que se pidió; el resto ya lo tenemos y no debe pisarse
    if (!pideCelular) delete datos.celular; else datos.celular = soloDigitos(datos.celular);
    if (!pideCorreo) delete datos.correo; else datos.correo = String(datos.correo).trim().toLowerCase();
    if (!tieneConyuge) ['conyuge_nombre', 'conyuge_cedula', 'conyuge_fecha_nacimiento', 'conyuge_actividad'].forEach(k => delete datos[k]);
    onSave(limpiar(datos));
  };

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {pideIdentidad && (
        <Grupo titulo="¿Quién eres?" descripcion="Así quedará registrada tu solicitud.">
          <Fila>
            <Entrada etiqueta="Nombres" requerido autoComplete="given-name" placeholder="Juan Carlos" {...campo('nombres')} />
            <Entrada etiqueta="Apellidos" requerido autoComplete="family-name" placeholder="García López" {...campo('apellidos')} />
          </Fila>
          <Entrada etiqueta="Número de documento" requerido inputMode="numeric" placeholder="1234567890"
                   ayuda="Lo usaremos para confirmar tu identidad al firmar." {...campo('cedula')} />
        </Grupo>
      )}

      {(pideCelular || pideCorreo) && (
        <Grupo titulo="¿Cómo te contactamos?" descripcion="Tu asesor usará estos datos para avisarte cómo va tu solicitud.">
          <Fila>
            {pideCelular && <Entrada etiqueta="Celular" requerido type="tel" inputMode="tel" autoComplete="tel-national" placeholder="300 123 4567" {...campo('celular')} />}
            {pideCorreo && <Entrada etiqueta="Correo electrónico" requerido type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="nombre@correo.com" {...campo('correo')} />}
          </Fila>
        </Grupo>
      )}

      <Grupo titulo="Tu documento">
        <Fila>
          <Lista etiqueta="Tipo de documento" requerido opciones={['CC', 'TI', 'CE', 'PAS']} {...campo('tipo_documento')} />
          <Entrada etiqueta="Ciudad de expedición" placeholder="Pereira" {...campo('ciudad_expedicion')} />
        </Fila>
        <Entrada etiqueta="Fecha de expedición" type="date" max={hoy()} {...campo('fecha_expedicion')} />
      </Grupo>

      <Grupo titulo="Nacimiento">
        <Entrada etiqueta="Fecha de nacimiento" requerido type="date" max={hoy()} autoComplete="bday" {...campo('fecha_nacimiento')} />
        <Fila>
          <Entrada etiqueta="Ciudad" placeholder="Manizales" {...campo('ciudad_nacimiento')} />
          <Lista etiqueta="Departamento" opciones={DEPARTAMENTOS} {...campo('departamento_nacimiento')} />
        </Fila>
      </Grupo>

      <Grupo titulo="Dónde vives">
        <Entrada etiqueta="Dirección" requerido autoComplete="street-address" placeholder="Calle 123 # 45-67" {...campo('direccion_residencia')} />
        <Fila>
          <Entrada etiqueta="Ciudad" requerido autoComplete="address-level2" placeholder="Pereira" {...campo('ciudad_residencia')} />
          <Lista etiqueta="Departamento" opciones={DEPARTAMENTOS} {...campo('departamento_residencia')} />
        </Fila>
        <Fila>
          <Lista etiqueta="Tipo de vivienda" opciones={[['propia', 'Propia'], ['arrendada', 'Arrendada'], ['familiar', 'Familiar']]} {...campo('tipo_vivienda')} />
          <Lista etiqueta="Estrato" opciones={[1, 2, 3, 4, 5, 6].map(n => [String(n), `Estrato ${n}`])} {...campo('estrato')} />
        </Fila>
        <Entrada etiqueta="Teléfono fijo" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="6061234567" {...campo('telefono_fijo')} />
      </Grupo>

      <Grupo titulo="Sobre ti">
        <Fila>
          <Lista etiqueta="Género" opciones={[['M', 'Masculino'], ['F', 'Femenino']]} {...campo('genero')} />
          <Lista etiqueta="Estado civil" opciones={CIVIL} {...campo('estado_civil')} />
        </Fila>
        <Fila>
          <Lista etiqueta="Nivel académico" opciones={NIVELES} {...campo('nivel_academico')} />
          <Entrada etiqueta="Profesión u oficio" placeholder="Ingeniero" {...campo('profesion')} />
        </Fila>
        <Entrada etiqueta="Personas a cargo" type="number" inputMode="numeric" min={0} placeholder="0" {...campo('personas_a_cargo')} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Casilla checked={d.cabeza_de_hogar} onChange={(v) => set('cabeza_de_hogar', v)}>Soy cabeza de hogar</Casilla>
          <Casilla checked={d.declarante_de_renta} onChange={(v) => set('declarante_de_renta', v)}>Declaro renta</Casilla>
        </div>
      </Grupo>

      {tieneConyuge && (
        <Grupo titulo="Tu pareja" descripcion="Solo si quieres registrarla; puedes dejarlo en blanco.">
          <Fila>
            <Entrada etiqueta="Nombre completo" {...campo('conyuge_nombre')} />
            <Entrada etiqueta="Documento" inputMode="numeric" {...campo('conyuge_cedula')} />
          </Fila>
          <Fila>
            <Entrada etiqueta="Fecha de nacimiento" type="date" max={hoy()} {...campo('conyuge_fecha_nacimiento')} />
            <Entrada etiqueta="A qué se dedica" {...campo('conyuge_actividad')} />
          </Fila>
        </Grupo>
      )}

      {Object.values(errores).some(Boolean) && (
        <Aviso tono="error">Revisa los campos marcados en rojo para continuar.</Aviso>
      )}
      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionPersonal;
