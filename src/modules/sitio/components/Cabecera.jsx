import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Menu, X } from 'lucide-react';
import { BRAND, Logo } from '../compartido.js';
import { RUTAS, URL_ASOCIATE, URL_PORTAL } from '../config.js';

// Enlaces del menú. `ruta` = página propia del sitio; `ancla` = sección del inicio o del pie.
export const ENLACES = [
  { t: 'Servicios',     ruta: RUTAS.servicios },
  { t: 'Beneficios',    ruta: RUTAS.beneficios },
  { t: 'Aliados',       ruta: RUTAS.aliados, soloMovil: true },   // en escritorio se llega desde Beneficios
  { t: 'Nosotros',      ruta: RUTAS.nosotros },
  { t: 'Transparencia', ruta: RUTAS.transparencia },
  { t: 'PQRS',          ruta: RUTAS.pqrs },
  { t: 'Contacto',      ancla: '#contacto' },   // el pie de cada página
];

const claseEnlace = (activo) =>
  `rounded-lg px-3.5 py-2 text-[15px] font-semibold transition hover:bg-slate-100 hover:text-slate-900 ${activo ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`;

// Encabezado semitransparente con desenfoque (se intuye la página detrás, pero el texto no se lee a través del menú) y con botones
// grandes. "Quiero asociarme" es siempre el llamado principal (en celular vive en la barra fija de abajo).
const Cabecera = () => {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();

  // Un enlace con ancla en OTRA página va a esa página y ahí baja a la sección; en la misma, solo baja
  const destino = (l) => (l.ruta && l.ruta !== pathname ? `${l.ruta}${l.ancla || ''}` : l.ancla || l.ruta);
  const activo = (l) => l.ruta === pathname && !l.ancla;

  const Enlace = ({ l, className, onClick }) => (
    l.ruta && l.ruta !== pathname
      ? <Link to={destino(l)} onClick={onClick} className={className} aria-current={activo(l) ? 'page' : undefined}>{l.t}</Link>
      : <a href={destino(l)} onClick={onClick} className={className} aria-current={activo(l) ? 'page' : undefined}>{l.t}</a>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      {/* Franja con los colores de la cooperativa, igual que en el kiosco */}
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-1" style={{ background: BRAND.azul }} />
        <span className="flex-1" style={{ background: BRAND.verde }} />
        <span className="flex-1" style={{ background: BRAND.dorado }} />
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-8">
        <Link to={RUTAS.inicio} aria-label="Cooperativa Progresemos, ir al inicio"><Logo className="h-10 md:h-12" /></Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 xl:flex">
          {ENLACES.filter((l) => !l.soloMovil).map((l) => <Enlace key={l.t} l={l} className={claseEnlace(activo(l))} />)}
        </nav>

        <div className="flex items-center gap-2">
          <a href={URL_PORTAL} className="hidden rounded-xl px-4 py-2.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 2xl:inline-block">Portal de asociados</a>
          {/* Pagos: siempre a la vista (en celular como botón compacto, junto al menú) */}
          <Link to={RUTAS.pagos} className="inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[15px] font-extrabold transition hover:bg-[#EEF5E9] md:px-4 md:py-2.5"
             style={{ borderColor: BRAND.verde, color: '#3F7A25' }}>
            <CreditCard size={18} /> <span>Pagos<span className="hidden sm:inline"> en línea</span></span>
          </Link>
          <a href={URL_ASOCIATE} className="hidden rounded-xl px-4 py-2.5 text-[15px] font-extrabold text-white shadow-sm transition hover:brightness-110 sm:inline-block md:px-5"
             style={{ background: BRAND.azul }}>
            Quiero asociarme
          </a>
          <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
                  className="rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 xl:hidden">
            {abierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {abierto && (
        <nav aria-label="Menú móvil" className="border-t border-slate-200 bg-white px-4 py-3 xl:hidden">
          <ul className="grid gap-1">
            <li><Link to={RUTAS.pagos} onClick={() => setAbierto(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-extrabold text-[#3F7A25] hover:bg-[#EEF5E9]"><CreditCard size={18} /> Pagos en línea</Link></li>
            {ENLACES.map((l) => (
              <li key={l.t}><Enlace l={l} onClick={() => setAbierto(false)} className="block rounded-lg px-3 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100" /></li>
            ))}
            <li><a href={URL_PORTAL} className="block rounded-lg px-3 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100">Portal de asociados</a></li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Cabecera;
