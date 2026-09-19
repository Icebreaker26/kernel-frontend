import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Banknote, CalendarDays, LayoutList, LogOut, Lock, Trophy, Wallet } from 'lucide-react';
import { useAsociado } from '../../../context/AsociadoContext.jsx';
import { labelClaseCuota } from '../../../utils/asociados.js';
import apiService from '../../../services/apiService.js';
import { NotificationProvider } from '../../../context/NotificationContext.jsx';
import NotificationBell from '../../../components/NotificationBell.jsx';
import MarcoPublico from '../../captacion/components/publico/MarcoPublico.jsx';
import { ACCENTS, BRAND, SeccionColapsable, Tarjeta, nombrePropio } from '../components/PortalUI.jsx';
import SorteoCard from '../components/portal/SorteoCard.jsx';
import DescuentosSection, { fmtCOP, useDescuentos } from '../components/portal/DescuentosSection.jsx';
import GanadoresSection from '../components/portal/GanadoresSection.jsx';
import SeguridadSection from '../components/portal/SeguridadSection.jsx';
import PrimerLogin from '../components/portal/PrimerLogin.jsx';
import ModalEmail from '../components/portal/ModalEmail.jsx';

// ── Frase del día ─────────────────────────────────────────────────────────────

const FRASES = [
  'El ahorro de hoy es la libertad de mañana.',
  'Juntos construimos más de lo que lograríamos solos.',
  'Cada aporte cuenta. El tuyo también.',
  'Cooperar es crecer con propósito.',
  'Tu constancia es el motor de Progresemos.',
  'Un paso a la vez, siempre hacia adelante.',
  'La solidaridad es nuestra mayor fortaleza.',
  'Invertir en la cooperativa es invertir en ti mismo.',
  'Pequeños aportes, grandes sueños posibles.',
  'Gracias por ser parte de esta comunidad.',
  'El progreso real se construye entre todos.',
  'Tu participación hace la diferencia.',
  'Ahorrando hoy, aseguramos el mañana.',
  'Una cooperativa fuerte empieza con miembros comprometidos.',
  'Confía en el proceso. Confía en tu cooperativa.',
];

const fraseDelDia = () => {
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  return FRASES[seed % FRASES.length];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : null);
const fmtMoney = (v) => (v != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  : null);

