import { useState } from 'react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import SeccionAportes from '../SeccionAportes.jsx';
import { Aviso } from '../publico/ui.jsx';
import PanelLateral from './PanelLateral.jsx';

/**
 * El asesor define o corrige los aportes de una solicitud (p. ej. firmada antes de que existiera este
 * paso). Es el MISMO formulario que ve el asociado, con la paleta del módulo del asesor.
 */
const PanelAportes = ({ vinculacion: v, tarifas, onClose, onGuardado }) => {
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const yaDefinido = v.valor_aporte !== null && v.valor_aporte !== undefined;

  const guardar = async (datos) => {
    setGuardando(true);
    setError('');
    try {
      await apiService.put(`/captacion/vinculaciones/${v.id}/aportes`, datos);
      toast.success('Aportes guardados');
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.detalles ? 'Revisa los valores ingresados.' : (err.response?.data?.error || 'No se pudo guardar. Inténtalo de nuevo.'));
    } finally { setGuardando(false); }
  };

  const valores = yaDefinido ? {
    valor_aporte: Number(v.valor_aporte),
    periodicidad: v.periodicidad_descuento || '',
    seguro_vida: !!v.seguro_vida_activo,
    bono_sorteo: !!v.bono_sorteo_activo,
  } : {};

  return (
    <PanelLateral titulo={yaDefinido ? 'Editar aportes' : 'Definir aportes'} subtitulo={`${v.nombres} ${v.apellidos} · CC ${v.cedula}`}
                  onClose={onClose} ocupado={guardando}>
      {error && <Aviso tono="error" className="mb-4">{error}</Aviso>}
      <SeccionAportes
        tarifas={tarifas}
        defaultValues={valores}
        onSave={guardar}
        saving={guardando}
        onBack={onClose}
        etiqueta="Guardar aportes"
        etiquetaAtras="Cancelar"
        introduccion={(
          <Aviso tono="info" titulo="Lo defines tú, en nombre del asociado">
            Llénalo con lo que acordaron. Queda registrado que lo definió el asesor, y no cambia la firma del asociado.
          </Aviso>
        )}
      />
    </PanelLateral>
  );
};

export default PanelAportes;
