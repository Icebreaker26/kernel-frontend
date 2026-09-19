import { Check } from 'lucide-react';
import { ACCENTS, BRAND } from '../data/marca.js';
import { usePresencia } from '../utils/usePresencia.js';

// Columna de texto de la diapositiva "Estamos en todo el país": las cifras reales en grande y tres puntos que ya
// usa el resto de la presentación. Las cifras salen de los mismos datos que el mapa.
const Cifra = ({ valor, etiqueta, color }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" style={{ borderTop: `4px solid ${color}` }}>
    <p className="text-4xl font-extrabold leading-none tracking-tight lg:text-5xl" style={{ color }}>{valor}</p>
    <p className="mt-1.5 text-sm font-semibold text-slate-600">{etiqueta}</p>
  </div>
);

const PUNTOS = [
  'Descuento por nómina en tu empresa',
  'Te asocias desde tu celular en unos 10 minutos',
  'Al retirarte, recuperas el 100% de tus aportes',
];

const PresenciaExtras = () => {
  const presencia = usePresencia();
  const municipios = presencia?.ciudades.length || 0;
  const departamentos = presencia?.departamentos.size || 0;

  return (
    <div className="mt-5 grid max-w-md gap-4">
      {municipios > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Cifra valor={municipios} etiqueta="municipios con asociados" color={BRAND.azul} />
          {departamentos > 0 && <Cifra valor={departamentos} etiqueta="departamentos" color={ACCENTS.verde.ink} />}
        </div>
      )}

      <ul className="grid gap-2">
        {PUNTOS.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-base text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: BRAND.verde }}>
              <Check size={13} strokeWidth={3} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PresenciaExtras;
