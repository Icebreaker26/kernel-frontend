import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, Save, Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ROL_LABEL = {
  admin:           'Administrador',
  comercial:       'Comercial',
  financiero:      'Financiero',
  control_interno: 'Control Interno',
  usuario:         'Usuario',
};

// ── Selector de avatar ────────────────────────────────────────────────────────
function AvatarUploader({ nombre, avatarUrl, onUpload }) {
  const inputRef          = useRef(null);
  const [preview, setPreview]     = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setPreview(avatarUrl); }, [avatarUrl]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar 2 MB');
      return;
    }
    // Preview local inmediato
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await apiService.post('/perfil/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpload(data.avatar_url);
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al subir la imagen');
      setPreview(avatarUrl); // revertir preview
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const inicial = nombre?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="relative group">
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-violet-500/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-300">
            {inicial}
          </div>
        )}

        {/* Botón overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {uploading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Camera size={22} className="text-white" />
          }
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-violet-400 transition-colors disabled:opacity-50"
      >
        <Camera size={12} />
        {uploading ? 'Subiendo…' : 'Cambiar foto'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
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
      setPerfil(prev => ({ ...prev, ...data }));
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

  if (!perfil) return null;

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-white relative">
      <GeometricBackground />
      <div className="relative z-10 p-8">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold">Mi perfil</h1>
              <p className="text-slate-500 text-xs mt-0.5">{ROL_LABEL[perfil.rol] ?? perfil.rol}</p>
            </div>
          </div>

          {/* Avatar */}
          <section className="border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Camera size={13} /> Foto de perfil
            </h2>
            <AvatarUploader
              nombre={perfil.nombre}
              avatarUrl={perfil.avatar_url}
              onUpload={(url) => setPerfil(prev => ({ ...prev, avatar_url: url }))}
            />
            <p className="text-center text-slate-600 text-xs">JPG, PNG o WebP · máx. 2 MB</p>
          </section>

          {/* Datos personales */}
          <section className="border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={13} /> Datos personales
            </h2>
            {perfil.rol === 'admin' ? (
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
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nombre</p>
                  <p className="text-sm text-white">{perfil.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm text-white">{perfil.email}</p>
                </div>
                <p className="text-xs text-slate-600 mt-1">El administrador puede modificar estos datos.</p>
              </div>
            )}
          </section>

          {/* Cambiar contraseña */}
          <section className="border border-slate-800 rounded-xl p-6">
            <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Lock size={13} /> Cambiar contraseña
            </h2>
            <form onSubmit={cambiarPassword} className="flex flex-col gap-4">
              {[
                { label: 'Contraseña actual',         key: 'password_actual' },
                { label: 'Nueva contraseña',           key: 'password_nueva' },
                { label: 'Confirmar nueva contraseña', key: 'confirmar' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 block mb-1">{label}</label>
                  <input
                    type="password"
                    value={passForm[key]}
                    onChange={(e) => setPassForm({ ...passForm, [key]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              ))}
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
            Cuenta creada el {new Date(perfil.created_at).toLocaleDateString('es-CO', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
