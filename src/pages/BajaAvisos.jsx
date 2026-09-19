import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BellOff, BellRing, Loader2, LinkIcon } from 'lucide-react';
import pub from '../modules/captacion/services/captacionPublicApi.js';
import MarcoPublico from '../modules/captacion/components/publico/MarcoPublico.jsx';
import { Aviso, BotonPrimario, BotonSecundario } from '../modules/captacion/components/publico/ui.jsx';

// Enlace "deja de recibirlos aquí" del pie de las campañas y avisos institucionales.
// Solo afecta a esos avisos: los códigos de verificación y las credenciales del portal siguen llegando.
// Abrir el enlace no cambia nada; la baja se confirma con el botón (los antivirus de correo abren los enlaces).
const BajaAvisos = () => {
  const { token } = useParams();
  const [estado, setEstado] = useState({ fase: 'cargando' });   // cargando | invalido | listo
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    pub.get(`/email/baja/${token}`)
      .then(({ data }) => vivo && setEstado({ fase: 'listo', ...data }))
      .catch((err) => vivo && setEstado({ fase: err.response?.status === 404 ? 'invalido' : 'error' }));
    return () => { vivo = false; };
  }, [token]);

  const cambiar = async (ruta) => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await pub.post(`/email/baja/${token}${ruta}`);
      setEstado({ fase: 'listo', correo: data.correo, de_baja: data.de_baja });
    } catch {
      setError('No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoPublico ancho="max-w-lg" centrado>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {estado.fase === 'cargando' && (
          <p className="flex items-center justify-center gap-2 py-6 text-slate-500"><Loader2 className="animate-spin" size={18} /> Cargando…</p>
        )}

        {estado.fase === 'invalido' && (
          <>
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><LinkIcon size={22} /></span>
            <h1 className="text-xl font-extrabold text-slate-900">Este enlace no es válido</h1>
            <p className="mt-2 text-base text-slate-600">
              Puede que esté incompleto o que se haya modificado. Abre de nuevo el enlace desde el correo que recibiste.
            </p>
          </>
        )}

        {estado.fase === 'error' && (
          <Aviso tono="error">No pudimos cargar esta página. Inténtalo de nuevo en unos minutos.</Aviso>
        )}

        {estado.fase === 'listo' && !estado.de_baja && (
          <>
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F1F7] text-[#065B8E]"><BellOff size={22} /></span>
            <h1 className="text-xl font-extrabold text-slate-900">¿Dejar de recibir avisos?</h1>
            <p className="mt-2 text-base text-slate-600">
              Dejaremos de enviar comunicados y avisos institucionales a <strong className="break-all">{estado.correo}</strong>.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Seguirás recibiendo los mensajes necesarios de tu cuenta, como códigos de verificación y datos de acceso al portal.
            </p>
            {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}
            <BotonPrimario type="button" cargando={enviando} onClick={() => cambiar('')} className="mt-5 w-full">
              Sí, dejar de recibir avisos
            </BotonPrimario>
          </>
        )}

        {estado.fase === 'listo' && estado.de_baja && (
          <>
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5E9] text-[#3F7A25]"><BellOff size={22} /></span>
            <h1 className="text-xl font-extrabold text-slate-900">Listo, no recibirás más avisos</h1>
            <p className="mt-2 text-base text-slate-600">
              <strong className="break-all">{estado.correo}</strong> ya no recibirá comunicados ni avisos institucionales de la Cooperativa Progresemos.
            </p>
            {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}
            <BotonSecundario type="button" disabled={enviando} onClick={() => cambiar('/reactivar')} className="mt-5 w-full">
              <BellRing size={16} className="mr-2 inline" /> Fue un error, quiero seguir recibiéndolos
            </BotonSecundario>
          </>
        )}
      </div>
    </MarcoPublico>
  );
};

export default BajaAvisos;
