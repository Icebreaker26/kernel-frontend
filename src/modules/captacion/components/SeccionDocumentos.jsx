import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FileText, Loader2, RefreshCcw } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import { mensajeErrorSubida, subirDocumento } from '../utils/subidaDocumento.js';
import { Aviso, BarraAcciones, Grupo } from './publico/ui.jsx';
import { TIPOS_PERMITIDOS } from './publico/imagen.js';

const LADOS = [
  { lado: 'frente',  titulo: 'Frente de tu cédula',  ayuda: 'La cara con tu foto y tu número.' },
  { lado: 'reverso', titulo: 'Reverso de tu cédula', ayuda: 'La cara de atrás.' },
];

const CasillaDocumento = ({ titulo, ayuda, s, onElegir }) => {
  const input = useRef(null);
  const listo = s.estado === 'listo';
  const subiendo = s.estado === 'subiendo';

  return (
    <div className={`rounded-2xl border-2 border-dashed p-4 transition ${
      listo ? 'border-[#5B9C3C]/60 bg-[#EEF5E9]/60' : s.estado === 'error' ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`}>
      {/* Sin `capture`: así el celular ofrece cámara, galería o archivos. */}
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={titulo}
             accept={TIPOS_PERMITIDOS.join(',')}
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onElegir(f); }} />

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
          {s.preview ? <img src={s.preview} alt="" className="h-full w-full object-cover" />
            : s.nombre ? <FileText size={30} /> : <Camera size={30} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-slate-900">{titulo}</p>
          <p className="truncate text-sm text-slate-500">{s.nombre && !subiendo ? s.nombre : ayuda}</p>

          {subiendo && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={s.progreso} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-[#065B8E] transition-all" style={{ width: `${s.progreso}%` }} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Loader2 size={14} className="animate-spin" /> Subiendo… {s.progreso}%</p>
            </div>
          )}
          {listo && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#3F7A25]"><CheckCircle2 size={16} /> Cargada</p>}
        </div>
      </div>

      {s.estado === 'error' && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {s.error}</p>
      )}

      {!subiendo && (
        <button type="button" onClick={() => input.current.click()}
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition ${
            listo ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-[#065B8E] text-white hover:brightness-95'}`}>
          {listo || s.estado === 'error' ? <RefreshCcw size={18} /> : <Camera size={18} />}
          {listo ? 'Cambiar' : s.estado === 'error' ? 'Intentar de nuevo' : 'Tomar foto o elegir archivo'}
        </button>
      )}
    </div>
  );
};

const inicial = (yaCargado) => ({ estado: yaCargado ? 'listo' : 'vacio', progreso: 0, nombre: '', preview: null, error: '' });

const SeccionDocumentos = ({ token, yaCargado, onSave, saving, onBack }) => {
  const [docs, setDocs] = useState({ frente: inicial(yaCargado), reverso: inicial(yaCargado) });
  const previews = useRef({});

  useEffect(() => () => Object.values(previews.current).forEach(u => u && URL.revokeObjectURL(u)), []);

  const set = (lado, cambios) => setDocs(p => ({ ...p, [lado]: { ...p[lado], ...cambios } }));

  const subir = async (lado, original) => {
    set(lado, { estado: 'subiendo', progreso: 0, error: '', nombre: original.name });
    try {
      const url = `/captacion/pub/${token}/documentos/${lado}`;
      const file = await subirDocumento({
        original,
        solicitar: (meta) => pub.post(`${url}/solicitar`, meta).then(r => r.data),
        confirmar: (body) => pub.patch(`${url}/confirmar`, body),
        onProgreso: (progreso) => set(lado, { progreso }),
      });

      if (previews.current[lado]) URL.revokeObjectURL(previews.current[lado]);
      previews.current[lado] = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      set(lado, { estado: 'listo', progreso: 100, nombre: file.name, preview: previews.current[lado] });
    } catch (err) {
      set(lado, { estado: 'error', error: mensajeErrorSubida(err) });
    }
  };

  const ocupado = LADOS.some(({ lado }) => docs[lado].estado === 'subiendo');
  const completo = LADOS.every(({ lado }) => docs[lado].estado === 'listo');

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (completo) onSave({}); }} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="Una foto de cada cara">
        Ponla sobre una superficie plana, con buena luz y sin reflejos. Debe verse completa y legible.
      </Aviso>

      <Grupo>
        {LADOS.map(({ lado, titulo, ayuda }) => (
          <CasillaDocumento key={lado} titulo={titulo} ayuda={ayuda} s={docs[lado]} onElegir={(f) => subir(lado, f)} />
        ))}
        <p className="text-sm text-slate-500">Formatos: JPG, PNG o PDF (hasta 15 MB). Solo la ve el equipo de la cooperativa.</p>
      </Grupo>

      <BarraAcciones onBack={onBack} cargando={saving} deshabilitado={!completo || ocupado}
        ayuda={!completo && !ocupado ? 'Sube las dos caras para continuar.' : undefined} />
    </form>
  );
};

export default SeccionDocumentos;
