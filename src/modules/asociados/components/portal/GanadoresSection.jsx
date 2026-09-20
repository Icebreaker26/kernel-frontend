import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import apiService from '../../../../services/apiService.js';
import { ACCENTS, Cargando, Vacio, nombrePropio } from '../PortalUI.jsx';

const formatMes = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month] = dateStr.slice(0, 7).split('-');
  return new Date(year, Number(month) - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

const GanadoresSection = () => {
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get('/sorteos/portal/ganadores')
      .then(({ data }) => setGanadores(Array.isArray(data) ? data : []))
      .catch(() => setGanadores([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Cargando texto="Cargando ganadores…" />;
  if (ganadores.length === 0) return <Vacio icon={Trophy} texto="Aún no hay ganadores registrados." />;

  const ac = ACCENTS.dorado;
  return (
    <ul className="grid gap-3">
      {ganadores.map((g, i) => (
        <li key={i} className="flex items-center gap-4 rounded-2xl p-4" style={{ background: ac.soft }}>
          <span className="shrink-0 font-mono text-2xl font-extrabold" style={{ color: ac.ink }}>#{String(g.numero).padStart(3, '0')}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-slate-900">{nombrePropio(g.nombre_completo) || '—'}</p>
            {g.empresa && <p className="truncate text-sm text-slate-600">{g.empresa}</p>}
            <p className="text-sm text-slate-500">{g.sorteo_nombre}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold capitalize" style={{ color: ac.ink }}>{formatMes(g.mes_premiacion)}</span>
        </li>
      ))}
    </ul>
  );
};

export default GanadoresSection;
