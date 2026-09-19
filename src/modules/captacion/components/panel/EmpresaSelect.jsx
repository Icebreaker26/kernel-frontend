import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import apiService from '../../../../services/apiService.js';
import { useTema } from '../publico/tema.js';

/** Selector con búsqueda de las empresas con convenio. `value` es el código de la empresa. */
const EmpresaSelect = ({ value, onChange, etiqueta = 'Empresa', requerido = true, error, name = 'empresa_codigo' }) => {
  const t = useTema();
  const [empresas, setEmpresas] = useState([]);
  const [query, setQuery]       = useState('');
  const [abierto, setAbierto]   = useState(false);
  const [cargando, setCargando] = useState(false);
  const contenedor              = useRef(null);

  useEffect(() => {
    setCargando(true);
    apiService.get('/empresas')
      .then(({ data }) => setEmpresas(data.filter(e => e.is_active !== false)))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const fuera = (e) => { if (!contenedor.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const elegida = empresas.find(e => e.codigo === value);
  const q = query.trim().toLowerCase();
  const filtradas = q ? empresas.filter(e => e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q)) : empresas;

  return (
    <div ref={contenedor} className="relative">
      <span className={t.etiqueta}>{etiqueta}{requerido && <span className={t.asterisco} aria-hidden> *</span>}</span>
      <button type="button" name={name} onClick={() => setAbierto(o => !o)} aria-haspopup="listbox" aria-expanded={abierto} aria-invalid={!!error}
              className={`${t.controlBase} ${error ? t.controlErr : t.controlOk} flex items-center justify-between text-left ${!elegida ? '!text-slate-400' : ''}`}>
        <span className="truncate">{elegida ? elegida.nombre : 'Busca y elige la empresa…'}</span>
        <ChevronDown size={16} className="ml-2 shrink-0 text-slate-400" />
      </button>
      {error && <span role="alert" className={t.errorTexto}>{error}</span>}

      {abierto && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-emerald-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o código…"
                   className="w-full bg-transparent text-[15px] text-slate-800 placeholder-slate-400 outline-none" />
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto">
            {cargando && <li className="px-3 py-2.5 text-sm text-slate-500">Cargando…</li>}
            {!cargando && filtradas.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-500">Sin resultados</li>}
            {filtradas.map(e => (
              <li key={e.codigo} role="option" aria-selected={e.codigo === value}>
                <button type="button" onClick={() => { onChange(e.codigo); setQuery(''); setAbierto(false); }}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[15px] transition-colors hover:bg-emerald-50 ${e.codigo === value ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700'}`}>
                  <span className="truncate">{e.nombre}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{e.codigo}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmpresaSelect;
