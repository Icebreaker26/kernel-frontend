import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ChevronDown, Clock, PauseCircle, Star, Ticket, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { ACCENTS, Boton, Cargando, Modal, Tarjeta, Vacio } from '../PortalUI.jsx';

// Estado de cada número que ya tiene el asociado
const ESTADO_NUMERO = {
  asignado:              { color: '#3F7A25', fondo: '#EEF5E9', borde: '#5B9C3C', etiqueta: 'Activo' },
  pendiente_adquisicion: { color: '#7A5200', fondo: '#FFFFFF', borde: '#F6AD18', etiqueta: 'Pendiente' },
  pendiente_retiro:      { color: '#B91C1C', fondo: '#FEE2E2', borde: '#F87171', etiqueta: 'Retirando' },
};

const num3 = (n) => String(n).padStart(3, '0');
const cop = (v) => `$${Number(v).toLocaleString('es-CO')}`;

const SorteoCard = ({ sorteoData, sorteoLoading, onRefresh, asociado }) => {
  const [modal, setModal]           = useState(null);
  const [accion, setAccion]         = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [verDisponibles, setVerDisponibles] = useState(false);

  const solicitar = async (numero) => {
    setProcesando(true);
    try {
      await apiService.post('/sorteos/portal/solicitar', { numero, sorteo_id: sorteoData.sorteo.id });
      toast.success(`Solicitud #${num3(numero)} enviada`);
      setModal(null); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al solicitar'); }
    finally { setProcesando(false); }
  };

  const cancelar = async (solicitudId) => {
    setProcesando(true);
    try {
      await apiService.delete(`/sorteos/portal/solicitudes/${solicitudId}`);
      toast.success('Solicitud cancelada');
      setAccion(null); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error ?? 'Error al cancelar'); }
    finally { setProcesando(false); }
  };

  if (sorteoLoading) return <Tarjeta><Cargando texto="Cargando tus bonos…" /></Tarjeta>;

  if (!sorteoData?.sorteo) return (
    <Tarjeta className="p-5"><Vacio icon={Ticket} texto="Tu empresa no tiene un bono activo por ahora." /></Tarjeta>
  );

  const { sorteo } = sorteoData;
  const pausado = sorteo.estado === 'pausado';
  const esUnico = sorteo.tipo_pago === 'unico';
  const activos = sorteoData.mis_boletos.filter((b) => b.estado === 'asignado').length;
  const ac = esUnico ? ACCENTS.dorado : ACCENTS.azul;   // dorado para el bono especial de pago único

  const valor = sorteo.precio_boleto == null ? null
    : esUnico ? `${cop(sorteo.precio_boleto)} · pago único`
    : asociado?.clase_cuota
      ? String(asociado.clase_cuota).startsWith('2') ? `${cop(sorteo.precio_boleto / 2)} quincenal` : `${cop(sorteo.precio_boleto)} mensual`
      : cop(sorteo.precio_boleto);

  const rawPremio = String(sorteo.premio ?? '').replace(/[.$\s]/g, '').replace(/,/g, '');
  const premioNum = Number(rawPremio);
  const premioEsNum = sorteo.premio && !Number.isNaN(premioNum) && premioNum > 0;

  const chip = 'rounded-xl border-2 px-3.5 py-2 font-mono text-base font-extrabold transition hover:brightness-95';

  return (
    <>
      <Tarjeta className="overflow-hidden" >
        {esUnico && (
          <div className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-extrabold" style={{ background: ACCENTS.dorado.soft, color: ACCENTS.dorado.ink }}>
            <Star size={16} fill="currentColor" /> Bono especial · pago único <Star size={16} fill="currentColor" />
          </div>
        )}

        <div className="flex items-start justify-between gap-4 px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: pausado ? '#7A5200' : ac.ink }}>{pausado ? 'Bono pausado' : esUnico ? 'Bono especial' : 'Bono activo'}</p>
            <h3 className="mt-0.5 break-words text-xl font-extrabold leading-snug text-slate-900">{sorteo.nombre}</h3>
            {valor && <p className="mt-1.5 text-base text-slate-600">Valor por bono: <strong className="text-slate-900">{valor}</strong></p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-slate-500">Mis bonos</p>
            <p className="text-4xl font-extrabold leading-none" style={{ color: ac.ink }}>{activos}</p>
          </div>
        </div>

        {sorteo.premio && (
          <div className="px-5 py-5 text-center" style={{ background: ac.soft }}>
            <p className="text-sm font-bold" style={{ color: ac.ink }}>Puedes ganar</p>
            <p className="mt-1 font-extrabold leading-none text-slate-900" style={{ fontSize: 'clamp(1.8rem, 7vw, 2.8rem)' }}>
              {premioEsNum ? cop(premioNum) : sorteo.premio}
            </p>
            {premioEsNum && <p className="mt-1.5 text-sm font-bold" style={{ color: ac.ink }}>en efectivo</p>}
          </div>
        )}

        {pausado && (
          <div className="flex items-center gap-3 border-y border-slate-200 border-l-4 border-l-[#F6AD18] bg-slate-100 px-5 py-3.5 text-base font-bold text-slate-900">
            <PauseCircle size={20} className="shrink-0" /> El plazo de compra está cerrado temporalmente.
          </div>
        )}

        <div className="space-y-6 px-4 py-5 sm:px-5">
          {/* Mis números */}
          {sorteoData.mis_boletos.length > 0 ? (
            <div>
              <p className="mb-3 text-base font-extrabold text-slate-800">Mis números <span className="text-slate-500">({sorteoData.mis_boletos.length})</span></p>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {sorteoData.mis_boletos.map((b) => {
                  const s = ESTADO_NUMERO[b.estado];
                  const puedeInteractuar = (!pausado && b.estado !== 'asignado') || b.estado === 'pendiente_adquisicion' || b.estado === 'pendiente_retiro';
                  return (
                    <button key={b.numero} type="button" disabled={!puedeInteractuar}
                      onClick={() => {
                        if (b.estado === 'pendiente_adquisicion') setAccion({ tipo: 'cancelar_adq', numero: b.numero, solicitudId: b.solicitud_id });
                        if (b.estado === 'pendiente_retiro')      setAccion({ tipo: 'cancelar_ret', numero: b.numero, solicitudId: b.solicitud_id });
                      }}
                      className="flex flex-col items-center rounded-2xl border-2 py-3 transition"
                      style={{ background: s.fondo, borderColor: s.borde, cursor: puedeInteractuar ? 'pointer' : 'default' }}>
                      <span className="font-mono text-2xl font-extrabold leading-none" style={{ color: s.color }}>{num3(b.numero)}</span>
                      <span className="mt-1.5 flex items-center gap-1 text-xs font-bold" style={{ color: s.color }}>
                        {b.estado !== 'asignado' && <Clock size={11} />}{s.etiqueta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-base text-slate-600">Aún no tienes números en este bono.</p>
          )}

          {/* Disponibles */}
          {!pausado && sorteoData.disponibles.length > 0 && (
            <div>
              <p className="mb-3 text-base font-extrabold text-slate-800">Números disponibles <span className="text-slate-500">({sorteoData.disponibles.length})</span></p>
              {!verDisponibles && (
                <div className="flex flex-wrap items-center gap-2">
                  {sorteoData.disponibles.slice(0, 7).map(({ numero }) => (
                    <button key={numero} type="button" onClick={() => setModal(numero)} className={chip} style={{ background: ac.soft, borderColor: ac.main, color: ac.ink }}>{num3(numero)}</button>
                  ))}
                  {sorteoData.disponibles.length > 7 && (
                    <button type="button" onClick={() => setVerDisponibles(true)} className="rounded-xl border-2 border-dashed border-slate-300 px-3.5 py-2 text-base font-bold text-slate-600 hover:border-slate-400">
                      +{sorteoData.disponibles.length - 7} más
                    </button>
                  )}
                </div>
              )}
              <AnimatePresence initial={false}>
                {verDisponibles && (
                  <motion.div key="disponibles" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                      {sorteoData.disponibles.map(({ numero }) => (
                        <button key={numero} type="button" onClick={() => setModal(numero)} className="rounded-xl border-2 py-2 font-mono text-base font-extrabold transition hover:brightness-95"
                                style={{ background: ac.soft, borderColor: ac.main, color: ac.ink }}>{num3(numero)}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setVerDisponibles(false)} className="mt-3 inline-flex items-center gap-1.5 text-base font-bold text-slate-600 hover:text-slate-900">
                      <ChevronDown size={16} style={{ transform: 'rotate(180deg)' }} /> Ocultar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!pausado && sorteoData.disponibles.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center text-base text-slate-600">
              Todos los bonos se han vendido. Te avisaremos cuando haya nuevos disponibles.
            </p>
          )}
        </div>
      </Tarjeta>

      {modal !== null && (
        <Modal titulo={`Solicitar el número #${num3(modal)}`} onClose={() => setModal(null)}>
          <p className="mb-6 text-base leading-relaxed text-slate-600">El número quedará reservado mientras una persona de la cooperativa aprueba tu solicitud.</p>
          <div className="flex justify-end gap-2">
            <Boton variante="suave" onClick={() => setModal(null)}>Cancelar</Boton>
            <Boton onClick={() => solicitar(modal)} loading={procesando} icon={<CheckCircle size={18} />}>Confirmar</Boton>
          </div>
        </Modal>
      )}

      {accion && (
        <Modal titulo={`Número #${num3(accion.numero)}`} onClose={() => setAccion(null)}>
          <p className="mb-1 text-base font-bold text-slate-800">{accion.tipo === 'cancelar_adq' ? 'Tienes una solicitud de adquisición pendiente.' : 'Tienes una solicitud de retiro pendiente.'}</p>
          <p className="mb-6 text-base text-slate-600">¿Quieres cancelarla?</p>
          <div className="flex justify-end gap-2">
            <Boton variante="suave" onClick={() => setAccion(null)}>Cerrar</Boton>
            <Boton variante="peligro" onClick={() => cancelar(accion.solicitudId)} loading={procesando} icon={<X size={18} />}>Cancelar solicitud</Boton>
          </div>
        </Modal>
      )}
    </>
  );
};

export default SorteoCard;
