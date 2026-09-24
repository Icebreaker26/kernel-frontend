import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal from '../../creditos/components/Modal.jsx';
import TarjetaPago from '../../creditos/components/TarjetaPago.jsx';
import { campo, fecha, fechaHora, hoyISO, mensajeError, moneda, numeroCuenta } from '../../creditos/lib/formato.js';

const ACCENT = '#34d399';
const TABS = [['pendiente', 'POR PAGAR'], ['pagada', 'PAGADOS'], ['anulada', 'DEVUELTOS']];
const btn = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40';

// Lo que se ve en la orden, en una frase, para confirmar antes de pagar
const frase = (o) => (o.forma_pago === 'transferencia'
  ? `${moneda(o.monto)} a ${o.titular_nombre} · ${o.banco} ${o.tipo_cuenta} ${numeroCuenta(o.numero_cuenta)}`
  : `${moneda(o.monto)} a ${o.asociado_nombre} (${o.forma_pago})`);

const ModalPagar = ({ orden, cuentas, onClose, onPagado }) => {
  const elegibles = cuentas.filter((c) => (orden.forma_pago === 'efectivo' ? ['banco', 'caja'].includes(c.tipo) : c.tipo === 'banco'));
  const [f, setF] = useState({ cuenta_origen_id: '', referencia: '', fecha_pago: hoyISO() });
  const [confirmo, setConfirmo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const ok = f.cuenta_origen_id && f.referencia.trim().length >= 3 && f.fecha_pago && confirmo;

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await apiService.post(`/tesoreria/desembolsos/${orden.id}/pagar`, { cuenta_origen_id: f.cuenta_origen_id, referencia: f.referencia.trim(), fecha_pago: f.fecha_pago });
      toast.success('Pago registrado');
      onPagado();
    } catch (err) { toast.error(mensajeError(err)); } finally { setEnviando(false); }
  };

  return (
    <Modal titulo="REGISTRAR EL PAGO" onClose={onClose} ancho="max-w-xl">
      <form onSubmit={enviar} className="space-y-3">
        <TarjetaPago asociado={{ codigo: orden.asociado_codigo, nombre: orden.asociado_nombre }} monto={orden.monto} forma={orden.forma_pago}
          cuenta={orden.forma_pago === 'transferencia' ? orden : null} acento={ACCENT} />
        <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">CUENTA DE LA COOPERATIVA DE LA QUE SALE EL DINERO</span>
          <select value={f.cuenta_origen_id} onChange={(e) => setF({ ...f, cuenta_origen_id: e.target.value })} className={campo}>
            <option value="">— elige —</option>
            {elegibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.entidad ? ` · ${c.entidad}` : ''}{c.numero ? ` · ${c.numero}` : ''}</option>)}
          </select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">REFERENCIA (COMPROBANTE DEL BANCO, Nº DE CHEQUE O RECIBO)</span>
            <input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} className={campo} maxLength={100} autoComplete="off" /></label>
          <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">FECHA DEL PAGO</span>
            <input type="date" value={f.fecha_pago} max={hoyISO()} onChange={(e) => setF({ ...f, fecha_pago: e.target.value })} className={campo} /></label>
        </div>
        <label className="flex items-start gap-2 rounded-sm border border-slate-700 p-2 text-xs">
          <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#34d399]" />
          <span>Confirmo que hice el pago de <strong>{frase(orden)}</strong>.</span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`${btn} border-slate-600 text-[#a0d4e0]`}>CANCELAR</button>
          <button type="submit" disabled={!ok || enviando} className={`${btn} border-[#34d399] bg-[#34d399] text-[#020617] hover:bg-[#6ee7b7]`}>{enviando ? 'REGISTRANDO…' : 'REGISTRAR PAGO'}</button>
        </div>
      </form>
    </Modal>
  );
};

const ModalDevolver = ({ orden, onClose, onDevuelto }) => {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await apiService.post(`/tesoreria/desembolsos/${orden.id}/devolver`, { motivo: motivo.trim() });
      toast.success('Devuelto a Control Interno');
      onDevuelto();
    } catch (err) { toast.error(mensajeError(err)); } finally { setEnviando(false); }
  };
  return (
    <Modal titulo="NO SE PUEDE PAGAR: DEVOLVER A CONTROL INTERNO" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-xs text-slate-400">{orden.radicado} · {frase(orden)}</p>
        <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">¿POR QUÉ NO SE PUEDE PAGAR? (OBLIGATORIO)</span>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} maxLength={1000} /></label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`${btn} border-slate-600 text-[#a0d4e0]`}>CANCELAR</button>
          <button type="submit" disabled={motivo.trim().length < 3 || enviando} className={`${btn} border-rose-600 bg-rose-600 text-white hover:bg-rose-500`}>DEVOLVER</button>
        </div>
      </form>
    </Modal>
  );
};

