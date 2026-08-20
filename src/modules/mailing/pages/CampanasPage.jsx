import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Send, Trash2, Edit3, Eye, CheckCircle, AlertCircle,
  Clock, Loader, Users, Building2, Ticket, Search, X, ChevronRight, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import EditorCuerpo from '../components/EditorCuerpo.jsx';

const ACCENT = '#6366f1';
const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ── Helpers segmento ──────────────────────────────────────────────────────────
const SEGMENTO_VACÍO = { empresas: [], sorteos: [], codigos: [] };

const segmentoEsTodos = (s) =>
  !s || ((s.empresas ?? []).length === 0 && (s.sorteos ?? []).length === 0 && (s.codigos ?? []).length === 0);

const segmentoResumen = (s) => {
  if (segmentoEsTodos(s)) return 'Todos los asociados con email';
  const partes = [];
  if ((s.empresas ?? []).length) partes.push(`${s.empresas.length} empresa${s.empresas.length !== 1 ? 's' : ''}`);
  if ((s.sorteos  ?? []).length) partes.push(`${s.sorteos.length} sorteo${s.sorteos.length !== 1 ? 's' : ''}`);
  if ((s.codigos  ?? []).length) partes.push(`${s.codigos.length} individual${s.codigos.length !== 1 ? 'es' : ''}`);
  return partes.join(' + ');
};

// ── EstadoBadge ───────────────────────────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const cfg = {
    borrador: { icon: Edit3,       color: '#6aacbc', label: 'BORRADOR' },
    enviando: { icon: Loader,      color: '#f59e0b', label: 'ENVIANDO…' },
    enviada:  { icon: CheckCircle, color: '#22c55e', label: 'ENVIADA' },
    error:    { icon: AlertCircle, color: '#ef4444', label: 'ERROR' },
  }[estado] ?? { icon: Clock, color: '#475569', label: estado?.toUpperCase() };
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 text-[10px] tracking-wider px-2 py-0.5 rounded-sm"
      style={{ color: cfg.color, background: cfg.color + '18', border: `1px solid ${cfg.color}33` }}>
      <Icon size={10} className={estado === 'enviando' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};

