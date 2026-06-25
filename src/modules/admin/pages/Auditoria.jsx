import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, UserMinus, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const fmt = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const Chip = ({ icon: Icon, valor, color }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${color}`}>
    <Icon size={11} /> {valor}
  </span>
);

const Auditoria = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.get('/asociados/sincronizaciones')
      .then(({ data }) => setHistorial(data))
      .catch(() => toast.error('Error cargando auditoría'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-1">Auditoría de sincronizaciones</h1>
      <p className="text-slate-500 text-xs mb-6">{historial.length} sincronizaciones registradas</p>

      {historial.length === 0 ? (
        <p className="text-slate-600 text-sm">No hay sincronizaciones registradas aún.</p>
      ) : (
        <div className="space-y-3">
          {historial.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={13} className="text-slate-500 shrink-0" />
                    <p className="text-slate-200 text-sm font-medium truncate">{s.archivo}</p>
                  </div>
                  <p className="text-slate-500 text-xs">
                    {s.usuario} · {fmt(s.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Chip icon={FileText}  valor={`${s.total} total`}        color="text-slate-400 bg-slate-800" />
                  <Chip icon={UserPlus}  valor={`${s.nuevos} nuevos`}      color="text-emerald-400 bg-emerald-500/10" />
                  <Chip icon={RefreshCw} valor={`${s.actualizados} act.`}  color="text-blue-400 bg-blue-500/10" />
                  <Chip icon={UserMinus} valor={`${s.retirados} retirados`} color="text-amber-400 bg-amber-500/10" />
                  {s.errores > 0 && (
                    <Chip icon={AlertCircle} valor={`${s.errores} errores`} color="text-red-400 bg-red-500/10" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Auditoria;
