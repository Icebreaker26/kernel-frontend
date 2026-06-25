import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Shield, ChevronDown, KeyRound, RefreshCw, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiService from '../../../services/apiService.js';
import AsignarPermisosModal from '../components/AsignarPermisosModal.jsx';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';
import CrearUsuarioModal from '../components/CrearUsuarioModal.jsx';

const ROLES = ['usuario', 'comercial', 'financiero', 'control_interno', 'admin'];

const badge = (aprobado) =>
  aprobado
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

const Usuarios = () => {
  const [usuarios, setUsuarios]       = useState([]);
  const [modalUsuario, setModalUsuario]           = useState(null);
  const [modalResetUsuario, setModalResetUsuario] = useState(null);
  const [modalCrear, setModalCrear]               = useState(false);
  const [loading, setLoading]         = useState(true);

  const cargar = async () => {
    try {
      const { data } = await apiService.get('/admin/usuarios');
      setUsuarios(data);
    } catch {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const aprobar = async (id) => {
    try {
      await apiService.patch(`/admin/usuarios/${id}/aprobar`);
      toast.success('Usuario aprobado');
      cargar();
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const desactivar = async (id) => {
    try {
      await apiService.patch(`/admin/usuarios/${id}/desactivar`);
      toast.success('Usuario desactivado');
      cargar();
    } catch {
      toast.error('Error al desactivar');
    }
  };

  const reactivar = async (id) => {
    try {
      await apiService.patch(`/admin/usuarios/${id}/reactivar`);
      toast.success('Usuario reactivado');
      cargar();
    } catch {
      toast.error('Error al reactivar');
    }
  };

  const cambiarRol = async (id, rol) => {
    try {
      await apiService.patch(`/admin/usuarios/${id}/rol`, { rol });
      toast.success('Rol actualizado');
      cargar();
    } catch {
      toast.error('Error al cambiar rol');
    }
  };

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg mb-1">Usuarios</h1>
          <p className="text-slate-500 text-xs">{usuarios.length} registrados</p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition-colors"
        >
          <UserPlus size={13} /> Nuevo usuario
        </button>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-slate-200">{u.nombre}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 pr-6 text-xs focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-xs ${badge(u.is_approved)}`}>
                    {u.is_approved ? 'Aprobado' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!u.is_approved && (
                      <button
                        onClick={() => aprobar(u.id)}
                        title="Aprobar"
                        className="text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                    {u.is_active ? (
                      <button
                        onClick={() => desactivar(u.id)}
                        title="Desactivar"
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <XCircle size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivar(u.id)}
                        title="Reactivar"
                        className="text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setModalUsuario(u)}
                      title="Permisos"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Shield size={15} />
                    </button>
                    <button
                      onClick={() => setModalResetUsuario(u)}
                      title="Resetear contraseña"
                      className="text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <KeyRound size={15} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalUsuario && (
        <AsignarPermisosModal
          usuario={modalUsuario}
          onClose={() => setModalUsuario(null)}
          onSaved={() => { setModalUsuario(null); cargar(); }}
        />
      )}

      {modalCrear && (
        <CrearUsuarioModal
          onClose={() => setModalCrear(false)}
          onCreado={() => { setModalCrear(false); cargar(); }}
        />
      )}

      {modalResetUsuario && (
        <ResetPasswordModal
          nombre={modalResetUsuario.nombre}
          apiPath={`/admin/usuarios/${modalResetUsuario.id}/password`}
          onClose={() => setModalResetUsuario(null)}
        />
      )}
    </div>
  );
};

export default Usuarios;
