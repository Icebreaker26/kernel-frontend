import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../../services/apiService.js';
import { subirAUrlFirmada } from '../../services/captacionPublicApi.js';
import { prepararArchivo, validarDocumento } from '../publico/imagen.js';
import {
  Area, Aviso, BarraAcciones, BotonPrimario, BotonSecundario, Casilla, DEPARTAMENTOS, Dinero, Entrada, Fila, Grupo, Lista,
  SiNo, limpiar, obligatorio, useFormulario,
} from '../publico/ui.jsx';
import { useTema } from '../publico/tema.js';
import EmpresaSelect from './EmpresaSelect.jsx';
import PanelLateral from './PanelLateral.jsx';

/**
 * Solicitud de vinculación diligenciada en papel. El asesor digita el formato físico y sube el escaneo firmado
 * a mano (evidencia de la firma y de la autorización de datos). No hay OTP, firma digital ni llamada de voz.
 * Pasos: 1) identidad (si el prospecto aún no existe) → 2) formulario → 3) firma y cédula.
 */

const soloDigitos = (v) => String(v || '').replace(/\D/g, '');
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const dia = (v) => (v ? String(v).slice(0, 10) : '');
const hoy = () => new Date().toISOString().slice(0, 10);

const TIPOS_DOC = [['CC', 'Cédula de ciudadanía'], ['TI', 'Tarjeta de identidad'], ['CE', 'Cédula de extranjería'], ['PAS', 'Pasaporte']];
const ESTADOS_CIVILES = [['soltero', 'Soltero(a)'], ['casado', 'Casado(a)'], ['union_libre', 'Unión libre'], ['separado', 'Separado(a)'], ['divorciado', 'Divorciado(a)'], ['viudo', 'Viudo(a)']];
const VIVIENDAS = [['propia', 'Propia'], ['arrendada', 'Arrendada'], ['familiar', 'Familiar']];
const CONTRATOS = [['indefinido', 'Indefinido'], ['fijo', 'Término fijo'], ['prestacion_servicios', 'Prestación de servicios'], ['otro', 'Otro']];
const PERIODICIDADES = [['mensual', 'Mensual'], ['quincenal', 'Quincenal']];
const PEP = [
  ['pep_maneja_recursos_publicos', 'Maneja recursos públicos'],
  ['pep_reconocimiento_publico', 'Goza de reconocimiento público'],
  ['pep_poder_publico', 'Tiene poder público'],
  ['pep_vinculo_expuesto', 'Tiene vínculo con una persona expuesta políticamente'],
];

const NUM = ['estrato', 'personas_a_cargo', 'ingresos_mensuales', 'egresos_mensuales', 'otros_ingresos', 'total_activos', 'total_pasivos'];

const INICIAL = {
  tipo_documento: 'CC', ciudad_expedicion: '', fecha_expedicion: '', fecha_nacimiento: '', ciudad_nacimiento: '', departamento_nacimiento: '',
  direccion_residencia: '', ciudad_residencia: '', departamento_residencia: '', telefono_fijo: '', genero: '', nivel_academico: '', profesion: '',
  estado_civil: '', tipo_vivienda: '', estrato: '', personas_a_cargo: '', cabeza_de_hogar: null, declarante_de_renta: null, instruccion_cooperativa: null,
  conyuge_nombre: '', conyuge_cedula: '', conyuge_fecha_nacimiento: '', conyuge_actividad: '',
  cargo: '', fecha_ingreso: '', tipo_contrato: '', direccion_trabajo: '', telefono_trabajo: '', ciudad_trabajo: '', departamento_trabajo: '',
  maneja_recursos_publicos: null, maneja_recursos_desc: '',
  pep_maneja_recursos_publicos: null, pep_reconocimiento_publico: null, pep_poder_publico: null, pep_vinculo_expuesto: null,
  actividad_financiera: '', ciiu: '', ingresos_mensuales: '', egresos_mensuales: '', otros_ingresos: '', otros_ingresos_desc: '',
  total_activos: '', total_pasivos: '', origen_fondos: '', moneda_extranjera: null,
  valor_aporte: '74000', periodicidad: 'mensual', seguro_vida: null, bono_sorteo: null,
  observaciones: '',
};

