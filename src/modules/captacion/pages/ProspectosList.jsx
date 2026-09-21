import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, ChevronRight, Copy, EyeOff, Globe, Loader2, MessageCircle, Monitor,
  FileText, MoreHorizontal, Plus, RefreshCcw, Search, Share2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { GRUPOS_ETAPA, TOQUES, etapaDe, tiempoRelativo } from '../utils/formato.js';
import { Chip, EtapaBadge, Kpi, Paginacion, ProgresoSecciones } from '../components/panel/indicadores.jsx';
import PanelNuevoProspecto from '../components/panel/PanelNuevoProspecto.jsx';
import PanelSolicitudFisica from '../components/panel/PanelSolicitudFisica.jsx';
import PanelStand from '../components/panel/PanelStand.jsx';
import PanelWeb from '../components/panel/PanelWeb.jsx';
import PanelEnlaceGrupos from '../components/panel/PanelEnlaceGrupos.jsx';

const POR_PAGINA = 25;
const HORAS_LIMPIEZA = 24;

const FILTROS = [
  ['todos', 'Todos'], ['por_contactar', 'Por contactar'], ['en_proceso', 'En proceso'],
  ['listas', 'Listos para entregar'], ['entregadas', 'Entregados'],
];

// ── Acciones de una fila ─────────────────────────────────────────────────────

