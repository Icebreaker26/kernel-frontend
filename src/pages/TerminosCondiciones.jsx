import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GeometricBackground from '../components/GeometricBackground.jsx';

const Seccion = ({ titulo, children }) => (
  <div className="mb-8">
    <h2 className="text-[#00e5ff] text-[10px] tracking-[4px] uppercase mb-3 border-b border-[#00e5ff15] pb-2">
      {titulo}
    </h2>
    <div className="text-[#a0d4e0] text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const TerminosCondiciones = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#05080f] font-mono relative">
      <GeometricBackground />
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)' }}
      />

      <div className="relative z-[2] max-w-2xl mx-auto px-5 py-10">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-[3px] transition-colors mb-8"
        >
          <ArrowLeft size={12} /> VOLVER
        </button>

        <div className="mb-10">
          <p className="text-[#6aacbc] text-[8px] tracking-[4px] mb-2">// COOPERATIVA PROGRESEMOS</p>
          <h1 className="text-xl font-bold text-[#a0d4e0] tracking-wider">
            TÉRMINOS Y CONDICIONES DEL PORTAL DEL ASOCIADO
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-2">Vigente desde julio de 2026 · Versión 1.0</p>
        </div>

        <div className="bg-[#08101e] border border-[#00e5ff15] rounded-sm p-6">

          <Seccion titulo="1. Objeto">
            <p>
              El Portal del Asociado es un canal digital provisto por{' '}
              <span className="text-[#00e5ff]">Cooperativa Progresemos</span> que permite al asociado
              consultar su información personal, gestionar su participación en sorteos y acceder a
              comunicaciones de la cooperativa. El uso del portal implica la aceptación de los presentes
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
            <ul className="list-none space-y-1 mt-2">
              {[
                'Usar el portal únicamente para los fines para los que fue diseñado',
                'No compartir sus credenciales con terceros',
                'No intentar acceder a información de otros asociados',
                'No realizar acciones que puedan afectar el funcionamiento del sistema',
                'Mantener actualizada su información de contacto a través de la cooperativa',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs">
                  <span className="text-[#00e5ff55] mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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

          <div className="mt-8 pt-4 border-t border-[#00e5ff0d] text-[#6aacbc] text-[9px] tracking-wider">
            Cooperativa Progresemos · Portal del Asociado · Colombia
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-[#6aacbc] hover:text-[#a0d4e0] text-[9px] tracking-[3px] transition-colors"
          >
            VOLVER AL PORTAL
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminosCondiciones;
