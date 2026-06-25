import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const Perfil = () => {
  const navigate = useNavigate();
  const [perfil, setPerfil]       = useState(null);
  const [datosForm, setDatosForm] = useState({ nombre: '', email: '' });
  const [passForm, setPassForm]   = useState({ password_actual: '', password_nueva: '', confirmar: '' });
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [loadingPass,  setLoadingPass]  = useState(false);

  useEffect(() => {
    apiService.get('/perfil').then(({ data }) => {
      setPerfil(data);
      setDatosForm({ nombre: data.nombre, email: data.email });
    });
  }, []);

  const guardarDatos = async (e) => {
    e.preventDefault();
    setLoadingDatos(true);
    try {
      const { data } = await apiService.put('/perfil', datosForm);
      setPerfil(data);
      toast.success('Datos actualizados');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setLoadingDatos(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (passForm.password_nueva !== passForm.confirmar) {
      return toast.error('Las contraseñas no coinciden');
    }
    setLoadingPass(true);
    try {
      await apiService.put('/perfil/password', {
        password_actual: passForm.password_actual,
        password_nueva:  passForm.password_nueva,
      });
      toast.success('Contraseña actualizada');
      setPassForm({ password_actual: '', password_nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al cambiar contraseña');
    } finally {
      setLoadingPass(false);
    }
  };

  const rolLabel = (rol) => ({
    admin:          'Administrador',
    comercial:      'Comercial',
    financiero:     'Financiero',
    control_interno:'Control Interno',
    usuario:        'Usuario',
  }[rol] ?? rol);

  if (!perfil) return null;

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-white p-8">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Mi perfil</h1>
            <p className="text-slate-500 text-xs mt-0.5">{rolLabel(perfil.rol)}</p>
          </div>
        </div>

        {/* Datos personales */}
        <section className="border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <User size={13} /> Datos personales
          </h2>
          <form onSubmit={guardarDatos} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Nombre</label>
              <input
                value={datosForm.nombre}
                onChange={(e) => setDatosForm({ ...datosForm, nombre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                <Mail size={11} className="inline mr-1" />Email
              </label>
              <input
                type="email"
                value={datosForm.email}
                onChange={(e) => setDatosForm({ ...datosForm, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loadingDatos}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 rounded-lg text-xs transition-colors"
              >
                <Save size={13} />
                {loadingDatos ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>

        {/* Cambiar contraseña */}
        <section className="border border-slate-800 rounded-xl p-6">
          <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Lock size={13} /> Cambiar contraseña
          </h2>
          <form onSubmit={cambiarPassword} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Contraseña actual</label>
              <input
                type="password"
                value={passForm.password_actual}
                onChange={(e) => setPassForm({ ...passForm, password_actual: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={passForm.password_nueva}
                onChange={(e) => setPassForm({ ...passForm, password_nueva: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passForm.confirmar}
                onChange={(e) => setPassForm({ ...passForm, confirmar: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loadingPass}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 rounded-lg text-xs transition-colors"
              >
                <Lock size={13} />
                {loadingPass ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </section>

        <p className="text-center text-slate-700 text-xs mt-6">
          Cuenta creada el {new Date(perfil.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
};

export default Perfil;
