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
      <p className="text-[#1a4a55] text-[9px] mb-3 tracking-widest">
        // SOLO LOS ASOCIADOS DE EMPRESAS HABILITADAS PUEDEN PARTICIPAR EN ESTE SORTEO
      </p>
      {empresas.map((emp) => {
        const on = habilitadas.has(emp.codigo);
        return (
          <div
            key={emp.codigo}
            className={`flex items-center justify-between p-3 border transition-all rounded-sm ${
              on
                ? 'border-[#00e5ff22] bg-[#00e5ff08]'
                : 'border-[#00e5ff0a] bg-[#08101e]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building2
                size={13}
                style={on ? { color: '#00e5ff', filter: 'drop-shadow(0 0 4px #00e5ff66)' } : { color: '#1a4a55' }}
              />
              <div>
                <p className={`text-[11px] font-medium tracking-wider ${on ? 'text-[#a0d4e0]' : 'text-[#1a4a55]'}`}>
                  {emp.nombre}
                </p>
                <p className="text-[#1a4a55] text-[9px] font-mono mt-0.5">
                  {emp.codigo} · {emp.asociados_activos} asociados activos
                </p>
              </div>
            </div>
            <button
              onClick={() => toggle(emp.codigo)}
              disabled={toggling === emp.codigo}
              className={`relative shrink-0 w-11 h-6 rounded-sm transition-all duration-200 focus:outline-none border ${
                on
                  ? 'bg-[#00e5ff22] border-[#00e5ff55]'
                  : 'bg-[#0d1829] border-[#00e5ff11]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={on ? { boxShadow: '0 0 8px #00e5ff22' } : undefined}
            >
              {toggling === emp.codigo
                ? <Loader2 size={12} className="absolute inset-0 m-auto animate-spin text-[#00e5ff]" />
                : (
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-sm shadow transition-transform duration-200 ${
                      on ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    style={{
                      background: on ? '#00e5ff' : '#1a4a55',
                      boxShadow: on ? '0 0 6px #00e5ff' : 'none',
                    }}
                  />
                )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EmpresasPanel;
