import { useCallback, useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { mensajeError } from './Modal.jsx';

const COINCIDENCIA = {
  exacta:   { t: 'Coincidencia exacta', c: 'text-emerald-400' },
  parcial:  { t: 'Coincidencia parcial: verifícala', c: 'text-amber-300' },
  multiple: { t: 'Varias personas: elige la correcta', c: 'text-amber-300' },
  ninguna:  { t: 'Sin coincidencia en el padrón', c: 'text-slate-500' },
};

/** Cédula de cada empleado: SOLIDO la pide como "Asesor". Se sugiere por nombre contra el padrón y una persona la confirma. */
const TabAsesores = () => {
  const [filas, setFilas] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [manual, setManual] = useState({});
  const [enviando, setEnviando] = useState(null);

  const cargar = useCallback(() => apiService.get('/rpa/asesores/cedulas-sugeridas').then(({ data }) => setFilas(data)).catch((err) => {
    if (err.response?.status === 403) setSinPermiso(true); else toast.error('No se pudieron cargar los asesores');
    setFilas([]);
  }), []);
  useEffect(() => { cargar(); }, [cargar]);

  const asignar = async (u, cedula) => {
    setEnviando(u.usuario_id);
    try {
      const { data } = await apiService.put(`/rpa/usuarios/${u.usuario_id}/cedula`, { cedula });
      toast.success(data.en_padron === false ? 'Cédula guardada (ojo: no figura en el padrón de asociados)' : 'Cédula guardada');
      cargar();
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar la cédula')); }
    finally { setEnviando(null); }
  };

  if (sinPermiso) return <p className="rounded border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">Esta sección es solo para administración del RPA.</p>;
  if (filas === null) return <Loader2 className="animate-spin text-slate-500" />;
  if (filas.length === 0) return <p data-testid="asesores-completos" className="rounded border border-emerald-900/40 bg-emerald-900/10 p-6 text-center text-xs text-emerald-300">Todos los usuarios activos ya tienen su cédula cargada.</p>;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">Sin cédula, un asociado captado por ese asesor no puede subirse a SOLIDO. Nada se asigna solo: cada cédula la confirmas tú.</p>
      {filas.map((u) => {
        const co = COINCIDENCIA[u.coincidencia];
        return (
          <article key={u.usuario_id} data-testid="fila-asesor" className="rounded border border-slate-800/60 bg-slate-900/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><p className="text-sm text-slate-200">{u.nombre}</p><p className="text-[10px] text-slate-500">{u.email}</p></div>
              <p className={`text-[10px] ${co.c}`}>{co.t}</p>
            </div>
            {u.candidatos.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {u.candidatos.map((c) => (
                  <li key={c.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs">
                    <span className="text-slate-300">{c.nombre} {c.apellido} <span className="text-slate-500">· {c.codigo}</span></span>
                    <button type="button" disabled={enviando === u.usuario_id} onClick={() => asignar(u, c.codigo)}
                            className="inline-flex items-center gap-1 rounded border border-emerald-600 bg-emerald-900/30 px-3 py-1 text-[10px] tracking-wider text-emerald-300 disabled:opacity-40"><Check size={11} /> USAR ESTA CÉDULA</button>
                  </li>
                ))}
              </ul>
            )}
            <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); asignar(u, (manual[u.usuario_id] || '').trim()); }}>
              <input inputMode="numeric" aria-label={`Cédula de ${u.nombre}`} value={manual[u.usuario_id] || ''} onChange={(e) => setManual({ ...manual, [u.usuario_id]: e.target.value })}
                     placeholder="O escribe la cédula" className="w-48 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200" />
              <button type="submit" disabled={enviando === u.usuario_id || !/^\d{4,15}$/.test((manual[u.usuario_id] || '').trim())}
                      className="rounded border border-slate-600 px-3 py-1.5 text-[10px] tracking-wider text-slate-300 disabled:opacity-40">GUARDAR</button>
            </form>
          </article>
        );
      })}
    </div>
  );
};

export default TabAsesores;