const PERSONAL = ['tipo_documento', 'ciudad_expedicion', 'fecha_expedicion', 'fecha_nacimiento', 'ciudad_nacimiento', 'departamento_nacimiento', 'direccion_residencia',
  'ciudad_residencia', 'departamento_residencia', 'telefono_fijo', 'genero', 'nivel_academico', 'profesion', 'estado_civil', 'tipo_vivienda', 'estrato',
  'personas_a_cargo', 'cabeza_de_hogar', 'declarante_de_renta', 'instruccion_cooperativa', 'conyuge_nombre', 'conyuge_cedula', 'conyuge_fecha_nacimiento', 'conyuge_actividad'];
const LABORAL = ['cargo', 'fecha_ingreso', 'tipo_contrato', 'direccion_trabajo', 'telefono_trabajo', 'ciudad_trabajo', 'departamento_trabajo', 'maneja_recursos_publicos', 'maneja_recursos_desc'];
const FINANCIERA = ['actividad_financiera', 'ciiu', 'ingresos_mensuales', 'egresos_mensuales', 'otros_ingresos', 'otros_ingresos_desc', 'total_activos', 'total_pasivos', 'origen_fondos', 'moneda_extranjera'];

const tomar = (d, claves) => {
  const o = {};
  for (const k of claves) {
    let v = d[k];
    if (v === '' || v === null || v === undefined) continue;
    if (NUM.includes(k)) v = Number(v);
    o[k] = v;
  }
  return o;
};

const beneficiarioVacio = (orden) => ({ orden, nombres: '', identificacion: '', parentesco: '', porcentaje: '', fecha_nacimiento: '' });
const referenciaVacia = (tipo) => ({ tipo, nombres: '', celular: '', telefono_fijo: '' });

// Fila «pregunta … Sí/No» para preguntas de cumplimiento
const Pregunta = ({ etiqueta, value, onChange, error }) => {
  const t = useTema();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-emerald-100 py-2 last:border-0">
      <span className="text-sm text-slate-700">{etiqueta}</span>
      <div className="text-right">
        <SiNo value={value} onChange={onChange} etiqueta={etiqueta} />
        {error && <p role="alert" className={t.errorTexto}>{error}</p>}
      </div>
    </div>
  );
};

// ── Paso 1: identidad ────────────────────────────────────────────────────────
const PasoIdentidad = ({ onCreado, onClose }) => {
  const t = useTema();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const { d, set, campo, errores, validar } = useFormulario({
    empresa_codigo: '', nombres: '', apellidos: '', cedula: '', celular: '', correo: '', autoriza: false,
  }, {
    empresa_codigo: obligatorio('Elige la empresa'),
    nombres: obligatorio(), apellidos: obligatorio(),
    cedula: (v) => (soloDigitos(v).length < 5 ? 'Escribe el número de cédula' : null),
    celular: (v) => (soloDigitos(v).length < 10 ? 'Escribe el celular de 10 dígitos' : null),
    correo: (v) => (v && !CORREO.test(String(v).trim()) ? 'Escribe un correo válido' : null),
    autoriza: (v) => (v ? null : 'La persona debe haber firmado la autorización de datos en el formulario'),
  });

  const crear = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true); setError('');
    try {
      const { data } = await apiService.post('/captacion/prospectos', limpiar({
        empresa_codigo: d.empresa_codigo, nombres: d.nombres.trim(), apellidos: d.apellidos.trim(),
        cedula: soloDigitos(d.cedula), celular: soloDigitos(d.celular), correo: d.correo.trim().toLowerCase(), acepta_habeas_data: true,
      }));
      onCreado(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el prospecto.');
    } finally { setGuardando(false); }
  };

  return (
    <form onSubmit={crear} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Aviso tono="info" titulo="Formulario diligenciado en papel">
        Registra a la persona, digita lo que trae el formato y sube el escaneo firmado a mano. Si el prospecto ya existe, ábrelo desde su fila en la lista.
      </Aviso>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Grupo titulo="Empresa">
        <EmpresaSelect value={d.empresa_codigo} onChange={(v) => set('empresa_codigo', v)} error={errores.empresa_codigo} etiqueta="Empresa con convenio" />
      </Grupo>
      <Grupo titulo="Datos de la persona">
        <Fila>
          <Entrada etiqueta="Nombres" requerido autoComplete="off" {...campo('nombres')} />
          <Entrada etiqueta="Apellidos" requerido autoComplete="off" {...campo('apellidos')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Cédula" requerido inputMode="numeric" autoComplete="off" {...campo('cedula')} />
          <Entrada etiqueta="Celular" requerido type="tel" inputMode="tel" autoComplete="off" {...campo('celular')} />
        </Fila>
        <Entrada etiqueta="Correo (opcional)" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" {...campo('correo')} />
      </Grupo>
      <Grupo titulo="Autorización de datos">
        <Casilla checked={d.autoriza} onChange={(v) => set('autoriza', v)} name="autoriza">
          El formulario físico incluye la autorización de tratamiento de datos (Ley 1581 de 2012) firmada por la persona.
        </Casilla>
        {errores.autoriza && <p role="alert" className={t.errorTexto}>{errores.autoriza}</p>}
      </Grupo>
      <BarraAcciones onBack={onClose} etiquetaAtras="Cancelar" etiqueta="Continuar" cargando={guardando} />
    </form>
  );
};

