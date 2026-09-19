import { useState } from 'react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Boton, Campo, inputCls } from '../PortalUI.jsx';

const SeguridadSection = () => {
  const [form, setForm]       = useState({ actual: '', nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/password', { password_actual: form.actual, password_nueva: form.nueva });
      toast.success('Contraseña actualizada');
      setForm({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { etiqueta: 'Contraseña actual',    key: 'actual',    autoComplete: 'current-password' },
        { etiqueta: 'Nueva contraseña',     key: 'nueva',     autoComplete: 'new-password', min: 8, placeholder: 'Mínimo 8 caracteres' },
        { etiqueta: 'Confirmar contraseña', key: 'confirmar', autoComplete: 'new-password', min: 8 },
      ].map(({ etiqueta, key, min, placeholder, autoComplete }) => (
        <Campo key={key} etiqueta={etiqueta}>
          <input type="password" autoComplete={autoComplete} value={form[key]} minLength={min} required placeholder={placeholder ?? ''}
                 onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inputCls} />
        </Campo>
      ))}
      <div className="flex justify-end pt-1">
        <Boton type="submit" loading={loading}>{loading ? 'Guardando…' : 'Actualizar contraseña'}</Boton>
      </div>
    </form>
  );
};

export default SeguridadSection;
