import DocumentoLegal, { Lista, Nota, Seccion } from '../components/DocumentoLegal.jsx';

const PoliticaPrivacidadPublica = () => (
  <DocumentoLegal
    tituloPagina="Política de privacidad"
    descripcion="Política de privacidad y tratamiento de datos personales de la Cooperativa Progresemos."
    titulo="Política de privacidad y tratamiento de datos"
    version="Vigente desde julio de 2026 · Versión 1.0"
    pie="Ley 1581 de 2012 · Decreto 1377 de 2013 · Circular Básica Jurídica Supersolidaria">

    <Seccion titulo="1. Responsable del tratamiento">
      <p>
        <strong>Cooperativa Progresemos</strong>, identificada con NIT 891.408.752-6,
        con domicilio en la Calle 10A #7-41, Barrio Restrepo, La Virginia, Risaralda, Colombia,
        es la responsable del tratamiento de los datos personales recopilados a través del Sistema
        Kernel y del Portal del Asociado.
      </p>
      <Nota>
        Contacto para temas de datos personales: controlinterno@cooperativaprogresemos.coop ·
        Vigilada por la Superintendencia de la Economía Solidaria (Supersolidaria)
      </Nota>
    </Seccion>

    <Seccion titulo="2. Datos personales que se tratan">
      <p>El sistema trata los siguientes datos de los asociados:</p>
      <Lista items={[
        'Número de cédula de ciudadanía (código de identificación)',
        'Nombre y apellidos',
        'Dirección de residencia',
        'Número de teléfono / celular',
        'Ciudad de residencia',
        'Empresa empleadora',
        'Valor y saldo de aporte mensual',
        'Historial de aportes',
        'Participación en sorteos y bonos asignados',
        'Fecha de ingreso, retiro o reingreso a la cooperativa',
      ]} />
    </Seccion>

    <Seccion titulo="3. Finalidades del tratamiento">
      <p>Los datos se utilizan exclusivamente para:</p>
      <Lista items={[
        'Administrar el vínculo asociativo y los aportes del asociado',
        'Gestionar la participación en sorteos y asignación de bonos',
        'Habilitar y operar el Portal del Asociado',
        'Enviar comunicaciones relacionadas con la actividad cooperativa',
        'Cumplir obligaciones legales ante Supersolidaria y demás autoridades',
        'Generar reportes internos de gestión',
      ]} />
    </Seccion>

    <Seccion titulo="4. Base legal del tratamiento">
      <p>
        El tratamiento se realiza con base en la autorización firmada por el asociado al momento de
        su afiliación a la cooperativa, de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013.
        El Portal del Asociado es un canal digital de consulta de información ya autorizada —
        no constituye un nuevo punto de recolección de datos.
      </p>
    </Seccion>

    <Seccion titulo="5. Derechos del titular">
      <p>Como titular de los datos, el asociado tiene derecho a:</p>
      <Lista items={[
        'Conocer los datos personales que se tienen sobre él',
        'Actualizar y rectificar datos inexactos o incompletos',
        'Solicitar la supresión de datos cuando no exista obligación legal de conservarlos',
        'Revocar la autorización de tratamiento',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)',
      ]} />
      <Nota>
        Para ejercer estos derechos, el asociado puede dirigirse personalmente a las oficinas de la
        cooperativa o escribir al correo controlinterno@cooperativaprogresemos.coop. La cooperativa
        responderá en un plazo máximo de 15 días hábiles.
      </Nota>
    </Seccion>

    <Seccion titulo="6. Transferencias de datos">
      <p>
        Los datos del asociado son sincronizados periódicamente desde el sistema de administración
        de la cooperativa. No se realizan transferencias a terceros con fines comerciales.
        La información podrá ser compartida con las autoridades competentes cuando así lo exija la ley.
      </p>
    </Seccion>

    <Seccion titulo="7. Conservación de datos">
      <p>
        Los datos se conservan durante la vigencia del vínculo asociativo y por el período adicional
        que exija la normativa aplicable (mínimo 10 años para datos financieros cooperativos, según
        las circulares de Supersolidaria).
      </p>
    </Seccion>

    <Seccion titulo="8. Seguridad">
      <p>
        La cooperativa implementa medidas técnicas y administrativas para proteger los datos contra
        acceso no autorizado, pérdida o alteración. El acceso al portal está protegido mediante
        contraseña personal, la cual es responsabilidad del asociado mantener confidencial.
      </p>
    </Seccion>
  </DocumentoLegal>
);

export default PoliticaPrivacidadPublica;
