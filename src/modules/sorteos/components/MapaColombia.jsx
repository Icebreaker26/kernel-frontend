import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { coordenadasDe as lookup } from '../../../data/coordenadasCiudades.js';

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
