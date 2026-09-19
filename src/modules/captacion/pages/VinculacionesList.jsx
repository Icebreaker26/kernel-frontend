import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCcw, CheckCircle2 } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

const SECCIONES = ['personal','laboral','financiera','pep','beneficiarios','referencias'];

const VinculacionesList = () => {
  const navigate = useNavigate();
  const [lista, setLista]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [filtroMes, setMes] = useState('');

  const cargar = () => {
    setLoad(true);
    apiService.get('/captacion/vinculaciones')
      .then(({ data }) => setLista(data))
      .catch(() => toast.error('Error cargando vinculaciones'))
      .finally(() => setLoad(false));
  };

  useEffect(() => { cargar(); }, []);

  const meses = [...new Set(lista.map(v =>
    new Date(v.created_at).toISOString().slice(0, 7)
  ))].sort().reverse();

  const filtradas = filtroMes
    ? lista.filter(v => v.created_at?.startsWith(filtroMes))
    : lista;

  const pendientesEntrega = lista.filter(v => v.estado === 'firmado').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-emerald-400/60 text-[9px] tracking-[3px] mb-1">// CAPTACIÓN</p>
          <h1 className="text-slate-200 font-bold text-lg tracking-wider">VINCULACIONES</h1>
        </div>
        <button onClick={cargar}
          className="p-2 border border-slate-700/50 rounded hover:border-emerald-700/50 text-slate-500 hover:text-emerald-400 transition-colors">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alerta pendientes entrega */}
      {pendientesEntrega > 0 && (
        <div className="flex items-center gap-3 mb-5 p-3 border border-emerald-700/30 bg-emerald-900/10 rounded">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-xs">
            <strong>{pendientesEntrega}</strong> solicitud{pendientesEntrega > 1 ? 'es' : ''} firmada{pendientesEntrega > 1 ? 's' : ''} pendiente{pendientesEntrega > 1 ? 's' : ''} de entrega a procesamiento.
          </p>
        </div>
      )}

      {/* Filtro mes */}
      {meses.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setMes('')}
            className={`px-3 py-1 text-[10px] tracking-wider rounded border transition-all ${
              !filtroMes ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-slate-700/50 text-slate-500 hover:border-slate-600'
            }`}>
            TODOS
          </button>
          {meses.map(m => (
            <button key={m} onClick={() => setMes(m)}
              className={`px-3 py-1 text-[10px] tracking-wider rounded border transition-all ${
                filtroMes === m ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-slate-700/50 text-slate-500 hover:border-slate-600'
              }`}>
              {m}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-600 text-xs tracking-wider">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="py-16 text-center border border-slate-800/40 rounded">
          <p className="text-slate-600 text-xs tracking-widest">SIN VINCULACIONES</p>
          <p className="text-slate-700 text-[10px] mt-2">Las vinculaciones aparecen cuando un prospecto firma su solicitud.</p>
        </div>
      ) : (
        <div className="border border-slate-800/50 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                <th className="text-left px-4 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">ASOCIADO</th>
                <th className="text-left px-4 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">EMPRESA</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">SECCIONES</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">FIRMADO</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">ESTADO</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => {
                const secDone = SECCIONES.filter(s => v[`seccion_${s}_at`]).length;
                const completa = secDone === SECCIONES.length && v.seccion_firma_at;
                return (
                  <tr key={v.id}
                    onClick={() => navigate(`/captacion/vinculaciones/${v.id}`)}
                    className="border-b border-slate-800/40 hover:bg-emerald-900/5 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-xs font-medium">{v.nombres} {v.apellidos}</p>
                      <p className="text-slate-600 text-[10px]">CC {v.cedula}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[10px]">{v.empresa_codigo}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-0.5 mb-1">
                        {SECCIONES.map(s => (
                          <span key={s} className={`w-2 h-2 rounded-sm ${v[`seccion_${s}_at`] ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        ))}
                        <span className={`w-2 h-2 rounded-sm ml-0.5 ${v.seccion_firma_at ? 'bg-emerald-300' : 'bg-slate-700'}`} title="firma" />
                      </div>
                      <p className="text-slate-600 text-[9px]">{secDone}/{SECCIONES.length} + firma</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-[10px]">
                      {v.seccion_firma_at ? new Date(v.seccion_firma_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[9px] tracking-wider px-2 py-0.5 rounded border ${
                        v.estado === 'entregado'
                          ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                          : completa
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-600/50'
                          : 'bg-amber-900/20 text-amber-400 border-amber-800/50'
                      }`}>
                        {v.estado === 'entregado' ? 'ENTREGADO' : completa ? 'FIRMADO' : 'INCOMPLETO'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-700 group-hover:text-slate-500">
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VinculacionesList;
