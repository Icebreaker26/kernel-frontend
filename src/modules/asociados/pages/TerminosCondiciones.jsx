import DocumentoLegal, { Lista, Seccion } from '../components/DocumentoLegal.jsx';

const TerminosPublico = () => (
  <DocumentoLegal
    tituloPagina="Términos y condiciones"
    titulo="Términos y condiciones del Portal del Asociado"
    version="Vigente desde julio de 2026 · Versión 1.0"
    pie="Cooperativa Progresemos · Portal del Asociado · Colombia">

    <Seccion titulo="1. Objeto">
      <p>
        El Portal del Asociado es un canal digital provisto por <strong>Cooperativa Progresemos</strong> que
        permite al asociado consultar su información personal, gestionar su participación en sorteos y
        acceder a comunicaciones de la cooperativa. El uso del portal implica la aceptación de los presentes
        términos.
      </p>
    </Seccion>

    <Seccion titulo="2. Acceso y credenciales">
      <p>
        El acceso al portal es habilitado por la cooperativa mediante solicitud del asociado.
        Las credenciales de acceso (código de cédula y contraseña) son personales e intransferibles.
      </p>
      <p>
        El asociado es responsable de mantener la confidencialidad de su contraseña. En caso de
        pérdida o sospecha de uso no autorizado, debe notificar de inmediato a la cooperativa.
        La cooperativa no se hace responsable por accesos no autorizados derivados del uso descuidado
        de las credenciales.
      </p>
    </Seccion>

    <Seccion titulo="3. Uso aceptable">
      <p>El asociado se compromete a:</p>
      <Lista items={[
        'Usar el portal únicamente para los fines para los que fue diseñado',
        'No compartir sus credenciales con terceros',
        'No intentar acceder a información de otros asociados',
        'No realizar acciones que puedan afectar el funcionamiento del sistema',
        'Mantener actualizada su información de contacto a través de la cooperativa',
      ]} />
    </Seccion>

    <Seccion titulo="4. Disponibilidad del servicio">
      <p>
        La cooperativa procura mantener el portal disponible de manera continua, pero no garantiza
        disponibilidad ininterrumpida. El servicio puede suspenderse temporalmente por mantenimiento,
        actualizaciones o causas de fuerza mayor sin previo aviso.
      </p>
    </Seccion>

    <Seccion titulo="5. Exactitud de la información">
      <p>
        La información mostrada en el portal proviene del sistema de administración de la cooperativa.
        Si el asociado detecta datos incorrectos o desactualizados, debe informarlo directamente a
        la cooperativa para su corrección. El portal es un medio de consulta — la fuente de verdad
        es el expediente físico del asociado.
      </p>
    </Seccion>

    <Seccion titulo="6. Solicitudes de bonos en sorteos">
      <p>
        Las solicitudes de adquisición o retiro de bonos realizadas desde el portal son peticiones
        que quedan sujetas a aprobación por parte del personal de la cooperativa. Una solicitud enviada
        no garantiza la asignación inmediata del número. El estado de la solicitud puede consultarse
        en el portal.
      </p>
    </Seccion>

    <Seccion titulo="7. Desactivación del acceso">
      <p>
        La cooperativa puede desactivar el acceso al portal en cualquier momento, especialmente en
        caso de retiro del asociado, uso indebido del portal o solicitud expresa del titular.
      </p>
    </Seccion>

    <Seccion titulo="8. Modificaciones">
      <p>
        La cooperativa puede modificar los presentes términos en cualquier momento. Los cambios
        serán comunicados a través del portal o por los medios de contacto registrados por el asociado.
        El uso continuado del portal tras la comunicación de cambios implica su aceptación.
      </p>
    </Seccion>

    <Seccion titulo="9. Ley aplicable">
      <p>
        Los presentes términos se rigen por las leyes de la República de Colombia. Cualquier
        controversia será resuelta ante las autoridades competentes, con domicilio en el lugar
        de funcionamiento de la cooperativa.
      </p>
    </Seccion>
  </DocumentoLegal>
);

export default TerminosPublico;
