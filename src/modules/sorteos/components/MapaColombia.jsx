import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

const COORDS = {
  'BOGOTÁ':            [-74.0721, 4.7110],
  'BOGOTA':            [-74.0721, 4.7110],
  'MEDELLÍN':          [-75.5812, 6.2442],
  'MEDELLIN':          [-75.5812, 6.2442],
  'CALI':              [-76.5320, 3.4516],
  'BARRANQUILLA':      [-74.7813, 10.9685],
  'CARTAGENA':         [-75.4794, 10.3910],
  'CÚCUTA':            [-72.5078, 7.8939],
  'CUCUTA':            [-72.5078, 7.8939],
  'BUCARAMANGA':       [-73.1198, 7.1253],
  'PEREIRA':           [-75.6906, 4.8087],
  'MANIZALES':         [-75.5138, 5.0703],
  'IBAGUÉ':            [-75.2322, 4.4389],
  'IBAGUE':            [-75.2322, 4.4389],
  'SANTA MARTA':       [-74.1990, 11.2408],
  'VILLAVICENCIO':     [-73.6350, 4.1533],
  'ARMENIA':           [-75.6811, 4.5339],
  'NEIVA':             [-75.2819, 2.9273],
  'POPAYÁN':           [-76.6147, 2.4448],
  'POPAYAN':           [-76.6147, 2.4448],
  'MONTERÍA':          [-75.8856, 8.7575],
  'MONTERIA':          [-75.8856, 8.7575],
  'PASTO':             [-77.2811, 1.2136],
  'SINCELEJO':         [-75.3978, 9.3047],
  'VALLEDUPAR':        [-73.2532, 10.4631],
  'RIOHACHA':          [-72.9072, 11.5444],
  'QUIBDÓ':            [-76.6583, 5.6919],
  'QUIBDO':            [-76.6583, 5.6919],
  'TUNJA':             [-73.3678, 5.5353],
  'FLORENCIA':         [-75.6062, 1.6144],
  'MOCOA':             [-76.6483, 1.1523],
  'LETICIA':           [-69.9406, -4.2153],
  'YOPAL':             [-72.3959, 5.3378],
  'ARAUCA':            [-70.7617, 7.0847],
  'BUENAVENTURA':      [-77.0310, 3.8801],
  'PALMIRA':           [-76.3039, 3.5394],
  'BELLO':             [-75.5576, 6.3327],
  'SOLEDAD':           [-74.7670, 10.9176],
  'SOACHA':            [-74.2172, 4.5797],
  'GIRARDOT':          [-74.8027, 4.3033],
  'DUITAMA':           [-73.0271, 5.8274],
  'SOGAMOSO':          [-72.9329, 5.7193],
  'ZIPAQUIRÁ':         [-74.0058, 5.0233],
  'ZIPAQUIRA':         [-74.0058, 5.0233],
  'FACATATIVÁ':        [-74.3538, 4.8147],
  'FACATATIVA':        [-74.3538, 4.8147],
  'BARRANCABERMEJA':   [-73.8547, 7.0647],
  'FLORIDABLANCA':     [-73.0936, 7.0603],
  'OCAÑA':             [-73.3561, 8.2344],
  'OCANA':             [-73.3561, 8.2344],
  'MAICAO':            [-72.2428, 11.3814],
  'TURBO':             [-76.7283, 8.0992],
  'APARTADÓ':          [-76.6239, 7.8836],
  'APARTADO':          [-76.6239, 7.8836],
  'RIONEGRO':          [-75.3744, 6.1547],
  'ENVIGADO':          [-75.5928, 6.1733],
  'ITAGÜÍ':            [-75.5997, 6.1844],
  'ITAGUI':            [-75.5997, 6.1844],
  'CARTAGO':           [-75.9122, 4.7456],
  'TULUÁ':             [-76.1961, 4.0842],
  'TULUA':             [-76.1961, 4.0842],
  'BUGA':              [-76.2989, 3.9003],
  'TUMACO':            [-78.7922, 1.7994],
  'IPIALES':           [-77.6408, 0.8289],
  'DOSQUEBRADAS':      [-75.6661, 4.8394],
  'CHINCHINÁ':         [-75.6047, 4.9819],
  'CHINCHINA':         [-75.6047, 4.9819],
  'LA DORADA':         [-74.6739, 5.4528],
  'AGUADAS':           [-75.4517, 5.6122],
  'JAMUNDÍ':           [-76.5386, 3.2619],
  'JAMUNDI':           [-76.5386, 3.2619],
  'SANTA ROSA DE CABAL':[-75.6214, 4.8686],
  'LA VIRGINIA':       [-75.8783, 4.9008],
  'RIOSUCIO':          [-75.7072, 5.4147],
  'RIOSUCIO CALDAS':   [-75.7072, 5.4147],
  // Municipios Eje Cafetero / Valle / Risaralda
  'VITERBO':           [-75.8833, 5.0611],
  'ANSERMANUEVO':      [-75.9886, 4.7956],
  'BALBOA RISARALDA':  [-75.9572, 4.9494],
  'TORO':              [-76.0811, 4.6025],
  'BELÉN DE UMBRÍA':   [-75.8750, 5.2094],
  'BELEN DE UMBRIA':   [-75.8750, 5.2094],
  'PUEBLO RICO':       [-76.0333, 5.2333],
  'QUINCHÍA':          [-75.7333, 5.3417],
  'QUINCHIA':          [-75.7333, 5.3417],
  'MARSELLA':          [-75.7361, 4.9386],
  'ROLDANILLO':        [-76.1553, 4.4125],
  'PUERTO TEJADA':     [-76.4167, 3.2333],
  'TRUJILLO':          [-76.3228, 4.2381],
  'RIOFRÍO':           [-76.2889, 4.1444],
  'RIOFRIO':           [-76.2889, 4.1444],
  'LA TEBAIDA':        [-75.7869, 4.4569],
  'CIRCASIA':          [-75.6408, 4.6161],
  'QUIMBAYA':          [-75.7614, 4.6219],
  'ALCALÁ':            [-75.7831, 4.6792],
  'ALCALA':            [-75.7831, 4.6792],
  'CALARCA':           [-75.6439, 4.5244],
  'CALARCÁ':      [-75.6439, 4.5244],
  'ARMENIA':           [-75.6811, 4.5339],
  'MONTENEGRO':        [-75.7500, 4.5667],
  'LA CELIA':          [-75.9817, 5.1047],
  // Antioquia
  'RIONEGRO ANTIOQUIA':[-75.3744, 6.1547],
  // Cauca
  'MORALES CAUCA':     [-76.6333, 2.7500],
  // Caquetá
  'SAN VICENTE DEL CAGUÁN':[-74.7703, 2.1089],
  'SAN VICENTE DEL CAGUAN':[-74.7703, 2.1089],
  // Casanare
  'OROCUÉ':            [-71.3544, 4.7944],
  'OROCUE':            [-71.3544, 4.7944],
  // Atlántico
  'GALAPA':            [-74.8897, 10.8978],
  'PONEDERA':          [-74.7458, 10.6444],
  // Boyacá
  'BELÉN BOYACA':      [-72.9333, 6.0167],
  'BELEN BOYACA':      [-72.9333, 6.0167],
  // San José ambiguo → San José del Guaviare
  'SAN JOSÉ':          [-72.6333, 2.5667],
  'SAN JOSE':          [-72.6333, 2.5667],

  // Magdalena
  'ARACATACA':         [-74.1928, 10.5942],
  'EL RETÉN':          [-74.2667, 10.6333],
  'EL RETEN':          [-74.2667, 10.6333],
  'EL PIÑON':          [-74.5167, 10.3833],
  'EL PINON':          [-74.5167, 10.3833],
  'FUNDACIÓN':         [-74.1833, 10.5167],
  'FUNDACION':         [-74.1833, 10.5167],
  'PIVIJAY':           [-74.6167, 10.4667],
  'REMOLINO':          [-74.6333, 10.7167],
  'ARIGUANÍ':          [-74.0833, 10.1667],
  'ARIGUANI':          [-74.0833, 10.1667],
  'ALGARROBO':         [-74.0167, 10.1500],
  'PLATO':             [-74.7833, 9.7833],
  'CERRO SAN ANTONIO': [-74.7167, 10.3333],
  'SALAMINA MAGDALENA':[-74.8000, 10.5000],
  'EL BANCO':          [-73.9833, 9.0000],
  'ZONA BANANERA':     [-74.1167, 10.6667],
  'BOSCONIA':          [-73.8833, 9.9667],
  'SABANAS DE SAN ANGEL':[-74.5500, 10.0667],
  'SANTA ANA':         [-74.5667, 9.3333],

  // Cesar
  'CHIRIGUANÁ':        [-73.6167, 9.3667],
  'CHIRIGUANA':        [-73.6167, 9.3667],
  'BECERRIL':          [-73.2667, 9.7000],
  'CHIMICHAGUA':       [-73.8167, 9.2667],
  'LA PAZ CESAR':      [-73.1667, 10.3833],
  'AGUSTÍN CODAZZI':   [-73.2333, 10.0333],
  'AGUSTIN CODAZZI':   [-73.2333, 10.0333],
  'EL PASO':           [-73.7000, 9.6667],
  'SAN MARTÍN CESAR':  [-73.6833, 10.0333],
  'SAN MARTIN CESAR':  [-73.6833, 10.0333],

  // Córdoba
  'SAHAGÚN':           [-75.4500, 8.9500],
  'SAHAGUN':           [-75.4500, 8.9500],
  'CHINÚ':             [-75.4000, 9.1167],
  'CHINU':             [-75.4000, 9.1167],
  'SAN PELAYO':        [-75.8333, 8.9667],
  'MONTERÍA':          [-75.8856, 8.7575],
  'CAUCASIA':          [-75.1833, 7.9833],

  // Casanare
  'PAZ DE ARIPORO':    [-71.8833, 5.8833],
  'TRINIDAD':          [-71.6500, 5.4167],
  'AGUAZUL':           [-72.5500, 5.1667],
  'NUNCHÍA':           [-72.2000, 5.6333],
  'NUNCHIA':           [-72.2000, 5.6333],
  'PORE':              [-71.9833, 5.7167],
  'VILLANUEVA CASANARE':[-72.9167, 4.6167],
  'OROCUÉ':            [-71.3544, 4.7944],
  'TÁMARA':            [-72.1667, 6.1167],
  'TAMARA':            [-72.1667, 6.1167],

  // Arauca
  'ARAUCA ARAUCA':     [-70.7617, 7.0847],
  'SARAVENA':          [-71.8667, 6.9500],

  // Sucre
  'OVEJAS':            [-75.2333, 9.5167],
  'SAN ONOFRE':        [-75.5333, 9.7333],
  'SAN MARCOS':        [-75.1333, 8.6667],

  // Bolívar
  'REGIDOR':           [-73.8333, 8.7000],
  'RÍO VIEJO':         [-73.8833, 8.4833],
  'RIO VIEJO':         [-73.8833, 8.4833],
  'MARÍA LA BAJA':     [-75.3167, 10.0000],
  'MARIA LA BAJA':     [-75.3167, 10.0000],
  'SAN AGUSTÍN':       [-76.2833, 1.8667],
  'SAN AGUSTIN':       [-76.2833, 1.8667],

  // Atlántico
  'BARANOA':           [-74.9167, 10.7833],
  'REPELÓN':           [-75.1333, 10.5000],
  'REPELON':           [-74.9167, 10.7833],
  'CAMPO DE LA CRUZ':  [-74.8833, 10.3833],

  // Meta
  'ACACÍAS':           [-73.7833, 3.9833],
  'ACACIAS':           [-73.7833, 3.9833],
  'VISTAHERMOSA':      [-73.7500, 3.1167],
  'SAN MARTÍN META':   [-73.6833, 3.6833],

  // Cundinamarca
  'CAJICÁ':            [-74.0167, 4.9167],
  'CAJICA':            [-74.0167, 4.9167],
  'PIEDRAS':           [-74.8833, 4.7000],

  // Santander
  'LANDÁZURI':         [-73.8167, 6.2167],
  'LANDAZURI':         [-73.8167, 6.2167],

  // Santander
  'PIEDECUESTA':       [-73.0497, 6.9883],

  // Guajira
  'DIBULLA':           [-73.3000, 11.2667],

  // Valle
  'FLORIDA':           [-76.2311, 3.3269],

  // Cauca
  'EL COPEY':          [-73.9500, 10.1500],

  // San Luis de Palenque (Casanare)
  'SAN LUIS DE PALENQUE':[-71.7333, 5.4167],

  // San Luis de Gaceno (Boyacá)
  'SAN LUIS DE GACENO':[-73.1667, 4.8167],
};

