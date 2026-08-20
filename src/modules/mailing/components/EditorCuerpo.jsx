import { useState, useEffect } from 'react';
import { ChevronLeft, Code } from 'lucide-react';
import { PLANTILLAS_INFO, generarHtml } from '../utils/plantillaHtml.js';

const ACCENT = '#6366f1';

// ── Selector de plantilla ─────────────────────────────────────────────────────
const SelectorPlantilla = ({ onElegir, onHtml }) => (
  <div>
    <p className="text-[9px] tracking-[2px] text-[#475569] mb-3">ELIGE UNA PLANTILLA</p>
    <div className="grid grid-cols-3 gap-3 mb-4">
      {PLANTILLAS_INFO.map(p => (
        <button key={p.tipo} onClick={() => onElegir(p.tipo)}
          className="flex flex-col items-start gap-2 p-4 border border-[#1e293b] rounded-sm hover:border-[#6366f133] hover:bg-[#0d1829] transition-all text-left group">
          <span className="text-2xl">{p.emoji}</span>
          <div>
            <p className="text-xs font-bold text-[#e2e8f0] mb-0.5 group-hover:text-white transition-colors">{p.nombre}</p>
            <p className="text-[10px] text-[#475569] leading-snug">{p.descripcion}</p>
          </div>
        </button>
      ))}
    </div>
    <button onClick={onHtml}
      className="flex items-center gap-1.5 text-[9px] tracking-wider text-[#334155] hover:text-[#475569] transition-colors">
      <Code size={10} /> Editar HTML directamente
    </button>
  </div>
);

// ── Formulario de campos por plantilla ────────────────────────────────────────
const FormPlantilla = ({ plantilla, onChange, onVolver }) => {
  const info = PLANTILLAS_INFO.find(p => p.tipo === plantilla.tipo);
  if (!info) return null;
  const campos = plantilla.campos ?? {};

  const set = (key, val) => onChange({ ...plantilla, campos: { ...campos, [key]: val } });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onVolver}
          className="flex items-center gap-1 text-[9px] tracking-wider text-[#475569] hover:text-[#6aacbc] transition-colors">
          <ChevronLeft size={11} /> PLANTILLAS
        </button>
        <span className="text-[#1e293b]">/</span>
        <span className="text-[10px] tracking-wider" style={{ color: ACCENT }}>
          {info.emoji} {info.nombre.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {info.campos.map(({ key, label, tipo, placeholder, optional }) => (
          <div key={key}>
            <label className="text-[10px] tracking-[2px] text-[#6aacbc] block mb-1.5">
              {label.toUpperCase()}
              {optional && <span className="text-[#334155] normal-case tracking-normal ml-1">— opcional</span>}
            </label>
            {tipo === 'textarea' ? (
              <textarea
                value={campos[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                rows={key === 'cuerpo' || key === 'mensaje' ? 5 : 3}
                className="w-full bg-[#0d1829] border border-[#1e293b] rounded-sm px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#6366f144] transition-colors resize-y" />
            ) : (
              <input
                value={campos[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0d1829] border border-[#1e293b] rounded-sm px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#6366f144] transition-colors" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Editor HTML directo ───────────────────────────────────────────────────────
const EditorHtml = ({ value, onChange, onVolver }) => (
  <div>
    <div className="flex items-center gap-3 mb-3">
      <button onClick={onVolver}
        className="flex items-center gap-1 text-[9px] tracking-wider text-[#475569] hover:text-[#6aacbc] transition-colors">
        <ChevronLeft size={11} /> PLANTILLAS
      </button>
      <span className="text-[#1e293b]">/</span>
      <span className="text-[10px] tracking-wider text-[#6aacbc] flex items-center gap-1">
        <Code size={10} /> HTML DIRECTO
      </span>
    </div>
    <p className="text-[9px] text-[#334155] mb-2">
      Etiquetas básicas: &lt;p&gt;, &lt;b&gt;, &lt;a href&gt;, &lt;ul&gt;&lt;li&gt;. Se inyecta dentro del template de la cooperativa.
    </p>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={10}
      placeholder={'<p>Estimado asociado,</p>\n<p>...</p>'}
      className="w-full bg-[#0d1829] border border-[#1e293b] rounded-sm px-3 py-2 text-sm text-[#e2e8f0] font-mono outline-none focus:border-[#6366f144] transition-colors resize-y" />
  </div>
);

// ── Preview en vivo ───────────────────────────────────────────────────────────
const PreviewVivo = ({ html }) => {
  if (!html) return null;
  return (
    <div className="mt-4 border border-[#1e293b] rounded-sm overflow-hidden">
      <p className="text-[9px] tracking-[2px] text-[#334155] px-3 py-2 border-b border-[#1e293b] bg-[#080f1c]">
        VISTA PREVIA
      </p>
      <div className="p-4 bg-[#0d1829] text-sm text-[#a0d4e0] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
// plantilla: { tipo, campos } | null
// cuerpoHtml: string (HTML generado o manual)
// onChange: ({ plantilla, cuerpoHtml }) => void
const EditorCuerpo = ({ plantilla, cuerpoHtml, onChange }) => {
  // 'elegir' | 'plantilla' | 'html'
  const [modo, setModo] = useState(() => {
    if (plantilla?.tipo) return 'plantilla';
    if (cuerpoHtml)      return 'html';
    return 'elegir';
  });

  // Regenerar HTML cada vez que cambian los campos de la plantilla
  useEffect(() => {
    if (modo === 'plantilla' && plantilla) {
      const html = generarHtml(plantilla);
      onChange({ plantilla, cuerpoHtml: html });
    }
  }, [plantilla, modo]);

  const elegirTipo = (tipo) => {
    const nuevaPlantilla = { tipo, campos: {} };
    setModo('plantilla');
    onChange({ plantilla: nuevaPlantilla, cuerpoHtml: '' });
  };

  const irHtml = () => {
    setModo('html');
    onChange({ plantilla: null, cuerpoHtml });
  };

  const volver = () => {
    setModo('elegir');
    onChange({ plantilla: null, cuerpoHtml: '' });
  };

  const actualizarPlantilla = (p) => {
    const html = generarHtml(p);
    onChange({ plantilla: p, cuerpoHtml: html });
  };

  const html = modo === 'plantilla' ? generarHtml(plantilla) : cuerpoHtml;

  return (
    <div>
      {modo === 'elegir' && (
        <SelectorPlantilla onElegir={elegirTipo} onHtml={irHtml} />
      )}
      {modo === 'plantilla' && plantilla && (
        <>
          <FormPlantilla
            plantilla={plantilla}
            onChange={actualizarPlantilla}
            onVolver={volver} />
          <PreviewVivo html={html} />
        </>
      )}
      {modo === 'html' && (
        <EditorHtml
          value={cuerpoHtml}
          onChange={v => onChange({ plantilla: null, cuerpoHtml: v })}
          onVolver={volver} />
      )}
    </div>
  );
};

export default EditorCuerpo;
