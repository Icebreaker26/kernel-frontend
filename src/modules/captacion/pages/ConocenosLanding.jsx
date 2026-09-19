import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import pub from '../services/captacionPublicApi.js';
import BienvenidaScreen     from '../components/BienvenidaScreen.jsx';
import LinkExpiradoScreen   from '../components/LinkExpiradoScreen.jsx';
import ConfirmacionScreen   from '../components/ConfirmacionScreen.jsx';
import FormularioVinculacion from '../components/FormularioVinculacion.jsx';
import { Loader2 } from 'lucide-react';

const ConocenosLanding = () => {
  const { token }               = useParams();
  const [searchParams]          = useSearchParams();
  const isStand                 = searchParams.get('m') === 'stand';

  const [status, setStatus]     = useState('loading');
  const [prospecto, setProspecto] = useState(null);
  const [stepupToken, setStepupToken] = useState(null);

  useEffect(() => {
    // Privacy headers ya los manda el backend; reforzar no-referrer en cliente
    if (document.referrer) {
      const meta = document.createElement('meta');
      meta.name = 'referrer'; meta.content = 'no-referrer';
      document.head.appendChild(meta);
    }

    // Ping — dispara desde JS para evitar que prefetch de WhatsApp lo registre
    pub.post(`/captacion/pub/${token}/ping`).catch(() => {});

    pub.get(`/captacion/pub/${token}`)
      .then(({ data }) => {
        setProspecto(data);
        if (data.vinculacion?.seccion_firma_at) {
          setStatus('done');
        } else if (data.vinculacion || isStand) {
          setStatus('form');
        } else {
          setStatus('welcome');
        }
      })
      .catch((err) => {
        if (err.response?.status === 410) {
          setProspecto(err.response.data);
          setStatus('expired');
        } else {
          setStatus('not_found');
        }
      });
  }, [token]);

  const iniciarFormulario = () => setStatus('form');
  const onFirmado = () => setStatus('done');

  if (status === 'loading') return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-400" size={28} />
    </div>
  );

  if (status === 'not_found') return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-mono text-center px-4">
      <p className="text-emerald-400/60 text-xs tracking-[4px] mb-3">// COOPERATIVA PROGRESEMOS</p>
      <p className="text-slate-400 text-sm">Este link no es válido o ya no está disponible.</p>
    </div>
  );

  if (status === 'expired') return (
    <LinkExpiradoScreen datos={prospecto} />
  );

  if (status === 'done') return (
    <ConfirmacionScreen prospecto={prospecto} />
  );

  if (status === 'welcome') return (
    <BienvenidaScreen
      prospecto={prospecto}
      token={token}
      isStand={isStand}
      onComenzar={iniciarFormulario}
    />
  );

  return (
    <FormularioVinculacion
      prospecto={prospecto}
      token={token}
      isStand={isStand}
      stepupToken={stepupToken}
      setStepupToken={setStepupToken}
      onFirmado={onFirmado}
    />
  );
};

export default ConocenosLanding;
