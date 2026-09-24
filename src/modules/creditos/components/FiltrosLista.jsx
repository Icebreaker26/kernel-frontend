import { SlidersHorizontal, X } from 'lucide-react';
import { ESTADOS, FORMAS, MODALIDADES, campo, botonLinea } from '../lib/formato.js';
import { contarFiltros, etiquetasFiltros } from '../lib/lista.js';

const Etiq = ({ id, children }) => <label htmlFor={id} className="mb-1 block text-[10px] tracking-widest text-slate-500">{children}</label>;

/**
 * Panel de filtros de la lista de créditos. Cada filtro es un parámetro de la URL, así que una vista filtrada se puede compartir o volver a abrir.
 * `soloTabla` oculta el filtro de estado en el tablero (el tablero ya muestra todos los estados).
 */
const FiltrosLista = ({ filtros, onCambiar, onLimpiar, opciones, abierto, onAbrir, soloTabla = false }) => {
  const n = contarFiltros(filtros) - (soloTabla && filtros.estado ? 1 : 0);
  const fichas = etiquetasFiltros(filtros, opciones).filter(([k]) => !(soloTabla && k === 'estado'));
  const en = (k) => (e) => onCambiar(k, e.target.value);
  const numero = (k) => (e) => onCambiar(k, e.target.value.replace(/\D/g, ''));

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onAbrir(!abierto)} aria-expanded={abierto} aria-controls="panel-filtros" className={`${botonLinea} ${n ? 'border-[#84cc16] text-[#84cc16]' : ''}`}>
          <SlidersHorizontal size={13} /> FILTROS{n ? ` (${n})` : ''}
        </button>
        {fichas.map(([k, texto]) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-[#08101e] py-0.5 pl-2.5 pr-1 text-[10px] text-[#a0d4e0]">
            {texto}
            <button type="button" onClick={() => onCambiar(k, '')} aria-label={`Quitar filtro: ${texto}`} className="rounded-full p-0.5 hover:bg-slate-700"><X size={10} /></button>
          </span>
        ))}
        {n > 0 && <button type="button" onClick={onLimpiar} className="text-[10px] tracking-widest text-slate-500 underline hover:text-[#84cc16]">LIMPIAR TODO</button>}
      </div>

      {abierto && (
        <div id="panel-filtros" role="region" aria-label="Filtros" className="mt-3 grid grid-cols-1 gap-3 rounded-sm border border-slate-800 bg-[#08101e] p-4 sm:grid-cols-2 lg:grid-cols-4">
          {!soloTabla && (
            <div><Etiq id="f-estado">ESTADO</Etiq>
              <select id="f-estado" value={filtros.estado ?? ''} onChange={en('estado')} className={campo}><option value="">Todos</option>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}</select></div>
          )}
          <div><Etiq id="f-categoria">CATEGORÍA</Etiq>
            <select id="f-categoria" value={filtros.categoria ?? ''} onChange={en('categoria')} className={campo}><option value="">Todas</option>{opciones.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div><Etiq id="f-empresa">EMPRESA</Etiq>
            <select id="f-empresa" value={filtros.empresa ?? ''} onChange={en('empresa')} className={campo}><option value="">Todas</option>{opciones.empresas.map((e) => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select></div>
          <div><Etiq id="f-forma">FORMA DE DESEMBOLSO</Etiq>
            <select id="f-forma" value={filtros.forma ?? ''} onChange={en('forma')} className={campo}><option value="">Todas</option>{Object.entries(FORMAS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
          <div><Etiq id="f-modalidad">TIPO DE FIRMA</Etiq>
            <select id="f-modalidad" value={filtros.modalidad ?? ''} onChange={en('modalidad')} className={campo}><option value="">Todas</option>{Object.entries(MODALIDADES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
          {filtros.todas && (
            <div><Etiq id="f-asesor">ASESOR</Etiq>
              <select id="f-asesor" value={filtros.asesor ?? ''} onChange={en('asesor')} className={campo}><option value="">Todos</option>{opciones.asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
          )}
          <div><Etiq id="f-desde">RADICADAS DESDE</Etiq><input id="f-desde" type="date" value={filtros.desde ?? ''} max={filtros.hasta || undefined} onChange={en('desde')} className={campo} /></div>
          <div><Etiq id="f-hasta">RADICADAS HASTA</Etiq><input id="f-hasta" type="date" value={filtros.hasta ?? ''} min={filtros.desde || undefined} onChange={en('hasta')} className={campo} /></div>
          <div><Etiq id="f-min">VALOR MÍNIMO</Etiq><input id="f-min" inputMode="numeric" value={filtros.min ?? ''} onChange={numero('min')} placeholder="0" className={campo} /></div>
          <div><Etiq id="f-max">VALOR MÁXIMO</Etiq><input id="f-max" inputMode="numeric" value={filtros.max ?? ''} onChange={numero('max')} placeholder="sin tope" className={campo} /></div>
          <div><Etiq id="f-dias">ANTIGÜEDAD MÍNIMA (DÍAS)</Etiq><input id="f-dias" inputMode="numeric" value={filtros.dias ?? ''} onChange={numero('dias')} placeholder="0" className={campo} /></div>
          <div className="self-end">
            <button type="button" aria-pressed={!!filtros.accion} onClick={() => onCambiar('accion', filtros.accion ? '' : '1')} title="Las que están en trámite o devueltas: las que tú debes mover"
              className={`w-full rounded-sm border px-3 py-2 text-[10px] font-bold tracking-widest ${filtros.accion ? 'border-[#84cc16] bg-[#84cc1622] text-[#84cc16]' : 'border-slate-700 text-[#a0d4e0] hover:border-slate-500'}`}>
              {filtros.accion ? '✓ ' : ''}SOLO LAS QUE REQUIEREN MI ACCIÓN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltrosLista;
