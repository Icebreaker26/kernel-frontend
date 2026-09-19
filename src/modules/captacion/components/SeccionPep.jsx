import { useState } from 'react';
import { Aviso, BarraAcciones, Grupo, SiNo } from './publico/ui.jsx';

const PREGUNTAS = [
  { key: 'pep_maneja_recursos_publicos', texto: '¿Manejas, administras, controlas o custodias recursos o bienes del Estado?' },
  { key: 'pep_reconocimiento_publico',   texto: '¿Tienes reconocimiento público o ejerces algún grado de poder o influencia sobre comunidades o sectores?' },
  { key: 'pep_poder_publico',            texto: '¿Desempeñas o desempeñaste en los últimos 3 años funciones públicas destacadas (presidente, magistrado, gobernador, alcalde, congresista, embajador, alto oficial, directivo de empresa estatal)?' },
  { key: 'pep_vinculo_expuesto',         texto: '¿Tienes vínculos familiares o asociativos con personas que cumplan alguna de las condiciones anteriores?' },
];

const SeccionPep = ({ defaultValues = {}, onSave, saving, onBack }) => {
  // null = sin responder: una declaración de cumplimiento debe ser explícita, no un "No" por defecto.
  const [resp, setResp] = useState(
    Object.fromEntries(PREGUNTAS.map(({ key }) => [key, defaultValues[key] ?? null]))
  );
  const [intentado, setIntentado] = useState(false);

  const faltan   = PREGUNTAS.filter(({ key }) => resp[key] === null);
  const hayUnSi  = Object.values(resp).some(v => v === true);

  const enviar = (e) => {
    e.preventDefault();
    setIntentado(true);
    if (faltan.length) return;
    onSave(resp);
  };

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="Cuatro preguntas rápidas">
        La mayoría de las personas responde “No” a todas. La Superintendencia de Economía Solidaria exige que las hagamos a cada asociado.
      </Aviso>

      <Grupo>
        {PREGUNTAS.map(({ key, texto }, i) => {
          const sinResponder = intentado && resp[key] === null;
          return (
            <div key={key} className={`flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between ${sinResponder ? 'bg-red-50 ring-1 ring-red-300' : ''}`}>
              <p className="text-base leading-snug text-slate-700"><span className="font-bold text-slate-400">{i + 1}. </span>{texto}</p>
              <SiNo etiqueta={texto} value={resp[key]} onChange={(v) => setResp(p => ({ ...p, [key]: v }))} />
            </div>
          );
        })}
      </Grupo>

      {hayUnSi && (
        <Aviso tono="aviso">
          Con una respuesta afirmativa, tu solicitud requiere una revisión adicional de cumplimiento. Esto <strong>no impide</strong> tu asociación.
        </Aviso>
      )}
      {intentado && faltan.length > 0 && <Aviso tono="error">Responde las {faltan.length === 1 ? 'pregunta pendiente' : `${faltan.length} preguntas pendientes`} para continuar.</Aviso>}

      <BarraAcciones onBack={onBack} cargando={saving} />
    </form>
  );
};

export default SeccionPep;
