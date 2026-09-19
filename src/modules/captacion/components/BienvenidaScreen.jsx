import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Banknote, Check, Copy, HeartHandshake, Landmark, PiggyBank, ShieldCheck, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { ACCENTS } from '../data/marca.js';
import MarcoPublico from './publico/MarcoPublico.jsx';
import PresentacionCooperativa from './PresentacionCooperativa.jsx';
import { BotonPrimario, BotonSecundario, Grupo } from './publico/ui.jsx';

// Mismos servicios que presenta el kiosco, para que el mensaje sea coherente.
const BENEFICIOS = [
  { Ic: PiggyBank,      titulo: 'Ahorro',            texto: 'Tus aportes son tuyos: al retirarte recuperas el 100%.', accent: 'azul' },
  { Ic: Banknote,       titulo: 'Créditos',          texto: 'Con descuento por nómina y sin trámites adicionales.',   accent: 'verde' },
  { Ic: ShieldCheck,    titulo: 'Seguros',           texto: 'Vida, autos, familiar y exequial.',                       accent: 'dorado' },
  { Ic: HeartHandshake, titulo: 'Bienestar',         texto: 'Recreación, salud, auxilios e incentivos todo el año.',  accent: 'bosque' },
];

const A_LA_MANO = [
  'Tu cédula, para subir una foto de ambas caras',
  'Cargo y fecha de ingreso en tu empresa',
  'Nombre y documento de quien será tu beneficiario',
  'Nombre y celular de una persona de referencia',
];

const BienvenidaScreen = ({ prospecto, token, isStand, onComenzar }) => {
  const [conociendo, setConociendo] = useState(false);
  const linkPersonal = `${window.location.origin}/conocenos/${token}`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPersonal);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.');
    }
  };

  // La misma presentación que ve quien llega por el kiosco o por el enlace de un grupo
  if (conociendo) return (
    <MarcoPublico
      ancho="max-w-5xl"
      derecha={(
        <button onClick={() => setConociendo(false)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <ArrowLeft size={16} /> Volver
        </button>
      )}
    >
      <PresentacionCooperativa autoAvance={false} />
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-[#F6F8FA]/95 px-4 py-3 backdrop-blur sm:static sm:mx-auto sm:w-full sm:max-w-2xl sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
        <BotonPrimario onClick={onComenzar} className="w-full py-4 text-lg">
          Comenzar mi asociación <ArrowRight size={20} />
        </BotonPrimario>
      </div>
    </MarcoPublico>
  );

  return (
    <MarcoPublico>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {prospecto?.nombres ? `Hola, ${prospecto.nombres}` : 'Te damos la bienvenida'}
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Asociarte a la cooperativa toma <strong className="text-slate-800">unos 10 minutos</strong>. Vamos paso a paso y cada paso se guarda al continuar.
        </p>
        {prospecto?.asesor?.nombre && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#065B8E] text-xs font-bold text-white">{prospecto.asesor.nombre[0]}</span>
            Te acompaña <strong className="text-slate-800">{prospecto.asesor.nombre}</strong>
          </p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4">
        <Grupo titulo="Ten a la mano" descripcion="Con esto terminas sin interrupciones:">
          <ul className="grid gap-2.5">
            {A_LA_MANO.map(t => (
              <li key={t} className="flex items-start gap-2.5 text-base text-slate-700">
                <Check size={20} className="mt-0.5 shrink-0 text-[#5B9C3C]" strokeWidth={3} /> {t}
              </li>
            ))}
          </ul>
        </Grupo>

        <div className="grid gap-3 sm:grid-cols-2">
          {BENEFICIOS.map(({ Ic, titulo, texto, accent }) => {
            const ac = ACCENTS[accent];
            return (
              <div key={titulo} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: ac.soft, color: ac.ink }}><Ic size={20} /></span>
                <div>
                  <p className="font-extrabold text-slate-900">{titulo}</p>
                  <p className="text-sm leading-snug text-slate-600">{texto}</p>
                </div>
              </div>
            );
          })}
        </div>

        <BotonSecundario onClick={() => setConociendo(true)} className="w-full py-4">
          <Landmark size={18} /> Conoce la cooperativa
        </BotonSecundario>

        {isStand && (
          <Grupo titulo="¿Prefieres terminar en tu celular?" descripcion="Escanea el código con la cámara de tu teléfono y continúa desde ahí.">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              {/* El QR se genera aquí mismo: el enlace lleva el token personal y no debe salir a servicios externos. */}
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <QRCodeSVG value={linkPersonal} size={168} level="M" marginSize={1} title="Código QR para continuar en tu celular" />
              </div>
              <div className="grid min-w-0 flex-1 gap-3 self-stretch">
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <Smartphone size={18} className="mt-0.5 shrink-0 text-[#065B8E]" />
                  Abre la cámara, apunta al código y toca el aviso que aparece. Tu avance se guarda paso a paso.
                </p>
                <div className="grid gap-2">
                  <code className="min-w-0 truncate rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500">{linkPersonal}</code>
                  <BotonSecundario onClick={copiarLink} className="!py-2.5 text-sm"><Copy size={15} /> Copiar enlace</BotonSecundario>
                </div>
                <p className="text-xs text-slate-500">El código es personal: no lo compartas con nadie más.</p>
              </div>
            </div>
          </Grupo>
        )}
      </motion.div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-slate-200 bg-[#F6F8FA]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <BotonPrimario onClick={onComenzar} className="w-full py-4 text-lg">
          Comenzar mi asociación <ArrowRight size={20} />
        </BotonPrimario>
      </div>
    </MarcoPublico>
  );
};

export default BienvenidaScreen;