/** Desembolsos de crédito: una orden de pago por crédito aprobado por Control Interno, con a quién, cuánto y a qué cuenta */
const Desembolsos = () => {
  const [tab, setTab] = useState('pendiente');
  const [filas, setFilas] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);   // { tipo: 'pagar' | 'devolver', orden }

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await apiService.get('/tesoreria/desembolsos', { params: { estado: tab } });
      setFilas(data);
    } catch (err) { setError(err.response?.status === 403 ? 'No tienes permiso para ver los desembolsos.' : 'No se pudieron cargar los desembolsos.'); }
  }, [tab]);
  useEffect(() => { setFilas(null); cargar(); }, [cargar]);
  useEffect(() => { apiService.get('/tesoreria/cuentas').then(({ data }) => setCuentas(data)).catch(() => {}); }, []);

  return (
    <div className="p-6 font-mono text-[#a0d4e0]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[3px]" style={{ color: ACCENT }}>DESEMBOLSOS DE CRÉDITO</h2>
          <p className="mt-1 text-[11px] text-slate-500">Créditos aprobados por Control Interno. Cada tarjeta dice a quién, cuánto y a qué cuenta se paga.</p>
        </div>
        <button type="button" onClick={cargar} aria-label="Actualizar" className="rounded-sm border border-slate-700 p-2 hover:text-[#34d399]"><RefreshCw size={14} /></button>
      </div>

      <nav className="mb-4 flex gap-1" aria-label="Estado de los desembolsos">
        {TABS.map(([k, t]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
            className={`rounded-sm px-3 py-1.5 text-[10px] tracking-widest ${tab === k ? 'bg-[#34d39922] text-[#34d399]' : 'text-[#7ec8d8] hover:text-[#34d399]'}`}>{t}{tab === k && filas ? ` (${filas.length})` : ''}</button>
        ))}
      </nav>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {!error && !filas && <p className="text-xs text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Cargando…</p>}
      {filas && !filas.length && <p className="text-xs text-slate-500">{tab === 'pendiente' ? 'No hay desembolsos por pagar.' : 'No hay registros en esta pestaña.'}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {filas?.map((o) => (
          <article key={o.id} className="space-y-3" aria-label={`Desembolso ${o.radicado}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold" style={{ color: ACCENT }}>{o.radicado}</h3>
              <p className="text-[10px] text-slate-500">Aprobado por {o.aprobada_por_nombre} · {fechaHora(o.aprobada_at)}{o.estado === 'pendiente' && o.dias_espera > 0 ? ` · espera ${o.dias_espera} día(s)` : ''}</p>
            </div>
            <TarjetaPago asociado={{ codigo: o.asociado_codigo, nombre: o.asociado_nombre }} monto={o.monto} forma={o.forma_pago} cuenta={o.forma_pago === 'transferencia' ? o : null} acento={ACCENT} />
            {o.estado === 'pendiente' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setModal({ tipo: 'pagar', orden: o })} className={`${btn} border-[#34d399] bg-[#34d399] text-[#020617] hover:bg-[#6ee7b7]`}>PAGAR</button>
                <button type="button" onClick={() => setModal({ tipo: 'devolver', orden: o })} className={`${btn} border-rose-700 text-rose-300 hover:bg-rose-950/40`}><Undo2 size={13} /> NO SE PUEDE PAGAR</button>
              </div>
            )}
            {o.estado === 'pagada' && (
              <p className="text-xs text-emerald-300">Pagado el {fecha(o.fecha_pago)} desde {o.cuenta_origen_nombre} · referencia <strong>{o.referencia_pago}</strong> · por {o.pagada_por_nombre}</p>
            )}
            {o.estado === 'anulada' && <p className="text-xs text-rose-300">Devuelto a Control Interno: {o.anulada_motivo}</p>}
          </article>
        ))}
      </div>

      {modal?.tipo === 'pagar' && <ModalPagar orden={modal.orden} cuentas={cuentas} onClose={() => setModal(null)} onPagado={() => { setModal(null); cargar(); }} />}
      {modal?.tipo === 'devolver' && <ModalDevolver orden={modal.orden} onClose={() => setModal(null)} onDevuelto={() => { setModal(null); cargar(); }} />}
    </div>
  );
};

export default Desembolsos;
