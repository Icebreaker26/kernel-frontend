import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, MessageCircle, Check, RefreshCcw, ChevronRight, X, Loader2, Search } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

const inp = 'w-full bg-[#041a12] border border-emerald-900/40 rounded px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors';
const lbl = 'block text-slate-400 text-[9px] tracking-[2px] mb-1 uppercase';
const sel = `${inp} appearance-none`;

const EmpresaSelect = ({ value, onChange }) => {
  const [empresas, setEmpresas]   = useState([]);
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const containerRef              = useRef(null);

  useEffect(() => {
    setLoading(true);
    apiService.get('/empresas')
      .then(({ data }) => setEmpresas(data.filter(e => e.is_active !== false)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = empresas.find(e => e.codigo === value);
  const filtered = query
    ? empresas.filter(e =>
        e.nombre.toLowerCase().includes(query.toLowerCase()) ||
        e.codigo.toLowerCase().includes(query.toLowerCase())
      )
    : empresas;

  const select = (empresa) => {
    onChange(empresa.codigo);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={lbl}>Empresa *</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inp} flex items-center justify-between text-left ${!selected ? 'text-slate-600' : ''}`}
      >
        <span className="truncate">
          {selected ? `${selected.nombre} (${selected.codigo})` : 'Buscar empresa…'}
        </span>
        <Search size={12} className="text-slate-600 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#041a12] border border-emerald-900/50 rounded shadow-xl">
          <div className="p-2 border-b border-emerald-900/30">
            <input
              autoFocus
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
              placeholder="Buscar por nombre o código…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {loading && <li className="px-3 py-2 text-slate-600 text-xs">Cargando…</li>}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-2 text-slate-600 text-xs">Sin resultados</li>
            )}
            {filtered.map(e => (
              <li key={e.codigo}>
                <button
                  type="button"
                  onClick={() => select(e)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-900/30 transition-colors flex items-center justify-between
                    ${e.codigo === value ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-300'}`}
                >
                  <span className="truncate">{e.nombre}</span>
                  <span className="text-slate-600 text-[10px] ml-2 shrink-0">{e.codigo}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ModalNuevoProspecto = ({ onClose, onCreado }) => {
  const [d, setD]       = useState({ empresa_codigo: '', nombres: '', apellidos: '', cedula: '', celular: '', correo: '', interes_principal: '', acepta_habeas_data: false });
  const [saving, setSav] = useState(false);
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d.empresa_codigo) return toast.error('Selecciona una empresa');
    if (!d.acepta_habeas_data) return toast.error('Debe aceptar el tratamiento de datos');
    setSav(true);
    try {
      const { data } = await apiService.post('/captacion', { ...d, acepta_habeas_data: true });
      toast.success('Prospecto creado');
      onCreado(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear prospecto');
    } finally { setSav(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#020f08] border border-emerald-900/50 rounded-lg p-6 font-mono max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-emerald-400/60 text-[9px] tracking-[3px]">// CAPTACIÓN</p>
            <p className="text-slate-200 font-bold tracking-wider">NUEVO PROSPECTO</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <EmpresaSelect value={d.empresa_codigo} onChange={v => set('empresa_codigo', v)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombres *</label>
              <input className={inp} value={d.nombres} onChange={e => set('nombres', e.target.value)} placeholder="Juan Carlos" required />
            </div>
            <div>
              <label className={lbl}>Apellidos *</label>
              <input className={inp} value={d.apellidos} onChange={e => set('apellidos', e.target.value)} placeholder="García López" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Cédula *</label>
              <input className={inp} inputMode="numeric" value={d.cedula} onChange={e => set('cedula', e.target.value)} placeholder="1234567890" required />
            </div>
            <div>
              <label className={lbl}>Celular *</label>
              <input className={inp} inputMode="tel" value={d.celular} onChange={e => set('celular', e.target.value)} placeholder="3001234567" required />
            </div>
          </div>

          <div>
            <label className={lbl}>Correo</label>
            <input type="email" className={inp} value={d.correo} onChange={e => set('correo', e.target.value)} placeholder="juan@empresa.com" />
          </div>

          <div>
            <label className={lbl}>Interés principal</label>
            <select className={sel} value={d.interes_principal} onChange={e => set('interes_principal', e.target.value)}>
              <option value="">— Opcional —</option>
              <option value="credito">Crédito</option>
              <option value="ahorro">Ahorro</option>
              <option value="seguros">Seguros</option>
              <option value="sorteos">Sorteos</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input type="checkbox" checked={d.acepta_habeas_data} onChange={e => set('acepta_habeas_data', e.target.checked)} className="accent-emerald-500 w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-slate-400 text-[10px] leading-relaxed">
              El prospecto acepta el tratamiento de sus datos personales conforme a la Ley 1581 de 2012. *
            </span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-700/50 rounded text-slate-400 hover:text-slate-200 text-xs tracking-wider transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Crear prospecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SECCIONES = ['personal','laboral','financiera','pep','beneficiarios','referencias'];

const EstadoBadge = ({ estado }) => {
  const map = {
    nuevo        : { label: 'Nuevo',        cls: 'bg-slate-800 text-slate-400 border-slate-700' },
    en_proceso   : { label: 'En proceso',   cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-900' },
    firmado      : { label: 'Firmado',       cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/50' },
    entregado    : { label: 'Entregado',     cls: 'bg-blue-900/30 text-blue-400 border-blue-800' },
    rechazado    : { label: 'Rechazado',     cls: 'bg-red-900/30 text-red-400 border-red-800' },
  };
  const { label, cls } = map[estado] || map.nuevo;
  return (
    <span className={`text-[9px] tracking-[1.5px] px-2 py-0.5 rounded border ${cls}`}>{label.toUpperCase()}</span>
  );
};

const SeccionDots = ({ vinculacion }) => (
  <div className="flex gap-0.5">
    {SECCIONES.map(s => (
      <span key={s} title={s}
        className={`w-2 h-2 rounded-sm ${vinculacion?.[`seccion_${s}_at`] ? 'bg-emerald-500' : 'bg-slate-700'}`} />
    ))}
  </div>
);

const ProspectoRow = ({ p, onToque }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyLink = async (e) => {
    e.stopPropagation();
    try {
      const { data } = await apiService.post('/captacion/whatsapp-url', { prospecto_id: p.id });
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copiado');
    } catch { toast.error('Error al copiar link'); }
  };

  const openWhatsApp = async (e) => {
    e.stopPropagation();
    try {
      const { data } = await apiService.post('/captacion/whatsapp-url', { prospecto_id: p.id });
      window.open(data.whatsapp_url, '_blank');
      onToque(p.id);
    } catch { toast.error('Error al abrir WhatsApp'); }
  };

  const seccionesDone = SECCIONES.filter(s => p.vinculacion?.[`seccion_${s}_at`]).length;

  return (
    <tr
      onClick={() => p.vinculacion && navigate(`/captacion/vinculaciones/${p.vinculacion.id}`)}
      className="border-b border-slate-800/50 hover:bg-emerald-900/5 transition-colors cursor-pointer group"
    >
      <td className="px-4 py-3">
        <p className="text-slate-200 text-xs font-medium">{p.nombres} {p.apellidos}</p>
        <p className="text-slate-600 text-[10px]">CC {p.cedula} · {p.empresa_codigo}</p>
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estado={p.estado} />
      </td>
      <td className="px-3 py-3">
        <SeccionDots vinculacion={p.vinculacion} />
        <p className="text-slate-600 text-[9px] mt-1">{seccionesDone}/{SECCIONES.length}</p>
      </td>
      <td className="px-3 py-3 text-slate-500 text-[10px]">
        {p.ultimo_toque ? new Date(p.ultimo_toque).toLocaleDateString('es-CO') : '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={copyLink} title="Copiar link"
            className="p-1.5 rounded border border-slate-700/50 hover:border-emerald-700/50 text-slate-500 hover:text-emerald-400 transition-colors">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <button onClick={openWhatsApp} title="Abrir WhatsApp"
            className="p-1.5 rounded border border-slate-700/50 hover:border-green-700/50 text-slate-500 hover:text-green-400 transition-colors">
            <MessageCircle size={12} />
          </button>
        </div>
      </td>
      <td className="px-2 py-3 text-slate-700 group-hover:text-slate-500">
        <ChevronRight size={14} />
      </td>
    </tr>
  );
};

const ProspectosList = () => {
  const navigate = useNavigate();
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtroEstado, setFiltro]   = useState('');
  const [modalAbierto, setModal]    = useState(false);

  const cargar = () => {
    setLoading(true);
    apiService.get('/captacion')
      .then(({ data }) => setProspectos(data))
      .catch(() => toast.error('Error cargando prospectos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const registrarToque = (id) => {
    apiService.post(`/captacion/${id}/toque`).catch(() => {});
    setProspectos(prev => prev.map(p => p.id === id ? { ...p, ultimo_toque: new Date().toISOString() } : p));
  };

  const filtrados = filtroEstado
    ? prospectos.filter(p => p.estado === filtroEstado)
    : prospectos;

  const stats = {
    total    : prospectos.length,
    enProceso: prospectos.filter(p => p.estado === 'en_proceso').length,
    firmados : prospectos.filter(p => p.estado === 'firmado' || p.estado === 'entregado').length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-emerald-400/60 text-[9px] tracking-[3px] mb-1">// CAPTACIÓN</p>
          <h1 className="text-slate-200 font-bold text-lg tracking-wider">PROSPECTOS</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar}
            className="p-2 border border-slate-700/50 rounded hover:border-emerald-700/50 text-slate-500 hover:text-emerald-400 transition-colors">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold tracking-wider rounded transition-all">
            <Plus size={14} /> NUEVO PROSPECTO
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total prospectos', val: stats.total,     color: 'emerald' },
          { label: 'En proceso',        val: stats.enProceso, color: 'amber'   },
          { label: 'Firmados',          val: stats.firmados,  color: 'blue'    },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-slate-900/40 border border-slate-800/60 rounded p-3">
            <p className={`text-xl font-bold text-${color}-400`}>{val}</p>
            <p className="text-slate-500 text-[9px] tracking-[2px] mt-0.5">{label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {['','nuevo','en_proceso','firmado','entregado'].map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`px-3 py-1 text-[10px] tracking-wider rounded border transition-all ${
              filtroEstado === e
                ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                : 'border-slate-700/50 text-slate-500 hover:border-slate-600'
            }`}>
            {e ? e.replace('_',' ').toUpperCase() : 'TODOS'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-16 text-center text-slate-600 text-xs tracking-wider">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="py-16 text-center border border-slate-800/40 rounded">
          <p className="text-slate-600 text-xs tracking-widest mb-3">SIN PROSPECTOS</p>
          <button onClick={() => setModal(true)}
            className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">
            + Crear primer prospecto →
          </button>
        </div>
      ) : (
        <div className="border border-slate-800/50 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                <th className="text-left px-4 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">PROSPECTO</th>
                <th className="text-left px-4 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">ESTADO</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">SECCIONES</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">ÚLT. TOQUE</th>
                <th className="text-left px-3 py-2 text-slate-500 text-[9px] tracking-[2px] font-normal">ACCIONES</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <ProspectoRow key={p.id} p={p} onToque={registrarToque} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <ModalNuevoProspecto
          onClose={() => setModal(false)}
          onCreado={(nuevo) => setProspectos(prev => [nuevo, ...prev])}
        />
      )}
    </div>
  );
};

export default ProspectosList;
