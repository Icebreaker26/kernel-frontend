import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { geoContains } from 'd3-geo';
import { MapPin } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { coordenadasDe } from '../../../data/coordenadasCiudades.js';
import { BRAND } from '../data/marca.js';

/**
 * Diapositiva "Estamos en todo el país": mapa de Colombia con un punto por cada municipio donde hay asociados.
 * Los municipios salen de la base de datos (solo nombres, sin conteos ni personas); el número de departamentos
 * se calcula ubicando cada punto en el mapa. Mismo mapa y coordenadas que la página de estadísticas de sorteos,
 * con el estilo claro de la marca.
 */

const AZUL_CLARO = '#E3EEF6';   // departamento sin asociados
const AZUL_PRESENCIA = '#B9D6EA'; // departamento con asociados

// Se pinta dentro de <Geographies> porque solo ahí se conocen los polígonos (y así se cuentan los departamentos)
const Capas = ({ geographies, pines, onDepartamentos }) => {
  const conPresencia = useMemo(() => {
    const nombres = new Set();
    for (const g of geographies) {
      if (pines.some((p) => geoContains(g, p.coords))) nombres.add(g.rsmKey);
    }
    return nombres;
  }, [geographies, pines]);

  useEffect(() => { onDepartamentos(conPresencia.size); }, [conPresencia, onDepartamentos]);

  return (
    <>
      {geographies.map((geo) => (
        <Geography
          key={geo.rsmKey}
          geography={geo}
          style={{
            default: { fill: conPresencia.has(geo.rsmKey) ? AZUL_PRESENCIA : AZUL_CLARO, stroke: '#FFFFFF', strokeWidth: 0.6, outline: 'none' },
            hover:   { fill: conPresencia.has(geo.rsmKey) ? AZUL_PRESENCIA : AZUL_CLARO, stroke: '#FFFFFF', strokeWidth: 0.6, outline: 'none' },
            pressed: { outline: 'none' },
          }}
        />
      ))}
      {pines.map((p) => (
        <Marker key={p.ciudad} coordinates={p.coords}>
          <circle r={5.5} fill={BRAND.verde} fillOpacity={0.22} />
          <circle r={2.6} fill={BRAND.verde} stroke="#FFFFFF" strokeWidth={0.8} />
        </Marker>
      ))}
    </>
  );
};

const MapaPresencia = () => {
  const [ciudades, setCiudades]   = useState(null);   // null = cargando; [] = sin datos
  const [departamentos, setDepartamentos] = useState(0);

  useEffect(() => {
    let vivo = true;
    pub.get('/captacion/pub/presencia')
      .then(({ data }) => vivo && setCiudades(data.ciudades || []))
      .catch(() => vivo && setCiudades([]));   // sin datos: se dibuja el mapa sin puntos ni cifras
    return () => { vivo = false; };
  }, []);

  const pines = useMemo(
    () => (ciudades || []).map((ciudad) => ({ ciudad, coords: coordenadasDe(ciudad) })).filter((p) => p.coords),
    [ciudades]
  );

  const hayDatos = pines.length > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {hayDatos && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: '#EEF5E9', color: '#3F7A25' }}>
            <MapPin size={15} /> {ciudades.length} municipios
          </span>
          {departamentos > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: '#E8F1F7', color: BRAND.azul }}>
              {departamentos} departamentos
            </span>
          )}
        </div>
      )}

      <div className="w-full max-w-[420px]" role="img"
           aria-label={hayDatos ? `Mapa de Colombia con asociados en ${ciudades.length} municipios` : 'Mapa de Colombia'}>
        <ComposableMap
          width={520}
          height={600}
          projection="geoMercator"
          projectionConfig={{ center: [-73.2, 4.4], scale: 1650 }}
          style={{ width: '100%', height: 'auto', maxHeight: '58vh' }}
        >
          <Geographies geography="/colombia.json">
            {({ geographies }) => <Capas geographies={geographies} pines={pines} onDepartamentos={setDepartamentos} />}
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  );
};

export default MapaPresencia;
