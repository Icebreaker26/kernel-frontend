import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { BRAND } from '../data/marca.js';
import MarcoPublico from './publico/MarcoPublico.jsx';
import { BotonSecundario, Grupo } from './publico/ui.jsx';

const SEGUNDOS_STAND = 20;
const PASOS = ['Tu asesor revisa la información', 'Firma del convenio y primer aporte', '¡Bienvenido(a) a Progresemos!'];

// En el stand la pantalla la usará la siguiente persona: volvemos solos al inicio del kiosco.
const ConfirmacionScreen = ({ prospecto, isStand, onVolverStand }) => {
  const [restante, setRestante] = useState(SEGUNDOS_STAND);
  const auto = isStand && !!onVolverStand;

  useEffect(() => {
    if (!auto) return;
    if (restante <= 0) { onVolverStand(); return; }
    const id = setTimeout(() => setRestante(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [auto, restante, onVolverStand]);

  const asesor = prospecto?.asesor?.nombre;

  return (
    <MarcoPublico centrado>
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="mx-auto mt-4">
        <span className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: '#EEF5E9', color: BRAND.verde }}>
          <CheckCircle2 size={44} />
        </span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-5 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">¡Solicitud enviada!</h1>
        <p className="mx-auto mt-2 max-w-md text-lg text-slate-600">
          {prospecto?.nombres ? `${prospecto.nombres}, tu` : 'Tu'} solicitud de asociación está completa.{' '}
          {asesor ? `${asesor} recibió un aviso y te contactará` : 'Tu asesor recibió un aviso y te contactará'} para los siguientes pasos.
        </p>
      </motion.div>

      <Grupo titulo="Qué sigue" className="mx-auto mt-6 w-full max-w-md">
        <ol className="grid gap-3">
          {PASOS.map((t, i) => (
            <li key={t} className="flex items-center gap-3 text-base text-slate-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: BRAND.azul }}>{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </Grupo>

      {auto && (
        <div className="mt-6 text-center">
          <p className="mb-2 text-sm text-slate-500">Volviendo al inicio en {restante} s…</p>
          <BotonSecundario onClick={onVolverStand}>Volver al inicio ahora</BotonSecundario>
        </div>
      )}
    </MarcoPublico>
  );
};

export default ConfirmacionScreen;