// ── Paso 2: formulario ───────────────────────────────────────────────────────
const PasoFormulario = ({ prospecto, inicial, onGuardado, onClose }) => {
  const t = useTema();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [bens, setBens] = useState(inicial.beneficiarios?.length ? inicial.beneficiarios : [beneficiarioVacio(1)]);
  const [refs, setRefs] = useState(inicial.referencias?.length ? inicial.referencias : [referenciaVacia('personal'), referenciaVacia('familiar')]);

  const reglaSiNo = (msg) => (v) => (v === null || v === undefined ? msg : null);
  const { d, set, campo, errores, validar } = useFormulario({ ...INICIAL, ...inicial.campos }, {
    valor_aporte: (v) => (Number(v) < 74000 ? 'El aporte mínimo es $74.000' : Number(v) % 1000 ? 'Debe ser múltiplo de $1.000' : null),
    seguro_vida: reglaSiNo('Indica si toma el seguro'),
    bono_sorteo: reglaSiNo('Indica si toma el bono'),
    pep_maneja_recursos_publicos: reglaSiNo('Responde'), pep_reconocimiento_publico: reglaSiNo('Responde'),
    pep_poder_publico: reglaSiNo('Responde'), pep_vinculo_expuesto: reglaSiNo('Responde'),
  });
  const conyuge = ['casado', 'union_libre'].includes(d.estado_civil);

  const setBen = (i, k, v) => setBens((l) => l.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const setRef = (i, k, v) => setRefs((l) => l.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const guardar = async (e) => {
    e.preventDefault();
    const benLlenos = bens.filter((b) => b.nombres.trim());
    const suma = benLlenos.reduce((s, b) => s + Number(b.porcentaje || 0), 0);
    const extra = {};
    if (benLlenos.length && suma !== 100) extra.beneficiarios = `Los porcentajes suman ${suma}%, deben sumar 100%`;
    if (!validar(extra)) { if (extra.beneficiarios) setError(extra.beneficiarios); return; }
    setGuardando(true); setError('');
    try {
      const { data } = await apiService.put(`/captacion/prospectos/${prospecto.id}/solicitud-fisica`, {
        personal: tomar(d, PERSONAL),
        laboral: tomar(d, LABORAL),
        pep: Object.fromEntries(PEP.map(([k]) => [k, d[k]])),
        financiera: tomar(d, FINANCIERA),
        aportes: { valor_aporte: Number(d.valor_aporte), periodicidad: d.periodicidad, seguro_vida: d.seguro_vida, bono_sorteo: d.bono_sorteo },
        beneficiarios: benLlenos.map((b, i) => limpiar({ orden: i + 1, nombres: b.nombres.trim(), identificacion: b.identificacion.trim(), parentesco: b.parentesco.trim(),
          porcentaje: Number(b.porcentaje || 0), fecha_nacimiento: b.fecha_nacimiento })),
        referencias: refs.filter((r) => r.nombres.trim()).map((r) => limpiar({ tipo: r.tipo, nombres: r.nombres.trim(), celular: r.celular.trim(), telefono_fijo: r.telefono_fijo.trim() })),
        ...(d.observaciones.trim() ? { observaciones: d.observaciones.trim() } : {}),
      });
      toast.success('Formulario digitado');
      onGuardado(data.vinculacion_id);
    } catch (err) {
      const det = err.response?.data?.detalles?.fieldErrors;
      setError(err.response?.data?.error !== 'Datos inválidos' ? (err.response?.data?.error || 'No se pudo guardar') : `Revisa: ${Object.keys(det || {}).join(', ')}`);
    } finally { setGuardando(false); }
  };

  const dept = DEPARTAMENTOS;

  return (
    <form onSubmit={guardar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {error && <Aviso tono="error">{error}</Aviso>}

      <Grupo titulo="Datos personales" descripcion={`${prospecto.nombres} ${prospecto.apellidos} · CC ${prospecto.cedula}`}>
        <Fila>
          <Lista etiqueta="Tipo de documento" opciones={TIPOS_DOC} {...campo('tipo_documento')} />
          <Lista etiqueta="Género" opciones={[['M', 'Masculino'], ['F', 'Femenino']]} {...campo('genero')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Ciudad de expedición" {...campo('ciudad_expedicion')} />
          <Entrada etiqueta="Fecha de expedición" type="date" {...campo('fecha_expedicion')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Fecha de nacimiento" type="date" {...campo('fecha_nacimiento')} />
          <Entrada etiqueta="Ciudad de nacimiento" {...campo('ciudad_nacimiento')} />
        </Fila>
        <Lista etiqueta="Departamento de nacimiento" opciones={dept} {...campo('departamento_nacimiento')} />
        <Entrada etiqueta="Dirección de residencia" {...campo('direccion_residencia')} />
        <Fila>
          <Entrada etiqueta="Ciudad de residencia" {...campo('ciudad_residencia')} />
          <Lista etiqueta="Departamento de residencia" opciones={dept} {...campo('departamento_residencia')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Teléfono fijo" type="tel" {...campo('telefono_fijo')} />
          <Entrada etiqueta="Nivel académico" {...campo('nivel_academico')} />
        </Fila>
        <Entrada etiqueta="Profesión" {...campo('profesion')} />
        <Fila>
          <Lista etiqueta="Estado civil" opciones={ESTADOS_CIVILES} {...campo('estado_civil')} />
          <Lista etiqueta="Tipo de vivienda" opciones={VIVIENDAS} {...campo('tipo_vivienda')} />
        </Fila>
        <Fila>
          <Entrada etiqueta="Estrato (1 a 6)" type="number" min="1" max="6" {...campo('estrato')} />
          <Entrada etiqueta="Personas a cargo" type="number" min="0" {...campo('personas_a_cargo')} />
        </Fila>
        <Pregunta etiqueta="Cabeza de hogar" value={d.cabeza_de_hogar} onChange={(v) => set('cabeza_de_hogar', v)} />
        <Pregunta etiqueta="Declarante de renta" value={d.declarante_de_renta} onChange={(v) => set('declarante_de_renta', v)} />
        <Pregunta etiqueta="Ha recibido instrucción sobre cooperativismo" value={d.instruccion_cooperativa} onChange={(v) => set('instruccion_cooperativa', v)} />
        {conyuge && (
          <>
            <Fila>
              <Entrada etiqueta="Cónyuge — nombre" {...campo('conyuge_nombre')} />
              <Entrada etiqueta="Cónyuge — cédula" {...campo('conyuge_cedula')} />
            </Fila>
            <Fila>
              <Entrada etiqueta="Cónyuge — fecha de nacimiento" type="date" {...campo('conyuge_fecha_nacimiento')} />
              <Entrada etiqueta="Cónyuge — actividad" {...campo('conyuge_actividad')} />
            </Fila>
          </>
        )}
      </Grupo>

      <Grupo titulo="Información laboral">
        <Fila>
          <Entrada etiqueta="Cargo" {...campo('cargo')} />
          <Entrada etiqueta="Fecha de ingreso" type="date" {...campo('fecha_ingreso')} />
        </Fila>
        <Lista etiqueta="Tipo de contrato" opciones={CONTRATOS} {...campo('tipo_contrato')} />
        <Entrada etiqueta="Dirección del trabajo" {...campo('direccion_trabajo')} />
        <Fila>
          <Entrada etiqueta="Teléfono del trabajo" type="tel" {...campo('telefono_trabajo')} />
          <Entrada etiqueta="Ciudad del trabajo" {...campo('ciudad_trabajo')} />
        </Fila>
        <Lista etiqueta="Departamento del trabajo" opciones={dept} {...campo('departamento_trabajo')} />
        <Pregunta etiqueta="Maneja recursos públicos" value={d.maneja_recursos_publicos} onChange={(v) => set('maneja_recursos_publicos', v)} />
        {d.maneja_recursos_publicos && <Entrada etiqueta="¿Cuáles?" {...campo('maneja_recursos_desc')} />}
      </Grupo>

      <Grupo titulo="Cumplimiento (PEP)" descripcion="Todas las preguntas son obligatorias; el formato trae la respuesta marcada.">
        {PEP.map(([k, etiqueta]) => (
          <Pregunta key={k} etiqueta={etiqueta} value={d[k]} onChange={(v) => set(k, v)} error={errores[k]} />
        ))}
      </Grupo>

      <Grupo titulo="Información financiera">
        <Fila>
          <Entrada etiqueta="Actividad económica" {...campo('actividad_financiera')} />
          <Entrada etiqueta="Código CIIU" {...campo('ciiu')} />
        </Fila>
        <Fila>
          <Dinero etiqueta="Ingresos mensuales" {...campo('ingresos_mensuales')} />
          <Dinero etiqueta="Egresos mensuales" {...campo('egresos_mensuales')} />
        </Fila>
        <Fila>
          <Dinero etiqueta="Otros ingresos" {...campo('otros_ingresos')} />
          <Entrada etiqueta="Concepto de otros ingresos" {...campo('otros_ingresos_desc')} />
        </Fila>
        <Fila>
          <Dinero etiqueta="Total activos" {...campo('total_activos')} />
          <Dinero etiqueta="Total pasivos" {...campo('total_pasivos')} />
        </Fila>
        <Entrada etiqueta="Origen de los fondos" {...campo('origen_fondos')} />
        <Pregunta etiqueta="Opera en moneda extranjera" value={d.moneda_extranjera} onChange={(v) => set('moneda_extranjera', v)} />
        {d.moneda_extranjera && <p className="text-xs text-slate-500">El detalle de las cuentas queda en el formato firmado.</p>}
      </Grupo>

      <Grupo titulo="Aportes" descripcion="El aporte mínimo es $74.000, en múltiplos de $1.000. Fondo, seguro, bono y cuota los fija el sistema.">
        <Fila>
          <Dinero etiqueta="Valor del aporte" requerido {...campo('valor_aporte')} />
          <Lista etiqueta="Periodicidad del descuento" opciones={PERIODICIDADES} {...campo('periodicidad')} />
        </Fila>
        <Pregunta etiqueta="Toma el seguro de vida" value={d.seguro_vida} onChange={(v) => set('seguro_vida', v)} error={errores.seguro_vida} />
        <Pregunta etiqueta="Toma el bono de sorteo" value={d.bono_sorteo} onChange={(v) => set('bono_sorteo', v)} error={errores.bono_sorteo} />
        {errores.valor_aporte && <p role="alert" className={t.errorTexto}>{errores.valor_aporte}</p>}
      </Grupo>

      <Grupo titulo="Beneficiarios" descripcion="Hasta 5. Los porcentajes deben sumar 100%.">
        {bens.map((b, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-emerald-100 bg-white/60 p-3">
            <Fila>
              <Entrada etiqueta={`Beneficiario ${i + 1} — nombre`} value={b.nombres} onChange={(e) => setBen(i, 'nombres', e.target.value)} />
              <Entrada etiqueta="Identificación" value={b.identificacion} onChange={(e) => setBen(i, 'identificacion', e.target.value)} />
            </Fila>
            <Fila>
              <Entrada etiqueta="Parentesco" value={b.parentesco} onChange={(e) => setBen(i, 'parentesco', e.target.value)} />
              <Entrada etiqueta="Porcentaje" type="number" min="0" max="100" value={b.porcentaje} onChange={(e) => setBen(i, 'porcentaje', e.target.value)} />
            </Fila>
            <Fila>
              <Entrada etiqueta="Fecha de nacimiento" type="date" value={b.fecha_nacimiento} onChange={(e) => setBen(i, 'fecha_nacimiento', e.target.value)} />
              {bens.length > 1 && (
                <button type="button" onClick={() => setBens((l) => l.filter((_, j) => j !== i))}
                        className="flex items-center justify-center gap-1.5 self-end rounded-lg border border-red-200 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <Trash2 size={14} /> Quitar
                </button>
              )}
            </Fila>
          </div>
        ))}
        {bens.length < 5 && (
          <BotonSecundario onClick={() => setBens((l) => [...l, beneficiarioVacio(l.length + 1)])}><Plus size={16} /> Agregar beneficiario</BotonSecundario>
        )}
      </Grupo>

      <Grupo titulo="Referencias">
        {refs.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-emerald-100 bg-white/60 p-3">
            <Fila>
              <Lista etiqueta="Tipo" opciones={[['personal', 'Personal'], ['familiar', 'Familiar']]} value={r.tipo} onChange={(e) => setRef(i, 'tipo', e.target.value)} />
              <Entrada etiqueta="Nombre" value={r.nombres} onChange={(e) => setRef(i, 'nombres', e.target.value)} />
            </Fila>
            <Fila>
              <Entrada etiqueta="Celular" type="tel" value={r.celular} onChange={(e) => setRef(i, 'celular', e.target.value)} />
              <Entrada etiqueta="Teléfono fijo" type="tel" value={r.telefono_fijo} onChange={(e) => setRef(i, 'telefono_fijo', e.target.value)} />
            </Fila>
          </div>
        ))}
      </Grupo>

      <Grupo titulo="Observaciones">
        <Area etiqueta="Notas del asesor (opcional)" {...campo('observaciones')} />
      </Grupo>

      {Object.values(errores).some(Boolean) && <Aviso tono="error">Revisa los campos marcados para continuar.</Aviso>}
      <BarraAcciones onBack={onClose} etiquetaAtras="Cerrar" etiqueta="Guardar y continuar" cargando={guardando} />
    </form>
  );
};

// ── Paso 3: firma en papel y cédula ──────────────────────────────────────────
const SubidaArchivo = ({ etiqueta, hecho, onArchivo, subiendo, progreso, aceptar }) => {
  const ref = useRef(null);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-white/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{etiqueta}</p>
        <p className="text-xs text-slate-500">{hecho ? 'Cargado' : subiendo ? `Subiendo… ${progreso}%` : 'Pendiente'}</p>
      </div>
      <input ref={ref} type="file" accept={aceptar} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArchivo(f); }} />
      <BotonSecundario onClick={() => ref.current?.click()} disabled={subiendo}>
        {subiendo ? <Loader2 size={16} className="animate-spin" /> : hecho ? <FileCheck2 size={16} className="text-emerald-600" /> : <Upload size={16} />}
        {hecho ? 'Reemplazar' : 'Subir'}
      </BotonSecundario>
    </div>
  );
};

const PasoFirma = ({ vinculacionId, estado, onListo, onClose }) => {
  const [fecha, setFecha] = useState(hoy());
  const [firmada, setFirmada] = useState(estado.firmada);
  const [sub, setSub] = useState({});
  const [error, setError] = useState('');
  const [cedula, setCedula] = useState({ frente: estado.frente, reverso: estado.reverso });
  const base = `/captacion/vinculaciones/${vinculacionId}`;

  const cambiar = (k, c) => setSub((s) => ({ ...s, [k]: { ...s[k], ...c } }));

  const subirEscaneo = async (original) => {
    setError('');
    if (new Date(fecha) > new Date()) { setError('La fecha de firma no puede ser futura'); return; }
    cambiar('firma', { subiendo: true, progreso: 0 });
    try {
      const file = await prepararArchivo(original);
      const invalido = validarDocumento(file);
      if (invalido) throw { mensaje: invalido };
      const meta = { nombre: file.name, mime: file.type, size: file.size };
      const { data: { uploadUrl, key } } = await apiService.post(`${base}/firma-fisica/solicitar`, meta);
      await subirAUrlFirmada(uploadUrl, file, (progreso) => cambiar('firma', { progreso }));
      await apiService.post(`${base}/firma-fisica`, { key, ...meta, fecha_firma: fecha });
      setFirmada(true);
      toast.success('Escaneo firmado registrado');
    } catch (err) {
      setError(err?.mensaje || err.response?.data?.error || 'No se pudo subir el escaneo');
    } finally { cambiar('firma', { subiendo: false }); }
  };

  const subirCedula = async (lado, original) => {
    setError('');
    cambiar(lado, { subiendo: true, progreso: 0 });
    try {
      const file = await prepararArchivo(original);
      const invalido = validarDocumento(file);
      if (invalido) throw { mensaje: invalido };
      const meta = { nombre: file.name, mime: file.type, size: file.size };
      const { data: { uploadUrl, key } } = await apiService.post(`${base}/documentos/${lado}/solicitar`, meta);
      await subirAUrlFirmada(uploadUrl, file, (progreso) => cambiar(lado, { progreso }));
      await apiService.patch(`${base}/documentos/${lado}/confirmar`, { key, ...meta });
      setCedula((c) => ({ ...c, [lado]: true }));
    } catch (err) {
      setError(err?.mensaje || err.response?.data?.error || 'No se pudo subir la cédula');
    } finally { cambiar(lado, { subiendo: false }); }
  };

  const aceptar = 'image/jpeg,image/png,image/webp,application/pdf';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {error && <Aviso tono="error">{error}</Aviso>}
      <Grupo titulo="Formulario firmado a mano" descripcion="Sube el escaneo o la foto del formato con la firma de la persona. Queda como evidencia de la firma y de la autorización de datos.">
        <Entrada etiqueta="Fecha que figura en el formato" type="date" max={hoy()} value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={firmada} />
        <SubidaArchivo etiqueta="Escaneo del formulario firmado" hecho={firmada} subiendo={sub.firma?.subiendo} progreso={sub.firma?.progreso} aceptar={aceptar}
                       onArchivo={subirEscaneo} />
        {firmada && <p className="text-sm font-medium text-emerald-700">Firma registrada: la solicitud quedó sellada con la huella del escaneo.</p>}
      </Grupo>
      <Grupo titulo="Cédula" descripcion="Frente y reverso. También se pueden cargar después desde la solicitud.">
        {['frente', 'reverso'].map((lado) => (
          <SubidaArchivo key={lado} etiqueta={`Cédula — ${lado}`} hecho={cedula[lado]} subiendo={sub[lado]?.subiendo} progreso={sub[lado]?.progreso}
                         aceptar={aceptar} onArchivo={(f) => subirCedula(lado, f)} />
        ))}
      </Grupo>
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-emerald-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <BotonSecundario onClick={onClose}>Cerrar</BotonSecundario>
        <BotonPrimario className="flex-1" disabled={!firmada} onClick={onListo} type="button">Ir a la solicitud</BotonPrimario>
      </div>
      {!firmada && <p className="pb-3 text-center text-sm text-slate-500">Sube el escaneo firmado para poder continuar.</p>}
    </div>
  );
};

