import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, FileSearch, XCircle } from 'lucide-react';
import apiService from '../../../services/apiService.js';

const VerificarPage = () => {
  const inputRef = useRef(null);
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);

  const verificar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setCargando(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('archivo', f);
      const { data } = await apiService.post('/firma/verificar', fd);
      setRes({ ...data, nombreLocal: f.name });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo verificar el archivo.');
    } finally { setCargando(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        Cargue un PDF firmado con Kernel, tal como fue descargado. Se calcula su huella SHA-256 y se compara con el registro; el archivo no se guarda.
      </p>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={verificar} />
      <button type="button" disabled={cargando} onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-sm bg-[#38bdf8] px-4 py-2 text-xs font-bold tracking-widest text-[#020617] disabled:opacity-40">
        <FileSearch size={14} /> {cargando ? 'VERIFICANDO…' : 'CARGAR PDF A VERIFICAR'}
      </button>

      {res?.valido && (
        <div className="mt-5 rounded-sm border border-emerald-800 bg-emerald-950/30 p-4 text-xs">
          <p className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 size={16} /> El documento coincide con el registro de Kernel</p>
          <dl className="mt-3 space-y-1 text-[#a0d4e0]">
            <div><dt className="inline text-slate-500">Folio: </dt><dd className="inline break-all">{res.folio}</dd></div>
            <div><dt className="inline text-slate-500">Documento original: </dt><dd className="inline">{res.nombre_archivo} ({res.paginas} pág.)</dd></div>
            <div><dt className="inline text-slate-500">Fecha: </dt><dd className="inline">{new Date(res.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</dd></div>
            <div><dt className="inline text-slate-500">Funcionario que asistió: </dt><dd className="inline">{res.empleado ?? '—'}</dd></div>
          </dl>
          <p className="mt-3 text-slate-500">Firmantes</p>
          <ul className="list-disc pl-5 text-[#a0d4e0]">
            {res.firmantes.map((f, i) => <li key={i}>{f.nombre} · {f.tipo_doc} {f.num_doc} · {f.rol}{f.con_huella ? ' · con huella' : ''}</li>)}
          </ul>
        </div>
      )}
      {res && !res.valido && (
        <div className="mt-5 rounded-sm border border-red-800 bg-red-950/30 p-4 text-xs text-red-200">
          <p className="flex items-center gap-2 font-bold"><XCircle size={16} /> No se encontró este documento en el registro</p>
          <p className="mt-2 leading-relaxed">Puede que no se haya firmado con Kernel, que se haya modificado después de descargarlo (incluso volver a guardarlo en otro programa cambia su huella) o que no se registrara su hash.</p>
          <p className="mt-2 break-all text-[10px] text-red-300/70">SHA-256 {res.hash}</p>
        </div>
      )}
    </div>
  );
};

export default VerificarPage;
