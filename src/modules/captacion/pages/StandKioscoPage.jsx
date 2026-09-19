import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Phone, Globe, HandHeart, MessageCircle, ShieldCheck } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { BRAND, CONTACTO } from '../data/marca.js';
import PresentacionCooperativa from '../components/PresentacionCooperativa.jsx';
import { Lista } from '../components/publico/ui.jsx';

/**
 * Pantalla de presentación de la cooperativa con el botón "Quiero asociarme". Tiene tres usos:
 *  - "kiosco":  /stand/:token   → pantalla compartida en un stand. Caduca a las 24 h; al terminar el formulario
 *               vuelve sola a esta pantalla para la siguiente persona.
 *  - "enlace":  /conoce/:token  → enlace permanente para compartir en grupos (WhatsApp, etc.). Cada persona
 *               la ve en su celular y, si se asocia, sigue en su propio formulario.
 *  - "web":     /asociate      → enlace único y estático para el botón "Asóciate aquí" del sitio de la cooperativa.
 *               No trae empresa ni asesor: la persona elige su empresa y la solicitud va al asesor por defecto
 *               que se elige en el panel "Página web" de la lista de prospectos.
 */
const MODOS = {
  kiosco: {
    info:    (t) => `/captacion/pub/stand/${t}`,
    iniciar: (t) => `/captacion/pub/stand/${t}/iniciar`,
    destino: (tokenPersonal, t) => `/conocenos/${tokenPersonal}?m=stand&s=${t}`,
    autoAvance: true,
    vencido:  { titulo: 'Esta sesión de stand terminó', texto: 'El asesor puede generar un nuevo enlace desde su panel.' },
    invalido: { titulo: 'Este enlace no es válido', texto: 'Pide al asesor que abra el stand nuevamente.' },
    errorInicio: 'No pudimos preparar el formulario. Intenta de nuevo o avisa al asesor.',
  },
  enlace: {
    info:    (t) => `/captacion/pub/enlace/${t}`,
    iniciar: (t) => `/captacion/pub/enlace/${t}/iniciar`,
    destino: (tokenPersonal) => `/conocenos/${tokenPersonal}`,
    autoAvance: false,
    vencido:  { titulo: 'Este enlace ya no está activo', texto: 'Pide a quien te lo compartió que te envíe uno nuevo.' },
    invalido: { titulo: 'Este enlace no es válido', texto: 'Puede que esté incompleto o que ya no esté activo. Pide a quien te lo compartió que te lo envíe de nuevo.' },
    errorInicio: 'No pudimos preparar tu formulario. Inténtalo de nuevo en un momento.',
  },
};

MODOS.web = {
  info:    () => '/captacion/pub/web',
  iniciar: () => '/captacion/pub/web/iniciar',
  destino: (tokenPersonal) => `/conocenos/${tokenPersonal}`,
  autoAvance: false,
  pideEmpresa: true,
  vencido:  { titulo: 'Este servicio no está disponible', texto: 'Llámanos y con gusto te ayudamos a asociarte.' },
  invalido: { titulo: 'No pudimos cargar esta página', texto: 'Inténtalo de nuevo en unos minutos o llámanos y con gusto te ayudamos.' },
  errorInicio: 'No pudimos preparar tu formulario. Inténtalo de nuevo en un momento.',
};

const Pantalla = ({ children }) => (
  <div className="min-h-screen bg-[#F6F8FA] font-sans flex flex-col items-center justify-center text-center px-8 gap-3 text-slate-800">
    {children}
  </div>
);

const Marca = ({ grande }) => (
  <img
    src="/logo-progresemos.png"
    alt="Cooperativa Progresemos"
    draggable={false}
    className={grande ? 'h-24 md:h-32 w-auto' : 'h-14 md:h-24 w-auto'}
  />
);

