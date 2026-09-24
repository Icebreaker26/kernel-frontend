import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { FORMAS, fechaHora, moneda } from '../../creditos/lib/formato.js';

const ACCENT = '#c084fc';

/**
 * Cola de Control Interno: créditos que Cartera marcó como COMPLETADOS. Por ahora solo se ve la cola y se descarga el PDF final;
 * la validación (aprobar o devolver) se define en el siguiente paso.
 */
const CreditosCompletados = () => {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const [bajando, setBajando] = useState(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await apiService.get('/control_interno/creditos');
      setFilas(data);
    } catch (err) {
      setError(err.response?.status === 403 ? 'No tienes permiso para ver esta bandeja.' : 'No se pudo cargar la bandeja.');
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const descargar = async (f) => {
    setBajando(f.id);
    try {
      const { data } = await apiService.get(`/control_interno/creditos/${f.id}/pdf-final`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `credito_${f.radicado}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      let msg = 'No se pudo generar el PDF final';
      try { msg = JSON.parse(await err.response.data.text()).error ?? msg; } catch { /* sin detalle */ }
      toast.error(msg);
    } finally { setBajando(null); }
  };

  return (
    <div className="p-6 font-mono text-[#a0d4e0]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[3px]" style={{ color: ACCENT }}>CRÉDITOS POR REVISAR</h2>
          <p className="mt-1 text-[11px] text-slate-500">Créditos que Cartera terminó. Ábrelos para verificarlos: si todo está bien pasan a Tesorería; si no, los devuelves con el motivo.</p>
        </div>
        <button type="button" onClick={cargar} aria-label="Actualizar" className="rounded-sm border border-slate-700 p-2 text-[#7ec8d8] hover:text-[#c084fc]"><RefreshCw size={14} /></button>
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {!error && !filas && <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>}
      {filas && !filas.length && <p className="text-xs text-slate-500">No hay créditos pendientes de validación.</p>}
      {filas?.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-slate-800 bg-[#08101e]">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] tracking-widest text-slate-500">
              <tr>
                <th className="px-3 py-2">RADICADO</th><th className="px-3 py-2">ASOCIADO</th><th className="px-3 py-2">EMPRESA</th>
                <th className="px-3 py-2 text-right">SOLICITADO</th><th className="px-3 py-2 text-right">AVAL</th><th className="px-3 py-2 text-right">FIRMA ELECTR.</th>
                <th className="px-3 py-2 text-right">DESEMBOLSO</th><th className="px-3 py-2">FORMA</th><th className="px-3 py-2">COMPLETADO</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-slate-800/70">
                  <td className="px-3 py-2 font-bold" style={{ color: ACCENT }}>{f.radicado}</td>
                  <td className="px-3 py-2">{f.asociado_nombre}<span className="block text-[10px] text-slate-500">C.C. {f.asociado_codigo}</span></td>
                  <td className="px-3 py-2">{f.empresa_nombre}</td>
                  <td className="px-3 py-2 text-right">{moneda(f.valor_solicitado)}</td>
                  <td className="px-3 py-2 text-right">{f.con_aval ? `${Number(f.aval_porcentaje)}% · ${moneda(f.aval_valor)}` : '—'}</td>
                  <td className="px-3 py-2 text-right">{f.modalidad_firma === 'externa' ? moneda(f.firma_electronica_valor) : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold">{moneda(f.desembolso_neto)}</td>
                  <td className="px-3 py-2">{FORMAS[f.forma_desembolso] ?? f.forma_desembolso}</td>
                  <td className="px-3 py-2">{fechaHora(f.completada_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/control-interno/creditos/${f.id}`} className="mr-2 inline-flex items-center rounded-sm border border-[#c084fc] bg-[#c084fc] px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-[#020617] hover:bg-[#d8b4fe]">REVISAR</Link>
                    <button type="button" disabled={bajando === f.id} onClick={() => descargar(f)} aria-label={`Descargar PDF final ${f.radicado}`}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-slate-600 px-2.5 py-1.5 text-[10px] tracking-widest hover:border-[#c084fc] hover:text-[#c084fc] disabled:opacity-40">
                      <Download size={12} /> {bajando === f.id ? 'ARMANDO…' : 'PDF FINAL'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreditosCompletados;
