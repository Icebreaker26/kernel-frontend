import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import MarcoPublico from '../../../captacion/components/publico/MarcoPublico.jsx';
import apiService from '../../../../services/apiService.js';
import { ACCENTS, Boton, Campo, Tarjeta, inputCls, nombrePropio } from '../PortalUI.jsx';

// Primer ingreso: leer lo importante y crear la contraseña personal
const PrimerLogin = ({ asociado, onDone }) => {
  const [paso, setPaso]       = useState('terminos'); // 'terminos' | 'password'
  const [form, setForm]       = useState({ inicial: '', nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const aceptarTerminos = async () => {
    setLoading(true);
    try {
      await apiService.post('/asociados/aceptar-terminos');
      setPaso('password');
    } catch (_) {
      toast.error('No fue posible registrar la aceptación. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    if (form.nueva.length < 8) { toast.error('La nueva contraseña debe tener mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      await apiService.put('/asociados/password', { password_actual: form.inicial, password_nueva: form.nueva });
      toast.success('Contraseña creada correctamente');
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear contraseña');
    } finally { setLoading(false); }
  };

  const campo = (key, etiqueta, placeholder = '', autoComplete = 'new-password') => (
    <Campo etiqueta={etiqueta}>
      <input type="password" required autoComplete={autoComplete} placeholder={placeholder} value={form[key]}
             onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inputCls} />
    </Campo>
  );

  const nombre = nombrePropio(asociado.nombre).split(' ')[0];

  return (
    <MarcoPublico ancho="max-w-lg" centrado>
      {paso === 'terminos' && (
        <Tarjeta className="p-6 sm:p-8">
          <span className="inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.verde.soft, color: ACCENTS.verde.ink }}>Primer acceso</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">¡Bienvenido, {nombre}!</h1>
          <p className="mt-3 text-base text-slate-600">Antes de continuar, ten en cuenta:</p>
          <ul className="mt-4 grid gap-3">
            {[
              'Al afiliarte a la cooperativa firmaste la autorización de tratamiento de tus datos personales.',
              'Este portal te permite consultar tu información y gestionar tu participación en sorteos.',
              'Tus credenciales son personales: no las compartas con nadie.',
              'La información mostrada proviene del sistema de administración de la cooperativa.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-base text-slate-700">
                <Check size={18} className="mt-1 shrink-0" style={{ color: ACCENTS.verde.ink }} strokeWidth={3} />{item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-slate-500">
            Puedes consultar en cualquier momento la{' '}
            <Link to="/portal/politica-privacidad" target="_blank" className="font-bold text-[#065B8E] underline">política de privacidad</Link>
            {' '}y los{' '}
            <Link to="/portal/terminos-condiciones" target="_blank" className="font-bold text-[#065B8E] underline">términos y condiciones</Link>
            {' '}del portal.
          </p>
          <Boton bloque loading={loading} onClick={aceptarTerminos} className="mt-6">Entendido, continuar</Boton>
        </Tarjeta>
      )}

      {paso === 'password' && (
        <Tarjeta className="p-6 sm:p-8">
          <span className="inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: ACCENTS.azul.soft, color: ACCENTS.azul.ink }}>Crea tu contraseña</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">{nombre}, protege tu cuenta</h1>
          <p className="mt-3 text-base text-slate-600">
            Escribe la contraseña inicial que te entregó la cooperativa y crea una nueva, solo tuya.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {campo('inicial', 'Contraseña inicial (la que te entregó la cooperativa)', '••••••••••', 'current-password')}
            {campo('nueva', 'Nueva contraseña', 'Mínimo 8 caracteres')}
            {campo('confirmar', 'Confirma la nueva contraseña')}
            <Boton type="submit" bloque loading={loading} className="mt-2">{loading ? 'Guardando…' : 'Crear contraseña'}</Boton>
          </form>
        </Tarjeta>
      )}
    </MarcoPublico>
  );
};

export default PrimerLogin;
