import { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const EmpresasPanel = ({ sorteoId, empresasHabilitadas, empresasCacheadas, onToggle }) => {
  const [empresas, setEmpresas]       = useState(empresasCacheadas ?? []);
  const [habilitadas, setHabilitadas] = useState(new Set(empresasHabilitadas));
  const [toggling, setToggling]       = useState(null);

  useEffect(() => {
    if (empresasCacheadas) { setEmpresas(empresasCacheadas); return; }
    apiService.get('/empresas').then(({ data }) => setEmpresas(data));
  }, [empresasCacheadas]);

  useEffect(() => {
    setHabilitadas(new Set(empresasHabilitadas));
  }, [empresasHabilitadas]);

  const toggle = async (codigo) => {
    setToggling(codigo);
    try {
      const { data } = await apiService.post(`/sorteos/${sorteoId}/empresas/${codigo}`);
      setHabilitadas((prev) => {
        const next = new Set(prev);
        data.habilitada ? next.add(codigo) : next.delete(codigo);
        return next;
      });
      onToggle?.(codigo, data.habilitada);
      toast.success(data.habilitada ? 'Empresa habilitada' : 'Empresa deshabilitada');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-slate-500 text-xs mb-2">
        Solo los asociados de empresas habilitadas pueden participar en este sorteo.
      </p>
      {empresas.map((emp) => {
        const on = habilitadas.has(emp.codigo);
        return (
          <div key={emp.codigo}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              on ? 'border-emerald-800 bg-emerald-900/20' : 'border-slate-800 bg-slate-900/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={13} className={on ? 'text-emerald-400' : 'text-slate-500'} />
              <div>
                <p className={`text-xs font-medium ${on ? 'text-white' : 'text-slate-400'}`}>{emp.nombre}</p>
                <p className="text-slate-600 text-[10px]">{emp.codigo} · {emp.asociados_activos} asociados activos</p>
              </div>
            </div>
            <button
              onClick={() => toggle(emp.codigo)}
              disabled={toggling === emp.codigo}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                on ? 'bg-emerald-600' : 'bg-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {toggling === emp.codigo
                ? <Loader2 size={12} className="absolute inset-0 m-auto animate-spin text-white" />
                : <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    on ? 'translate-x-5' : 'translate-x-0'
                  }`} />
              }
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EmpresasPanel;
