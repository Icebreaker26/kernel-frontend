import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import TablaSolicitudes from '../components/TablaSolicitudes.jsx';
import { ESTADOS, campo, botonPrimario, mensajeError } from '../lib/formato.js';

const SolicitudesPage = () => {
  const [filas, setFilas] = useState([]);
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [todas, setTodas] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await apiService.get('/creditos', { params: { estado: estado || undefined, q: q || undefined, todas: todas ? 1 : undefined } });
        setFilas(data);
      } catch (err) {
        if (err.response?.status === 403) toast.error('No tienes permiso para ver los créditos');
        else toast.error(mensajeError(err, 'No se pudieron cargar las solicitudes'));
      } finally { setCargando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [estado, q, todas]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por radicado, cédula o nombre" className={`${campo} pl-8`} aria-label="Buscar solicitudes" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`${campo} w-auto`} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#6aacbc]" title="Solo si administras créditos">
          <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Ver las de todos los asesores
        </label>
        <Link to="/creditos/nueva" className={botonPrimario}><Plus size={13} /> NUEVA SOLICITUD</Link>
      </div>
      {cargando && <p className="mb-2 text-[11px] text-slate-500">Cargando…</p>}
      <TablaSolicitudes filas={filas} base="/creditos" mostrarAsesor={todas} vacio="Aún no hay solicitudes con esos filtros" />
    </div>
  );
};

export default SolicitudesPage;
