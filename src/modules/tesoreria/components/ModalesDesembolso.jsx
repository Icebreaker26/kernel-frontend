import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import Modal from '../../creditos/components/Modal.jsx';
import TarjetaPago from '../../creditos/components/TarjetaPago.jsx';
import { campo, fecha, hoyISO, mensajeError, moneda } from '../../creditos/lib/formato.js';
import { fechaISO } from '../../creditos/lib/lista.js';
import { cuentasElegibles, destino, frase, validarFechaPago } from '../lib/desembolsos.js';

const btn = 'inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const ACENTO = '#34d399';

const Fila = ({ k, children }) => (
  <div className="grid grid-cols-[120px_1fr] items-baseline gap-3 border-b border-slate-800/70 py-2 last:border-0">
    <dt className="text-[10px] tracking-widest text-slate-500">{k}</dt>
    <dd className="text-sm text-[#e2f3f8]">{children}</dd>
  </div>
);

/**
 * Registrar el pago en DOS pasos: primero los datos (de qué cuenta sale, referencia y fecha) y luego una confirmación que resume todo lo que
 * se va a registrar. Reemplaza la casilla "confirmo": el segundo paso obliga a leer el resumen antes de dejar constancia de un pago.
 */
export const ModalPagar = ({ orden, cuentas, onClose, onPagado }) => {
  const elegibles = useMemo(() => cuentasElegibles(cuentas, orden.forma_pago), [cuentas, orden.forma_pago]);
  const hoy = hoyISO();
  const desde = fechaISO(orden.aprobada_at);
  const [f, setF] = useState({ cuenta_origen_id: '', referencia: '', fecha_pago: hoy });
  const [paso, setPaso] = useState('datos');   // 'datos' | 'confirmar'
  const [enviando, setEnviando] = useState(false);
  const cuenta = elegibles.find((c) => c.id === f.cuenta_origen_id);
  const errorFecha = validarFechaPago(f.fecha_pago, orden.aprobada_at, hoy);
  const listo = !!cuenta && f.referencia.trim().length >= 3 && !errorFecha;

  const enviar = async () => {
    setEnviando(true);
    try {
      await apiService.post(`/tesoreria/desembolsos/${orden.id}/pagar`, { cuenta_origen_id: f.cuenta_origen_id, referencia: f.referencia.trim(), fecha_pago: f.fecha_pago });
      toast.success('Pago registrado');
      onPagado();
    } catch (err) {
      toast.error(mensajeError(err));
      setPaso('datos');   // el servidor rechazó algo (referencia repetida, período cerrado…): se vuelve a los datos para corregirlo
    } finally { setEnviando(false); }
  };

  return (
    <Modal titulo="REGISTRAR EL PAGO" onClose={onClose} ancho="max-w-xl">
      {paso === 'datos' ? (
        <form onSubmit={(e) => { e.preventDefault(); if (listo) setPaso('confirmar'); }} className="space-y-3">
          <TarjetaPago asociado={{ codigo: orden.asociado_codigo, nombre: orden.asociado_nombre }} monto={orden.monto} forma={orden.forma_pago}
            cuenta={orden.forma_pago === 'transferencia' ? orden : null} acento={ACENTO} />
          {elegibles.length === 0 && (
            <p role="alert" className="flex items-start gap-2 rounded-sm border border-rose-800/60 bg-rose-500/[0.05] p-2 text-[11px] text-rose-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
              No hay una cuenta de la cooperativa desde la que se pueda pagar esto ({orden.forma_pago === 'efectivo' ? 'un banco o una caja' : 'una cuenta bancaria'} activa). Créala en Cuentas antes de pagar.</p>
          )}
          <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">CUENTA DE LA COOPERATIVA DE LA QUE SALE EL DINERO</span>
            <select value={f.cuenta_origen_id} onChange={(e) => setF({ ...f, cuenta_origen_id: e.target.value })} className={campo}>
              <option value="">— elige —</option>
              {elegibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.entidad ? ` · ${c.entidad}` : ''}{c.numero ? ` · ${c.numero}` : ''}</option>)}
            </select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">REFERENCIA (COMPROBANTE DEL BANCO, Nº DE CHEQUE O RECIBO)</span>
              <input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} className={campo} maxLength={100} autoComplete="off" /></label>
            <label className="block"><span className="mb-1 block text-[10px] tracking-widest text-slate-500">FECHA DEL PAGO</span>
              <input type="date" value={f.fecha_pago} min={desde || undefined} max={hoy} onChange={(e) => setF({ ...f, fecha_pago: e.target.value })} className={campo} aria-invalid={!!errorFecha} /></label>
          </div>
          {errorFecha && <p role="alert" className="text-[11px] text-rose-300">{errorFecha}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={`${btn} border-slate-600 text-[#a0d4e0]`}>CANCELAR</button>
            <button type="submit" disabled={!listo} className={`${btn} border-[#34d399] bg-[#34d399] text-[#020617] hover:bg-[#6ee7b7]`}>REVISAR Y CONFIRMAR</button>
          </div>
        </form>
      ) : (
        <div className="space-y-3" aria-label="Confirmación del pago">
          <p className="text-[10px] font-bold tracking-widest text-[#34d399]">CONFIRMA ANTES DE REGISTRAR</p>
          <p className="text-xs text-slate-400">Vas a dejar constancia de que <strong className="text-[#e2f3f8]">ya hiciste este pago</strong>. Revisa que todo coincida con lo que hiciste en el banco, en el cheque o en la caja.</p>
          <div className="rounded-sm border-2 p-4" style={{ borderColor: ACENTO }}>
            <p className="text-[10px] tracking-widest text-slate-500">MONTO PAGADO</p>
            <p className="mb-2 text-3xl font-bold" style={{ color: ACENTO }} data-testid="monto-confirmado">{moneda(orden.monto)}</p>
            <dl>
              <Fila k="ASOCIADO"><span className="font-bold">{orden.asociado_nombre}</span><span className="ml-2 text-xs text-slate-400">C.C. {orden.asociado_codigo}</span></Fila>
              <Fila k="A DÓNDE VA">{orden.forma_pago === 'transferencia' ? <>{destino(orden)} <span className="text-xs text-slate-400">· titular {orden.titular_nombre}</span></> : destino(orden)}</Fila>
              <Fila k="SALE DE">{cuenta?.nombre}{cuenta?.entidad ? <span className="text-xs text-slate-400"> · {cuenta.entidad}</span> : null}</Fila>
              <Fila k="REFERENCIA"><span className="font-mono">{f.referencia.trim()}</span></Fila>
              <Fila k="FECHA">{fecha(f.fecha_pago)}</Fila>
            </dl>
            {orden.forma_pago === 'transferencia' && orden.titular_es_asociado === false && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-sm border border-rose-500 bg-rose-950/40 p-2 text-xs font-bold text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />La cuenta es de un tercero ({orden.titular_nombre}), no del asociado.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPaso('datos')} disabled={enviando} className={`${btn} border-slate-600 text-[#a0d4e0]`}><ArrowLeft size={13} aria-hidden />VOLVER Y CORREGIR</button>
            <button type="button" onClick={enviar} disabled={enviando} className={`${btn} border-[#34d399] bg-[#34d399] text-[#020617] hover:bg-[#6ee7b7]`}><CheckCircle2 size={13} aria-hidden />{enviando ? 'REGISTRANDO…' : 'SÍ, YA PAGUÉ: REGISTRAR PAGO'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// Motivos que se repiten: se ofrecen como atajos para no escribirlos cada vez (siempre se pueden editar)
const MOTIVOS = ['El banco rechazó la cuenta', 'Los datos bancarios no coinciden con el certificado', 'El titular de la cuenta no corresponde al asociado', 'El monto no coincide con lo aprobado'];

export const ModalDevolver = ({ orden, onClose, onDevuelto }) => {
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
        <p className="text-[11px] text-slate-500">El crédito vuelve a Control Interno para que lo revise de nuevo. Queda registrado quién lo devolvió y por qué.</p>
        <div className="flex flex-wrap gap-1.5" aria-label="Motivos frecuentes">
          {MOTIVOS.map((m) => (
            <button key={m} type="button" onClick={() => setMotivo(m)} className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-[#a0d4e0] hover:border-slate-500">{m}</button>
          ))}
        </div>
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
