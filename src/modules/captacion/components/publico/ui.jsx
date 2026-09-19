import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTema } from './tema.js';

// Los controles se dibujan con el tema activo (ver tema.js): claro para el asociado, oscuro/esmeralda
// en el panel del asesor. Inputs a 16px en el tema claro: por debajo iOS hace zoom al enfocar.

const useControl = (error) => {
  const t = useTema();
  return `${t.controlBase} ${error ? t.controlErr : t.controlOk}`;
};

// ── Hook de formulario ───────────────────────────────────────────────────────

export const obligatorio = (msg = 'Este dato es obligatorio') =>
  (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null);

/**
 * `reglas`: { campo: (valor, todo) => mensaje | null }.
 * `campo(k)` devuelve las props que necesita cualquier control de ui.jsx.
 */
export const useFormulario = (inicial, reglas = {}) => {
  const [d, setD]           = useState(inicial);
  const [errores, setErr]   = useState({});

  const set = (k, v) => {
    setD(p => ({ ...p, [k]: v }));
    setErr(e => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const campo = (k) => ({
    name: k,
    value: d[k] ?? '',
    error: errores[k],
    onChange: (e) => set(k, e.target.value),
  });

  const validar = (extra = {}) => {
    const e = {};
    for (const [k, fn] of Object.entries(reglas)) {
      const m = fn(d[k], d);
      if (m) e[k] = m;
    }
    Object.assign(e, extra);
    setErr(e);
    const primero = Object.keys(e).find(k => e[k]);
    if (primero) {
      const el = document.querySelector(`[name="${primero}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !primero;
  };

  return { d, set, setD, campo, errores, setErr, validar };
};

// Quita vacíos: el backend valida enums y fechas, y '' no es ninguna de las dos.
export const limpiar = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );

// ── Controles ────────────────────────────────────────────────────────────────

export const Campo = ({ etiqueta, requerido, error, ayuda, className = '', children }) => {
  const t = useTema();
  return (
    <label className={`block ${className}`}>
      {etiqueta && (
        <span className={t.etiqueta}>
          {etiqueta}{requerido && <span className={t.asterisco} aria-hidden> *</span>}
        </span>
      )}
      {children}
      {ayuda && !error && <span className={t.ayuda}>{ayuda}</span>}
      {error && <span role="alert" className={t.errorTexto}>{error}</span>}
    </label>
  );
};

export const Entrada = ({ etiqueta, requerido, error, ayuda, className, ...props }) => {
  const control = useControl(error);
  return (
    <Campo etiqueta={etiqueta} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      <input className={control} aria-invalid={!!error} {...props} />
    </Campo>
  );
};

export const Lista = ({ etiqueta, requerido, error, ayuda, className, opciones, placeholder = 'Selecciona…', ...props }) => {
  const control = useControl(error);
  return (
    <Campo etiqueta={etiqueta} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      <select className={`${control} appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
              aria-invalid={!!error} {...props}>
        <option value="">{placeholder}</option>
        {opciones.map(o => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </Campo>
  );
};

export const Area = ({ etiqueta, requerido, error, ayuda, className, ...props }) => {
  const control = useControl(error);
  return (
    <Campo etiqueta={etiqueta} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      <textarea className={`${control} resize-none`} rows={3} aria-invalid={!!error} {...props} />
    </Campo>
  );
};

// Valor guardado como string de dígitos; se muestra con separador de miles.
export const Dinero = ({ etiqueta, requerido, error, ayuda, className, value, onChange, ...props }) => {
  const control = useControl(error);
  const t = useTema();
  return (
    <Campo etiqueta={etiqueta} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      <span className="relative block">
        <span className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${t.simbolo}`}>$</span>
        <input
          type="text" inputMode="numeric" autoComplete="off"
          className={`${control} pl-8`}
          aria-invalid={!!error}
          value={value ? Number(value).toLocaleString('es-CO') : ''}
          onChange={(e) => onChange({ target: { value: e.target.value.replace(/\D/g, '') } })}
          {...props}
        />
      </span>
    </Campo>
  );
};

export const Casilla = ({ checked, onChange, children, descripcion, name }) => {
  const t = useTema();
  return (
    <label className={`flex cursor-pointer items-start gap-3 border transition ${t.casilla}`}>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)}
             className={`mt-0.5 h-5 w-5 shrink-0 ${t.check}`} />
      <span className={t.casillaTexto}>
        {children}
        {descripcion && <span className={`mt-0.5 block ${t.casillaDesc}`}>{descripcion}</span>}
      </span>
    </label>
  );
};

export const SiNo = ({ value, onChange, etiqueta }) => (
  <div role="radiogroup" aria-label={etiqueta} className="flex shrink-0 gap-2">
    {[['Sí', true], ['No', false]].map(([l, v]) => {
      const activo = value === v;
      return (
        <button key={l} type="button" role="radio" aria-checked={activo} onClick={() => onChange(v)}
          className={`min-w-[76px] rounded-xl border-2 px-4 py-2.5 text-base font-bold transition ${
            activo
              ? v ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-[#5B9C3C] bg-[#EEF5E9] text-[#3F7A25]'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
          {l}
        </button>
      );
    })}
  </div>
);

export const Segmentado = ({ value, onChange, opciones, etiqueta, name }) => {
  const t = useTema();
  return (
    <div role="radiogroup" aria-label={etiqueta} name={name} tabIndex={name ? -1 : undefined} className={`grid grid-flow-col auto-cols-fr gap-1 ${t.segContenedor}`}>
      {opciones.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`${t.segBoton} ${value === v ? t.segActivo : t.segInactivo}`}>
          {l}
        </button>
      ))}
    </div>
  );
};

// ── Contenedores ─────────────────────────────────────────────────────────────

export const Grupo = ({ titulo, descripcion, children, className = '' }) => {
  const t = useTema();
  return (
    <section className={`${t.grupo} ${className}`}>
      {titulo && <h3 className={t.grupoTitulo}>{titulo}</h3>}
      {descripcion && <p className={t.grupoDesc}>{descripcion}</p>}
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${titulo ? 'mt-4' : ''}`}>{children}</div>
    </section>
  );
};

export const Fila = ({ children }) => <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">{children}</div>;

const ICONOS = { info: Info, aviso: AlertTriangle, error: AlertTriangle, ok: CheckCircle2 };

export const Aviso = ({ tono = 'info', titulo, children, className = '' }) => {
  const t = useTema();
  const Ic = ICONOS[tono];
  return (
    <div role={tono === 'error' ? 'alert' : undefined} className={`${t.avisoBase} ${t.avisos[tono]} ${className}`}>
      <Ic size={20} className="mt-0.5 shrink-0" />
      <div className={t.avisoTexto}>
        {titulo && <p className="font-bold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
};

// ── Botones ──────────────────────────────────────────────────────────────────

export const BotonPrimario = ({ cargando, children, className = '', ...props }) => {
  const t = useTema();
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${t.botonPrimario} ${className}`}
      style={t.botonPrimarioEstilo}
      disabled={cargando || props.disabled}
      {...props}
    >
      {cargando && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

export const BotonSecundario = ({ children, className = '', ...props }) => {
  const t = useTema();
  return (
    <button type="button" className={`inline-flex items-center justify-center gap-2 transition active:scale-[0.99] ${t.botonSecundario} ${className}`} {...props}>
      {children}
    </button>
  );
};

/** Barra pegada al borde inferior: el botón de continuar siempre queda a la mano. */
export const BarraAcciones = ({ onBack, cargando, etiqueta = 'Continuar', etiquetaAtras = 'Atrás', deshabilitado, ayuda, extra = null }) => {
  const t = useTema();
  return (
    <div className={`sticky bottom-0 z-10 -mx-4 mt-2 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 ${t.barra}`}>
      {ayuda && <p className={`mb-2 text-center ${t.barraAyuda}`}>{ayuda}</p>}
      <div className="flex gap-3">
        {onBack && (
          <BotonSecundario onClick={onBack} aria-label={etiquetaAtras === 'Atrás' ? 'Volver al paso anterior' : etiquetaAtras}>
            <ArrowLeft size={18} /> <span className="hidden sm:inline">{etiquetaAtras}</span>
          </BotonSecundario>
        )}
        {extra}
        <BotonPrimario type="submit" cargando={cargando} disabled={deshabilitado} className="flex-1">
          {etiqueta} {!cargando && <ArrowRight size={18} />}
        </BotonPrimario>
      </div>
    </div>
  );
};

export const DEPARTAMENTOS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá',
  'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila',
  'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
];
