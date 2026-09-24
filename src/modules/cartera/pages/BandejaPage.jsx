import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import TablaSolicitudes from '../../creditos/components/TablaSolicitudes.jsx';
import { campo, mensajeError } from '../../creditos/lib/formato.js';

const TABS = [
  ['entregadas', 'POR RECIBIR', 'Entregadas por los asesores: esperan a Cartera'],
  ['recibidas', 'RECIBIDAS', 'Expedientes que Cartera ya recibió: falta cargar y firmar el comprobante y el estudio, y completar'],
  ['completadas', 'COMPLETADAS', 'Cartera ya los completó: están en Control Interno'],
  ['devueltas', 'DEVUELTAS', 'Devueltas al asesor para corregir'],
  ['por_llegar', 'EN TRÁMITE', 'Aún en manos del asesor (solo para anticipar carga)'],
];

const BandejaPage = () => {
  const [tab, setTab] = useState('entregadas');
  const [q, setQ] = useState('');
  const [filas, setFilas] = useState([]);
  const [conteos, setConteos] = useState({});
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await apiService.get('/cartera', { params: { tab, q: q || undefined } });
        setFilas(data);
        setConteos((c) => ({ ...c, [tab]: data.length }));
        setSinPermiso(false);
      } catch (err) {
        if (err.response?.status === 403) setSinPermiso(true); else toast.error(mensajeError(err, 'No se pudo cargar la bandeja'));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [tab, q]);

  if (sinPermiso) return <p className="text-xs text-amber-300">No tienes permiso para ver la bandeja de Cartera.</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Estados">
          {TABS.map(([k, t, ayuda]) => (
            <button key={k} type="button" title={ayuda} onClick={() => setTab(k)}
              className={`rounded-sm px-3 py-1.5 text-[10px] tracking-widest ${tab === k ? 'bg-[#fbbf2422] text-[#fbbf24]' : 'text-[#6aacbc] hover:text-[#00e5ff]'}`}>
              {t}{conteos[k] != null ? ` (${conteos[k]})` : ''}
            </button>
          ))}
        </nav>
        <Link to="/cartera/reportes" className="ml-auto inline-flex items-center gap-2 rounded-sm border border-slate-600 px-3 py-2 text-[10px] font-bold tracking-widest text-[#a0d4e0] hover:border-[#fbbf24] hover:text-[#fbbf24]"><BarChart3 size={13} /> REPORTES DEL MES</Link>
        <div className="relative min-w-[240px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Radicado, cédula o nombre" className={`${campo} pl-8`} aria-label="Buscar en la bandeja" />
        </div>
      </div>
      <p className="mb-3 text-[11px] text-slate-500">{TABS.find(([k]) => k === tab)[2]}. El semáforo muestra firma, autorización de la empresa y documentos del asociado.</p>
      <TablaSolicitudes filas={filas} base="/cartera" mostrarAsesor vacio="No hay expedientes en esta bandeja" />
    </div>
  );
};

export default BandejaPage;
