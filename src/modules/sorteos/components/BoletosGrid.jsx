import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Loader2, UserCheck, Check, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { coincideBusqueda } from '../../../utils/asociados.js';

const ESTADO_STYLE = {
  libre:                 'bg-[#003d4499] border-[#00e5ff44] text-[#00e5ff]',
  asignado:              'bg-[#08101e] border-[#0d1a2a] text-[#6aacbc]',
  pendiente_adquisicion: 'bg-[#2a1a0099] border-[#ffb70044] text-[#ffb70088]',
  pendiente_retiro:      'bg-[#2a080099] border-[#ff3d3d44] text-[#ff3d3d88]',
};

const LEYENDA = [
  { estado: 'libre',                 label: 'Disponible',   color: '#00e5ff' },
  { estado: 'asignado',              label: 'Ocupado',      color: '#6aacbc' },
  { estado: 'pendiente_adquisicion', label: 'Pend. adq.',   color: '#ffb700' },
  { estado: 'pendiente_retiro',      label: 'Pend. retiro', color: '#ff3d3d' },
];

// ── Buscador de asociado ─────────────────────────────────────────────────────

const BuscadorAsociado = ({ onSelect }) => {
  const [q, setQ]               = useState('');
  const [todos, setTodos]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto]   = useState(false);
  const ref                     = useRef(null);

  useEffect(() => {
    apiService.get('/asociados')
      .then(({ data }) => setTodos(data))
      .finally(() => setCargando(false));

    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    return todos.filter((a) => coincideBusqueda(q, a.codigo, a.nombre, a.apellido, a.nombre_empresa ?? '')).slice(0, 8);
  }, [q, todos]);

  const seleccionar = (a) => { onSelect(a); setQ(''); setAbierto(false); };

  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <div className="flex items-center gap-2 bg-[#08101e] border border-[#00e5ff22] rounded-sm px-3 py-2 focus-within:border-[#00e5ff55] transition-colors">
        {cargando
          ? <Loader2 size={13} className="text-[#6aacbc] shrink-0 animate-spin" />
          : <Search size={13} className="text-[#6aacbc] shrink-0" />}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          placeholder="BUSCAR ASOCIADO..."
          className="bg-transparent text-[10px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none w-full font-mono tracking-wider"
        />
        {q && (
          <button onClick={() => { setQ(''); setAbierto(false); }} className="text-[#6aacbc] hover:text-[#a0d4e0]">
            <X size={11} />
          </button>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-[#08101e] border border-[#00e5ff33] rounded-sm overflow-hidden z-30"
          style={{ boxShadow: '0 0 20px #00e5ff11' }}
        >
          {resultados.map((a) => (
            <button
              key={a.codigo}
              onMouseDown={() => seleccionar(a)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#00e5ff0a] transition-colors border-b border-[#00e5ff11] last:border-0"
            >
              <p className="text-[10px] text-[#a0d4e0]">{a.nombre} {a.apellido}</p>
              <p className="text-[9px] text-[#6aacbc] mt-0.5 font-mono">{a.codigo} · {a.nombre_empresa ?? '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Modal para boleto asignado / pendiente ───────────────────────────────────

const ModalBoleto = ({ modal, onCerrar, onRetirar, guardando }) => {
  const b = modal.boleto;
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 40px #00e5ff11' }}
      >
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00e5ff]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00e5ff]" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#a0d4e0] font-bold text-sm tracking-wider">
            NÚMERO{' '}
            <span className="text-[#00e5ff] font-mono" style={{ textShadow: '0 0 10px #00e5ff66' }}>
              {String(modal.numero).padStart(3, '0')}
            </span>
          </h3>
          <button onClick={onCerrar}>
            <X size={16} className="text-[#6aacbc] hover:text-[#a0d4e0]" />
          </button>
        </div>

        {(b.estado === 'asignado' || b.estado === 'pendiente_retiro') && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#0d1829] border border-[#00e5ff11] rounded-sm p-3 text-[10px]">
              <p className="text-[#6aacbc] mb-1 tracking-wider">TITULAR</p>
              <p className="text-[#a0d4e0] font-medium">{b.nombre} {b.apellido}</p>
              <p className="text-[#6aacbc] font-mono text-[9px] mt-0.5">CC {b.asociado_codigo}</p>
              <p className="text-[#6aacbc] font-mono mt-1">{b.empresa_codigo} · {b.nombre_empresa}</p>
              {b.estado === 'pendiente_retiro' && (
                <p className="text-orange-400 mt-1.5 text-[9px] tracking-wider">⏳ SOLICITUD DE RETIRO PENDIENTE</p>
              )}
            </div>
            <button
              onClick={() => { onCerrar(); navigate(`/asociados/${b.asociado_codigo}`); }}
              className="border border-[#00e5ff33] bg-[#00e5ff0d] hover:bg-[#00e5ff1a] text-[#00e5ff] text-[10px] py-2 rounded-sm transition-all flex items-center justify-center gap-2 tracking-widest"
            >
              <ExternalLink size={12} />
              VER PERFIL COMPLETO
            </button>
            <button
              onClick={onRetirar}
              disabled={guardando}
              className="border border-[#ff3d3d44] bg-[#ff3d3d11] hover:bg-[#ff3d3d22] disabled:opacity-40 text-[#ff3d3d] text-[10px] py-2 rounded-sm transition-all flex items-center justify-center gap-2 tracking-widest"
            >
              {guardando && <Loader2 size={12} className="animate-spin" />}
              RETIRAR DIRECTAMENTE
            </button>
          </div>
        )}

        {b.estado === 'pendiente_adquisicion' && (
          <div className="bg-[#0d1829] border border-[#ffb70022] rounded-sm p-3 text-[10px]">
            <p className="text-[#ffb700] mb-1 tracking-wider">⏳ SOLICITUD DE ADQUISICIÓN PENDIENTE</p>
            <p className="text-[#6aacbc]">Gestiona desde la pestaña <strong className="text-[#a0d4e0]">SOLICITUDES</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Grid principal ───────────────────────────────────────────────────────────

const BoletosGrid = ({ sorteoId, boletos, onRefresh }) => {
  const [asociado, setAsociado]         = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [modal, setModal]               = useState(null);
  const [guardando, setGuardando]       = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [segmento, setSegmento]         = useState(0);

  const toggleFiltro = (estado) => {
    setFiltroEstado((prev) => (prev === estado ? null : estado));
    setSegmento(0);
  };

  const cerrarModal     = () => setModal(null);
  const limpiarAsociado = () => { setAsociado(null); setSeleccionado(null); };

  const handleClick = (b) => {
    if (b.estado === 'libre') {
      if (!asociado) return;
      setSeleccionado(b.numero === seleccionado ? null : b.numero);
      return;
    }
    setModal({ numero: b.numero, boleto: b });
  };

  const confirmarAsignacion = async () => {
    if (!asociado || seleccionado === null) return;
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/boletos/asignar`, {
        numero: seleccionado,
        asociado_codigo: asociado.codigo,
      });
      toast.success(`#${String(seleccionado).padStart(3, '0')} asignado a ${asociado.nombre} ${asociado.apellido}`);
      setSeleccionado(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al asignar');
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async () => {
    setGuardando(true);
    try {
      await apiService.post(`/sorteos/${sorteoId}/boletos/retirar`, { numero: modal.numero });
      toast.success(`#${String(modal.numero).padStart(3, '0')} liberado`);
      cerrarModal();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al retirar');
    } finally {
      setGuardando(false);
    }
  };

  const modoAsignacion = !!asociado;

  const boletosMobile = useMemo(() => {
    const inicio = segmento * 100 + 1;
    const fin    = inicio + 99;
    return boletos.filter((b) =>
      b.numero >= inicio && b.numero <= fin && (!filtroEstado || b.estado === filtroEstado)
    );
  }, [boletos, segmento, filtroEstado]);

  const boletosActivos = useMemo(() => {
    if (!asociado) return [];
    return boletos
      .filter((b) => b.asociado_codigo === asociado.codigo && b.estado !== 'libre')
      .sort((a, b) => a.numero - b.numero);
  }, [asociado, boletos]);

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {!asociado ? (
          <BuscadorAsociado onSelect={setAsociado} />
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-start gap-2 border border-[#00e5ff33] bg-[#00e5ff08] rounded-sm px-3 py-2">
              <UserCheck size={13} className="text-[#00e5ff] shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 4px #00e5ff)' }} />
              <div>
                <p className="text-[10px] text-[#a0d4e0] font-medium leading-none tracking-wider">
                  {asociado.nombre} {asociado.apellido}
                </p>
                <p className="text-[9px] text-[#6aacbc] mt-0.5 font-mono">{asociado.codigo}</p>
                {boletosActivos.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[8px] text-[#6aacbc] tracking-wider self-center">ACTIVOS:</span>
                    {boletosActivos.map((b) => (
                      <span
                        key={b.numero}
                        className="text-[8px] font-mono px-1 py-0.5 rounded-sm border"
                        style={{
                          color:        b.estado === 'pendiente_retiro' ? '#ff3d3d' : '#00e5ff',
                          borderColor:  b.estado === 'pendiente_retiro' ? '#ff3d3d44' : '#00e5ff44',
                          background:   b.estado === 'pendiente_retiro' ? '#ff3d3d0a' : '#00e5ff0a',
                        }}
                      >
                        #{String(b.numero).padStart(3, '0')}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[8px] text-[#6aacbc66] mt-1 tracking-wider">SIN BONOS ACTIVOS</p>
                )}
              </div>
              <button onClick={limpiarAsociado} className="ml-auto text-[#6aacbc] hover:text-[#a0d4e0] transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>

            {seleccionado !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#6aacbc]">
                  ASIGNAR{' '}
                  <span className="text-[#00e5ff] font-mono font-bold" style={{ textShadow: '0 0 8px #00e5ff44' }}>
                    #{String(seleccionado).padStart(3, '0')}
                  </span>
                </span>
                <button
                  onClick={confirmarAsignacion}
                  disabled={guardando}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#00e5ff55] bg-[#00e5ff11] hover:bg-[#00e5ff22] disabled:opacity-40 text-[#00e5ff] text-[10px] rounded-sm transition-all tracking-widest"
                >
                  {guardando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  CONFIRMAR
                </button>
                <button
                  onClick={() => setSeleccionado(null)}
                  className="px-3 py-1.5 text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] border border-[#00e5ff11] rounded-sm transition-colors tracking-widest"
                >
                  CANCELAR
                </button>
              </div>
            ) : (
              <p className="text-[#6aacbc] text-[10px] tracking-wider">SELECCIONA UN NÚMERO LIBRE</p>
            )}
          </div>
        )}

        {/* Leyenda — clickeable para filtrar */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {LEYENDA.map(({ estado, label, color }) => {
            const activo = filtroEstado === estado;
            const count  = boletos.filter((b) => b.estado === estado).length;
            return (
              <button
                key={estado}
                onClick={() => toggleFiltro(estado)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm border transition-all"
                style={{
                  borderColor:     activo ? color : color + '33',
                  background:      activo ? color + '22' : 'transparent',
                  boxShadow:       activo ? `0 0 8px ${color}33` : 'none',
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block border"
                  style={{
                    background:  ESTADO_STYLE[estado].split(' ')[0].replace('bg-[', '').replace(']', ''),
                    borderColor: color + '66',
                  }}
                />
                <span
                  className="text-[9px] tracking-wider font-mono transition-colors"
                  style={{ color: activo ? color : '#6aacbc' }}
                >
                  {label.toUpperCase()}
                </span>
                <span
                  className="text-[8px] font-bold font-mono"
                  style={{ color: activo ? color : '#6aacbc99' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {filtroEstado && (
            <button
              onClick={() => setFiltroEstado(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-sm border border-[#00e5ff22] text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#00e5ff44] transition-all text-[9px] tracking-wider"
            >
              <X size={10} /> TODO
            </button>
          )}
        </div>
      </div>

      {/* Grid móvil — segmentos de 100, 5 columnas */}
      <div className="sm:hidden">
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {Array.from({ length: 10 }, (_, i) => {
            const inicio = i * 100 + 1;
            const fin    = i * 100 + 100;
            const label  = `${String(inicio).padStart(3, '0')}–${String(fin).padStart(3, '0')}`;
            return (
              <button
                key={i}
                onClick={() => setSegmento(i)}
                className={`py-2 rounded-sm border text-[9px] font-mono tracking-wider transition-all text-center ${
                  segmento === i
                    ? 'bg-[#00e5ff11] border-[#00e5ff55] text-[#00e5ff]'
                    : 'bg-[#08101e] border-[#00e5ff11] text-[#6aacbc] hover:border-[#00e5ff33]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-5 gap-[4px]">
          {boletosMobile.length === 0 ? (
            <div className="col-span-5 py-8 text-center text-[#6aacbc] text-[10px] tracking-widest">
              SIN BOLETOS EN ESTE SEGMENTO
            </div>
          ) : boletosMobile.map((b) => {
            const esLibre   = b.estado === 'libre';
            const esSel     = esLibre && modoAsignacion && b.numero === seleccionado;
            const clickable = !esLibre || modoAsignacion;

            let cls = `text-[13px] font-mono rounded-sm py-3 text-center leading-none transition-all border `;
            if (esSel) {
              cls += 'bg-[#00e5ff] text-[#022c22] border-[#00e5ff] font-bold cursor-pointer';
            } else {
              cls += ESTADO_STYLE[b.estado] + (clickable ? ' cursor-pointer' : '');
            }

            return (
              <button
                key={b.numero}
                onClick={() => handleClick(b)}
                title={
                  esLibre && modoAsignacion
                    ? `Asignar a ${asociado.nombre} ${asociado.apellido}`
                    : b.nombre ? `${b.nombre} ${b.apellido}` : 'Libre'
                }
                disabled={guardando && esLibre}
                className={cls}
                style={
                  esSel
                    ? undefined
                    : b.estado === 'libre'
                    ? { boxShadow: '0 0 4px #00e5ff33' }
                    : b.estado === 'pendiente_adquisicion'
                    ? { boxShadow: '0 0 3px #ffb70022' }
                    : b.estado === 'pendiente_retiro'
                    ? { boxShadow: '0 0 3px #ff3d3d22' }
                    : undefined
                }
              >
                {String(b.numero).padStart(3, '0')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid desktop — todos los boletos */}
      <div className="hidden sm:grid gap-[3px] sm:grid-cols-[repeat(20,minmax(0,1fr))] lg:grid-cols-[repeat(25,minmax(0,1fr))]">
        {(filtroEstado ? boletos.filter((b) => b.estado === filtroEstado) : boletos).map((b) => {
          const esLibre   = b.estado === 'libre';
          const esSel     = esLibre && modoAsignacion && b.numero === seleccionado;
          const clickable = !esLibre || modoAsignacion;

          let cls = `text-[15px] font-mono rounded-sm py-3 text-center leading-none transition-all border `;
          if (esSel) {
            cls += 'bg-[#00e5ff] text-[#022c22] border-[#00e5ff] font-bold cursor-pointer';
          } else {
            cls += ESTADO_STYLE[b.estado] + (clickable ? ' cursor-pointer' : '');
          }

          return (
            <button
              key={b.numero}
              onClick={() => handleClick(b)}
              title={
                esLibre && modoAsignacion
                  ? `Asignar a ${asociado.nombre} ${asociado.apellido}`
                  : b.nombre ? `${b.nombre} ${b.apellido}` : 'Libre'
              }
              disabled={guardando && esLibre}
              className={cls}
              style={
                esSel
                  ? undefined
                  : b.estado === 'libre'
                  ? { boxShadow: '0 0 4px #00e5ff33' }
                  : b.estado === 'pendiente_adquisicion'
                  ? { boxShadow: '0 0 3px #ffb70022' }
                  : b.estado === 'pendiente_retiro'
                  ? { boxShadow: '0 0 3px #ff3d3d22' }
                  : undefined
              }
            >
              {String(b.numero).padStart(3, '0')}
            </button>
          );
        })}
      </div>

      {modal && (
        <ModalBoleto
          modal={modal}
          onCerrar={cerrarModal}
          onRetirar={retirar}
          guardando={guardando}
        />
      )}
    </div>
  );
};

export default BoletosGrid;
