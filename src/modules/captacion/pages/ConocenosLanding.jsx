import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, LinkIcon } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { BRAND, CONTACTO } from '../data/marca.js';
import MarcoPublico from '../components/publico/MarcoPublico.jsx';
import { PASOS_FORMULARIO } from '../utils/formato.js';
import BienvenidaScreen      from '../components/BienvenidaScreen.jsx';
import LinkExpiradoScreen    from '../components/LinkExpiradoScreen.jsx';
import ConfirmacionScreen    from '../components/ConfirmacionScreen.jsx';
import FormularioVinculacion, { borrarBorrador } from '../components/FormularioVinculacion.jsx';

// Pasos que el asociado debe tener completos (todos menos la firma, que se evalúa aparte)
const REQUERIDOS = PASOS_FORMULARIO.map(([k]) => k).filter(k => k !== 'firma');
const faltanPasos = (v) => REQUERIDOS.some(k => !v?.[`seccion_${k}_at`]);

// Firmada no es lo mismo que completa: una solicitud firmada antes de que existieran ciertos pasos
// (o a la que le falta la cédula) debe poder completarse mientras no esté entregada.
const estadoInicial = (vinculacion) => {
  if (!vinculacion) return 'welcome';
  if (vinculacion.estado === 'entregada') return 'done';
  if (vinculacion.seccion_firma_at && !faltanPasos(vinculacion)) return 'done';
  return 'form';
};

const ConocenosLanding = () => {
  const { token }      = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const isStand        = searchParams.get('m') === 'stand';
  const standToken     = searchParams.get('s'); // sesión de kiosco a la que se vuelve al terminar

  const [status, setStatus]           = useState('loading');
  const [prospecto, setProspecto]     = useState(null);
  const [stepupToken, setStepupToken] = useState(null);

  useEffect(() => {
    // Ping desde JS (no desde el servidor) para que el prefetch de WhatsApp no cuente como visita
    pub.post(`/captacion/pub/${token}/ping`).catch(() => {});

    pub.get(`/captacion/pub/${token}`)
      .then(({ data }) => {
        setProspecto(data);
        setStatus(estadoInicial(data.vinculacion));
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

  const volverAlStand = useCallback(() => {
    borrarBorrador(token);
    navigate(`/stand/${standToken}`, { replace: true });
  }, [navigate, standToken, token]);

  if (status === 'loading') return (
    <MarcoPublico centrado>
      <Loader2 className="mx-auto animate-spin" size={36} style={{ color: BRAND.azul }} />
    </MarcoPublico>
  );

  if (status === 'not_found') return (
    <MarcoPublico centrado>
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500"><LinkIcon size={30} /></span>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Este enlace no es válido</h1>
        <p className="mt-2 text-lg text-slate-600">Puede que esté incompleto o que ya no esté disponible. Pide a tu asesor que te lo envíe de nuevo o llama al {CONTACTO.telefono}.</p>
      </div>
    </MarcoPublico>
  );

  if (status === 'expired') return (
    <LinkExpiradoScreen datos={{ nombres: prospecto?.nombres, asesor_nombre: prospecto?.asesor_nombre || prospecto?.asesor?.nombre }} />
  );

  if (status === 'done') return (
    <ConfirmacionScreen
      prospecto={prospecto}
      isStand={isStand}
      onVolverStand={isStand && standToken ? volverAlStand : undefined}
    />
  );

  if (status === 'welcome') return (
    <BienvenidaScreen prospecto={prospecto} token={token} isStand={isStand} onComenzar={() => setStatus('form')} />
  );

  return (
    <FormularioVinculacion
      prospecto={prospecto}
      token={token}
      isStand={isStand}
      stepupToken={stepupToken}
      setStepupToken={setStepupToken}
      onFirmado={(p) => { setProspecto(prev => ({ ...prev, nombres: p?.nombres || prev.nombres })); setStatus('done'); }}
      onExpirado={() => setStatus('expired')}
    />
  );
};

export default ConocenosLanding;
