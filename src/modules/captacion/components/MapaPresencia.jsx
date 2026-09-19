import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { BRAND } from '../data/marca.js';
import { usePresencia } from '../utils/usePresencia.js';

/**
 * Mapa de la diapositiva "Estamos en todo el país": un punto por cada municipio donde hay asociados, y los
 * departamentos con asociados resaltados en el azul de la marca. Mismo mapa y coordenadas que la página de
 * estadísticas de sorteos, con estilo claro. Los datos vienen de usePresencia (solo nombres de ciudades).
 */

const SIN_PRESENCIA = '#DCE6EE';   // departamento sin asociados
const CON_PRESENCIA = BRAND.azul;  // departamento con asociados: azul fuerte para que resalte

const MapaPresencia = () => {
  const presencia = usePresencia();
  const pines = presencia?.pines || [];
  const departamentos = presencia?.departamentos || new Set();
  const total = presencia?.ciudades.length || 0;

  return (
    <div className="mx-auto w-full max-w-[560px]" role="img"
         aria-label={total ? `Mapa de Colombia con asociados en ${total} municipios y ${departamentos.size} departamentos` : 'Mapa de Colombia'}>
      <ComposableMap
        width={520}
        height={600}
        projection="geoMercator"
        projectionConfig={{ center: [-73, 4.2], scale: 1780 }}
        // Alto según la pantalla: en el kiosco no puede pasar del espacio que dejan el encabezado y el botón
        style={{ width: '100%', height: 'auto', maxHeight: 'max(300px, min(calc(100dvh - 300px), 700px))' }}
      >
        <Geographies geography="/colombia.json">
          {({ geographies }) => (
            <>
              {geographies.map((geo) => {
                const relleno = departamentos.has(geo.properties.NOMBRE_DPT) ? CON_PRESENCIA : SIN_PRESENCIA;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: relleno, stroke: '#FFFFFF', strokeWidth: 0.8, outline: 'none' },
                      hover:   { fill: relleno, stroke: '#FFFFFF', strokeWidth: 0.8, outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })}
              {pines.map((p) => (
                <Marker key={p.ciudad} coordinates={p.coords}>
                  <circle r={7} fill={BRAND.dorado} fillOpacity={0.35} />
                  <circle r={3.4} fill={BRAND.dorado} stroke="#FFFFFF" strokeWidth={1} />
                </Marker>
              ))}
            </>
          )}
        </Geographies>
      </ComposableMap>
    </div>
  );
};

export default MapaPresencia;
