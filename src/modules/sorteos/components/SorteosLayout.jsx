import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Plus, LogOut, ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext.jsx';
import apiService from '../../../services/apiService.js';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';

const SorteosLayout = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { id }           = useParams();
  const [sorteos, setSorteos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ nombre: '', descripcion: '' });
  const [creating, setCreating]   = useState(false);

  const cargar = () =>
    apiService.get('/sorteos').then(({ data }) => { setSorteos(data); setLoading(false); });

  useEffect(() => { cargar(); }, []);

  const crearSorteo = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await apiService.post('/sorteos', form);
      toast.success('Sorteo creado');
      setShowModal(false);
      setForm({ nombre: '', descripcion: '' });
      await cargar();
      navigate(`/sorteos/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al crear sorteo');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080f] font-mono flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#00e5ff22] flex flex-col py-6 px-4 shrink-0 bg-[#08101e] relative">
        {/* Esquinas estilo panel */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00e5ff]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00e5ff]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00e5ff44]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00e5ff44]" />

        <div className="mb-6 pb-4 border-b border-[#00e5ff11]">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-3 rounded-sm border border-[#00e5ff22] bg-[#00e5ff08] hover:bg-[#00e5ff15] hover:border-[#00e5ff55] text-[#6aacbc] hover:text-[#00e5ff] text-[10px] tracking-wider transition-all"
          >
            <ChevronLeft size={12} /> PANEL PRINCIPAL
          </button>
          <p
            className="text-[#00e5ff] font-bold text-base tracking-[4px]"
            style={{ textShadow: '0 0 12px #00e5ff66' }}
          >
            KERNEL
          </p>
          <p className="text-[#6aacbc] text-[9px] mt-0.5 tracking-[3px]">// SORTEOS</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 w-full border border-[#00e5ff55] bg-[#00e5ff11] hover:bg-[#00e5ff] text-[#00e5ff] hover:text-black text-[10px] px-3 py-2 rounded-sm mb-4 transition-all tracking-widest"
        >
          <Plus size={12} /> [ + ] NUEVO SORTEO
        </button>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center pt-4">
              <Loader2 size={16} className="animate-spin text-[#00e5ff44]" />
            </div>
          ) : sorteos.length === 0 ? (
            <p className="text-[#6aacbc] text-[10px] text-center pt-4 tracking-wider">SIN SORTEOS</p>
          ) : sorteos.map((s) => {
            const asignados = Number(s.boletos_asignados ?? 0);
            const pct = Math.round((asignados / 1000) * 100);
            const isActive = id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/sorteos/${s.id}`)}
                className={`text-left px-3 py-2.5 rounded-sm text-[10px] transition-all border ${
                  isActive
                    ? 'bg-[#00e5ff11] border-[#00e5ff33] text-[#00e5ff]'
                    : 'border-transparent text-[#6aacbc] hover:text-[#a0d4e0] hover:border-[#00e5ff11] hover:bg-[#00e5ff08]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium tracking-wider truncate pr-1">{s.nombre.toUpperCase()}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Number(s.solicitudes_pendientes) > 0 && (
                      <span className="bg-[#ffb700] text-black text-[8px] px-1.5 py-0.5 rounded-sm font-bold">
                        {s.solicitudes_pendientes}
                      </span>
                    )}
                    <span className={`text-[8px] px-1.5 py-0.5 border tracking-wider ${
                      s.estado === 'activo'
                        ? 'border-[#00e5ff44] text-[#00e5ff] bg-[#00e5ff11]'
                        : 'border-[#ff3d3d44] text-[#ff3d3d] bg-[#ff3d3d11]'
                    }`}>
                      {s.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="h-[2px] bg-[#0d1829] rounded-full">
                  <div
                    className="h-[2px] rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: isActive ? '#00e5ff' : '#6aacbc',
                      boxShadow: isActive ? '0 0 6px #00e5ff' : 'none',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-[#6aacbc]">{asignados} / 1000</span>
                  <span className={`text-[8px] ${isActive ? 'text-[#00e5ff]' : 'text-[#6aacbc]'}`}>{pct}%</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#00e5ff11] pt-4 mt-2">
          <p className="text-[#6aacbc] text-[9px] mb-2 truncate tracking-widest">// {user?.nombre?.toUpperCase()}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d55] text-[9px] text-[#6aacbc] hover:text-[#ff3d3d] transition-all tracking-widest"
            >
              <LogOut size={12} /> CERRAR SESIÓN
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto relative">
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
          }}
        />
        <div className="relative z-10 h-full">
          <Outlet context={{ recargarSorteos: cargar, sorteos }} />
        </div>
      </main>

      {/* Modal nuevo sorteo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className="bg-[#08101e] border border-[#00e5ff33] rounded-sm p-6 w-full max-w-md relative"
            style={{ boxShadow: '0 0 40px #00e5ff11' }}
          >
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00e5ff]" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00e5ff]" />
            <p className="text-[9px] text-[#6aacbc] tracking-[3px] mb-1">// SISTEMA DE SORTEOS</p>
            <h2 className="text-[#00e5ff] font-bold text-sm mb-5 tracking-widest" style={{ textShadow: '0 0 10px #00e5ff66' }}>
              NUEVO SORTEO
            </h2>
            <form onSubmit={crearSorteo} className="flex flex-col gap-3">
              <input
                placeholder="Nombre del sorteo *"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors font-mono"
                required
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={2}
                className="bg-[#0d1829] border border-[#00e5ff22] rounded-sm px-3 py-2 text-sm text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#00e5ff55] transition-colors resize-none font-mono"
              />
              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-[10px] text-[#6aacbc] hover:text-[#a0d4e0] px-4 py-2 transition-colors tracking-widest"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="border border-[#00e5ff55] bg-[#00e5ff11] hover:bg-[#00e5ff] hover:text-black disabled:opacity-40 text-[#00e5ff] text-[10px] px-4 py-2 rounded-sm transition-all flex items-center gap-2 tracking-widest"
                >
                  {creating && <Loader2 size={12} className="animate-spin" />}
                  CREAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SorteosLayoutWithNotifications = () => (
  <NotificationProvider endpoint="/notificaciones">
    <SorteosLayout />
  </NotificationProvider>
);

export default SorteosLayoutWithNotifications;
