import { SlidersHorizontal, X } from 'lucide-react';
import { FORMAS, campo, botonLinea } from '../../creditos/lib/formato.js';
import { FORMAS_PAGO, contarFiltros, etiquetasFiltros } from '../lib/desembolsos.js';

const Etiq = ({ id, children }) => <label htmlFor={id} className="mb-1 block text-[10px] tracking-widest text-slate-500">{children}</label>;

/**
 * Panel de filtros de los desembolsos. Cada filtro es un parámetro de la URL, así una vista filtrada se puede compartir o volver a abrir.
 * Los que solo tienen sentido en lo ya pagado (cuenta de origen) se ofrecen igual: en las otras pestañas simplemente no traen nada.
 */
const FiltrosDesembolsos = ({ filtros, onCambiar, onLimpiar, opciones, abierto, onAbrir }) => {
  const n = contarFiltros(filtros);
  const fichas = etiquetasFiltros(filtros, opciones);
  const en = (k) => (e) => onCambiar(k, e.target.value);
  const numero = (k) => (e) => onCambiar(k, e.target.value.replace(/\D/g, ''));

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onAbrir(!abierto)} aria-expanded={abierto} aria-controls="panel-filtros-tes" className={`${botonLinea} ${n ? 'border-[#34d399] text-[#34d399]' : ''}`}>
          <SlidersHorizontal size={13} /> FILTROS{n ? ` (${n})` : ''}
        </button>
        {fichas.map(([k, texto]) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-[#08101e] py-0.5 pl-2.5 pr-1 text-[10px] text-[#a0d4e0]">
            {texto}
            <button type="button" onClick={() => onCambiar(k, '')} aria-label={`Quitar filtro: ${texto}`} className="rounded-full p-0.5 hover:bg-slate-700"><X size={10} /></button>
          </span>
        ))}
        {n > 0 && <button type="button" onClick={onLimpiar} className="text-[10px] tracking-widest text-slate-500 underline hover:text-[#34d399]">LIMPIAR TODO</button>}
      </div>

      {abierto && (
        <div id="panel-filtros-tes" role="region" aria-label="Filtros" className="mt-3 grid grid-cols-1 gap-3 rounded-sm border border-slate-800 bg-[#08101e] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Etiq id="f-forma">FORMA DE PAGO</Etiq>
            <select id="f-forma" value={filtros.forma ?? ''} onChange={en('forma')} className={campo}><option value="">Todas</option>{FORMAS_PAGO.map((k) => <option key={k} value={k}>{FORMAS[k]}</option>)}</select></div>
          <div><Etiq id="f-empresa">EMPRESA</Etiq>
            <select id="f-empresa" value={filtros.empresa ?? ''} onChange={en('empresa')} className={campo}><option value="">Todas</option>{opciones.empresas.map((e) => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select></div>
          <div><Etiq id="f-aprobador">APROBADO POR</Etiq>
            <select id="f-aprobador" value={filtros.aprobador ?? ''} onChange={en('aprobador')} className={campo}><option value="">Todos</option>{opciones.aprobadores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
          <div><Etiq id="f-cuenta">PAGADO DESDE (CUENTA)</Etiq>
            <select id="f-cuenta" value={filtros.cuenta ?? ''} onChange={en('cuenta')} className={campo}><option value="">Todas</option>{opciones.cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div><Etiq id="f-desde">APROBADOS DESDE</Etiq><input id="f-desde" type="date" value={filtros.desde ?? ''} max={filtros.hasta || undefined} onChange={en('desde')} className={campo} /></div>
          <div><Etiq id="f-hasta">APROBADOS HASTA</Etiq><input id="f-hasta" type="date" value={filtros.hasta ?? ''} min={filtros.desde || undefined} onChange={en('hasta')} className={campo} /></div>
          <div><Etiq id="f-min">MONTO MÍNIMO</Etiq><input id="f-min" inputMode="numeric" value={filtros.min ?? ''} onChange={numero('min')} placeholder="0" className={campo} /></div>
          <div><Etiq id="f-max">MONTO MÁXIMO</Etiq><input id="f-max" inputMode="numeric" value={filtros.max ?? ''} onChange={numero('max')} placeholder="sin tope" className={campo} /></div>
          <div><Etiq id="f-dias">ESPERA MÍNIMA (DÍAS)</Etiq><input id="f-dias" inputMode="numeric" value={filtros.dias ?? ''} onChange={numero('dias')} placeholder="0" className={campo} /></div>
          <div className="self-end lg:col-span-3">
            <button type="button" aria-pressed={!!filtros.tercero} onClick={() => onCambiar('tercero', filtros.tercero ? '' : '1')} title="Las órdenes cuya cuenta no está a nombre del asociado: las que exigen más cuidado"
              className={`w-full rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest ${filtros.tercero ? 'border-[#34d399] bg-[#34d39922] text-[#34d399]' : 'border-slate-700 text-[#a0d4e0] hover:border-slate-500'}`}>
              {filtros.tercero ? '✓ ' : ''}SOLO CUENTAS DE TERCEROS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltrosDesembolsos;
