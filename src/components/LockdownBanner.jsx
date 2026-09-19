import { useState, useEffect } from 'react';
import { ShieldOff, X } from 'lucide-react';

const MSGS = {
  lockdown:   (d) => `Sistema en modo seguridad (N${d.nivel}) — operaciones financieras suspendidas.${d.motivo ? ` Motivo: ${d.motivo}` : ''}`,
  cuarentena: (d) => d.code === 'IP_CUARENTENA'
    ? 'Tu IP está en cuarentena temporal. Contacta al administrador.'
    : 'Tu cuenta está en cuarentena temporal. Contacta al administrador.',
};

export default function LockdownBanner() {
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    const handler = (e) => setEvento(e.detail);
    window.addEventListener('lockdown', handler);
    return () => window.removeEventListener('lockdown', handler);
  }, []);

  if (!evento) return null;

  const es503 = evento.tipo === 'lockdown';

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center gap-3 px-4 py-3 text-sm font-mono"
      style={{
        background: es503 ? '#7f1d1d' : '#431407',
        borderBottom: `1px solid ${es503 ? '#ef444455' : '#f9731655'}`,
        color: es503 ? '#fecaca' : '#fed7aa',
      }}
    >
      <ShieldOff size={16} className="shrink-0" />
      <span className="flex-1">{MSGS[evento.tipo]?.(evento)}</span>
      <button
        onClick={() => setEvento(null)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}