const Acciones = ({ p, onEnviado, onFisico }) => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const contenedor = useRef(null);
  const listaMenu = useRef(null);
  const [pos, setPos] = useState(null);   // el menú va en un portal con posición fija: la tabla recorta (overflow) lo que se sale de ella

  const alternarMenu = () => {
    if (menu) { setMenu(false); return; }
    const r = contenedor.current?.getBoundingClientRect();
    if (!r) return;
    const alto = 130;   // alto aproximado del menú (3 opciones)
    const arriba = window.innerHeight - r.bottom < alto + 8;
    setPos({ right: Math.max(8, window.innerWidth - r.right), ...(arriba ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
    setMenu(true);
  };

  useEffect(() => {
    if (!menu) return undefined;
    const cerrar = () => setMenu(false);
    const fuera = (e) => { if (!contenedor.current?.contains(e.target) && !listaMenu.current?.contains(e.target)) cerrar(); };
    const esc = (e) => e.key === 'Escape' && cerrar();
    document.addEventListener('mousedown', fuera);
    window.addEventListener('keydown', esc);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', cerrar, true); window.removeEventListener('resize', cerrar);
    };
  }, [menu]);

  // El backend arma el mensaje de WhatsApp (`url`) y el enlace personal (`link`) y marca el prospecto como "enlace enviado"
  const enlaces = async () => (await apiService.get(`/captacion/prospectos/${p.id}/whatsapp`)).data;

  const whatsapp = async () => {
    setOcupado(true);
    try {
      const { url } = await enlaces();
      window.open(url, '_blank', 'noopener');
      onEnviado(p.id, { registrarToque: true });
    } catch { toast.error('No se pudo abrir WhatsApp'); }
    finally { setOcupado(false); }
  };

  const copiar = async (sufijo, mensaje) => {
    setMenu(false);
    try {
      const { link } = await enlaces();
      await navigator.clipboard.writeText(link + sufijo);
      toast.success(mensaje);
      onEnviado(p.id, { registrarToque: false });
    } catch { toast.error('No se pudo copiar el enlace'); }
  };

  const tieneSolicitud = !!p.vinculacion_id;
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-slate-300 transition-colors hover:bg-emerald-900/20 hover:text-emerald-300';

  return (
    <div className="flex items-center justify-end gap-1.5" ref={contenedor} onClick={(e) => e.stopPropagation()}>
      {tieneSolicitud ? (
        <button onClick={() => navigate(`/captacion/vinculaciones/${p.vinculacion_id}`)}
                className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-300 transition-colors hover:bg-emerald-900/40">
          VER SOLICITUD <ChevronRight size={12} />
        </button>
      ) : (
        <button onClick={whatsapp} disabled={ocupado}
                className="flex items-center gap-1.5 rounded border border-green-700/50 bg-green-900/20 px-3 py-1.5 text-[10px] font-bold tracking-wider text-green-300 transition-colors hover:bg-green-900/40 disabled:opacity-50">
          {ocupado ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />} WHATSAPP
        </button>
      )}
      <div className="relative">
        <button onClick={alternarMenu} aria-label="Más acciones" aria-haspopup="menu" aria-expanded={menu}
                className="rounded border border-slate-700/50 p-1.5 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-200">
          <MoreHorizontal size={14} />
        </button>
        {menu && pos && createPortal(
          <div ref={listaMenu} role="menu" style={{ position: 'fixed', ...pos }} className="z-[60] w-56 overflow-hidden rounded border border-emerald-900/50 bg-[#041a12] shadow-xl">
            <button role="menuitem" className={item} onClick={() => copiar('', 'Enlace copiado')}><Copy size={12} /> Copiar enlace</button>
            <button role="menuitem" className={item} onClick={() => copiar('?m=stand', 'Enlace para stand copiado')}><Monitor size={12} /> Copiar enlace para stand</button>
            <button role="menuitem" className={item} onClick={() => { setMenu(false); onFisico(p); }}><FileText size={12} /> Cargar formulario físico</button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

// ── Datos de una fila (compartidos por la tabla y las tarjetas móviles) ───────

const Identidad = ({ p }) => (
  <div className="min-w-0">
    <p className="truncate text-xs font-medium text-slate-200">{p.nombres} {p.apellidos}</p>
    <p className="truncate text-[10px] text-slate-500">
      CC {p.cedula} · {p.empresa_nombre || p.empresa_codigo}
      {p.asesor_nombre && <span className="ml-1.5 text-slate-400">· Asesor: {p.asesor_nombre}</span>}
      {p.origen === 'stand' && <span className="ml-1.5 rounded border border-amber-800/50 px-1 text-[8px] tracking-wider text-amber-400/80">STAND</span>}
      {p.origen === 'grupo' && <span className="ml-1.5 rounded border border-sky-800/50 px-1 text-[8px] tracking-wider text-sky-400/80">GRUPO</span>}
      {p.origen === 'web' && <span className="ml-1.5 rounded border border-violet-800/50 px-1 text-[8px] tracking-wider text-violet-400/80">WEB</span>}
    </p>
  </div>
);

const Actividad = ({ p }) => {
  const partes = [];
  if (p.ultimo_toque && p.ultimo_toque_at) partes.push(`${TOQUES[p.ultimo_toque] || p.ultimo_toque} ${tiempoRelativo(p.ultimo_toque_at)}`);
  if (p.ping_at) partes.push(`Abrió el enlace ${tiempoRelativo(p.ping_at)}${p.ping_count > 1 ? ` (${p.ping_count} veces)` : ''}`);
  if (!partes.length) partes.push(`Creado ${tiempoRelativo(p.created_at)}`);
  return (
    <div className="text-[10px] leading-relaxed text-slate-500">
      {partes.map(t => <p key={t}>{t}</p>)}
    </div>
  );
};

const FilaTabla = ({ p, onEnviado, onAbrir, onFisico }) => (
  <tr onClick={() => onAbrir(p)} className={`group border-b border-slate-800/40 transition-colors hover:bg-emerald-900/5 ${p.vinculacion_id ? 'cursor-pointer' : ''}`}>
    <td className="px-4 py-3"><Identidad p={p} /></td>
    <td className="px-3 py-3"><EtapaBadge etapa={p.etapa} /></td>
    <td className="px-3 py-3">{p.vinculacion_id ? <ProgresoSecciones fila={p} /> : <span className="text-[10px] text-slate-700">Sin iniciar</span>}</td>
    <td className="px-3 py-3"><Actividad p={p} /></td>
    <td className="px-3 py-3"><Acciones p={p} onEnviado={onEnviado} onFisico={onFisico} /></td>
  </tr>
);

const TarjetaMovil = ({ p, onEnviado, onAbrir, onFisico }) => (
  <li className="min-w-0 rounded border border-slate-800/60 bg-slate-900/30 p-3" onClick={() => onAbrir(p)}>
    <div className="flex items-start justify-between gap-2">
      <Identidad p={p} />
      <EtapaBadge etapa={p.etapa} />
    </div>
    {p.vinculacion_id && <div className="mt-2.5"><ProgresoSecciones fila={p} ancho="w-full" /></div>}
    <div className="mt-2.5"><Actividad p={p} /></div>
    <div className="mt-3"><Acciones p={p} onEnviado={onEnviado} onFisico={onFisico} /></div>
  </li>
);

// ── Vista de "sin identificar" ───────────────────────────────────────────────

const FilaSinIdentificar = ({ p }) => {
  const horas = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
  const restan = Math.max(0, Math.ceil(HORAS_LIMPIEZA - horas));
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-800/40 px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">Sin identificar</p>
        <p className="truncate text-[10px] text-slate-600">Stand · {p.empresa_nombre || p.empresa_codigo} · {tiempoRelativo(p.created_at)}</p>
      </div>
      <p className="shrink-0 text-[10px] text-slate-600">{restan > 0 ? `Se elimina en ~${restan} h` : 'Se elimina en la próxima limpieza'}</p>
    </li>
  );
};

// ── Página ───────────────────────────────────────────────────────────────────

const ProspectosList = () => {
  const navigate = useNavigate();

  const [items, setItems]         = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(false);
  const [vista, setVista]         = useState('normal');           // 'normal' | 'sin_identificar'
  const [sinIdentificar, setSinIdentificar] = useState(0);
  const [busqueda, setBusqueda]   = useState('');
  const [grupo, setGrupo]         = useState('todos');
  const [empresa, setEmpresa]     = useState('');
  const [pagina, setPagina]       = useState(1);
  const [modal, setModal]         = useState(null);               // 'nuevo' | 'stand' | 'fisico'
  const [prospectoFisico, setProspectoFisico] = useState(null);   // null = solicitud física de una persona nueva

  const cargar = useCallback(() => {
    setCargando(true);
    setError(false);
    const query = vista === 'sin_identificar' ? '?sin_identificar=solo' : '';
    Promise.all([apiService.get(`/captacion/prospectos${query}`), apiService.get('/captacion/prospectos/resumen')])
      .then(([lista, resumen]) => {
        setItems(lista.data.map(p => ({ ...p, etapa: etapaDe(p) })));
        setSinIdentificar(resumen.data.sin_identificar);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [vista]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, grupo, empresa, vista]);

  // Tras enviar/copiar el enlace: reflejarlo sin recargar la lista
  const alEnviar = (id, { registrarToque }) => {
    if (registrarToque) apiService.post(`/captacion/prospectos/${id}/toque`, { resultado: 'enviado_link' }).catch(() => {});
    setItems(prev => prev.map(p => {
      if (p.id !== id) return p;
      const estado = ['nuevo', 'contactado'].includes(p.estado) ? 'link_enviado' : p.estado;
      const siguiente = { ...p, estado };
      if (registrarToque) Object.assign(siguiente, { ultimo_toque: 'enviado_link', ultimo_toque_at: new Date().toISOString() });
      return { ...siguiente, etapa: etapaDe(siguiente) };
    }));
  };

  const conteo = useMemo(() => {
    const c = { total: items.length };
    for (const [g, etapas] of Object.entries(GRUPOS_ETAPA)) c[g] = items.filter(p => etapas.includes(p.etapa)).length;
    return c;
  }, [items]);

  const empresas = useMemo(() => [...new Set(items.map(p => p.empresa_nombre || p.empresa_codigo))].sort(), [items]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return items.filter(p => {
      if (grupo !== 'todos' && !GRUPOS_ETAPA[grupo].includes(p.etapa)) return false;
      if (empresa && (p.empresa_nombre || p.empresa_codigo) !== empresa) return false;
      if (!q) return true;
      return `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q)
        || (digitos && (`${p.cedula}`.includes(digitos) || `${p.celular || ''}`.includes(digitos)));
    });
  }, [items, busqueda, grupo, empresa]);

  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hayFiltros = busqueda || grupo !== 'todos' || empresa;
  const limpiarFiltros = () => { setBusqueda(''); setGrupo('todos'); setEmpresa(''); };
  const abrir = (p) => { if (p.vinculacion_id) navigate(`/captacion/vinculaciones/${p.vinculacion_id}`); };
  const enSinIdentificar = vista === 'sin_identificar';

  const encabezados = ['PROSPECTO', 'ETAPA', 'PROGRESO', 'ACTIVIDAD', ''];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-[3px] text-emerald-400/60">// CAPTACIÓN</p>
          <h1 className="text-lg font-bold tracking-wider text-slate-200">{enSinIdentificar ? 'SIN IDENTIFICAR' : 'PROSPECTOS'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar} aria-label="Actualizar" title="Actualizar"
                  className="rounded border border-slate-700/50 p-2 text-slate-500 transition-colors hover:border-emerald-700/50 hover:text-emerald-400">
            <RefreshCcw size={14} className={cargando ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal('web')} aria-label="Página web" title="Enlace para el botón “Asóciate aquí” del sitio y asesor que recibe esas solicitudes"
                  className="flex items-center gap-2 rounded border border-violet-700/50 bg-violet-500/10 px-3 py-2 text-xs font-bold tracking-wider text-violet-300 transition-colors hover:bg-violet-500/20">
            <Globe size={14} /> <span className="hidden lg:inline">WEB</span>
          </button>
          <button onClick={() => setModal('grupos')} aria-label="Enlace para grupos" title="Enlace para compartir en grupos de WhatsApp"
                  className="flex items-center gap-2 rounded border border-sky-700/50 bg-sky-500/10 px-3 py-2 text-xs font-bold tracking-wider text-sky-300 transition-colors hover:bg-sky-500/20">
            <Share2 size={14} /> <span className="hidden lg:inline">GRUPOS</span>
          </button>
          <button onClick={() => setModal('stand')}
                  className="flex items-center gap-2 rounded border border-amber-700/50 bg-amber-500/10 px-3 py-2 text-xs font-bold tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20">
            <Monitor size={14} /> <span className="hidden sm:inline">ABRIR</span> STAND
          </button>
          <button onClick={() => { setProspectoFisico(null); setModal('fisico'); }} aria-label="Formulario físico" title="Cargar un formulario de afiliación diligenciado en papel"
                  className="flex items-center gap-2 rounded border border-slate-600/60 bg-slate-500/10 px-3 py-2 text-xs font-bold tracking-wider text-slate-300 transition-colors hover:bg-slate-500/20">
            <FileText size={14} /> <span className="hidden lg:inline">FORMULARIO FÍSICO</span>
          </button>
          <button onClick={() => setModal('nuevo')}
                  className="flex items-center gap-2 rounded bg-emerald-500 px-3 py-2 text-xs font-bold tracking-wider text-white transition-all hover:bg-emerald-400">
            <Plus size={14} /> NUEVO<span className="hidden sm:inline"> PROSPECTO</span>
          </button>
        </div>
      </div>

      {enSinIdentificar ? (
        <>
          <button onClick={() => setVista('normal')} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
            <ArrowLeft size={13} /> Volver a prospectos
          </button>
          <div className="mb-4 flex items-start gap-3 rounded border border-slate-800/60 bg-slate-900/30 p-3">
            <EyeOff size={16} className="mt-0.5 shrink-0 text-slate-500" />
            <p className="text-[11px] leading-relaxed text-slate-400">
              Personas que tocaron “Quiero asociarme” en un kiosco pero no llegaron a escribir su nombre. Se ocultan de tu lista y
              <strong className="text-slate-300"> se eliminan solas a las {HORAS_LIMPIEZA} horas</strong>. En cuanto alguien escribe su nombre y documento pasa a ser un prospecto normal.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Contadores (sirven de filtro) */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Kpi etiqueta="Total" valor={conteo.total} activo={grupo === 'todos'} onClick={() => setGrupo('todos')} />
            <Kpi etiqueta="Por contactar" valor={conteo.por_contactar} tono="sky" activo={grupo === 'por_contactar'} onClick={() => setGrupo('por_contactar')} />
            <Kpi etiqueta="En proceso" valor={conteo.en_proceso} tono="amber" activo={grupo === 'en_proceso'} onClick={() => setGrupo('en_proceso')} />
            <Kpi etiqueta="Listos para entregar" valor={conteo.listas} tono="emerald" activo={grupo === 'listas'} onClick={() => setGrupo('listas')} />
            <Kpi etiqueta="Entregados" valor={conteo.entregadas} tono="blue" activo={grupo === 'entregadas'} onClick={() => setGrupo('entregadas')} />
          </div>

          {/* Búsqueda y filtros */}
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, cédula o celular…" aria-label="Buscar prospectos"
                       className="w-full rounded border border-slate-700/50 bg-slate-900/40 py-2.5 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-600 transition-colors focus:border-emerald-600 focus:outline-none" />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"><X size={12} /></button>
                )}
              </div>
              {empresas.length > 1 && (
                <div className="relative sm:w-64">
                  <Building2 size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Filtrar por empresa"
                          className="w-full appearance-none rounded border border-slate-700/50 bg-slate-900/40 py-2.5 pl-8 pr-3 text-xs text-slate-300 focus:border-emerald-600 focus:outline-none">
                    <option value="">Todas las empresas</option>
                    {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTROS.map(([k, l]) => <Chip key={k} activo={grupo === k} onClick={() => setGrupo(k)}>{l.toUpperCase()}</Chip>)}
              </div>
              {sinIdentificar > 0 && (
                <button onClick={() => setVista('sin_identificar')} className="flex items-center gap-1.5 text-[10px] text-slate-500 transition-colors hover:text-slate-300">
                  <EyeOff size={12} /> Ver sin identificar ({sinIdentificar})
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Contenido */}
      {cargando && items.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-400" size={22} /></div>
      ) : error ? (
        <div className="rounded border border-red-900/40 bg-red-900/10 py-12 text-center">
          <p className="mb-3 text-xs text-red-300">No se pudieron cargar los prospectos.</p>
          <button onClick={cargar} className="text-xs text-emerald-400 hover:text-emerald-300">Reintentar</button>
        </div>
      ) : enSinIdentificar ? (
        items.length === 0
          ? <p className="rounded border border-slate-800/40 py-12 text-center text-xs text-slate-600">No hay nadie sin identificar.</p>
          : <ul className="overflow-hidden rounded border border-slate-800/50">{items.map(p => <FilaSinIdentificar key={p.id} p={p} />)}</ul>
      ) : filtrados.length === 0 ? (
        <div className="rounded border border-slate-800/40 py-14 text-center">
          {items.length === 0 ? (
            <>
              <p className="mb-1 text-xs tracking-widest text-slate-500">TODAVÍA NO TIENES PROSPECTOS</p>
              <p className="mb-4 text-[11px] text-slate-600">Crea uno o abre un stand para empezar a captar asociados.</p>
              <button onClick={() => setModal('nuevo')} className="text-xs text-emerald-400 hover:text-emerald-300">+ Crear primer prospecto →</button>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs tracking-widest text-slate-500">SIN RESULTADOS</p>
              {hayFiltros && <button onClick={limpiarFiltros} className="text-xs text-emerald-400 hover:text-emerald-300">Limpiar filtros</button>}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-hidden rounded border border-slate-800/50 md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  {encabezados.map((h, i) => <th key={i} className="px-4 py-2 text-left text-[9px] font-normal tracking-[2px] text-slate-500">{h}</th>)}
                </tr>
              </thead>
              <tbody>{visibles.map(p => <FilaTabla key={p.id} p={p} onEnviado={alEnviar} onAbrir={abrir} onFisico={(x) => { setProspectoFisico(x); setModal('fisico'); }} />)}</tbody>
            </table>
          </div>
          {/* Móvil */}
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 md:hidden">{visibles.map(p => <TarjetaMovil key={p.id} p={p} onEnviado={alEnviar} onAbrir={abrir} onFisico={(x) => { setProspectoFisico(x); setModal('fisico'); }} />)}</ul>
          <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </>
      )}

      {modal === 'nuevo' && (
        <PanelNuevoProspecto
          onClose={() => setModal(null)}
          onCreado={(nuevo) => {
            if (enSinIdentificar) return;
            const fila = { ...nuevo, vinculacion_id: null, vinculacion_estado: null, origen: 'enlace', sin_identificar: false, ultimo_toque: null, ultimo_toque_at: null, ping_at: null, ping_count: 0 };
            setItems(prev => [{ ...fila, etapa: etapaDe(fila) }, ...prev]);
          }}
        />
      )}
      {modal === 'fisico' && (
        <PanelSolicitudFisica
          prospecto={prospectoFisico}
          onClose={() => { setModal(null); setProspectoFisico(null); cargar(); }}
        />
      )}
      {modal === 'stand' && <PanelStand onClose={() => setModal(null)} />}
      {modal === 'grupos' && <PanelEnlaceGrupos onClose={() => setModal(null)} />}
      {modal === 'web' && <PanelWeb onClose={() => setModal(null)} />}
    </div>
  );
};

export default ProspectosList;
