import { Outlet, NavLink } from 'react-router-dom';
import { Users, Shield, LogOut, Upload, UsersRound, ClipboardList, Building2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';

const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#020617] font-mono flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-800 flex flex-col py-6 px-4 shrink-0">
        <div className="mb-8">
          <p className="text-white font-bold text-sm">kernel</p>
          <p className="text-slate-600 text-xs mt-0.5">Admin</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Users size={14} /> Usuarios
          </NavLink>
          <NavLink
            to="/admin/permisos"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Shield size={14} /> Permisos
          </NavLink>
          <NavLink
            to="/admin/asociados"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <UsersRound size={14} /> Asociados
          </NavLink>
          <NavLink
            to="/admin/empresas"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Building2 size={14} /> Empresas
          </NavLink>
          <NavLink
            to="/admin/auditoria"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <ClipboardList size={14} /> Auditoría
          </NavLink>
          <NavLink
            to="/admin/asociados/importar"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Upload size={14} /> Importar asociados
          </NavLink>
        </nav>

        <div className="border-t border-slate-800 pt-4">
          <p className="text-slate-500 text-xs mb-2 truncate">{user?.nombre}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
