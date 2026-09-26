import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Cpu, Languages, UserCog, FileSpreadsheet } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import EstadoAgente from '../components/EstadoAgente.jsx';
import TabTrabajos from '../components/TabTrabajos.jsx';
import TabAgentes from '../components/TabAgentes.jsx';
import TabEquivalencias from '../components/TabEquivalencias.jsx';
import TabAsesores from '../components/TabAsesores.jsx';
import TabFlexible from '../components/TabFlexible.jsx';
import { resumenAgentes } from '../estados.js';

const TABS = [
  ['trabajos', 'TRABAJOS', ListChecks],
  ['agentes', 'AGENTES', Cpu],
  ['equivalencias', 'EQUIVALENCIAS', Languages],
  ['asesores', 'ASESORES', UserCog],
  ['flexible', 'FLEXIBLE', FileSpreadsheet],
];

/** Operación del RPA de SOLIDO: bandeja de trabajos (aprobación y capturas), agentes, equivalencias y cédulas de los asesores. */
const SolidoPage = () => {
  const [tab, setTab] = useState('trabajos');
  const [agentes, setAgentes] = useState(null);

  const cargarAgentes = useCallback(() => apiService.get('/rpa/agentes').then(({ data }) => setAgentes(data)).catch(() => setAgentes((a) => a ?? [])), []);
  useEffect(() => { cargarAgentes(); const t = setInterval(cargarAgentes, 15000); return () => clearInterval(t); }, [cargarAgentes]);

  const guardaHabilitado = (agentes || []).some((a) => a.permite_guardar);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-5">
        <h1 className="text-lg font-bold tracking-[3px] text-slate-200">CARGA A SOLIDO</h1>
        <p className="mt-1 text-[11px] text-slate-500">Asociados que el agente sube a SOLIDO: revisión y aprobación, estado del agente, códigos de ciudad y empresa, y cédula de los asesores.</p>
        <EstadoAgente className="mt-3" agente={agentes ? resumenAgentes(agentes) : undefined} />
      </header>

      <div role="tablist" aria-label="Secciones" className="mb-5 flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map(([k, t, Icono]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-[10px] tracking-[2px] ${tab === k ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <Icono size={12} /> {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'trabajos' && <TabTrabajos guardaHabilitado={guardaHabilitado} />}
        {tab === 'agentes' && <TabAgentes agentes={agentes} onCambio={cargarAgentes} />}
        {tab === 'equivalencias' && <TabEquivalencias />}
        {tab === 'asesores' && <TabAsesores />}
        {tab === 'flexible' && <TabFlexible />}
      </div>
    </div>
  );
};

export default SolidoPage;
