import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { labelClaseCuota } from '../../../utils/asociados.js';
import { LogOut, User, Phone, MapPin, Building2, CreditCard, Ticket, KeyRound, ChevronDown } from 'lucide-react';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';

const Campo = ({ label, valor, icon: Icon }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0">
    <div className="mt-0.5 text-emerald-500/70">
      <Icon size={14} />
    </div>
    <div>
      <p className="text-slate-500 text-xs mb-0.5">{label}</p>
      <p className="text-slate-200 text-sm">{valor || <span className="text-slate-600 italic">Sin información</span>}</p>
    </div>
  </div>
);

const MisDatos = () => {
  const { asociado, logout } = useAsociado();
  const navigate = useNavigate();
  const [showPass, setShowPass]       = useState(false);
  const [passForm, setPassForm]       = useState({ actual: '', nueva: '', confirmar: '' });
  const [loadingPass, setLoadingPass] = useState(false);

  const handleCambiarPass = async (e) => {
    e.preventDefault();
    if (passForm.nueva !== passForm.confirmar) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoadingPass(true);
    try {
      await apiService.put('/asociados/password', {
        password_actual: passForm.actual,
        password_nueva:  passForm.nueva,
      });
      toast.success('Contraseña actualizada');
      setShowPass(false);
      setPassForm({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoadingPass(false);
    }
  };

  if (!asociado) return null;

  return (
    <div className="min-h-screen bg-[#020617] font-mono px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs text-emerald-500 tracking-widest uppercase mb-1">Portal Asociado</p>
            <h1 className="text-xl font-bold text-white">
              {asociado.nombre} {asociado.apellido}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">CC {asociado.codigo}</p>
          </motion.div>
          <div className="flex items-center gap-2 mt-1">
            <NotificationBell />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>

        {/* Acceso rápido a sorteos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <button
            onClick={() => navigate('/portal/sorteos')}
            className="w-full flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-xl hover:bg-emerald-900/30 transition-colors text-left"
          >
            <Ticket size={16} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Mis bonos del sorteo</p>
              <p className="text-slate-500 text-xs">Consulta y solicita números del sorteo activo</p>
            </div>
          </button>
        </motion.div>

        {/* Tarjeta de datos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-2 mb-4"
        >
          <p className="text-slate-500 text-xs py-3 border-b border-slate-800 mb-1 tracking-wider uppercase">
            Información personal
          </p>
          <Campo label="Nombre completo"  valor={`${asociado.nombre} ${asociado.apellido}`} icon={User} />
          <Campo label="Cédula"           valor={asociado.codigo}        icon={CreditCard} />
          <Campo label="Teléfono / Móvil" valor={asociado.movil}         icon={Phone} />
          <Campo label="Dirección"        valor={asociado.direccion}     icon={MapPin} />
          <Campo label="Ciudad"           valor={asociado.ciudad}        icon={MapPin} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-2"
        >
          <p className="text-slate-500 text-xs py-3 border-b border-slate-800 mb-1 tracking-wider uppercase">
            Información cooperativa
          </p>
          <Campo label="Clase de cuota"    valor={labelClaseCuota(asociado.clase_cuota)} icon={CreditCard} />
          <Campo label="Empresa descuento" valor={asociado.empresa_dsto}   icon={Building2} />
          <Campo label="Nombre empresa"    valor={asociado.nombre_empresa} icon={Building2} />
        </motion.div>

        {/* Cambiar contraseña */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setShowPass((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <KeyRound size={14} className="text-emerald-500/70" />
              <span className="text-xs tracking-wider uppercase">Cambiar contraseña</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${showPass ? 'rotate-180' : ''}`}
            />
          </button>

          {showPass && (
            <form onSubmit={handleCambiarPass} className="px-5 pb-5 flex flex-col gap-3 border-t border-slate-800">
              <div className="pt-4">
                <label className="text-slate-500 text-xs mb-1 block">Contraseña actual</label>
                <input
                  type="password"
                  value={passForm.actual}
                  onChange={(e) => setPassForm((f) => ({ ...f, actual: e.target.value }))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={passForm.nueva}
                  onChange={(e) => setPassForm((f) => ({ ...f, nueva: e.target.value }))}
                  minLength={8}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Confirmar contraseña</label>
                <input
                  type="password"
                  value={passForm.confirmar}
                  onChange={(e) => setPassForm((f) => ({ ...f, confirmar: e.target.value }))}
                  minLength={8}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loadingPass}
                className="mt-1 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loadingPass ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  );
};

const MisDatosWithNotifications = () => (
  <NotificationProvider endpoint="/asociados/notificaciones">
    <MisDatos />
  </NotificationProvider>
);

export default MisDatosWithNotifications;
