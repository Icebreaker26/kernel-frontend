import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { ESTADOS, fechaHora, tipoDoc } from '../../creditos/lib/formato.js';

const CLASES = {
  a_firmar:          'Documento a firmar (sin firmar)',
  firmado:           'Documento firmado',
  evidencia_externa: 'Evidencia de la firma externa',
  adjunto:           'Documento del asociado',
  autorizacion:      'Autorización de la empresa',
};
const kb = (n) => (n == null ? '' : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Pestaña "Documentos" del perfil del asociado: todos los archivos de crédito de todas sus solicitudes, agrupados por solicitud.
 * Lo ve quien trabaja Créditos o Cartera; el asesor solo ve los de sus propias solicitudes. Cada consulta queda en el historial de la solicitud.
 */
const DocumentosAsociado = ({ codigo }) => {
  const [docs, setDocs] = useState(null);
  const [estado, setEstado] = useState('cargando');   // cargando | ok | sin_permiso | error
  const [abriendo, setAbriendo] = useState(null);

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    apiService.get(`/creditos/asociados/${encodeURIComponent(codigo)}/documentos`)
      .then(({ data }) => { if (vivo) { setDocs(data); setEstado('ok'); } })
      .catch((err) => { if (vivo) setEstado(err.response?.status === 403 ? 'sin_permiso' : 'error'); });
    return () => { vivo = false; };
  }, [codigo]);

  const grupos = useMemo(() => {
    const m = new Map();
    for (const d of docs ?? []) {
      if (!m.has(d.solicitud_id)) m.set(d.solicitud_id, { id: d.solicitud_id, radicado: d.radicado, estado: d.solicitud_estado, docs: [], ultima: d.created_at });
      m.get(d.solicitud_id).docs.push(d);
    }
    return [...m.values()].sort((a, b) => new Date(b.ultima) - new Date(a.ultima));
  }, [docs]);

  const abrir = async (d) => {
    setAbriendo(d.archivo_id);
    try {
      const { data } = await apiService.get(`/creditos/asociados/${encodeURIComponent(codigo)}/documentos/${d.archivo_id}/url`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo abrir el documento');
    } finally { setAbriendo(null); }
  };

  if (estado === 'cargando') return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#10b981]" /></div>;
  if (estado === 'sin_permiso') return <p className="flex items-center gap-2 py-10 text-xs text-amber-300"><ShieldAlert size={14} /> Necesitas permiso de Créditos o de Cartera para ver los documentos del asociado.</p>;
  if (estado === 'error') return <p className="py-10 text-xs text-rose-300">No se pudieron cargar los documentos.</p>;
  if (grupos.length === 0) return <p className="py-10 text-center text-xs text-[#6aacbc]">Este asociado aún no tiene documentos de crédito en el sistema.</p>;

  return (
    <div className="space-y-4">
      <p className="text-[10px] leading-relaxed text-[#6aacbc]">
        Documentos de crédito del asociado, agrupados por solicitud. Algunos contienen datos personales y biométricos (Ley 1581): cada vez que abres uno queda registrado en el historial de la solicitud.
      </p>
      {grupos.map((g) => (
        <section key={g.id} className="rounded-sm border border-[#10b98122] bg-[#08101e]">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#10b98115] px-4 py-2.5">
            <h3 className="text-[11px] font-bold tracking-widest text-[#10b981]">{g.radicado}</h3>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] tracking-wider ${ESTADOS[g.estado]?.c ?? 'border-slate-700 text-slate-400'}`}>{ESTADOS[g.estado]?.t ?? g.estado}</span>
          </header>
          <ul>
            {g.docs.map((d) => (
              <li key={`${d.clase}-${d.id}`} className={`flex items-center gap-3 border-b border-[#10b98108] px-4 py-2.5 last:border-0 ${d.vigente ? '' : 'opacity-50'}`}>
                <FileText size={14} className="shrink-0 text-[#6aacbc]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-[#a0d4e0]">
                    {d.clase === 'autorizacion' ? CLASES.autorizacion : `${tipoDoc(d.tipo)} · ${CLASES[d.clase] ?? d.clase}`}
                    {!d.vigente && <span className="ml-2 text-[9px] tracking-wider text-slate-400">SIN VIGENCIA</span>}
                  </p>
                  <p className="truncate text-[10px] text-[#6aacbc]">{d.nombre} · {kb(d.size_bytes)} · {fechaHora(d.created_at)}{d.subido_por_nombre ? ` · ${d.subido_por_nombre}` : ''}</p>
                </div>
                <button type="button" onClick={() => abrir(d)} disabled={abriendo === d.archivo_id} aria-label={`Abrir ${d.nombre}`} title="Abrir en una pestaña nueva"
                  className="shrink-0 text-[#6aacbc] transition-colors hover:text-[#10b981] disabled:opacity-40">
                  {abriendo === d.archivo_id ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default DocumentosAsociado;
