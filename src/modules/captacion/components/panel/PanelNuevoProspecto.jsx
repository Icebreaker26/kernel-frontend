import { useState } from 'react';
import { Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Aviso, BarraAcciones, BotonSecundario, Casilla, Entrada, Fila, Grupo, Lista, limpiar, obligatorio, useFormulario } from '../publico/ui.jsx';
import { useTema } from '../publico/tema.js';
import EmpresaSelect from './EmpresaSelect.jsx';
import PanelLateral from './PanelLateral.jsx';

const INTERESES = [['credito', 'Crédito'], ['ahorro', 'Ahorro'], ['seguros', 'Seguros'], ['sorteos', 'Sorteos'], ['otro', 'Otro']];
const soloDigitos = (v) => String(v || '').replace(/\D/g, '');
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Contenido del formulario: va dentro de PanelLateral para heredar el tema del módulo del asesor.
const Formulario = ({ onClose, onCreado }) => {
  const t = useTema();
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const { d, set, campo, errores, validar } = useFormulario({
    empresa_codigo: '', nombres: '', apellidos: '', cedula: '', celular: '', correo: '', interes_principal: '', acepta_habeas_data: false,
  }, {
    empresa_codigo: obligatorio('Elige la empresa del prospecto'),
    nombres:   obligatorio(),
    apellidos: obligatorio(),
    cedula:    (v) => (soloDigitos(v).length < 5 ? 'Escribe el número de cédula' : null),
    celular:   (v) => (soloDigitos(v).length < 10 ? 'Escribe el celular de 10 dígitos' : null),
    correo:    (v) => (v && !CORREO.test(String(v).trim()) ? 'Escribe un correo válido, por ejemplo nombre@correo.com' : null),
    acepta_habeas_data: (v) => (v ? null : 'El prospecto debe aceptar el tratamiento de sus datos'),
  });

  // `llenarAhora`: el asesor completa el formulario junto al prospecto, en esta misma pantalla
  const crear = async ({ llenarAhora = false } = {}) => {
    if (!validar()) return;
    setGuardando(true);
    setError('');
    try {
      const { data } = await apiService.post('/captacion/prospectos', limpiar({
        empresa_codigo: d.empresa_codigo,
        nombres: d.nombres.trim(),
        apellidos: d.apellidos.trim(),
        cedula: soloDigitos(d.cedula),
        celular: soloDigitos(d.celular),
        correo: d.correo.trim().toLowerCase(),
        interes_principal: d.interes_principal,
        acepta_habeas_data: true,
      }));
      toast.success('Prospecto creado');
      onCreado(data);
      if (llenarAhora) window.open(`/conocenos/${data.token}?m=stand`, '_blank');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el prospecto. Inténtalo de nuevo.');
    } finally { setGuardando(false); }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); crear(); }} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="Después de crearlo">
        Envíale su enlace por WhatsApp para que llene el formulario en su celular, o usa “Llenar ahora” para completarlo juntos en esta pantalla.
      </Aviso>
      {error && <Aviso tono="error">{error}</Aviso>}

      <Grupo titulo="Empresa">
        <EmpresaSelect value={d.empresa_codigo} onChange={(v) => set('empresa_codigo', v)} error={errores.empresa_codigo} etiqueta="Empresa con convenio" />
      </Grupo>

      <Grupo titulo="Datos de la persona">
        <Fila>
          <Entrada etiqueta="Nombres" requerido autoComplete="off" placeholder="Juan Carlos" {...campo('nombres')} />
          <Entrada etiqueta="Apellidos" requerido autoComplete="off" placeholder="García López" {...campo('apellidos')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Cédula" requerido inputMode="numeric" autoComplete="off" placeholder="1234567890" {...campo('cedula')} />
          <Entrada etiqueta="Celular" requerido type="tel" inputMode="tel" autoComplete="off" placeholder="300 123 4567" {...campo('celular')} />
        </Fila>
        <Entrada etiqueta="Correo (opcional)" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" placeholder="nombre@correo.com" {...campo('correo')} />
        <Lista etiqueta="Interés principal (opcional)" opciones={INTERESES} placeholder="Sin definir" {...campo('interes_principal')} />
      </Grupo>

      <Grupo titulo="Autorización">
        <div>
          <Casilla checked={d.acepta_habeas_data} onChange={(v) => set('acepta_habeas_data', v)} name="acepta_habeas_data">
            El prospecto acepta el tratamiento de sus datos personales conforme a la Ley 1581 de 2012.
          </Casilla>
          {errores.acepta_habeas_data && <p role="alert" className={t.errorTexto}>{errores.acepta_habeas_data}</p>}
        </div>
      </Grupo>

      {Object.values(errores).some(Boolean) && <Aviso tono="error">Revisa los campos marcados para continuar.</Aviso>}

      <BarraAcciones
        onBack={onClose} etiquetaAtras="Cancelar" etiqueta="Crear prospecto" cargando={guardando}
        extra={(
          <BotonSecundario onClick={() => crear({ llenarAhora: true })} disabled={guardando} title="Crea el prospecto y abre el formulario para llenarlo juntos">
            <Monitor size={16} /> <span className="hidden sm:inline">Llenar ahora</span>
          </BotonSecundario>
        )}
      />
    </form>
  );
};

const PanelNuevoProspecto = ({ onClose, onCreado }) => (
  <PanelLateral titulo="Nuevo prospecto" onClose={onClose}>
    <Formulario onClose={onClose} onCreado={onCreado} />
  </PanelLateral>
);

export default PanelNuevoProspecto;
