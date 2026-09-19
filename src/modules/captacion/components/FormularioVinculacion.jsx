import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { BRAND } from '../data/marca.js';
import MarcoPublico from './publico/MarcoPublico.jsx';
import { Aviso } from './publico/ui.jsx';
import StepUpModal          from './StepUpModal.jsx';
import SeccionPersonal      from './SeccionPersonal.jsx';
import SeccionLaboral       from './SeccionLaboral.jsx';
import SeccionFinanciera    from './SeccionFinanciera.jsx';
import SeccionPep           from './SeccionPep.jsx';
import SeccionAportes       from './SeccionAportes.jsx';
import SeccionBeneficiarios from './SeccionBeneficiarios.jsx';
import SeccionReferencias   from './SeccionReferencias.jsx';
import SeccionDocumentos    from './SeccionDocumentos.jsx';
import SeccionFirma         from './SeccionFirma.jsx';

const PASOS = [
  { key: 'personal',      titulo: 'Tus datos',      intro: 'Cuéntanos quién eres y dónde vives.' },
  { key: 'laboral',       titulo: 'Tu trabajo',     intro: 'Necesitamos estos datos para el descuento por nómina.' },
  { key: 'financiera',    titulo: 'Tus finanzas',   intro: 'Un resumen de tus ingresos y tu patrimonio.' },
  { key: 'pep',           titulo: 'Cumplimiento',   intro: 'Preguntas obligatorias de prevención de lavado de activos.', sinNota: true },
  { key: 'aportes',       titulo: 'Tus aportes',    intro: 'Elige cuánto ahorras cada mes y qué beneficios quieres tener.' },
  { key: 'beneficiarios', titulo: 'Beneficiarios',  intro: 'Quiénes recibirán tus aportes y beneficios.' },
  { key: 'referencias',   titulo: 'Referencias',    intro: 'Personas que puedan confirmar que te conocen.' },
  { key: 'documentos',    titulo: 'Tu cédula',      intro: 'Sube una foto de tu documento por ambas caras.', sinNota: true },
  { key: 'firma',         titulo: 'Firma',          intro: 'Último paso: revisa y firma tu solicitud.', sinNota: true },
];
const FIRMA = PASOS.length - 1;

// ── Borrador ─────────────────────────────────────────────────────────────────
// sessionStorage (no localStorage): los datos son sensibles y en un dispositivo compartido
// no deben sobrevivir al cierre de la pestaña. En el stand no se guarda nada.

const CLAVE = (token) => `captacion_borrador_${token}`;
const leerBorrador = (token) => { try { return JSON.parse(sessionStorage.getItem(CLAVE(token)) || '{}'); } catch { return {}; } };
const guardarBorrador = (token, k, v) => {
  try { sessionStorage.setItem(CLAVE(token), JSON.stringify({ ...leerBorrador(token), [k]: v })); } catch { /* sin storage */ }
};
export const borrarBorrador = (token) => { try { sessionStorage.removeItem(CLAVE(token)); } catch { /* sin storage */ } };

// ── Errores del backend → mensaje para la persona ────────────────────────────

const mensajeError = (err) => {
  if (!err.response) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  const { status, data } = err.response;
  if (status === 429) return 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.';
  if (status === 400 && data?.detalles) {
    const campos = Object.keys(data.detalles.fieldErrors || {});
    return `Hay datos con un formato que no pudimos aceptar${campos.length ? ` (${campos.join(', ')})` : ''}. Revísalos e inténtalo de nuevo.`;
  }
  if (data?.error && status < 500) return data.error;
  return 'No pudimos guardar tus datos. Inténtalo de nuevo en un momento.';
};

// ── Indicador de progreso ────────────────────────────────────────────────────

