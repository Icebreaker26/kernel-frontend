import { useState } from 'react';
import { Check, Copy, MessageCircle, RefreshCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Aviso, BotonPrimario, BotonSecundario, Grupo } from '../publico/ui.jsx';
import { useTema } from '../publico/tema.js';
import EmpresaSelect from './EmpresaSelect.jsx';
import PanelLateral from './PanelLateral.jsx';

const mensajeWhatsApp = (url) => `Conoce Cooperativa Progresemos y asóciate desde tu celular:\n${url}`;

const Contenido = () => {
  const t = useTema();
  const [empresa, setEmpresa]   = useState('');
  const [error, setError]       = useState('');
  const [token, setToken]       = useState(null);
  const [ocupado, setOcupado]   = useState(false);
  const [copiado, setCopiado]   = useState(false);
  const [confirmar, setConfirmar] = useState(null); // 'renovar' | 'desactivar'

  const url = token ? `${window.location.origin}/conoce/${token}` : '';

  const pedir = async ({ renovar = false } = {}) => {
    if (!empresa) return setError('Elige la empresa de las personas a quienes les vas a compartir el enlace');
    setOcupado(true);
    setError('');
    try {
      const { data } = await apiService.post('/captacion/enlaces-publicos', { empresa_codigo: empresa, renovar });
      setToken(data.token);
      setConfirmar(null);
      if (renovar) toast.success('Enlace renovado: el anterior dejó de funcionar');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo generar el enlace. Inténtalo de nuevo.');
    } finally { setOcupado(false); }
  };

  const desactivar = async () => {
    setOcupado(true);
    try {
      await apiService.delete(`/captacion/enlaces-publicos/${encodeURIComponent(empresa)}`);
      setToken(null);
      setConfirmar(null);
      toast.success('Enlace desactivado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo desactivar el enlace');
    } finally { setOcupado(false); }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.'); }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-6">
      <Aviso tono="info" titulo="Un enlace fijo para compartir en grupos">
        Quien lo abra ve la presentación de la cooperativa y, si toca “Quiero asociarme”, queda como prospecto tuyo.
        A diferencia del kiosco, <strong>no caduca</strong> ni se cancela al abrir otro.
      </Aviso>

      <Grupo titulo="Empresa" descripcion="El enlace es uno por empresa: muestra su nombre y asigna a quien se asocie a esa empresa.">
        <EmpresaSelect value={empresa} etiqueta="Empresa con convenio"
                       onChange={(v) => { setEmpresa(v); setToken(null); setConfirmar(null); setError(''); }} error={error} />
        {!token && <BotonPrimario onClick={() => pedir()} cargando={ocupado} className="w-full">Generar enlace</BotonPrimario>}
      </Grupo>

      {token && (
        <>
          <Grupo titulo="Tu enlace">
            <code className="block break-all rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-sm text-emerald-900">{url}</code>
            <div className="grid gap-2 sm:grid-cols-2">
              <BotonPrimario onClick={copiar}>{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar enlace</>}</BotonPrimario>
              <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(url))}`} target="_blank" rel="noopener noreferrer"
                 className={`inline-flex items-center justify-center gap-2 transition ${t.botonSecundario}`}>
                <MessageCircle size={16} /> Compartir por WhatsApp
              </a>
            </div>
          </Grupo>

          <Grupo titulo="Qué pasa cuando la gente lo abre">
            <ul className="grid gap-2 text-sm text-slate-600">
              <li>• Cada persona ve la presentación en su celular, a su ritmo, y toca “Quiero asociarme” si le interesa.</li>
              <li>• Sigue en su propio formulario; tú lo ves en tu lista desde que escribe su nombre y documento.</li>
              <li>• Quienes solo miran o no escriben su nombre <strong>no aparecen</strong> en tu lista (se limpian solos a las 24 horas).</li>
            </ul>
          </Grupo>

          <Grupo titulo="Si el enlace llegó a quien no debía">
            {confirmar ? (
              <div className="grid gap-3">
                <Aviso tono="aviso">
                  {confirmar === 'renovar'
                    ? 'Se crea un enlace nuevo y el actual deja de funcionar para todos. Tendrás que volver a compartir el nuevo.'
                    : 'El enlace deja de funcionar para todos. Puedes volver a generarlo cuando quieras y será el mismo.'}
                </Aviso>
                <div className="flex gap-2">
                  <BotonSecundario onClick={() => setConfirmar(null)} disabled={ocupado} className="flex-1">Cancelar</BotonSecundario>
                  <BotonPrimario onClick={() => (confirmar === 'renovar' ? pedir({ renovar: true }) : desactivar())} cargando={ocupado} className="flex-1">
                    {confirmar === 'renovar' ? 'Sí, renovar' : 'Sí, desactivar'}
                  </BotonPrimario>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <BotonSecundario onClick={() => setConfirmar('renovar')}><RefreshCcw size={15} /> Renovar enlace</BotonSecundario>
                <BotonSecundario onClick={() => setConfirmar('desactivar')}><Trash2 size={15} /> Desactivar</BotonSecundario>
              </div>
            )}
          </Grupo>
        </>
      )}
    </div>
  );
};

const PanelEnlaceGrupos = ({ onClose }) => (
  <PanelLateral titulo="Enlace para grupos" subtitulo="Para compartir en WhatsApp u otros grupos" onClose={onClose}>
    <Contenido />
  </PanelLateral>
);

export default PanelEnlaceGrupos;