// ── Panel ────────────────────────────────────────────────────────────────────
// `prospecto`: si ya existe (fila de la lista); sin él, el primer paso lo crea.
const PanelSolicitudFisica = ({ prospecto: inicial = null, onClose, onCreado }) => {
  const navigate = useNavigate();
  const [prospecto, setProspecto] = useState(inicial);
  const [vinculacionId, setVinculacionId] = useState(null);
  const [existente, setExistente] = useState({ campos: {}, beneficiarios: [], referencias: [] });
  const [estadoFirma, setEstadoFirma] = useState({ firmada: false, frente: false, reverso: false });
  const [paso, setPaso] = useState(inicial ? 'cargando' : 'identidad');

  // Prospecto existente: si ya tiene una solicitud física digitada, se retoma
  useEffect(() => {
    if (!inicial) return;
    apiService.get(`/captacion/prospectos/${inicial.id}/solicitud-fisica`)
      .then(({ data }) => {
        const v = data.vinculacion;
        if (v?.origen_solicitud === 'fisico') {
          const campos = {};
          for (const k of Object.keys(INICIAL)) {
            if (v[k] === null || v[k] === undefined) continue;
            campos[k] = k.includes('fecha') ? dia(v[k]) : NUM.includes(k) ? String(v[k]).replace(/\.00$/, '') : v[k];
          }
          if (v.valor_aporte !== null && v.valor_aporte !== undefined) campos.valor_aporte = String(Number(v.valor_aporte));
          if (v.periodicidad_descuento) campos.periodicidad = v.periodicidad_descuento;
          if (v.seguro_vida_activo !== null) campos.seguro_vida = v.seguro_vida_activo;
          if (v.bono_sorteo_activo !== null) campos.bono_sorteo = v.bono_sorteo_activo;
          if (v.fisico_observaciones) campos.observaciones = v.fisico_observaciones;
          setExistente({
            campos,
            beneficiarios: (v.beneficiarios || []).map((b) => ({ ...b, identificacion: b.identificacion ?? '', parentesco: b.parentesco ?? '', porcentaje: String(Number(b.porcentaje)), fecha_nacimiento: dia(b.fecha_nacimiento) })),
            referencias: (v.referencias || []).map((r) => ({ ...r, nombres: r.nombres ?? '', celular: r.celular ?? '', telefono_fijo: r.telefono_fijo ?? '' })),
          });
          setVinculacionId(v.id);
          setEstadoFirma({ firmada: !!v.seccion_firma_at, frente: !!v.cedula_frente_id, reverso: !!v.cedula_reverso_id });
          setPaso(v.seccion_firma_at ? 'firma' : 'formulario');
        } else {
          setPaso(v ? 'bloqueado' : 'formulario');
        }
      })
      .catch(() => { toast.error('No se pudo cargar el prospecto'); onClose(); });
  }, [inicial, onClose]);

  const titulos = { identidad: 'Paso 1 · Identidad', formulario: 'Paso 2 · Formulario', firma: 'Paso 3 · Firma y cédula' };

  return (
    <PanelLateral titulo="Solicitud física" subtitulo={prospecto ? `${prospecto.nombres} ${prospecto.apellidos}` : titulos[paso]} onClose={onClose} ancho="sm:max-w-3xl">
      {paso === 'cargando' && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>}
      {paso === 'bloqueado' && (
        <Aviso tono="info" titulo="Este prospecto ya tiene una solicitud digital">
          No se puede convertir en física. Ábrela desde “Ver solicitud”.
        </Aviso>
      )}
      {paso === 'identidad' && (
        <PasoIdentidad onClose={onClose} onCreado={(p) => { setProspecto(p); onCreado?.(p); setPaso('formulario'); }} />
      )}
      {paso === 'formulario' && prospecto && (
        <PasoFormulario prospecto={prospecto} inicial={existente} onClose={onClose}
                        onGuardado={(id) => { setVinculacionId(id); setPaso('firma'); }} />
      )}
      {paso === 'firma' && vinculacionId && (
        <PasoFirma vinculacionId={vinculacionId} estado={estadoFirma} onClose={onClose}
                   onListo={() => { onClose(); navigate(`/captacion/vinculaciones/${vinculacionId}`); }} />
      )}
    </PanelLateral>
  );
};

export default PanelSolicitudFisica;
