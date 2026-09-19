import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Menu, X } from 'lucide-react';
import { Logo } from '../../captacion/components/publico/MarcoPublico.jsx';
import { BRAND } from '../../captacion/data/marca.js';

// Pagos en línea: por ahora sigue en la página actual de la cooperativa. Se cambia aquí y se actualiza en todo el sitio.
export const PAGOS_URL = 'https://www.cooperativaprogresemos.coop/pagos/';

export const ENLACES = [
  ['Servicios', '#servicios'],
  ['Beneficios', '#beneficios'],
  ['Presencia', '#presencia'],
  ['Cómo asociarte', '#como'],
  ['Contacto', '#contacto'],
];

// Encabezado sólido (no transparente: el texto de la página no se debe ver a través del menú) y con botones
// grandes. "Quiero asociarme" es siempre el llamado principal (en celular vive en la barra fija de abajo).
const Cabecera = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-8">
        <a href="#inicio" aria-label="Cooperativa Progresemos, ir al inicio"><Logo className="h-10 md:h-12" /></a>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {ENLACES.map(([t, h]) => (
            <a key={h} href={h} className="rounded-lg px-3.5 py-2 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">{t}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="/portal" className="hidden rounded-xl px-4 py-2.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 xl:inline-block">Portal de asociados</a>
          {/* Pagos: siempre a la vista (en celular como botón compacto, junto al menú) */}
          <a href={PAGOS_URL} className="inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[15px] font-extrabold transition hover:bg-[#EEF5E9] md:px-4 md:py-2.5"
             style={{ borderColor: BRAND.verde, color: '#3F7A25' }}>
            <CreditCard size={18} /> <span>Pagos<span className="hidden sm:inline"> en línea</span></span>
          </a>
          <Link to="/asociate" className="hidden rounded-xl px-4 py-2.5 text-[15px] font-extrabold text-white shadow-sm transition hover:brightness-110 sm:inline-block md:px-5"
                style={{ background: BRAND.azul }}>
            Quiero asociarme
          </Link>
          <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
                  className="rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 lg:hidden">
            {abierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {abierto && (
        <nav aria-label="Menú móvil" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <ul className="grid gap-1">
            <li><a href={PAGOS_URL} className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-extrabold text-[#3F7A25] hover:bg-[#EEF5E9]"><CreditCard size={18} /> Pagos en línea</a></li>
            {ENLACES.map(([t, h]) => (
              <li key={h}>
                <a href={h} onClick={() => setAbierto(false)} className="block rounded-lg px-3 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100">{t}</a>
              </li>
            ))}
            <li><a href="/portal" className="block rounded-lg px-3 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100">Portal de asociados</a></li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Cabecera;
