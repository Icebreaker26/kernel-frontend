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
    ? 'bg-[#00e5ff11] text-[#00e5ff] border-[#00e5ff33]'
    : 'bg-[#ffb70011] text-[#ffb700] border-[#ffb70033]';

const Usuarios = () => {
  const [usuarios, setUsuarios]                     = useState([]);
  const [modalUsuario, setModalUsuario]             = useState(null);
  const [modalResetUsuario, setModalResetUsuario]   = useState(null);
  const [modalCrear, setModalCrear]                 = useState(false);
  const [loading, setLoading]                       = useState(true);

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
    try { await apiService.patch(`/admin/usuarios/${id}/aprobar`); toast.success('Usuario aprobado'); cargar(); }
    catch { toast.error('Error al aprobar'); }
  };

  const desactivar = async (id) => {
    try { await apiService.patch(`/admin/usuarios/${id}/desactivar`); toast.success('Usuario desactivado'); cargar(); }
    catch { toast.error('Error al desactivar'); }
  };

  const reactivar = async (id) => {
    try { await apiService.patch(`/admin/usuarios/${id}/reactivar`); toast.success('Usuario reactivado'); cargar(); }
    catch { toast.error('Error al reactivar'); }
  };

  const cambiarRol = async (id, rol) => {
    try { await apiService.patch(`/admin/usuarios/${id}/rol`, { rol }); toast.success('Rol actualizado'); cargar(); }
    catch { toast.error('Error al cambiar rol'); }
  };

  if (loading) return <p className="text-[#6aacbc] text-xs tracking-widest">CARGANDO...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#6aacbc] text-[8px] tracking-[3px] mb-1">// GESTIÓN DE ACCESOS</p>
          <h1 className="text-[#a0d4e0] font-bold text-lg tracking-wider">USUARIOS</h1>
          <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">{usuarios.length} REGISTRADOS</p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 border border-[#a855f744] bg-[#a855f711] hover:bg-[#a855f722] hover:border-[#a855f766] text-[#a855f7] text-[9px] tracking-[2px] rounded-sm transition-all"
          style={{ textShadow: '0 0 8px #a855f733' }}
        >
          <UserPlus size={13} /> NUEVO USUARIO
        </button>
      </div>

      <div className="border border-[#00e5ff11] rounded-sm overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#00e5ff11] bg-[#00e5ff05]">
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">NOMBRE</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">EMAIL</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ROL</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ESTADO</th>
              <th className="text-left px-4 py-3 text-[#6aacbc] tracking-[2px] font-normal">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-[#00e5ff08] hover:bg-[#00e5ff05] transition-colors"
              >
                <td className="px-4 py-3 text-[#a0d4e0]">{u.nombre}</td>
                <td className="px-4 py-3 text-[#6aacbc] font-mono">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className="appearance-none bg-[#0d1829] border border-[#00e5ff22] text-[#a0d4e0] rounded-sm px-2 py-1 pr-6 text-[10px] focus:outline-none focus:border-[#00e5ff55] cursor-pointer font-mono"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#6aacbc] pointer-events-none" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-sm border text-[9px] tracking-wider ${badge(u.is_approved)}`}>
                    {u.is_approved ? 'APROBADO' : 'PENDIENTE'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {!u.is_approved && (
                      <button
                        onClick={() => aprobar(u.id)}
                        title="Aprobar"
                        className="text-[#00e5ff] hover:text-[#00e5ffcc] transition-colors"
                        style={{ filter: 'drop-shadow(0 0 4px #00e5ff55)' }}
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {u.is_active ? (
                      <button
                        onClick={() => desactivar(u.id)}
                        title="Desactivar"
                        className="text-[#ff3d3d] hover:text-[#ff3d3dcc] transition-colors"
                      >
                        <XCircle size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivar(u.id)}
                        title="Reactivar"
                        className="text-[#00e5ff] hover:text-[#00e5ffcc] transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setModalUsuario(u)}
                      title="Permisos"
                      className="text-[#a855f7] hover:text-[#a855f7cc] transition-colors"
                    >
                      <Shield size={14} />
                    </button>
                    <button
                      onClick={() => setModalResetUsuario(u)}
                      title="Resetear contraseña"
                      className="text-[#ffb700] hover:text-[#ffb700cc] transition-colors"
                    >
                      <KeyRound size={14} />
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