// ── Panel expandible con checkboxes ──────────────────────────────────────────
const PanelSeleccion = ({ icon: Icon, titulo, items, seleccionados, onToggle, onLimpiar, cargando }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const sel = new Set(seleccionados);
  const filtrados = items.filter(item =>
    !busqueda.trim() || item.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const count = sel.size;

  return (
    <div className="border border-[#1e293b] rounded-sm overflow-hidden">
      <button onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0d1829] transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-[#6aacbc]" />
          <span className="text-[10px] tracking-[2px] text-[#6aacbc]">{titulo}</span>
          {count > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm"
              style={{ color: ACCENT, background: ACCENT + '18', border: `1px solid ${ACCENT}33` }}>
              {count}
            </span>
          )}
        </div>
        {abierto
          ? <ChevronDown size={12} className="text-[#334155]" />
          : <ChevronRight size={12} className="text-[#334155]" />}
      </button>

      {abierto && (
        <div className="border-t border-[#1e293b] bg-[#080f1c]">
          {items.length > 5 && (
            <div className="relative p-2 pb-1">
              <Search size={11} className="absolute left-5 top-1/2 -translate-y-0.5 text-[#475569]" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-[#0d1829] border border-[#1e293b] rounded-sm pl-7 pr-3 py-1.5 text-xs text-[#e2e8f0] outline-none" />
            </div>
          )}
          {cargando ? (
            <p className="text-[10px] text-[#475569] text-center py-4 animate-pulse">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-[10px] text-[#334155] text-center py-4">Sin resultados</p>
          ) : (
            <div className="max-h-44 overflow-y-auto divide-y divide-[#0d1424]">
              {filtrados.map(item => {
                const checked = sel.has(item.id);
                return (
                  <label key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#0d1829] transition-colors">
                    <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)}
                      className="accent-[#6366f1] w-3.5 h-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#e2e8f0] truncate">{item.nombre}</p>
                      {item.sub && <p className="text-[10px] text-[#475569] truncate">{item.sub}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {count > 0 && (
            <div className="px-4 py-2 border-t border-[#1e293b] flex justify-end">
              <button onClick={onLimpiar}
                className="text-[9px] tracking-wider text-[#ef4444] hover:text-[#ef4444cc] flex items-center gap-1">
                <X size={10} /> LIMPIAR {titulo.toUpperCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Segmentador ───────────────────────────────────────────────────────────────
const Segmentador = ({ value, onChange }) => {
  const [empresas,   setEmpresas]   = useState([]);
  const [sorteos,    setSorteos]    = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [loadingE, setLoadingE] = useState(false);
  const [loadingS, setLoadingS] = useState(false);
  const [loadingC, setLoadingC] = useState(false);

  useEffect(() => {
    if (!empresas.length) {
      setLoadingE(true);
      apiService.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {}).finally(() => setLoadingE(false));
    }
    if (!sorteos.length) {
      setLoadingS(true);
      apiService.get('/sorteos')
        .then(({ data }) => setSorteos(data.filter(s => ['activo', 'pausado'].includes(s.estado))))
        .catch(() => {})
        .finally(() => setLoadingS(false));
    }
    if (!candidatos.length) {
      setLoadingC(true);
      apiService.get('/mailing/candidatos').then(({ data }) => setCandidatos(data)).catch(() => {}).finally(() => setLoadingC(false));
    }
  }, []);

  const seg = value ?? SEGMENTO_VACÍO;

  const toggleEmpresa = (codigo) => {
    const next = new Set(seg.empresas ?? []);
    next.has(codigo) ? next.delete(codigo) : next.add(codigo);
    onChange({ ...seg, empresas: [...next] });
  };
  const toggleSorteo = (id) => {
    const next = new Set(seg.sorteos ?? []);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...seg, sorteos: [...next] });
  };
  const toggleCodigo = (codigo) => {
    const next = new Set(seg.codigos ?? []);
    next.has(codigo) ? next.delete(codigo) : next.add(codigo);
    onChange({ ...seg, codigos: [...next] });
  };

  const itemsEmpresas   = empresas.map(e => ({ id: e.codigo, nombre: e.nombre }));
  const itemsSorteos    = sorteos.map(s => ({ id: s.id, nombre: s.nombre }));
  const itemsCandidatos = candidatos.map(c => ({
    id:     c.codigo,
    nombre: `${c.apellido}, ${c.nombre}`,
    sub:    `${c.codigo} · ${c.email}`,
  }));

  const todos = segmentoEsTodos(seg);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] tracking-wider text-[#475569]">
          {todos
            ? 'Sin filtros aplicados — llegará a todos los asociados con email'
            : `Segmento: ${segmentoResumen(seg)}`}
        </p>
        {!todos && (
          <button onClick={() => onChange(SEGMENTO_VACÍO)}
            className="text-[9px] tracking-wider text-[#ef4444] hover:text-[#ef4444cc] flex items-center gap-1">
            <X size={10} /> LIMPIAR TODO
          </button>
        )}
      </div>
      <PanelSeleccion icon={Building2} titulo="Empresas"
        items={itemsEmpresas} seleccionados={seg.empresas ?? []}
        onToggle={toggleEmpresa} onLimpiar={() => onChange({ ...seg, empresas: [] })}
        cargando={loadingE} />
      <PanelSeleccion icon={Ticket} titulo="Sorteos"
        items={itemsSorteos} seleccionados={seg.sorteos ?? []}
        onToggle={toggleSorteo} onLimpiar={() => onChange({ ...seg, sorteos: [] })}
        cargando={loadingS} />
      <PanelSeleccion icon={Users} titulo="Individuales"
        items={itemsCandidatos} seleccionados={seg.codigos ?? []}
        onToggle={toggleCodigo} onLimpiar={() => onChange({ ...seg, codigos: [] })}
        cargando={loadingC} />
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const FORM_VACÍO = { asunto: '', cuerpo_html: '', cuerpo_texto: '', segmento: SEGMENTO_VACÍO, plantilla: null };

const normalizarSegmento = (s) => {
  if (!s || s.tipo !== undefined) return SEGMENTO_VACÍO;
  return { empresas: s.empresas ?? [], sorteos: s.sorteos ?? [], codigos: s.codigos ?? [] };
};

const CampanasPage = () => {
  const [campanas, setCampanas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [seleccionada, setSel]  = useState(null);
  const [preview, setPreview]   = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [form, setForm]         = useState(FORM_VACÍO);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiService.get('/mailing');
      setCampanas(data);
    } catch { toast.error('Error cargando campañas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setForm(FORM_VACÍO); setSel(null); setModal('crear'); };

  const abrirEditar = (c) => {
    setForm({
      asunto:       c.asunto,
      cuerpo_html:  c.cuerpo_html,
      cuerpo_texto: c.cuerpo_texto ?? '',
      segmento:     normalizarSegmento(c.segmento),
      plantilla:    c.plantilla ?? null,
    });
    setSel(c); setModal('editar');
  };

  const abrirPreview = async (c) => {
    setSel(c); setModal('preview'); setPreview(null);
    try {
      const { data } = await apiService.get(`/mailing/${c.id}/preview`);
      setPreview(data);
    } catch { toast.error('Error cargando preview'); }
  };

  const guardar = async () => {
    if (!form.asunto.trim())     { toast.error('El asunto es obligatorio'); return; }
    if (!form.cuerpo_html.trim()) { toast.error('El cuerpo del mensaje está vacío'); return; }
    try {
      if (modal === 'crear') {
        await apiService.post('/mailing', form);
        toast.success('Campaña creada');
      } else {
        await apiService.put(`/mailing/${seleccionada.id}`, form);
        toast.success('Campaña actualizada');
      }
      setModal(null); cargar();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al guardar'); }
  };

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar la campaña "${c.asunto}"?`)) return;
    try { await apiService.delete(`/mailing/${c.id}`); toast.success('Eliminada'); cargar(); }
    catch { toast.error('Error al eliminar'); }
  };

  const enviar = async (c) => {
    if (!confirm(`¿Enviar "${c.asunto}"?`)) return;
    setEnviando(c.id);
    try {
      const { data } = await apiService.post(`/mailing/${c.id}/enviar`);
      const eta = data.horas_estimadas > 0
        ? ` — ~${data.horas_estimadas}h para completar`
        : '';
      toast.success(`${data.destinatarios} destinatario(s) encolados${eta}`);
      cargar();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al enviar'); }
    finally { setEnviando(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-[10px] tracking-widest text-[#6aacbc] animate-pulse">CARGANDO CAMPAÑAS...</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] tracking-[3px] text-[#475569]">
          {campanas.length} campaña{campanas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 text-[10px] tracking-widest px-4 py-2 rounded-sm border transition-all"
          style={{ color: ACCENT, borderColor: ACCENT + '44', background: ACCENT + '11' }}>
          <Plus size={12} /> NUEVA CAMPAÑA
        </button>
      </div>

      {campanas.length === 0 ? (
        <div className="bg-[#08101e] border border-[#6366f118] rounded-sm p-12 text-center">
          <p className="text-[10px] tracking-[3px] text-[#334155] mb-2">SIN CAMPAÑAS</p>
          <p className="text-xs text-[#475569]">Crea tu primera campaña para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanas.map(c => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#08101e] border border-[#6366f118] rounded-sm p-4 relative overflow-hidden">
              <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT }} />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-[#e2e8f0] truncate">{c.asunto}</p>
                    <EstadoBadge estado={c.estado} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#475569] flex-wrap">
                    <span>{segmentoResumen(c.segmento)}</span>
                    {c.creado_por_nombre && <span>· {c.creado_por_nombre}</span>}
                    <span>· {fmtFecha(c.created_at)}</span>
                    {c.estado === 'enviada' && (
                      <span style={{ color: '#22c55e' }}>· {c.enviados} enviados · {c.errores} errores</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => abrirPreview(c)} title="Preview"
                    className="p-1.5 rounded-sm border border-[#6aacbc22] text-[#6aacbc] hover:border-[#6aacbc66] transition-colors">
                    <Eye size={13} />
                  </button>
                  {c.estado === 'borrador' && (<>
                    <button onClick={() => abrirEditar(c)}
                      className="p-1.5 rounded-sm border transition-colors"
                      style={{ borderColor: ACCENT + '33', color: ACCENT }}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => enviar(c)} disabled={enviando === c.id}
                      className="flex items-center gap-1.5 text-[10px] tracking-wider px-3 py-1.5 rounded-sm border transition-all disabled:opacity-50"
                      style={{ color: '#22c55e', borderColor: '#22c55e44', background: '#22c55e11' }}>
                      {enviando === c.id ? <Loader size={11} className="animate-spin" /> : <Send size={11} />}
                      ENVIAR
                    </button>
                    <button onClick={() => eliminar(c)}
                      className="p-1.5 rounded-sm border border-[#ef444433] text-[#ef4444] hover:border-[#ef444466] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </>)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <AnimatePresence>
        {(modal === 'crear' || modal === 'editar') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.88)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#08101e] border rounded-sm w-full max-w-2xl max-h-[92vh] overflow-y-auto"
              style={{ borderColor: ACCENT + '44' }}>
              <div className="relative p-6">
                <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT }} />
                <p className="text-[10px] tracking-[3px] text-[#6aacbc] mb-5">
                  {modal === 'crear' ? '// NUEVA CAMPAÑA' : '// EDITAR CAMPAÑA'}
                </p>

                <div className="space-y-5">
                  {/* Asunto */}
                  <div>
                    <label className="text-[10px] tracking-[2px] text-[#6aacbc] block mb-1.5">ASUNTO</label>
                    <input value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))}
                      placeholder="Ej: ¡Tu bono solidario está disponible!"
                      className="w-full bg-[#0d1829] border border-[#1e293b] rounded-sm px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#6366f144] transition-colors" />
                  </div>

                  {/* Editor visual */}
                  <div>
                    <label className="text-[10px] tracking-[2px] text-[#6aacbc] block mb-3">CONTENIDO</label>
                    <EditorCuerpo
                      plantilla={form.plantilla}
                      cuerpoHtml={form.cuerpo_html}
                      onChange={({ plantilla, cuerpoHtml }) =>
                        setForm(f => ({ ...f, plantilla, cuerpo_html: cuerpoHtml }))} />
                  </div>

                  {/* Destinatarios */}
                  <div>
                    <label className="text-[10px] tracking-[2px] text-[#6aacbc] block mb-3">DESTINATARIOS</label>
                    <Segmentador
                      value={form.segmento}
                      onChange={seg => setForm(f => ({ ...f, segmento: seg }))} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setModal(null)}
                    className="text-[10px] tracking-wider px-4 py-2 rounded-sm border border-[#1e293b] text-[#6aacbc] hover:border-[#6aacbc44] transition-colors">
                    CANCELAR
                  </button>
                  <button onClick={guardar}
                    className="text-[10px] tracking-wider px-4 py-2 rounded-sm border transition-colors"
                    style={{ color: ACCENT, borderColor: ACCENT + '44', background: ACCENT + '11' }}>
                    {modal === 'crear' ? 'CREAR CAMPAÑA' : 'GUARDAR CAMBIOS'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Preview */}
      <AnimatePresence>
        {modal === 'preview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.88)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#08101e] border border-[#6aacbc33] rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="relative p-6">
                <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: '#6aacbc' }} />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] tracking-[3px] text-[#6aacbc]">// PREVIEW</p>
                  {preview
                    ? <span className="text-[10px] tracking-wider" style={{ color: '#22c55e' }}>
                        {preview.destinatarios_count} destinatario{preview.destinatarios_count !== 1 ? 's' : ''}
                      </span>
                    : <Loader size={12} className="text-[#475569] animate-spin" />}
                </div>
                {preview?.advertencia_rate && (
                  <div className="mb-4 px-3 py-2.5 rounded-sm border text-[10px] leading-relaxed"
                    style={{ color: '#f59e0b', borderColor: '#f59e0b33', background: '#f59e0b0d' }}>
                    ⚠ {preview.advertencia_rate}
                  </div>
                )}
                {seleccionada && (<>
                  <div className="mb-3">
                    <p className="text-[10px] text-[#475569] mb-0.5">SEGMENTO</p>
                    <p className="text-xs text-[#6aacbc]">{segmentoResumen(seleccionada.segmento)}</p>
                  </div>
                  <p className="text-[10px] text-[#475569] mb-1">ASUNTO</p>
                  <p className="text-sm font-bold text-[#e2e8f0] mb-4">{seleccionada.asunto}</p>
                  <p className="text-[10px] text-[#475569] mb-2">CUERPO</p>
                  <div className="bg-[#0d1829] border border-[#1e293b] rounded-sm p-4 text-sm text-[#a0d4e0] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: seleccionada.cuerpo_html }} />
                </>)}
                <div className="flex justify-end mt-6">
                  <button onClick={() => { setModal(null); setPreview(null); }}
                    className="text-[10px] tracking-wider px-4 py-2 rounded-sm border border-[#1e293b] text-[#6aacbc] hover:border-[#6aacbc44] transition-colors">
                    CERRAR
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampanasPage;
