import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { campo, botonPrimario, mensajeError } from '../lib/formato.js';

const MOMENTOS = { indiferente: 'Al radicar', antes_firma: 'Al radicar (antes de la firma)', despues_firma: 'Cuando la firma quede completa' };

const Fila = ({ e, onGuardado }) => {
  const [v, setV] = useState({ requiere_autorizacion: e.requiere_autorizacion, momento_autorizacion: e.momento_autorizacion, emails: (e.emails_autorizacion ?? []).join(', ') });
  const [guardando, setGuardando] = useState(false);
  const cambios = v.requiere_autorizacion !== e.requiere_autorizacion || v.momento_autorizacion !== e.momento_autorizacion || v.emails !== (e.emails_autorizacion ?? []).join(', ');

  const guardar = async () => {
    const emails = v.emails.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (emails.some((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) return toast.error('Hay un correo inválido');
    setGuardando(true);
    try {
      const { data } = await apiService.put(`/creditos/config/empresas/${encodeURIComponent(e.codigo)}`, { requiere_autorizacion: v.requiere_autorizacion, momento_autorizacion: v.momento_autorizacion, emails_autorizacion: emails });
      toast.success(`${e.nombre}: guardado`);
      onGuardado(e.codigo, { ...data, configurada: true });
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar')); } finally { setGuardando(false); }
  };

  return (
    <tr className="border-t border-slate-800 align-top">
      <td className="px-3 py-2"><span className="block text-[#a0d4e0]">{e.nombre}</span><span className="text-[10px] text-slate-500">{e.codigo}{!e.configurada && ' · sin configurar (exige autorización)'}</span></td>
      <td className="px-3 py-2"><label className="flex items-center gap-2"><input type="checkbox" checked={v.requiere_autorizacion} onChange={(x) => setV({ ...v, requiere_autorizacion: x.target.checked })} /> Exige</label></td>
      <td className="px-3 py-2"><select value={v.momento_autorizacion} disabled={!v.requiere_autorizacion} onChange={(x) => setV({ ...v, momento_autorizacion: x.target.value })} className={campo}>{Object.entries(MOMENTOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></td>
      <td className="px-3 py-2"><input value={v.emails} disabled={!v.requiere_autorizacion} onChange={(x) => setV({ ...v, emails: x.target.value })} placeholder={e.contacto_email ? `(contacto general: ${e.contacto_email})` : 'sin correo'} className={campo} /></td>
      <td className="px-3 py-2 text-right"><button type="button" disabled={guardando || (!cambios && e.configurada)} onClick={guardar} className={botonPrimario}>{guardando ? '…' : 'GUARDAR'}</button></td>
    </tr>
  );
};

const EmpresasPage = () => {
  const [q, setQ] = useState('');
  const [filas, setFilas] = useState([]);
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => apiService.get('/creditos/config/empresas', { params: { q: q || undefined } })
      .then(({ data }) => { setFilas(data); setSinPermiso(false); })
      .catch((err) => { if (err.response?.status === 403) setSinPermiso(true); else toast.error(mensajeError(err, 'No se pudo cargar')); }), 250);
    return () => clearTimeout(t);
  }, [q]);

  if (sinPermiso) return <p className="text-xs text-amber-300">Necesitas el permiso CONFIGURAR del módulo Créditos para administrar las empresas.</p>;

  return (
    <div>
      <p className="mb-3 max-w-3xl text-[11px] leading-relaxed text-slate-400">
        Define qué empresas exigen autorización para descontar el crédito por nómina, cuándo se les pide el correo y a qué direcciones.
        Una empresa sin configurar se trata como <b>exige autorización</b>. Si no hay correos aquí, se usa el contacto general de la empresa (el asesor lo confirma al radicar).
      </p>
      <div className="relative mb-3 max-w-md">
        <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa" className={`${campo} pl-8`} aria-label="Buscar empresa" />
      </div>
      <div className="overflow-x-auto rounded-sm border border-slate-800">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-[#08101e] text-[10px] tracking-widest text-slate-500"><tr><th className="px-3 py-2">EMPRESA</th><th className="px-3 py-2">AUTORIZACIÓN</th><th className="px-3 py-2">CUÁNDO SE PIDE</th><th className="px-3 py-2">CORREOS</th><th /></tr></thead>
          <tbody>
            {filas.map((e) => <Fila key={e.codigo} e={e} onGuardado={(codigo, d) => setFilas((fs) => fs.map((x) => (x.codigo === codigo ? { ...x, ...d } : x)))} />)}
            {filas.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Sin empresas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmpresasPage;
