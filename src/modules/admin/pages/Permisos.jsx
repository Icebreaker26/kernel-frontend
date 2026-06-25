import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import AsignarPermisosModal from '../components/AsignarPermisosModal.jsx';

const Permisos = () => {
  const [usuarios, setUsuarios]         = useState([]);
  const [modalUsuario, setModalUsuario] = useState(null);
  const [loading, setLoading]           = useState(true);

  const cargar = async () => {
    try {
      const { data } = await apiService.get('/admin/usuarios');
      setUsuarios(data.filter((u) => u.is_approved && u.is_active));
    } catch {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-1">Permisos</h1>
      <p className="text-slate-500 text-xs mb-6">Asignación por usuario</p>

      <div className="grid gap-3">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between px-4 py-3 border border-slate-800 rounded-xl hover:bg-slate-800/30 transition-colors"
          >
            <div>
              <p className="text-slate-200 text-sm">{u.nombre}</p>
              <p className="text-slate-500 text-xs">{u.email} · {u.rol}</p>
            </div>
            <button
              onClick={() => setModalUsuario(u)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-violet-600/40 text-violet-400 hover:bg-violet-600/10 rounded-lg text-xs transition-colors"
            >
              <Shield size={12} /> Editar permisos
            </button>
          </div>
        ))}
      </div>

      {modalUsuario && (
        <AsignarPermisosModal
          usuario={modalUsuario}
          onClose={() => setModalUsuario(null)}
          onSaved={() => { setModalUsuario(null); cargar(); }}
        />
      )}
    </div>
  );
};

export default Permisos;
