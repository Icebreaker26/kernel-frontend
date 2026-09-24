import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { FORMAS, TIPOS_CUENTA, moneda, numeroCuenta } from '../lib/formato.js';

const Fila = ({ k, children }) => (
  <div className="grid grid-cols-[130px_1fr] items-baseline gap-3 border-b border-slate-800/70 py-2 last:border-0">
    <dt className="text-[10px] tracking-widest text-slate-500">{k}</dt>
    <dd className="text-sm text-[#e2f3f8]">{children}</dd>
  </div>
);

/**
 * "A quién, cuánto y a dónde": lo único que Tesorería (y Control Interno al aprobar) necesita ver para pagar sin equivocarse.
 * asociado = { codigo, nombre }; cuenta = { banco, tipo_cuenta, numero_cuenta, titular_nombre, titular_documento, titular_es_asociado } o null (cheque / efectivo).
 */
const TarjetaPago = ({ asociado, monto, forma, cuenta, acento = '#34d399' }) => {
  const [copiado, setCopiado] = useState('');
  const copiar = async (texto, que) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(que); setTimeout(() => setCopiado(''), 2000); } catch { toast.error('No se pudo copiar'); }
  };
  const esTransferencia = forma === 'transferencia';
  const tercero = esTransferencia && cuenta && cuenta.titular_es_asociado === false;

  return (
    <div className="rounded-sm border-2 p-4" style={{ borderColor: tercero ? '#fb7185' : acento }} aria-label="Datos del pago">
      <p className="text-[10px] tracking-widest text-slate-500">{esTransferencia ? 'MONTO A TRANSFERIR' : `MONTO A PAGAR EN ${String(FORMAS[forma] ?? forma).toUpperCase()}`}</p>
      <p className="mb-3 text-3xl font-bold" style={{ color: acento }} data-testid="monto-pago">{moneda(monto)}</p>

      <dl>
        <Fila k="ASOCIADO">
          <span className="font-bold">{asociado.nombre}</span>
          <span className="ml-2 text-xs text-slate-400">C.C. {asociado.codigo}</span>
        </Fila>
        <Fila k="FORMA DE PAGO">{FORMAS[forma] ?? forma}</Fila>
        {esTransferencia && cuenta && (
          <>
            <Fila k="BANCO">{cuenta.banco}</Fila>
            <Fila k="TIPO DE CUENTA">{TIPOS_CUENTA[cuenta.tipo_cuenta] ?? cuenta.tipo_cuenta}</Fila>
            <Fila k="NÚMERO DE CUENTA">
              <span className="font-mono text-lg tracking-wider" data-testid="numero-cuenta">{numeroCuenta(cuenta.numero_cuenta)}</span>
              <button type="button" onClick={() => copiar(cuenta.numero_cuenta, 'cuenta')} aria-label="Copiar número de cuenta"
                className="ml-3 inline-flex items-center gap-1 rounded-sm border border-slate-600 px-2 py-0.5 text-[10px] tracking-widest text-[#a0d4e0] hover:border-[#34d399]">
                <Copy size={11} /> {copiado === 'cuenta' ? 'COPIADO' : 'COPIAR'}
              </button>
            </Fila>
            <Fila k="TITULAR">
              <span className="font-bold">{cuenta.titular_nombre}</span>
              <span className="ml-2 text-xs text-slate-400">C.C. {cuenta.titular_documento}</span>
            </Fila>
          </>
        )}
        {!esTransferencia && <Fila k="A NOMBRE DE"><span className="font-bold">{asociado.nombre}</span><span className="ml-2 text-xs text-slate-400">C.C. {asociado.codigo}</span></Fila>}
      </dl>

      {esTransferencia && cuenta && (tercero
        ? <p className="mt-3 flex items-start gap-2 rounded-sm border border-rose-500 bg-rose-950/40 p-2 text-xs font-bold text-rose-200" role="alert"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> TITULAR DISTINTO AL ASOCIADO: la cuenta es de un tercero. Verifica antes de pagar.</p>
        : <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} /> La cuenta está a nombre del asociado.</p>)}
    </div>
  );
};

export default TarjetaPago;
