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

const PoliticaPrivacidad = () => {
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
            POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS
          </h1>
          <p className="text-[#6aacbc] text-[9px] tracking-wider mt-2">Vigente desde julio de 2026 · Versión 1.0</p>
        </div>

        <div className="bg-[#08101e] border border-[#00e5ff15] rounded-sm p-6">

          <Seccion titulo="1. Responsable del tratamiento">
            <p>
              <span className="text-[#00e5ff]">Cooperativa Progresemos</span>, identificada con NIT 891.408.752-6,
              con domicilio en la Calle 10A #7-41, Barrio Restrepo, La Virginia, Risaralda, Colombia,
              es la responsable del tratamiento de los datos personales recopilados a través del Sistema
              Kernel y del Portal del Asociado.
            </p>
            <p className="text-[#6aacbc] text-xs">
              Contacto para temas de datos personales: controlinterno@cooperativaprogresemos.coop ·
              Vigilada por la Superintendencia de la Economía Solidaria (Supersolidaria)
            </p>
          </Seccion>

          <Seccion titulo="2. Datos personales que se tratan">
            <p>El sistema trata los siguientes datos de los asociados:</p>
            <ul className="list-none space-y-1 mt-2">
              {[
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
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs">
                  <span className="text-[#00e5ff55] mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo="3. Finalidades del tratamiento">
            <p>Los datos se utilizan exclusivamente para:</p>
            <ul className="list-none space-y-1 mt-2">
              {[
                'Administrar el vínculo asociativo y los aportes del asociado',
                'Gestionar la participación en sorteos y asignación de bonos',
                'Habilitar y operar el Portal del Asociado',
                'Enviar comunicaciones relacionadas con la actividad cooperativa',
                'Cumplir obligaciones legales ante Supersolidaria y demás autoridades',
                'Generar reportes internos de gestión',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs">
                  <span className="text-[#00e5ff55] mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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
            <ul className="list-none space-y-1 mt-2">
              {[
                'Conocer los datos personales que se tienen sobre él',
                'Actualizar y rectificar datos inexactos o incompletos',
                'Solicitar la supresión de datos cuando no exista obligación legal de conservarlos',
                'Revocar la autorización de tratamiento',
                'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs">
                  <span className="text-[#00e5ff55] mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[#6aacbc] text-xs">
              Para ejercer estos derechos, el asociado puede dirigirse personalmente a las oficinas de la
              cooperativa o escribir al correo controlinterno@cooperativaprogresemos.coop. La cooperativa
              responderá en un plazo máximo de 15 días hábiles.
            </p>
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

          <div className="mt-8 pt-4 border-t border-[#00e5ff0d] text-[#6aacbc] text-[9px] tracking-wider">
            Ley 1581 de 2012 · Decreto 1377 de 2013 · Circular Básica Jurídica Supersolidaria
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

export default PoliticaPrivacidad;