const Progreso = ({ actual, hecho, puedeIr, onIr }) => (
  <nav aria-label="Progreso de la solicitud" className="mb-5">
    <ol className="flex items-start">
      {PASOS.map((p, i) => {
        const completo = hecho[p.key];
        const activo = i === actual;
        return (
          <li key={p.key} className="flex flex-1 items-start last:flex-none">
            <button
              type="button" onClick={() => onIr(i)} disabled={!puedeIr(i)}
              aria-current={activo ? 'step' : undefined}
              className="flex flex-col items-center gap-1 disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  activo ? 'text-white ring-4 ring-[#065B8E]/20'
                  : completo ? 'text-white'
                  : 'bg-slate-200 text-slate-500'}`}
                style={{ background: activo ? BRAND.azul : completo ? BRAND.verde : undefined }}
              >
                {completo && !activo ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`hidden text-xs font-semibold md:block ${activo ? 'text-[#065B8E]' : 'text-slate-500'}`}>{p.titulo}</span>
            </button>
            {i < FIRMA && <span className="mx-1.5 mt-4 h-0.5 flex-1 rounded" style={{ background: completo ? BRAND.verde : '#e2e8f0' }} />}
          </li>
        );
      })}
    </ol>
  </nav>
);

// ── Formulario ───────────────────────────────────────────────────────────────

const FormularioVinculacion = ({ prospecto, token, isStand, stepupToken, setStepupToken, onFirmado, onExpirado }) => {
  const vin = prospecto?.vinculacion;

  const [hecho, setHecho] = useState(
    Object.fromEntries(PASOS.map(p => [p.key, !!vin?.[`seccion_${p.key}_at`]]))
  );
  const yaFirmada = !!vin?.seccion_firma_at;
  const primerPendiente = PASOS.findIndex(p => p.key !== 'firma' && !vin?.[`seccion_${p.key}_at`]);
  const [actual, setActual]       = useState(primerPendiente === -1 ? FIRMA : primerPendiente);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [pedirStepUp, setPedirStepUp] = useState(false);
  const [perfil, setPerfil]       = useState({ nombres: prospecto?.nombres, apellidos: prospecto?.apellidos });

  const borrador = useRef(isStand ? {} : leerBorrador(token)).current;
  // Lo guardado en esta visita, en memoria (también en el stand, donde no hay borrador en disco):
  // al volver con "Atrás" el paso conserva lo que la persona ya escribió.
  const memoria = useRef({});
  const valores = (clave) => memoria.current[clave] || borrador[clave];
  const encabezado = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    encabezado.current?.focus({ preventScroll: true });
  }, [actual]);

  const paso = PASOS[actual];
  const faltanes = PASOS.filter(p => p.key !== 'firma' && !hecho[p.key]).map(p => p.titulo.toLowerCase());

  const previosCompletos = (i) => PASOS.slice(0, i).every(p => hecho[p.key]);
  const puedeIr = (i) => i <= actual || previosCompletos(i);

  const irA = (i) => {
    if (!puedeIr(i)) return;
    setError('');
    if (i === FIRMA && !stepupToken) return setPedirStepUp(true);
    setActual(i);
  };

  // Tras guardar un paso: ir al siguiente que falte (saltando los ya completos). Si no queda ninguno,
  // firmar; o, si ya estaba firmada (solo completaba lo que faltaba), terminar sin volver a firmar.
  const avanzar = (clave) => {
    const nuevo = { ...hecho, [clave]: true };
    setHecho(nuevo);
    const pendiente = (i) => PASOS[i].key !== 'firma' && !nuevo[PASOS[i].key];
    let siguiente = PASOS.findIndex((_, i) => i > actual && pendiente(i));
    if (siguiente === -1) siguiente = PASOS.findIndex((_, i) => pendiente(i));
    if (siguiente !== -1) return setActual(siguiente);
    if (yaFirmada) return onFirmado(perfil);
    if (!stepupToken) return setPedirStepUp(true);
    return setActual(FIRMA);
  };

  const guardar = async (clave, datos) => {
    setGuardando(true);
    setError('');
    try {
      // Los documentos ya se subieron y confirmaron uno a uno; aquí solo se avanza.
      if (clave === 'documentos') {
        avanzar('documentos');
        return;
      }
      if (clave === 'firma') {
        await pub.post(`/captacion/pub/${token}/firmar`, datos, { headers: { 'X-Stepup-Token': stepupToken || '' } });
        borrarBorrador(token);
        onFirmado(perfil);
        return;
      }
      await pub.put(`/captacion/pub/${token}/${clave}`, datos);

      memoria.current[clave] = datos;
      if (!isStand) guardarBorrador(token, clave, datos);
      if (clave === 'personal' && (datos.nombres || datos.apellidos)) {
        setPerfil({ nombres: datos.nombres || perfil.nombres, apellidos: datos.apellidos || perfil.apellidos });
      }
      avanzar(clave);
    } catch (err) {
      const status = err.response?.status;
      if (status === 410) return onExpirado?.();
      if (status === 403 && err.response?.data?.code?.startsWith('STEPUP')) {
        setStepupToken(null);
        return setPedirStepUp(true);
      }
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const atras = actual > 0 ? () => { setError(''); setActual(actual - 1); } : undefined;
  const comunes = { saving: guardando, onBack: atras };

  return (
    <MarcoPublico derecha={<span className="text-sm font-semibold text-slate-500">Paso {actual + 1} de {PASOS.length}</span>}>
      <Progreso actual={actual} hecho={hecho} puedeIr={puedeIr} onIr={irA} />

      <div className="mb-4">
        <h1 ref={encabezado} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-slate-900 focus:outline-none">{paso.titulo}</h1>
        <p className="mt-0.5 text-base text-slate-600">{paso.intro}</p>
        {!paso.sinNota && <p className="mt-1 text-sm text-slate-500">Los campos con <span className="text-red-500">*</span> son obligatorios.</p>}
      </div>

      {yaFirmada && faltanes.length > 0 && (
        <Aviso tono="info" titulo="Tu solicitud ya está firmada" className="mb-4">
          Solo falta completar: <strong>{faltanes.join(', ')}</strong>. No tienes que volver a firmar.
        </Aviso>
      )}

      {error && <Aviso tono="error" className="mb-4">{error}</Aviso>}

      <motion.div key={paso.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {paso.key === 'personal' && (
          <SeccionPersonal defaultValues={valores('personal')} onSave={(d) => guardar('personal', d)} pideIdentidad={!!prospecto?.requiere_identificacion}
            pideCelular={!!prospecto?.requiere_celular} pideCorreo={!!prospecto?.requiere_correo} {...comunes} />
        )}
        {paso.key === 'laboral' && (
          <SeccionLaboral defaultValues={valores('laboral')} onSave={(d) => guardar('laboral', d)} {...comunes} />
        )}
        {paso.key === 'financiera' && (
          <SeccionFinanciera defaultValues={valores('financiera')} onSave={(d) => guardar('financiera', d)} isStand={isStand} {...comunes} />
        )}
        {paso.key === 'pep' && (
          <SeccionPep defaultValues={valores('pep')} onSave={(d) => guardar('pep', d)} {...comunes} />
        )}
        {paso.key === 'aportes' && (prospecto?.tarifas
          ? <SeccionAportes defaultValues={valores('aportes')} onSave={(d) => guardar('aportes', d)} tarifas={prospecto.tarifas} {...comunes} />
          : <Aviso tono="error">No pudimos cargar los valores de los aportes. Recarga la página e inténtalo de nuevo.</Aviso>)}
        {paso.key === 'beneficiarios' && (
          <SeccionBeneficiarios defaultValues={valores('beneficiarios')} onSave={(d) => guardar('beneficiarios', d)} {...comunes} />
        )}
        {paso.key === 'referencias' && (
          <SeccionReferencias defaultValues={valores('referencias')} onSave={(d) => guardar('referencias', d)} {...comunes} />
        )}
        {paso.key === 'documentos' && (
          <SeccionDocumentos token={token} yaCargado={hecho.documentos} onSave={(d) => guardar('documentos', d)} {...comunes} />
        )}
        {paso.key === 'firma' && (
          <SeccionFirma perfil={perfil} versionConsentimiento={prospecto?.version_consentimiento} onSave={(d) => guardar('firma', d)} {...comunes} />
        )}
      </motion.div>

      {pedirStepUp && (
        <StepUpModal
          token={token}
          onVerificado={(t) => { setStepupToken(t); setPedirStepUp(false); setActual(FIRMA); }}
          onCancelar={() => setPedirStepUp(false)}
        />
      )}
    </MarcoPublico>
  );
};

export default FormularioVinculacion;
