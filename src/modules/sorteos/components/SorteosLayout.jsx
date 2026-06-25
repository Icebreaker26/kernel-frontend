import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Ticket, Plus, LogOut, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext.jsx';
import apiService from '../../../services/apiService.js';

const EstadoChip = ({ estado }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
    estado === 'activo' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'
  }`}>
    {estado}
  </span>
);

const SorteosLayout = () => {
  const { user, logout } = useAuth();
  const navigate        = useNavigate();
  const { id }          = useParams();
  const [sorteos, setSorteos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ nombre: '', descripcion: '' });
  const [creating, setCreating] = useState(false);

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
    <div className="min-h-screen bg-[#020617] font-mono flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-slate-800 flex flex-col py-6 px-4 shrink-0">
        <div className="mb-6">
          <button
            onClick={() => navigate('/selector')}
            className="flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-3 transition-colors"
          >
            <ChevronLeft size={13} /> Selector
          </button>
          <p className="text-white font-bold text-sm">kernel</p>
          <p className="text-slate-600 text-xs mt-0.5">Sorteos</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg mb-4 transition-colors"
        >
          <Plus size={13} /> Nuevo sorteo
        </button>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center pt-4"><Loader2 size={16} className="animate-spin text-slate-600" /></div>
          ) : sorteos.length === 0 ? (
            <p className="text-slate-600 text-xs text-center pt-4">Sin sorteos</p>
          ) : sorteos.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/sorteos/${s.id}`)}
              className={`text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-start gap-2 ${
                id === s.id
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket size={13} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <EstadoChip estado={s.estado} />
                  {Number(s.solicitudes_pendientes) > 0 && (
                    <span className="bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {s.solicitudes_pendientes}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={12} className="mt-0.5 shrink-0 opacity-40" />
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800 pt-4">
          <p className="text-slate-500 text-xs mb-2 truncate">{user?.nombre}</p>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
            <LogOut size={13} /> Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ recargarSorteos: cargar }} />
      </main>

      {/* Modal nuevo sorteo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-sm mb-4">Nuevo sorteo</h2>
            <form onSubmit={crearSorteo} className="flex flex-col gap-3">
              <input
                placeholder="Nombre del sorteo *"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={2}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="text-xs text-slate-400 hover:text-white px-4 py-2 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                  {creating && <Loader2 size={12} className="animate-spin" />}
                  Crear sorteo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SorteosLayout;
