import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, Users, ClipboardCheck, BarChart2, ShieldCheck, UploadCloud, LogOut } from 'lucide-react';
import apiService from '../../../services/apiService.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import UserAvatar from '../../../components/UserAvatar.jsx';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import GeometricBackground from '../../../components/GeometricBackground.jsx';

const ACCENT = '#10b981';

const ITEMS_BASE = [
  { icon: Users,          label: 'PROSPECTOS',    path: '/captacion',               exact: true },
  { icon: ClipboardCheck, label: 'VINCULACIONES', path: '/captacion/vinculaciones' },
  { icon: BarChart2,      label: 'MIS VALORES',   path: '/captacion/valores' },
];

const activo = (item, actual) => (item.exact ? actual === item.path : actual === item.path || actual.startsWith(`${item.path}/`));

const NavItem = ({ item, actual }) => {
  const navigate = useNavigate();
  const on = activo(item, actual);
  const Icon = item.icon;
  return (
    <button
      onClick={() => navigate(item.path)}
      aria-current={on ? 'page' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-sm border px-3 py-2 text-xs tracking-wide transition-all ${
        on ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
           : 'border-transparent text-slate-400 hover:border-emerald-500/10 hover:bg-emerald-500/5 hover:text-slate-200'}`}
    >
      <Icon size={14} style={{ color: on ? ACCENT : undefined }} />
      {item.label}
    </button>
  );
};

const ITEM_CUMPLIMIENTO = { icon: ShieldCheck, label: 'CUMPLIMIENTO', path: '/captacion/cumplimiento' };
const ITEM_SOLIDO = { icon: UploadCloud, label: 'SOLIDO', path: '/captacion/solido' };

const CaptacionLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();
  // El acceso de cumplimiento (permiso VALIDAR) se descubre preguntándole a la API: si responde, se muestra la pestaña
  const [veCumplimiento, setVeCumplimiento] = useState(false);
  useEffect(() => { apiService.get('/captacion/cumplimiento/listas').then(() => setVeCumplimiento(true)).catch(() => {}); }, []);
  // Igual con la operación del RPA de SOLIDO (permiso rpa READ): si la API responde, se muestra la pestaña
  const [veSolido, setVeSolido] = useState(false);
  useEffect(() => { apiService.get('/rpa/agentes').then(() => setVeSolido(true)).catch(() => {}); }, []);
  const ITEMS = [...ITEMS_BASE, ...(veCumplimiento ? [ITEM_CUMPLIMIENTO] : []), ...(veSolido ? [ITEM_SOLIDO] : [])];

  return (
    <div className="relative flex min-h-screen flex-col bg-[#020617] font-mono md:flex-row">
      <GeometricBackground />

      {/* Móvil: barra superior con pestañas */}
      <header className="relative z-20 border-b border-emerald-900/30 bg-[#041a12]/90 md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <button onClick={() => navigate('/selector')} aria-label="Volver al panel principal"
                  className="flex items-center gap-1 rounded-sm border border-emerald-900/30 bg-emerald-900/10 px-2 py-1.5 text-[10px] tracking-wide text-slate-400">
            <ChevronLeft size={13} /> PANEL
          </button>
          <p className="text-sm font-bold tracking-[4px] text-emerald-400">KERNEL <span className="text-[10px] tracking-[2px] text-slate-500">// CAPTACIÓN</span></p>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={logout} aria-label="Salir" className="rounded-sm p-1.5 text-slate-400 hover:text-red-400"><LogOut size={15} /></button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {ITEMS.map(item => {
            const on = activo(item, pathname);
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)} aria-current={on ? 'page' : undefined}
                      className={`flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[10px] tracking-wide ${
                        on ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-transparent text-slate-400'}`}>
                <Icon size={12} /> {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Escritorio: barra lateral */}
      <aside className="relative hidden w-52 shrink-0 flex-col border-r border-emerald-900/30 bg-[#041a12]/60 px-4 py-6 md:flex">
        <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-emerald-500" />
        <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-emerald-500" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-emerald-900/60" />
        <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-emerald-900/60" />

        <div className="mb-6 border-b border-emerald-900/20 pb-4">
          <button
            onClick={() => navigate('/selector')}
            className="mb-3 flex w-full items-center gap-1.5 rounded-sm border border-emerald-900/30 bg-emerald-900/10 px-2 py-1.5 text-xs tracking-wide text-slate-400 transition-all hover:border-emerald-700/50 hover:bg-emerald-900/20 hover:text-emerald-400"
          >
            <ChevronLeft size={13} /> PANEL PRINCIPAL
          </button>
          <p className="text-base font-bold tracking-[4px] text-emerald-400" style={{ textShadow: '0 0 12px #10b98166' }}>KERNEL</p>
          <p className="mt-1 text-[11px] tracking-[2px] text-slate-500">// CAPTACIÓN</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map(item => <NavItem key={item.path} item={item} actual={pathname} />)}
        </nav>

        <div className="mt-2 border-t border-emerald-900/20 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <UserAvatar url={user?.avatar_url} nombre={user?.nombre} size={28} accent={ACCENT} />
            <p className="truncate text-[10px] tracking-wider text-slate-400">{user?.nombre?.toUpperCase()}</p>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-sm border border-red-900/20 bg-red-900/5 px-2 py-1.5 text-[10px] tracking-wide text-slate-400 transition-all hover:border-red-700/40 hover:bg-red-900/15 hover:text-red-400"
            >
              <LogOut size={13} /> SALIR
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 md:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0"
             style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.005) 2px, rgba(16,185,129,0.005) 4px)' }} />
        <div className="relative z-10 md:h-full md:overflow-auto"><Outlet /></div>
      </main>
    </div>
  );
};

const CaptacionLayout = () => (
  <NotificationProvider endpoint="/notificaciones">
    <CaptacionLayoutInner />
  </NotificationProvider>
);

export default CaptacionLayout;
