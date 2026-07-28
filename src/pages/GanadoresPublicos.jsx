import { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import apiService from '../services/apiService.js';

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .toUpperCase();
};

const GanadoresPublicos = () => {
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    apiService.get('/public/ganadores')
      .then(({ data }) => setGanadores(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{ fontFamily: 'monospace', background: '#020617', minHeight: '100vh', padding: '24px 20px', color: '#a0d4e0' }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 9, letterSpacing: 4, color: '#6aacbc', marginBottom: 6 }}>
          // COOPERATIVA PROGRESEMOS
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <Trophy size={20} color="#ffb700" style={{ filter: 'drop-shadow(0 0 8px #ffb70066)' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ffb700', margin: 0, textShadow: '0 0 16px #ffb70044', letterSpacing: 2 }}>
            GANADORES DEL SORTEO
          </h1>
          <Trophy size={20} color="#ffb700" style={{ filter: 'drop-shadow(0 0 8px #ffb70066)' }} />
        </div>
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #ffb70033, transparent)', margin: '12px auto', maxWidth: 300 }} />
      </div>

      {/* Contenido */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <Loader2 size={24} color="#ffb70066" className="animate-spin" />
        </div>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ff3d3d', fontSize: 12, letterSpacing: 2 }}>
          ERROR AL CARGAR LOS DATOS
        </p>
      )}

      {!loading && !error && ganadores.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6aacbc', fontSize: 12, letterSpacing: 3, paddingTop: 40 }}>
          SIN GANADORES REGISTRADOS AÚN
        </p>
      )}

      {!loading && !error && ganadores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto' }}>
          {ganadores.map((g, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #ffb70033',
                background: '#ffb7000a',
                borderRadius: 2,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#ffb700',
                textShadow: '0 0 12px #ffb70055',
                minWidth: 60,
                lineHeight: 1,
              }}>
                #{String(g.numero).padStart(3, '0')}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#a0d4e0', letterSpacing: 1 }}>
                  {g.sorteo_nombre}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6aacbc', letterSpacing: 2 }}>
                  {formatMes(g.mes_premiacion)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pie */}
      <p style={{ textAlign: 'center', fontSize: 9, color: '#2a4a5a', letterSpacing: 2, marginTop: 32 }}>
        KERNEL · SISTEMA DE GESTIÓN OPERATIVA
      </p>
    </div>
  );
};

export default GanadoresPublicos;