const lookup = (ciudad) => {
  if (!ciudad) return null;
  const key = ciudad.toUpperCase().trim();
  return COORDS[key] ?? null;
};

const MapaColombia = ({ porCiudad }) => {
  const [zoom, setZoom]         = useState(1);
  const [center, setCenter]     = useState([-74, 4]);
  const [tooltip, setTooltip]   = useState(null);
  const containerRef            = useRef(null);

  const puntos = useMemo(() =>
    porCiudad
      .map((c) => ({ ...c, coords: lookup(c.ciudad) }))
      .filter((c) => c.coords !== null)
  , [porCiudad]);

  const sinMapa = useMemo(() =>
    porCiudad.filter((c) => lookup(c.ciudad) === null)
  , [porCiudad]);

  const maxBoletos = Math.max(...puntos.map((p) => p.boletos), 1);

  // Zoom con rueda del mouse sin necesidad de click previo
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.2 : 0.85;
    setZoom((z) => Math.min(Math.max(z * delta, 1), 20));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.4, 20))}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >+</button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.4, 1))}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >−</button>
          <button
            onClick={() => { setZoom(1); setCenter([-74, 4]); }}
            className="px-2 h-7 flex items-center bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-slate-300 rounded text-[10px] transition-colors ml-1"
          >Reset</button>
        </div>
        <p className="text-slate-600 text-[10px]">Scroll para zoom · Arrastra para mover</p>
      </div>

      {/* Mapa */}
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-slate-800/60"
        style={{ height: 440, background: '#020617', cursor: 'grab', position: 'relative' }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-74, 4], scale: 1800 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates); setZoom(z); }}
          >
            {/* Departamentos */}
            <Geographies geography="/colombia.json">
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: '#0f172a', stroke: '#1e293b', strokeWidth: 0.4, outline: 'none' },
                      hover:   { fill: '#1e293b', stroke: '#334155', strokeWidth: 0.4, outline: 'none' },
                      pressed: { fill: '#1e293b', outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Pins */}
            {puntos.map((p) => {
              const r = 4 + (p.boletos / maxBoletos) * 14;
              return (
                <Marker
                  key={p.ciudad}
                  coordinates={p.coords}
                  onMouseEnter={() => setTooltip(p)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    r={r / zoom + 1}
                    fill="#10b981"
                    fillOpacity={0.8}
                    stroke="#064e3b"
                    strokeWidth={0.8 / zoom}
                    style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                  />
                  {zoom >= 3 && (
                    <text
                      textAnchor="middle"
                      y={-(r / zoom + 3)}
                      style={{ fontSize: 3 / zoom + 'px', fill: '#94a3b8', pointerEvents: 'none' }}
                    >
                      {p.ciudad}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip flotante */}
        {tooltip && (
          <div className="absolute bottom-4 left-4 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 pointer-events-none">
            <p className="text-white text-xs font-semibold">{tooltip.ciudad}</p>
            <p className="text-emerald-400 text-xs">{tooltip.boletos} bono{tooltip.boletos !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {sinMapa.length > 0 && (
        <p className="text-slate-600 text-[10px]">
          Sin ubicación en el mapa: {sinMapa.map((c) => `${c.ciudad} (${c.boletos})`).join(' · ')}
        </p>
      )}
    </div>
  );
};

export default MapaColombia;
