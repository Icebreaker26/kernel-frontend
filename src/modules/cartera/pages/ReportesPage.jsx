import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { botonLinea, botonPrimario, campo, fecha, hoyISO, mensajeError, moneda } from '../../creditos/lib/formato.js';

const suma = (filas, k) => filas.reduce((t, f) => t + Number(f[k] ?? 0), 0);

const Tabla = ({ titulo, ayuda, filas, columnas, totales, cargando, onCsv, descargando }) => (
  <section className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-[11px] font-bold tracking-widest text-[#fbbf24]">{titulo}</h3>
        <p className="text-[10px] text-slate-500">{ayuda}</p>
      </div>
      <button type="button" disabled={descargando || cargando || !filas.length} onClick={onCsv} className={botonLinea}>
        <Download size={13} /> {descargando ? 'PREPARANDO…' : 'EXPORTAR ARCHIVO PLANO (CSV)'}
      </button>
    </div>
    {cargando ? <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>
      : !filas.length ? <p className="text-xs text-slate-500">No hay registros en este mes.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] tracking-widest text-slate-500">
              <tr>{columnas.map((c) => <th key={c.k} className={`px-2 py-1.5 ${c.der ? 'text-right' : ''}`}>{c.t}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.radicado} className="border-t border-slate-800/70">
                  {columnas.map((c) => <td key={c.k} className={`px-2 py-1.5 ${c.der ? 'text-right' : ''}`}>{c.f ? c.f(f[c.k]) : f[c.k]}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-600 font-bold text-[#fbbf24]">
                {columnas.map((c, i) => <td key={c.k} className={`px-2 py-1.5 ${c.der ? 'text-right' : ''}`}>{i === 0 ? `TOTAL (${filas.length})` : totales[c.k] != null ? moneda(totales[c.k]) : ''}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
  </section>
);

const COLUMNAS_AVALES = [
  { k: 'fecha_completado', t: 'FECHA', f: fecha }, { k: 'radicado', t: 'RADICADO' }, { k: 'cedula', t: 'CÉDULA' }, { k: 'asociado', t: 'ASOCIADO' },
  { k: 'valor_solicitado', t: 'VALOR SOLICITADO', der: true, f: moneda }, { k: 'aval_porcentaje', t: '%', der: true, f: (v) => `${Number(v)}%` },
  { k: 'aval_valor', t: 'VALOR AVAL', der: true, f: moneda }, { k: 'desembolso_neto', t: 'DESEMBOLSO NETO', der: true, f: moneda },
];
const COLUMNAS_FIRMAS = [
  { k: 'fecha_completado', t: 'FECHA', f: fecha }, { k: 'radicado', t: 'RADICADO' }, { k: 'cedula', t: 'CÉDULA' }, { k: 'asociado', t: 'ASOCIADO' },
  { k: 'proveedor', t: 'PROVEEDOR' }, { k: 'documentos', t: 'DOCS.', der: true }, { k: 'valor', t: 'VALOR', der: true, f: moneda },
];

const ReportesPage = () => {
  const [mes, setMes] = useState(() => hoyISO().slice(0, 7));
  const [avales, setAvales] = useState([]);
  const [firmas, setFirmas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [bajando, setBajando] = useState('');
  const [param, setParam] = useState(null);
  const [tarifa, setTarifa] = useState('');

  const cargarMes = useCallback(async () => {
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    setCargando(true);
    try {
      const [a, f] = await Promise.all([apiService.get('/cartera/reportes/avales', { params: { mes } }), apiService.get('/cartera/reportes/firmas-electronicas', { params: { mes } })]);
      setAvales(a.data.filas);
      setFirmas(f.data.filas);
    } catch (err) { toast.error(mensajeError(err, 'No se pudieron cargar los reportes')); }
    finally { setCargando(false); }
  }, [mes]);
  useEffect(() => { cargarMes(); }, [cargarMes]);

  useEffect(() => {
    apiService.get('/cartera/parametros').then(({ data }) => { setParam(data); setTarifa(String(data.tarifa_firma_electronica)); }).catch(() => {});
  }, []);

  const csv = async (ruta, nombre) => {
    setBajando(ruta);
    try {
      const { data } = await apiService.get(`/cartera/reportes/${ruta}`, { params: { mes, formato: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `${nombre}_${mes}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      let msg = 'No se pudo exportar el archivo';
      try { msg = JSON.parse(await err.response.data.text()).error ?? msg; } catch { /* sin detalle */ }
      toast.error(msg);
    } finally { setBajando(''); }
  };

  const guardarTarifa = async () => {
    try {
      const { data } = await apiService.put('/cartera/parametros/tarifa-firma', { valor: Number(tarifa) });
      setParam((p) => ({ ...p, tarifa_firma_electronica: data.tarifa_firma_electronica }));
      toast.success('Tarifa guardada: aplica a los créditos que se cierren desde ahora');
    } catch (err) { toast.error(mensajeError(err, 'No se pudo guardar la tarifa')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Link to="/cartera" className="inline-flex items-center gap-1 text-[10px] tracking-widest text-[#6aacbc] hover:text-[#00e5ff]"><ArrowLeft size={12} /> VOLVER A LA BANDEJA</Link>
        <div className="ml-auto">
          <label htmlFor="mes-reporte" className="mb-1 block text-[10px] tracking-widest text-slate-500">MES</label>
          <input id="mes-reporte" type="month" value={mes} max={hoyISO().slice(0, 7)} onChange={(e) => setMes(e.target.value)} className={`${campo} w-44`} />
        </div>
      </div>

      <Tabla titulo="AVALES DEL MES" ayuda="Créditos completados en el mes con aval del Fondo Regional." cargando={cargando} filas={avales} columnas={COLUMNAS_AVALES}
        totales={{ valor_solicitado: suma(avales, 'valor_solicitado'), aval_valor: suma(avales, 'aval_valor'), desembolso_neto: suma(avales, 'desembolso_neto') }}
        descargando={bajando === 'avales'} onCsv={() => csv('avales', 'avales')} />

      <Tabla titulo="FIRMAS ELECTRÓNICAS DEL MES" ayuda="Créditos completados en el mes que se firmaron con proveedor externo (tienen costo)." cargando={cargando} filas={firmas} columnas={COLUMNAS_FIRMAS}
        totales={{ valor: suma(firmas, 'valor') }} descargando={bajando === 'firmas-electronicas'} onCsv={() => csv('firmas-electronicas', 'firmas_electronicas')} />

      {param?.puede_configurar && (
        <section className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
          <h3 className="mb-1 text-[11px] font-bold tracking-widest text-[#fbbf24]">TARIFA DE LA FIRMA ELECTRÓNICA</h3>
          <p className="mb-3 text-[10px] text-slate-500">Costo por crédito firmado con proveedor externo. Se descuenta del desembolso y queda congelado al completar cada crédito.</p>
          <div className="flex max-w-sm items-end gap-2">
            <div className="flex-1">
              <label htmlFor="tarifa" className="mb-1 block text-[10px] tracking-widest text-slate-500">VALOR (COP)</label>
              <input id="tarifa" type="number" min="0" step="100" value={tarifa} onChange={(e) => setTarifa(e.target.value)} className={campo} />
            </div>
            <button type="button" disabled={tarifa === '' || Number(tarifa) < 0 || Number(tarifa) === param.tarifa_firma_electronica} onClick={guardarTarifa} className={botonPrimario}>GUARDAR</button>
          </div>
        </section>
      )}
      {param && !param.puede_configurar && <p className="text-[10px] text-slate-500">Tarifa vigente de la firma electrónica: {moneda(param.tarifa_firma_electronica)}. La configura quien tiene permiso de configuración de Cartera.</p>}
    </div>
  );
};

export default ReportesPage;
