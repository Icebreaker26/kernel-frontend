import { useState } from 'react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Boton, Campo, Modal, inputCls } from '../PortalUI.jsx';

// Aviso al entrar cuando el asociado no tiene correo registrado
const ModalEmail = ({ onGuardado, onDespues }) => {
  const [form, setForm]       = useState({ email: '', emailConfirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.email !== form.emailConfirm) { toast.error('Los correos no coinciden'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/email', { email: form.email.trim().toLowerCase(), emailConfirm: form.emailConfirm.trim().toLowerCase() });
      toast.success('Correo registrado correctamente');
      await onGuardado();
    } catch (err) {
      toast.error(err.response?.status === 409
        ? 'Ese correo ya está registrado en otro asociado'
        : 'No se pudo guardar el correo. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  return (
    <Modal titulo="Registra tu correo" onClose={onDespues}>
      <p className="mb-5 text-base leading-relaxed text-slate-600">
        Lo necesitamos para enviarte avisos importantes y para que puedas recuperar tu acceso si lo pierdes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Campo etiqueta="Correo electrónico">
          <input type="email" autoComplete="email" required placeholder="correo@ejemplo.com" value={form.email}
                 onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
        </Campo>
        <Campo etiqueta="Confirma tu correo">
          <input type="email" autoComplete="email" required placeholder="correo@ejemplo.com" value={form.emailConfirm}
                 onChange={(e) => setForm((f) => ({ ...f, emailConfirm: e.target.value }))} className={inputCls} />
        </Campo>
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="suave" onClick={onDespues}>Después</Boton>
          <Boton type="submit" loading={loading}>{loading ? 'Guardando…' : 'Guardar'}</Boton>
        </div>
      </form>
    </Modal>
  );
};

export default ModalEmail;