const calcAntiguedad = (fechaIngreso, fechaReingreso) => {
  const desde = fechaReingreso ?? fechaIngreso;
  if (!desde) return null;
  const hoy = new Date(); const inicio = new Date(desde);
  let años = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth() - inicio.getMonth();
  if (hoy.getDate() < inicio.getDate()) meses--;
  if (meses < 0) { años--; meses += 12; }
  if (años === 0) return meses === 1 ? '1 mes' : `${meses} meses`;
  return meses === 0
    ? `${años} ${años === 1 ? 'año' : 'años'}`
    : `${años} ${años === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

// Dato clave de la parte alta: icono, valor grande y una línea de apoyo
const DatoClave = ({ icon: Icon, etiqueta, valor, apoyo, color, fondo }) => (
  <div className="flex items-center gap-3 rounded-2xl p-3.5 sm:block sm:p-4" style={{ background: fondo }}>
    <Icon size={22} className="shrink-0" style={{ color }} />
    <div className="min-w-0 sm:mt-2">
      <p className="text-sm font-bold text-slate-600">{etiqueta}</p>
      <p className="mt-0.5 break-words text-lg font-extrabold leading-tight sm:text-xl" style={{ color }}>{valor ?? '—'}</p>
      {apoyo && <p className="mt-0.5 text-sm text-slate-500">{apoyo}</p>}
    </div>
  </div>
);

const FilaDato = ({ etiqueta, valor }) => (
  valor != null && valor !== '' ? (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-base text-slate-500">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-right text-base font-bold text-slate-900">{valor}</dd>
    </div>
  ) : null
);

// ── Página principal ──────────────────────────────────────────────────────────

const MisDatos = () => {
  const { asociado, logout, refreshMe } = useAsociado();
  const [sorteosData, setSorteosData]       = useState([]);
  const [sorteoLoading, setSorteoLoading]   = useState(true);
  const [emailDismissed, setEmailDismissed] = useState(false);
  const { items: descItems, loading: descLoading, total: descTotal } = useDescuentos();

  const cargarSorteo = useCallback(() => {
    setSorteoLoading(true);
    apiService.get('/sorteos/portal/activo')
      .then(({ data }) => setSorteosData(data.sorteos ?? []))
      .catch(() => setSorteosData([]))
      .finally(() => setSorteoLoading(false));
  }, []);

  useEffect(() => { cargarSorteo(); }, [cargarSorteo]);

  if (!asociado) return null;
  if (asociado.primer_login) return <PrimerLogin asociado={asociado} onDone={refreshMe} />;

  const saldo      = asociado.saldo_aporte != null ? Number(asociado.saldo_aporte) : null;
  const antiguedad = calcAntiguedad(asociado.fecha_ingreso, asociado.fecha_reingreso);

  const mostrarModalEmail = !asociado.email && !emailDismissed;
  const primerNombre = nombrePropio(asociado.nombre).split(' ')[0];
  const totalMensual = Number(asociado.valor_aporte ?? 0) + (descLoading ? 0 : descTotal);

  const colorSaldo = saldo == null ? { c: '#475569', f: '#F1F5F9' }
    : saldo < 0 ? { c: ACCENTS.verde.ink, f: ACCENTS.verde.soft }
    : saldo > 0 ? { c: '#B91C1C', f: '#FEE2E2' }
    : { c: '#475569', f: '#F1F5F9' };

  const salir = (
    <div className="flex items-center gap-1">
      <NotificationBell openUp={false} alignRight claro />
      <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-base font-bold text-slate-600 transition hover:bg-slate-100 hover:text-red-600">
        <LogOut size={18} /> Salir
      </button>
    </div>
  );

  return (
    <MarcoPublico ancho="max-w-3xl" derecha={salir}>
      {mostrarModalEmail && <ModalEmail onGuardado={refreshMe} onDespues={() => setEmailDismissed(true)} />}

      <div className="space-y-4 py-2">

        {/* ── Saludo y datos clave ── */}
        <Tarjeta className="overflow-hidden">
          <div className="px-5 pb-4 pt-6">
            <p className="text-base font-bold" style={{ color: BRAND.azul }}>Portal del asociado</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Hola, {primerNombre}</h1>
            <p className="mt-1 text-base text-slate-500">
              {nombrePropio(asociado.nombre)} {nombrePropio(asociado.apellido)} · CC {asociado.codigo}
            </p>
          </div>

          <dl className="px-5">
            <FilaDato etiqueta="Empresa"   valor={asociado.nombre_empresa} />
            <FilaDato etiqueta="Teléfono"  valor={asociado.movil} />
            <FilaDato etiqueta="Dirección" valor={asociado.direccion} />
            <FilaDato etiqueta="Ciudad"    valor={asociado.ciudad} />
          </dl>

          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
            <DatoClave icon={CalendarDays} etiqueta="Antigüedad" valor={antiguedad ?? '—'} color={BRAND.azul} fondo={ACCENTS.azul.soft}
                       apoyo={asociado.fecha_ingreso ? `desde ${fmtFecha(asociado.fecha_ingreso)}` : undefined} />
            <DatoClave icon={Banknote} etiqueta="Tu cuota" valor={asociado.valor_aporte != null ? fmtMoney(asociado.valor_aporte) : '—'} color={ACCENTS.dorado.ink} fondo={ACCENTS.dorado.soft}
                       apoyo={labelClaseCuota(asociado.clase_cuota) ?? undefined} />
            <DatoClave icon={Wallet} etiqueta="Saldo de aporte" valor={saldo != null ? fmtMoney(Math.abs(saldo)) : '—'} color={colorSaldo.c} fondo={colorSaldo.f}
                       apoyo={saldo != null ? (saldo < 0 ? 'A tu favor' : saldo > 0 ? 'Pendiente' : 'Al día') : undefined} />
          </div>

          {(asociado.valor_aporte > 0 || descTotal > 0) && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4" style={{ background: ACCENTS.verde.soft }}>
              <div>
                <p className="text-base font-extrabold text-slate-900">Total que se te descuenta al mes</p>
                {!descLoading && descTotal > 0 && asociado.valor_aporte > 0 && (
                  <p className="mt-0.5 text-sm text-slate-600">Aporte {fmtMoney(asociado.valor_aporte)} + otros descuentos {fmtCOP(descTotal)}</p>
                )}
              </div>
              <p className="shrink-0 text-2xl font-extrabold sm:text-3xl" style={{ color: ACCENTS.verde.ink }}>{fmtCOP(totalMensual)}</p>
            </div>
          )}
        </Tarjeta>

        {/* ── Mensaje del día ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl px-5 py-4 text-center" style={{ background: ACCENTS.dorado.soft }}>
          <p className="text-sm font-bold" style={{ color: ACCENTS.dorado.ink }}>Mensaje del día</p>
          <p className="mt-1 text-lg italic text-slate-800">“{fraseDelDia()}”</p>
        </motion.div>

        {/* ── Mis descuentos ── */}
        <SeccionColapsable titulo="Mis descuentos" icon={LayoutList} accent="azul" badge={!descLoading && descTotal > 0 ? fmtCOP(descTotal) : undefined}>
          <DescuentosSection items={descItems} loading={descLoading} />
        </SeccionColapsable>

        {/* ── Bonos activos ── */}
        {sorteoLoading || sorteosData.length === 0
          ? <SorteoCard sorteoData={null} sorteoLoading={sorteoLoading} onRefresh={cargarSorteo} asociado={asociado} />
          : sorteosData.map((item) => (
              <SorteoCard key={item.sorteo.id} sorteoData={item} sorteoLoading={false} onRefresh={cargarSorteo} asociado={asociado} />
            ))}

        {/* ── Ganadores ── */}
        <SeccionColapsable titulo="Ganadores" icon={Trophy} accent="dorado">
          <GanadoresSection />
        </SeccionColapsable>

        {/* ── Seguridad ── */}
        <SeccionColapsable titulo="Seguridad · Cambiar contraseña" icon={Lock} accent="bosque">
          <SeguridadSection />
        </SeccionColapsable>

        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-2 pt-2 text-sm text-slate-500">
          <Link to="/portal/politica-privacidad" className="font-bold hover:text-[#065B8E] hover:underline">Política de privacidad</Link>
          <span aria-hidden>·</span>
          <Link to="/portal/terminos-condiciones" className="font-bold hover:text-[#065B8E] hover:underline">Términos y condiciones</Link>
        </p>
      </div>
    </MarcoPublico>
  );
};

const MisDatosWithNotifications = () => (
  <NotificationProvider endpoint="/asociados/notificaciones">
    <MisDatos />
  </NotificationProvider>
);

export default MisDatosWithNotifications;
