import { useEffect, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { Aviso, BotonPrimario, Grupo, Lista } from '../publico/ui.jsx';
import PanelLateral from './PanelLateral.jsx';

// Qué tan bien rinde el botón del sitio: cuántos llegan, empiezan, se identifican y firman
const Embudo = ({ e }) => {
  const pasos = [
    ['Visitas', e.visitas], ['Iniciaron', e.iniciados], ['Se identificaron', e.identificados], ['Firmaron', e.firmados],
  ];
  const pct = (n) => (e.visitas > 0 ? `${Math.round((n / e.visitas) * 100)}%` : '—');
  return (
    <Grupo titulo={`Resultados de la página (últimos ${e.dias} días)`}
           descripcion="Cuántas personas llegan desde el botón del sitio y hasta dónde avanzan.">
      <div className="grid grid-cols-2 gap-2">
        {pasos.map(([etiqueta, n], i) => (
          <div key={etiqueta} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-2xl font-extrabold text-slate-900">{n.toLocaleString('es-CO')}</p>
            <p className="text-sm text-slate-600">{etiqueta}</p>
            {i > 0 && <p className="text-xs text-slate-400">{pct(n)} de las visitas</p>}
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">Las visitas se cuentan una vez por sesión del navegador. Solo se guarda la fecha, nada de la persona.</p>
    </Grupo>
  );
};

// Página pública /asociate: el enlace para el botón "Asóciate aquí" del sitio de la cooperativa y el asesor
// al que llegan esas solicitudes. Quien tiene el permiso CONFIGURAR (o es admin) elige el asesor; los demás
// solo ven el enlace y quién lo atiende.
const Contenido = () => {
  const [cfg, setCfg]         = useState(null);
  const [error, setError]     = useState('');
  const [asesor, setAsesor]   = useState('');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = () => apiService.get('/captacion/config/web')
    .then(({ data }) => { setCfg(data); setAsesor(data.asesor?.id || ''); })
    .catch(() => setError('No se pudo cargar la configuración. Inténtalo de nuevo.'));

  useEffect(() => { cargar(); }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cfg.enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.'); }
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await apiService.put('/captacion/config/web', { asesor_uuid: asesor || null });
      await cargar();
      toast.success(asesor ? 'Asesor de la página web actualizado' : 'Página web desactivada: nadie recibirá solicitudes');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar. Inténtalo de nuevo.');
    } finally { setGuardando(false); }
  };

  if (!cfg) return (
    <div className="py-10 text-center text-slate-500">
      {error ? <Aviso tono="error">{error}</Aviso> : <Loader2 className="mx-auto animate-spin" size={26} />}
    </div>
  );

  const cambio = (asesor || '') !== (cfg.asesor?.id || '');

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-6">
      <Aviso tono="info" titulo="Un enlace único para el sitio web">
        Ponlo en el botón <strong>“Asóciate aquí”</strong> de la página de la cooperativa. Quien lo abre ve la presentación,
        elige su empresa y toca “Quiero asociarme”.
      </Aviso>

      <Grupo titulo="Enlace">
        <code className="block break-all rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-sm text-emerald-900">{cfg.enlace}</code>
        <BotonPrimario onClick={copiar}>{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar enlace</>}</BotonPrimario>
      </Grupo>

      {cfg.embudo && <Embudo e={cfg.embudo} />}

      <Grupo titulo="Quién atiende las solicitudes"
             descripcion="Las personas que se asocian desde la web quedan a nombre de este asesor, con la etiqueta WEB en su lista de prospectos.">
        {!cfg.asesor && (
          <Aviso tono="aviso">
            Todavía no hay un asesor asignado: la página muestra “Este servicio no está disponible” hasta que elijas uno.
          </Aviso>
        )}

        {cfg.puede_configurar ? (
          <>
            <Lista etiqueta="Asesor" value={asesor} onChange={(e) => { setAsesor(e.target.value); setError(''); }}
                   opciones={cfg.candidatos.map((c) => [c.id, c.nombre])} placeholder="Sin asignar (página desactivada)" />
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <BotonPrimario onClick={guardar} cargando={guardando} disabled={!cambio} className="w-full">Guardar</BotonPrimario>
            <p className="text-sm text-slate-500">
              Solo aparecen usuarios activos con permiso de escritura en Captación. Si alguien no está en la lista, actívale ese permiso desde la pantalla de permisos.
            </p>
          </>
        ) : (
          <>
            <p className="rounded-lg bg-slate-50 px-3.5 py-3 text-base text-slate-700">
              {cfg.asesor ? <><strong>{cfg.asesor.nombre}</strong> <span className="text-slate-500">· {cfg.asesor.email}</span></> : 'Sin asignar'}
            </p>
            <p className="text-sm text-slate-500">Para cambiarlo necesitas el permiso <strong>CONFIGURAR</strong> del módulo de captación; pídeselo a un administrador.</p>
          </>
        )}
      </Grupo>
    </div>
  );
};

const PanelWeb = ({ onClose }) => (
  <PanelLateral titulo="Página web" subtitulo="Botón “Asóciate aquí” del sitio de la cooperativa" onClose={onClose}>
    <Contenido />
  </PanelLateral>
);

export default PanelWeb;
