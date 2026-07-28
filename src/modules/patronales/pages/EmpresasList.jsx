import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Loader2, Users, Globe, Search, X, SlidersHorizontal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

const FILTROS_DEFAULT = {
  estado:       'todas',    // todas | activas | inactivas
  portal:       'todos',    // todos | con_portal | sin_portal
  facturacion:  'todas',    // todas | unica | separada
  asociados:    'todos',    // todos | con | sin
  orden:        'nombre',   // nombre | asociados_desc | asociados_asc
};

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`text-[9px] px-2.5 py-1 tracking-widest border rounded-sm transition-all whitespace-nowrap ${
      active
        ? 'border-[#f59e0b55] bg-[#f59e0b11] text-[#f59e0b]'
        : 'border-[#f59e0b0d] text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#f59e0b22]'
    }`}
  >
    {label}
  </button>
);

const FiltroGrupo = ({ label, opciones, valor, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[#6aacbc] text-[8px] tracking-[2px] uppercase shrink-0 w-24">{label}</span>
    <div className="flex gap-1 flex-wrap">
      {opciones.map(([val, lbl]) => (
        <Chip key={val} label={lbl} active={valor === val} onClick={() => onChange(val)} />
      ))}
    </div>
  </div>
);

export default function EmpresasList() {
  const navigate               = useNavigate();
  const [empresas, setEmpresas]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [buscar,   setBuscar]     = useState('');
  const [filtros,  setFiltros]    = useState(FILTROS_DEFAULT);
  const [panelOpen, setPanelOpen] = useState(false);
  const sectionRefs               = useRef({});
  const searchRef                 = useRef(null);

  useEffect(() => {
    apiService.get('/patronales/empresas')
      .then(({ data }) => setEmpresas(data))
      .catch(() => toast.error('Error al cargar empresas'))
      .finally(() => setLoading(false));
  }, []);

  const setF = (key) => (val) => setFiltros((f) => ({ ...f, [key]: val }));

  const hayFiltrosActivos = Object.entries(filtros).some(([k, v]) => v !== FILTROS_DEFAULT[k]);

  const limpiar = () => { setFiltros(FILTROS_DEFAULT); setBuscar(''); };

  const filtradas = useMemo(() => {
    let lista = [...empresas];

    // Estado
    if (filtros.estado === 'activas')   lista = lista.filter((e) => e.is_active);
    if (filtros.estado === 'inactivas') lista = lista.filter((e) => !e.is_active);

    // Portal
    if (filtros.portal === 'con_portal')  lista = lista.filter((e) => e.portal_activo);
    if (filtros.portal === 'sin_portal')  lista = lista.filter((e) => !e.portal_activo);

    // Facturación
    if (filtros.facturacion === 'unica')    lista = lista.filter((e) => e.facturacion === 'unica');
    if (filtros.facturacion === 'separada') lista = lista.filter((e) => e.facturacion === 'separada');

    // Asociados
    if (filtros.asociados === 'con') lista = lista.filter((e) => parseInt(e.total_asociados) > 0);
    if (filtros.asociados === 'sin') lista = lista.filter((e) => parseInt(e.total_asociados) === 0);

    // Búsqueda
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      lista = lista.filter(
        (e) => e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q)
      );
    }

    // Orden
    if (filtros.orden === 'asociados_desc') lista.sort((a, b) => parseInt(b.total_asociados) - parseInt(a.total_asociados));
    if (filtros.orden === 'asociados_asc')  lista.sort((a, b) => parseInt(a.total_asociados) - parseInt(b.total_asociados));
    // nombre: ya viene ordenado del servidor

    return lista;
  }, [empresas, buscar, filtros]);

  // Agrupar por primera letra (solo cuando ordena por nombre)
  const agrupar = filtros.orden === 'nombre';

  const grupos = useMemo(() => {
    if (!agrupar) return [['', filtradas]];
    const map = {};
    for (const e of filtradas) {
      const letra = /^[A-Z]/i.test(e.nombre) ? e.nombre[0].toUpperCase() : '#';
      (map[letra] ??= []).push(e);
    }
    return Object.entries(map).sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [filtradas, agrupar]);

  const letrasConDatos = useMemo(() => new Set(grupos.map(([l]) => l)), [grupos]);

  const saltarA = (letra) => {
    const el = sectionRefs.current[letra];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const total   = filtradas.length;
  const activas = empresas.filter((e) => e.is_active).length;

  return (
    <div className="flex h-full">

      {/* ── Lista principal ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 min-w-0">

        {/* Header */}
        <p className="text-[#6aacbc] text-[9px] tracking-[4px] mb-1">// PATRONALES</p>
        <div className="flex items-end justify-between mb-5">
          <h1 className="text-2xl font-bold text-[#f59e0b] tracking-[3px]" style={{ textShadow: '0 0 20px #f59e0b44' }}>
            EMPRESAS
          </h1>
          {!loading && (
            <span className="text-[#6aacbc] text-[9px] tracking-widest">
              {total} / {empresas.length} · {activas} ACTIVAS
            </span>
          )}
        </div>

        {/* Barra de búsqueda + botón filtros */}
        <div className="flex gap-2 mb-3 items-center">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6aacbc]" />
            <input
              ref={searchRef}
              placeholder="Nombre o código..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="pl-8 pr-3 py-2 bg-[#08101e] border border-[#f59e0b22] rounded-sm text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#f59e0b55] transition-colors font-mono w-56"
            />
            {buscar && (
              <button
                onClick={() => setBuscar('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6aacbc] hover:text-[#a0d4e0]"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <button
            onClick={() => setPanelOpen((o) => !o)}
            className={`flex items-center gap-1.5 text-[9px] px-3 py-2 border rounded-sm tracking-widest transition-all ${
              panelOpen || hayFiltrosActivos
                ? 'border-[#f59e0b55] bg-[#f59e0b11] text-[#f59e0b]'
                : 'border-[#f59e0b11] text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#f59e0b22]'
            }`}
          >
            <SlidersHorizontal size={11} />
            FILTROS
            {hayFiltrosActivos && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            )}
          </button>

          {(hayFiltrosActivos || buscar) && (
            <button
              onClick={limpiar}
              className="flex items-center gap-1 text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] tracking-widest transition-colors"
            >
              <X size={10} /> LIMPIAR
            </button>
          )}
        </div>

        {/* Panel de filtros */}
        {panelOpen && (
          <div className="bg-[#08101e] border border-[#f59e0b22] rounded-sm p-4 mb-5 flex flex-col gap-3">
            <FiltroGrupo
              label="Estado"
              opciones={[['todas','TODAS'],['activas','ACTIVAS'],['inactivas','RETIRADAS']]}
              valor={filtros.estado}
              onChange={setF('estado')}
            />
            <FiltroGrupo
              label="Portal"
              opciones={[['todos','TODOS'],['con_portal','CON PORTAL'],['sin_portal','SIN PORTAL']]}
              valor={filtros.portal}
              onChange={setF('portal')}
            />
            <FiltroGrupo
              label="Facturación"
              opciones={[['todas','TODAS'],['unica','ÚNICA'],['separada','SEPARADA']]}
              valor={filtros.facturacion}
              onChange={setF('facturacion')}
            />
            <FiltroGrupo
              label="Asociados"
              opciones={[['todos','TODOS'],['con','CON ASOCIADOS'],['sin','SIN ASOCIADOS']]}
              valor={filtros.asociados}
              onChange={setF('asociados')}
            />
            <div className="border-t border-[#f59e0b11] pt-3">
              <FiltroGrupo
                label="Ordenar por"
                opciones={[['nombre','NOMBRE A-Z'],['asociados_desc','MÁS ASOCIADOS'],['asociados_asc','MENOS ASOCIADOS']]}
                valor={filtros.orden}
                onChange={setF('orden')}
              />
            </div>
          </div>
        )}

        {/* Chips activos */}
        {hayFiltrosActivos && !panelOpen && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {filtros.estado !== 'todas' && (
              <span className="text-[8px] px-2 py-1 bg-[#f59e0b11] border border-[#f59e0b33] text-[#f59e0b] tracking-widest">
                {filtros.estado === 'activas' ? 'ACTIVAS' : 'RETIRADAS'}
              </span>
            )}
            {filtros.portal !== 'todos' && (
              <span className="text-[8px] px-2 py-1 bg-[#f59e0b11] border border-[#f59e0b33] text-[#f59e0b] tracking-widest">
                {filtros.portal === 'con_portal' ? 'CON PORTAL' : 'SIN PORTAL'}
              </span>
            )}
            {filtros.facturacion !== 'todas' && (
              <span className="text-[8px] px-2 py-1 bg-[#f59e0b11] border border-[#f59e0b33] text-[#f59e0b] tracking-widest">
                {filtros.facturacion === 'unica' ? 'FACTURA ÚNICA' : 'FACTURA SEPARADA'}
              </span>
            )}
            {filtros.asociados !== 'todos' && (
              <span className="text-[8px] px-2 py-1 bg-[#f59e0b11] border border-[#f59e0b33] text-[#f59e0b] tracking-widest">
                {filtros.asociados === 'con' ? 'CON ASOCIADOS' : 'SIN ASOCIADOS'}
              </span>
            )}
            {filtros.orden !== 'nombre' && (
              <span className="text-[8px] px-2 py-1 bg-[#f59e0b11] border border-[#f59e0b33] text-[#f59e0b] tracking-widest">
                {filtros.orden === 'asociados_desc' ? 'MÁS ASOCIADOS ↓' : 'MENOS ASOCIADOS ↑'}
              </span>
            )}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#f59e0b44]" />
          </div>
        ) : grupos.length === 0 || (grupos.length === 1 && grupos[0][1].length === 0) ? (
          <p className="text-[#6aacbc] text-[10px] tracking-widest text-center py-16">SIN RESULTADOS</p>
        ) : (
          <div className="flex flex-col gap-6">
            {grupos.map(([letra, items]) => (
              <div key={letra || '_'} ref={(el) => { sectionRefs.current[letra] = el; }}>
                {agrupar && (
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#f59e0b] font-bold text-lg w-7 leading-none" style={{ textShadow: '0 0 10px #f59e0b55' }}>
                      {letra}
                    </span>
                    <div className="flex-1 h-[1px] bg-[#f59e0b11]" />
                    <span className="text-[#6aacbc] text-[9px] tracking-widest">{items.length}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  {items.map((emp) => (
                    <button
                      key={emp.codigo}
                      onClick={() => navigate(`/patronales/empresas/${emp.codigo}`)}
                      className="bg-[#08101e] border border-[#f59e0b0a] hover:border-[#f59e0b33] hover:bg-[#f59e0b05] rounded-sm px-4 py-3 text-left transition-all flex items-center gap-3 group"
                    >
                      <Building2
                        size={13}
                        className="shrink-0"
                        style={{ color: emp.is_active ? '#f59e0b' : '#6aacbc' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-sm font-medium tracking-wide truncate ${emp.is_active ? 'text-[#a0d4e0]' : 'text-[#6aacbc]'}`}>
                            {emp.nombre}
                          </span>
                          {!emp.is_active && (
                            <span className="text-[8px] px-1.5 py-0.5 border border-[#ff3d3d33] text-[#ff3d3d88] bg-[#ff3d3d08] tracking-wider shrink-0">
                              RETIRADA
                            </span>
                          )}
                          {emp.portal_activo && (
                            <span className="flex items-center gap-1 text-[8px] text-[#22c55e] tracking-wider shrink-0">
                              <Globe size={8} /> PORTAL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[#6aacbc] text-[9px] tracking-widest">
                          <span>{emp.codigo}</span>
                          <span className="flex items-center gap-1"><Users size={8} /> {emp.total_asociados}</span>
                          <span>{emp.facturacion?.toUpperCase()}</span>
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-[#f59e0b22] group-hover:text-[#f59e0b] transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Índice A-Z (solo cuando ordena por nombre) ────────────────────────── */}
      {!loading && agrupar && (
        <div className="flex flex-col justify-center gap-0.5 px-2 py-8 border-l border-[#f59e0b11] shrink-0 select-none">
          {LETRAS.map((l) => {
            const tiene = letrasConDatos.has(l);
            return (
              <button
                key={l}
                onClick={() => tiene && saltarA(l)}
                disabled={!tiene}
                className={`text-[9px] w-5 h-4 flex items-center justify-center rounded-sm transition-all font-mono ${
                  tiene
                    ? 'text-[#f59e0b] hover:bg-[#f59e0b22] cursor-pointer'
                    : 'text-[#6aacbc22] cursor-default'
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}
