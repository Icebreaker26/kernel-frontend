import { AlertTriangle, ScanText } from 'lucide-react';
import { TIPOS_CUENTA, numeroCuenta } from '../../creditos/lib/formato.js';

const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '');

/** Los campos de la cuenta que se rellenan con lo leído del certificado (el banco lo da la plantilla; el tipo, la cuenta elegida) */
export const camposDeLectura = (lectura, cuenta) => ({
  banco: lectura.banco, tipo_cuenta: cuenta.tipo_cuenta, numero_cuenta: cuenta.numero_cuenta,
  titular_nombre: lectura.titular_nombre ?? '', titular_documento: lectura.titular_documento ?? '',
});

const AVISOS = {
  sin_texto: 'No se pudo leer el certificado ni por reconocimiento de imagen (poca nitidez o sin texto). Digita los datos.',
  no_reconocido: 'El formato de este certificado no se reconoce todavía. Digita los datos.',
};

/**
 * Lo que se leyó del certificado bancario, como SUGERENCIA: Cartera verifica y guarda. Muestra las alertas (titular distinto, vencido, cuenta
 * inactiva) y, si el certificado lista varias cuentas, deja elegir la que corresponde.
 */
const LecturaCertificado = ({ lectura, cta, editable, onUsar }) => {
  if (!lectura || lectura.estado === 'sin_certificado') return null;
  if (lectura.estado !== 'leido') {
    return <p role="status" className="mb-3 flex items-start gap-2 rounded-sm border border-slate-700 p-2 text-[11px] text-slate-400"><ScanText size={13} className="mt-0.5 shrink-0" aria-hidden />{AVISOS[lectura.estado]}</p>;
  }
  const porOcr = lectura.origen === 'ocr';
  const digitado = soloDigitos(cta.numero_cuenta);
  const coincide = lectura.cuentas.some((c) => c.numero_cuenta === digitado);
  return (
    <div role="region" aria-label="Lectura del certificado bancario" className="mb-3 rounded-sm border border-[#84cc1655] bg-[#84cc1608] p-3">
      <p className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#84cc16]"><ScanText size={13} aria-hidden />{porOcr ? 'LEÍDO DE LA IMAGEN (RECONOCIMIENTO AUTOMÁTICO)' : 'LEÍDO DEL CERTIFICADO BANCARIO'}</p>
      <p className="mt-1 text-[10px] text-slate-500">{porOcr ? 'No se rellena solo: la lectura de imágenes puede confundir dígitos. Compárala con el certificado y úsala si es correcta.' : 'Es una sugerencia: verifica cada dato contra el certificado antes de guardar.'}</p>
      <ul className="mt-2 space-y-1">
        {lectura.cuentas.map((c) => (
          <li key={c.numero_cuenta} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#a0d4e0]">
            <span>{lectura.banco} · {TIPOS_CUENTA[c.tipo_cuenta]} · <span className="font-bold text-[#e2f3f8]">{numeroCuenta(c.numero_cuenta)}</span></span>
            {editable && (porOcr || lectura.cuentas.length > 1) && (
              <button type="button" onClick={() => onUsar(c)} aria-label={`Usar la cuenta terminada en ${c.numero_cuenta.slice(-4)}`} className="rounded-sm border border-slate-700 px-2 py-0.5 text-[9px] font-bold tracking-widest text-[#a0d4e0] hover:border-[#84cc16] hover:text-[#84cc16]">{porOcr && lectura.cuentas.length === 1 ? 'USAR ESTOS DATOS' : 'USAR ESTA'}</button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-slate-400">Titular: {lectura.titular_nombre} · {lectura.tipo_documento} {lectura.titular_documento}{lectura.expedicion ? ` · expedido el ${lectura.expedicion}` : ''}</p>
      {digitado && !coincide && (porOcr ? (
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-amber-800/60 bg-amber-500/[0.05] p-2 text-[11px] text-amber-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />El número digitado difiere de lo leído. El reconocimiento automático puede equivocarse: confirma el número contra el certificado.</p>
      ) : (
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-rose-800/60 bg-rose-500/[0.05] p-2 text-[11px] text-rose-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />El número digitado no coincide con el del certificado.</p>
      ))}
      {lectura.alertas.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label="Alertas del certificado">
          {lectura.alertas.map((a) => (
            <li key={a.codigo} className={`flex items-start gap-2 rounded-sm border p-2 text-[11px] ${a.nivel === 'error' ? 'border-rose-800/60 bg-rose-500/[0.05] text-rose-300' : 'border-amber-800/60 bg-amber-500/[0.05] text-amber-300'}`}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />{a.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LecturaCertificado;