const StandKioscoPage = ({ modo = 'kiosco' }) => {
  const cfg            = MODOS[modo];
  const web            = !!cfg.pideEmpresa;
  const { standToken, enlaceToken } = useParams();
  const token          = standToken || enlaceToken;
  const navigate       = useNavigate();

  const [session, setSession]     = useState(null);
  const [status, setStatus]       = useState('loading');
  const [iniciando, setIniciando] = useState(false);
  const [error, setError]         = useState('');
  const [empresa, setEmpresa]     = useState('');   // solo en la página pública /asociate
  // En móvil no hay avance automático: la gente hace scroll y la diapositiva no debe cambiar sola
  const [movil]                   = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    pub.get(cfg.info(token))
      .then(({ data }) => {
        if (cfg.pideEmpresa && !data.disponible) return setStatus('expired');
        setSession(data); setStatus('ready');
      })
      .catch((err) => setStatus(err.response?.status === 410 ? 'expired' : 'error'));
  }, [cfg, token]);

  const iniciar = async () => {
    if (cfg.pideEmpresa && !empresa) return setError('Elige la empresa donde trabajas para continuar.');
    setIniciando(true);
    setError('');
    try {
      const { data } = await pub.post(cfg.iniciar(token), cfg.pideEmpresa ? { empresa_codigo: empresa } : undefined);
      navigate(cfg.destino(data.token, token));
    } catch (err) {
      setError(err.response?.status === 429
        ? 'Hay muchas personas entrando a la vez. Espera un momento e inténtalo de nuevo.'
        : cfg.errorInicio);
      setIniciando(false);
    }
  };

  if (status === 'loading') return (
    <Pantalla><Loader2 className="animate-spin" size={36} style={{ color: BRAND.azul }} /></Pantalla>
  );
  if (status === 'expired' || status === 'error') {
    const t = status === 'expired' ? cfg.vencido : cfg.invalido;
    return (
      <Pantalla>
        <Marca grande />
        <p className="text-2xl font-bold mt-6">{t.titulo}</p>
        <p className="text-slate-500 max-w-md">{t.texto}</p>
      </Pantalla>
    );
  }

  return (
    // Kiosco/enlace: pantalla completa que no se desplaza. Web: página normal que se desplaza (lleva el selector de empresa
    // y, si se bloqueara a la altura de la pantalla, recortaría las diapositivas altas).
    <div className={`bg-[#F6F8FA] text-slate-800 font-sans flex flex-col relative min-h-[100dvh] ${web ? '' : 'select-none md:h-screen md:overflow-hidden'}`}>
      {/* Franja de marca */}
      <div className="h-1.5 w-full shrink-0 flex">
        <span className="flex-1" style={{ background: BRAND.azul }} />
        <span className="flex-1" style={{ background: BRAND.verde }} />
        <span className="flex-1" style={{ background: BRAND.dorado }} />
      </div>

      <header className="flex items-center justify-between px-4 md:px-8 py-2 md:py-1.5 shrink-0 gap-3">
        <Marca />
        {session?.empresa_nombre && (
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500">Empresa con convenio</p>
            <p className="text-base md:text-lg font-bold text-slate-800">{session.empresa_nombre}</p>
            {session.asociados_empresa && (
              <p className="text-xs md:text-sm text-slate-500">Ya somos {session.asociados_empresa.toLocaleString('es-CO')} asociados en tu empresa</p>
            )}
          </div>
        )}
      </header>

      <main className={`flex-1 flex flex-col px-4 md:px-8 pb-3 max-w-7xl mx-auto w-full ${web ? '' : 'md:min-h-0'}`}>
        <PresentacionCooperativa autoAvance={cfg.autoAvance && !movil} tarifas={session?.tarifas} libre={web} />

        {/* CTA */}
        <div className={`max-w-2xl mx-auto w-full ${web ? 'mt-4 pb-2' : 'sticky bottom-0 md:static bg-[#F6F8FA]/95 backdrop-blur md:bg-transparent md:backdrop-blur-none py-2 md:py-0 z-10'}`}>
          {cfg.pideEmpresa && (
            <div className="mb-3 select-text">
              <Lista
                etiqueta="¿En qué empresa trabajas?"
                requerido
                value={empresa}
                onChange={(e) => { setEmpresa(e.target.value); setError(''); }}
                opciones={(session?.empresas || []).map((e) => [e.codigo, e.nombre])}
                placeholder="Elige tu empresa…"
              />
            </div>
          )}
          <motion.button
            onClick={iniciar}
            disabled={iniciando}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl text-white text-xl font-extrabold flex items-center justify-center gap-3 disabled:opacity-70 shadow-lg"
            style={{ background: BRAND.azul, boxShadow: `0 12px 28px -10px ${BRAND.azul}99` }}
          >
            {iniciando
              ? <><Loader2 size={22} className="animate-spin" /> Preparando tu formulario…</>
              : <><HandHeart size={22} /> Quiero asociarme <ArrowRight size={22} /></>}
          </motion.button>
          {error && <p role="alert" className="text-center text-sm text-red-600 mt-2">{error}</p>}
          {web && (
            <a href={`https://wa.me/${CONTACTO.telefonoLink.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información para asociarme a la Cooperativa Progresemos')}`}
               target="_blank" rel="noopener noreferrer"
               className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3 text-base font-bold text-slate-700 transition hover:border-[#5B9C3C] hover:text-[#3F7A25]">
              <MessageCircle size={20} style={{ color: BRAND.verde }} /> ¿Dudas? Habla con un asesor por WhatsApp
            </a>
          )}
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-slate-500 mt-2">
            <ShieldCheck size={14} style={{ color: BRAND.verde }} />
            Tus datos están protegidos (Ley 1581 de 2012) · Al retirarte recuperas el 100% de tus aportes
          </p>
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 md:px-8 py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-2"><Phone size={14} style={{ color: BRAND.verde }} /> {CONTACTO.telefono}</span>
          <span className="flex items-center gap-2"><Globe size={14} style={{ color: BRAND.verde }} /> {CONTACTO.web}</span>
        </div>
        {session?.asesor_nombre && (
          <p>Te atiende: <span className="font-bold text-slate-800">{session.asesor_nombre}</span></p>
        )}
      </footer>
    </div>
  );
};

export default StandKioscoPage;
