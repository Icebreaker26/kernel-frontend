import { useState } from 'react';
import { Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Aviso, BarraAcciones, Grupo } from '../publico/ui.jsx';
import EmpresaSelect from './EmpresaSelect.jsx';
import PanelLateral from './PanelLateral.jsx';

const Formulario = ({ onClose }) => {
  const [empresa, setEmpresa] = useState('');
  const [error, setError]     = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const abrir = async (e) => {
    e.preventDefault();
    if (!empresa) return setError('Elige la empresa de las personas que se van a asociar');
    setAbriendo(true);
    setError('');
    try {
      const { data } = await apiService.post('/captacion/stand-sessions', { empresa_codigo: empresa });
      window.open(`/stand/${data.token}`, '_blank');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo abrir el stand');
    } finally { setAbriendo(false); }
  };

  return (
    <form onSubmit={abrir} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="El kiosco se abre en una pestaña nueva">
        Es la pantalla que las personas usan para conocer la cooperativa y empezar su asociación en el stand.
      </Aviso>

      <Grupo titulo="Empresa del stand" descripcion="Elige la empresa de las personas que van a asociarse en este stand.">
        <EmpresaSelect value={empresa} onChange={(v) => { setEmpresa(v); setError(''); }} error={error} etiqueta="Empresa con convenio" />
      </Grupo>

      <Aviso tono="aviso" titulo="Antes de abrirlo">
        Si ya tienes un kiosco abierto para esta misma empresa, se cierra y este lo reemplaza.
        Quienes solo toquen “Quiero asociarme” sin escribir su nombre no aparecerán en tu lista.
      </Aviso>

      <BarraAcciones onBack={onClose} etiquetaAtras="Cancelar" etiqueta="Abrir kiosco" cargando={abriendo} deshabilitado={!empresa} />
    </form>
  );
};

const PanelStand = ({ onClose }) => (
  <PanelLateral eyebrow="// MODO STAND" titulo="Abrir kiosco" ancho="sm:max-w-md" onClose={onClose}>
    <Formulario onClose={onClose} />
  </PanelLateral>
);

export default PanelStand;
