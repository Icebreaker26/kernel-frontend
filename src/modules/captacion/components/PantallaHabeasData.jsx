import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { BRAND, CONTACTO } from '../data/marca.js';
import MarcoPublico from './publico/MarcoPublico.jsx';
import { Aviso, BotonPrimario, Casilla } from './publico/ui.jsx';

// Autorización de tratamiento de datos personales (Ley 1581 de 2012). La tiene que aceptar la propia
// persona antes de darnos sus datos; queda registrada con versión del texto, fecha e IP.
const PantallaHabeasData = ({ token, version, onAceptada }) => {
  const [acepta, setAcepta] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const continuar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    if (!acepta) return;
    setEnviando(true);
    setError('');
    try {
      await pub.post(`/captacion/pub/${token}/habeas-data`, { acepta: true, version });
      onAceptada();
    } catch (err) {
      setError(err.response?.data?.code === 'HABEAS_VERSION'
        ? 'El texto de la autorización cambió. Recarga la página para verlo de nuevo.'
        : 'No pudimos registrar tu autorización. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoPublico ancho="max-w-xl" centrado>
      <form onSubmit={continuar} noValidate className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#E8F1F7', color: BRAND.azul }}>
          <ShieldCheck size={24} />
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">Tus datos personales</h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          Para tramitar tu asociación necesitamos algunos datos tuyos. Antes de pedírtelos, queremos que sepas cómo los usaremos.
        </p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700">
          <p>
            Autorizo a <strong>Cooperativa Progresemos</strong> para recolectar, almacenar, usar y consultar mis datos personales, conforme a la
            Ley 1581 de 2012, con estas finalidades:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Tramitar y gestionar mi vinculación como asociado.</li>
            <li>Verificar la información que suministro y cumplir las normas de prevención de lavado de activos.</li>
            <li>Administrar mis aportes, beneficios y servicios como asociado.</li>
            <li>Comunicarme información de la cooperativa relacionada con mi asociación.</li>
          </ul>
          <p className="mt-2">
            Puedo conocer, actualizar, rectificar y solicitar la supresión de mis datos, o revocar esta autorización, escribiendo a la
            cooperativa o llamando al <a href={`tel:${CONTACTO.telefonoLink}`} className="font-semibold underline">{CONTACTO.telefono}</a>.
          </p>
        </div>

        <div className="mt-4">
          <Casilla checked={acepta} onChange={setAcepta} name="acepta_habeas_data">
            Leí y autorizo el tratamiento de mis datos personales
          </Casilla>
          {intentado && !acepta && (
            <p role="alert" className="mt-1 text-sm font-medium text-red-600">Debes aceptar para poder continuar.</p>
          )}
        </div>

        {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}

        <BotonPrimario type="submit" cargando={enviando} className="mt-5 w-full">Aceptar y continuar</BotonPrimario>
      </form>
    </MarcoPublico>
  );
};

export default PantallaHabeasData;
