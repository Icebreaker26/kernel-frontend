import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Piezas visuales compartidas por el detalle de Créditos, el cierre de Cartera y la revisión de Control Interno: así los tres módulos se ven
 * y se leen igual. `acento` cambia el color de énfasis (lima: Créditos y Cartera; violeta: Control Interno).
 */
export const ACENTOS = {
  lima:    { texto: 'text-[#84cc16]', borde: 'border-[#84cc1666]', fondo: 'bg-[#84cc1608]', aro: 'border-[#84cc1666]', hex: '#84cc16' },
  violeta: { texto: 'text-[#c084fc]', borde: 'border-[#c084fc66]', fondo: 'bg-[#c084fc08]', aro: 'border-[#c084fc66]', hex: '#c084fc' },
};

/** Tarjeta de sección: título (con número de paso opcional) a la izquierda y un sello de estado o una acción a la derecha */
export const Seccion = ({ n, titulo, estado, accion, acento = 'lima', etiqueta, children }) => (
  <section aria-label={etiqueta} className="rounded-sm border border-slate-800 bg-[#08101e] p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className={`flex items-center gap-2.5 text-[11px] font-bold tracking-widest ${ACENTOS[acento].texto}`}>
        {n != null && <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${ACENTOS[acento].aro}`}>{n}</span>}
        {titulo}
      </h3>
      {estado}{accion}
    </div>
    {children}
  </section>
);

/** Sello de estado: verde con ✓ si está bien, ámbar con ⚠ si falta algo */
export const Insignia = ({ ok, texto }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{ok ? <CheckCircle2 size={12} aria-hidden /> : <AlertTriangle size={12} aria-hidden />}{texto}</span>
);

/** Cifra clave: `destacado` la resalta (el valor a desembolsar); `chica` es para datos de texto */
export const Cifra = ({ k, v, destacado = false, chica = false, acento = 'lima' }) => (
  <div className={`rounded-sm border p-3 ${destacado ? `${ACENTOS[acento].borde} ${ACENTOS[acento].fondo}` : 'border-slate-800 bg-[#08101e]'}`}>
    <dt className="text-[9px] tracking-widest text-slate-500">{k}</dt>
    <dd className={`mt-1 font-bold ${chica ? 'text-sm text-[#a0d4e0]' : 'text-xl'} ${destacado ? ACENTOS[acento].texto : chica ? '' : 'text-[#e2f3f8]'}`}>{v}</dd>
  </div>
);

export const Dato = ({ k, v }) => <div><dt className="text-[9px] tracking-widest text-slate-500">{k}</dt><dd className="text-xs text-[#a0d4e0]">{v}</dd></div>;

/** "Qué sigue y quién lo hace", siempre a la vista. `x` es lo que devuelve siguientePaso() */
export const TarjetaSiguiente = ({ x, acento = 'lima' }) => (
  <section aria-label="Siguiente paso" className={`rounded-sm border p-4 ${x.terminado ? 'border-slate-700 bg-[#08101e]' : `${ACENTOS[acento].borde} ${ACENTOS[acento].fondo}`}`}>
    <h3 className={`mb-2 text-[11px] font-bold tracking-widest ${ACENTOS[acento].texto}`}>{x.terminado ? 'ESTADO FINAL' : 'SIGUIENTE PASO'}</h3>
    {x.quien && <p className="mb-1 text-[10px] tracking-widest text-slate-500">LO HACE: <span className="font-bold text-[#a0d4e0]">{x.quien.toUpperCase()}</span></p>}
    <p className="text-xs text-[#a0d4e0]">{x.texto}</p>
    {x.restantes > 0 && <p className="mt-1 text-[10px] text-slate-500">y {x.restantes} más por completar</p>}
  </section>
);
