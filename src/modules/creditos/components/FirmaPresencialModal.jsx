import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { MotorFirma } from '../../firma/pages/FirmarPage.jsx';
import { botonLinea, botonPrimario, mensajeError, tipoDoc } from '../lib/formato.js';

// Texto adicional del consentimiento cuando el documento firmado se conserva en el expediente del crédito.
// BORRADOR: debe revisarlo Jurídica (finalidad, plazo de conservación y quién accede) antes de producción.
const TEXTO_CONSERVACION = 'Autorizo además que la Cooperativa Progresemos conserve estos documentos firmados, incluida la imagen de mi firma y, si la di, de mi huella, '
  + 'para el trámite, la administración y el cobro de mi crédito, y que solo los consulte el personal autorizado.';
const VERSION_TEXTO = 'firma-credito-v1';

/**
 * Firma presencial de los documentos de una solicitud con el motor de firma: el asociado firma una vez (y da su huella si quiere)
 * y se aplica a todos. Cada PDF firmado se sube a Kernel y se enlaza a la solicitud con su folio; el servidor comprueba que sea
 * exactamente el que produjo el motor.
 */
const FirmaPresencialModal = ({
  solicitudId, asociado, pendientes, onTerminado, onClose,
  // Por defecto los documentos del asesor; Cartera indica sus propias rutas (comprobante y estudio de crédito)
  urlContenido = (p) => `/creditos/${solicitudId}/documentos/${p.id}/contenido`,
  urlFirmado = `/creditos/${solicitudId}/firmado`,
}) => {
  const [docs, setDocs] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [fase, setFase] = useState('firmando');       // firmando | guardando | listo
  const [estado, setEstado] = useState({});           // id → 'guardando' | 'ok' | mensaje de error
  const resultadosRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const out = [];
      for (const p of pendientes) {
        // Los bytes vienen del backend (no directo de S3): así no dependen del CORS del bucket
        const { data } = await apiService.get(urlContenido(p), { responseType: 'arraybuffer' });
        out.push({ id: p.id, nombre: p.nombre, bytes: new Uint8Array(data) });
      }
      if (vivo) setDocs(out);
    })().catch((err) => vivo && setErrorCarga(mensajeError(err, 'No se pudieron descargar los documentos a firmar')));
    return () => { vivo = false; };
  }, [solicitudId, pendientes]);

  const firmantes = useMemo(() => [{ nombre: `${asociado.nombre} ${asociado.apellido}`.replace(/\s+/g, ' ').trim(), tipo_doc: 'CC', num_doc: asociado.codigo, rol: 'asociado' }], [asociado]);

  const guardar = async (lista) => {
    setFase('guardando');
    let fallos = 0;
    for (const r of lista) {
      if (estado[r.id] === 'ok') continue;
      setEstado((e) => ({ ...e, [r.id]: 'guardando' }));
      try {
        // El servidor comprueba que el archivo es exactamente el que produjo el motor (por su folio y huella) antes de guardarlo
        const fd = new FormData();
        fd.append('folio', r.folio);
        fd.append('archivo', new Blob([r.bytes], { type: 'application/pdf' }), r.nombre);
        await apiService.post(urlFirmado, fd);
        setEstado((e) => ({ ...e, [r.id]: 'ok' }));
      } catch (err) {
        fallos += 1;
        setEstado((e) => ({ ...e, [r.id]: mensajeError(err, 'No se pudo guardar') }));
      }
    }
    if (fallos === 0) { setFase('listo'); toast.success('Documentos firmados y guardados en el expediente'); onTerminado(); } else setFase('firmando');
  };

  const onFirmados = (lista) => { resultadosRef.current = lista; guardar(lista); };
  const hayErrores = Object.values(estado).some((v) => v !== 'ok' && v !== 'guardando');

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#020617] font-mono text-[#a0d4e0]">
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-slate-800 bg-[#08101e] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest text-[#84cc16]">FIRMA PRESENCIAL · {asociado.nombre} {asociado.apellido}</p>
          <p className="truncate text-[11px] text-slate-400">{pendientes.map((p) => tipoDoc(p.tipo)).join(' · ')}</p>
        </div>
        <button type="button" onClick={onClose} disabled={fase === 'guardando'} className={botonLinea}><X size={13} /> CERRAR</button>
      </div>

      {(fase === 'guardando' || hayErrores || fase === 'listo') && (
        <div className="mx-auto mt-4 max-w-2xl space-y-2 rounded-sm border border-slate-700 bg-[#08101e] p-4 text-xs">
          <p className="text-[10px] tracking-widest text-[#84cc16]">GUARDANDO EN EL EXPEDIENTE</p>
          {pendientes.map((p) => {
            const e = estado[p.id];
            return (
              <p key={p.id} className="flex items-start gap-2">
                {e === 'ok' ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-400" /> : e === 'guardando' ? <Loader2 size={14} className="mt-0.5 animate-spin" /> : e ? <AlertTriangle size={14} className="mt-0.5 text-rose-400" /> : <span className="w-3.5" />}
                <span>{p.nombre}{e && e !== 'ok' && e !== 'guardando' && <span className="block text-rose-300">{e}</span>}</span>
              </p>
            );
          })}
          {hayErrores && fase !== 'guardando' && (
            <button type="button" onClick={() => guardar(resultadosRef.current)} className={botonPrimario}>REINTENTAR LO QUE FALTA</button>
          )}
          {hayErrores && <p className="text-[11px] text-slate-500">Los PDF firmados siguen disponibles abajo para descargarlos mientras no cierres esta ventana.</p>}
        </div>
      )}

      <div className="p-4">
        {errorCarga && <p className="text-xs text-rose-300">{errorCarga}</p>}
        {!errorCarga && !docs && <p className="text-xs text-slate-400"><Loader2 size={14} className="mr-2 inline animate-spin" />Descargando los documentos a firmar…</p>}
        {docs && (
          <MotorFirma documentosIniciales={docs} firmantesIniciales={firmantes} onFirmados={onFirmados} onCancelar={onClose}
            textoExtra={TEXTO_CONSERVACION} versionTexto={VERSION_TEXTO} />
        )}
      </div>
    </div>
  );
};

export default FirmaPresencialModal;
