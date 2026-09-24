import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Search, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';
import { CANALES, FORMAS, MODALIDADES, campo, botonPrimario, botonLinea, mensajeError, moneda, fecha } from '../lib/formato.js';

const soloDigitos = (v) => v.replace(/\D/g, '');
const etiqueta = 'mb-1 block text-[10px] tracking-widest text-slate-500';
const MOMENTOS = { antes_firma: 'Al radicar (antes de la firma)', despues_firma: 'Cuando la firma quede completa', indiferente: 'Al radicar' };

const Campo = ({ label, children, ayuda }) => (
  <label className="block">
    <span className={etiqueta}>{label}</span>
    {children}
    {ayuda && <span className="mt-1 block text-[10px] text-slate-500">{ayuda}</span>}
  </label>
);

const NuevaPage = () => {
  const navigate = useNavigate();
  const clave = useRef(crypto.randomUUID());   // si se envía dos veces (doble clic), no se crea otra solicitud
  const [categorias, setCategorias] = useState([]);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [info, setInfo] = useState(null);
  const [cargandoInfo, setCargandoInfo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [f, setF] = useState({
    categoria_id: '', canal_origen: 'presencial', valor_solicitado: '', cuotas: '', cuota_mensual: '',
    forma_desembolso: 'transferencia', modalidad_firma: 'presencial', proveedor_externo: '', observaciones: '', cambiarPolitica: false, requerir: true, override_motivo: '', emails: '',
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => { apiService.get('/creditos/categorias').then(({ data }) => { setCategorias(data); setF((x) => ({ ...x, categoria_id: data[0]?.id ?? '' })); }).catch(() => toast.error('No se pudieron cargar las categorías')); }, []);

  useEffect(() => {
    if (q.trim().length < 3 || info) { setResultados([]); return undefined; }
    const t = setTimeout(() => apiService.get('/creditos/asociados/buscar', { params: { q } }).then(({ data }) => setResultados(data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, info]);

  const elegir = async (codigo) => {
    setCargandoInfo(true);
    setResultados([]);
    try {
      const { data } = await apiService.get(`/creditos/asociados/${encodeURIComponent(codigo)}`);
      setInfo(data);
      const emails = data.config.emails_autorizacion?.length ? data.config.emails_autorizacion : (data.empresa_contacto_email ? [data.empresa_contacto_email] : []);
      setF((x) => ({ ...x, cambiarPolitica: false, requerir: data.config.requiere_autorizacion, emails: emails.join(', ') }));
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo cargar el asociado'));
    } finally { setCargandoInfo(false); }
  };

  const requiere = info ? (f.cambiarPolitica ? f.requerir : info.config.requiere_autorizacion) : true;
  const emails = useMemo(() => f.emails.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean), [f.emails]);
  const emailsMal = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const errores = [];
  if (!info) errores.push('Selecciona al asociado');
  if (!f.categoria_id) errores.push('Elige la categoría');
  if (!Number(f.valor_solicitado)) errores.push('Indica el valor de la solicitud');
  if (f.modalidad_firma === 'externa' && !f.proveedor_externo.trim()) errores.push('Indica el proveedor de la firma externa');
  if (f.cambiarPolitica && f.override_motivo.trim().length < 3) errores.push('Explica por qué cambias lo que exige la empresa');
  if (requiere && emailsMal.length) errores.push(`Correo inválido: ${emailsMal.join(', ')}`);

  const enviar = async (e) => {
    e.preventDefault();
    if (errores.length) return toast.error(errores[0]);
    setEnviando(true);
    try {
      const body = {
        clave: clave.current, asociado_codigo: info.codigo, categoria_id: f.categoria_id, canal_origen: f.canal_origen,
        valor_solicitado: Number(f.valor_solicitado),
        forma_desembolso: f.forma_desembolso, modalidad_firma: f.modalidad_firma,
        ...(f.cuotas ? { cuotas: Number(f.cuotas) } : {}), ...(f.cuota_mensual ? { cuota_mensual: Number(f.cuota_mensual) } : {}),
        ...(f.modalidad_firma === 'externa' ? { proveedor_externo: f.proveedor_externo.trim() } : {}),
        ...(f.observaciones.trim() ? { observaciones: f.observaciones.trim() } : {}),
        ...(f.cambiarPolitica ? { autorizacion_requerida: f.requerir, override_motivo: f.override_motivo.trim() } : {}),
        ...(requiere && emails.length ? { emails_autorizacion: emails } : {}),
      };
      const { data } = await apiService.post('/creditos', body);
      const c = data.correo?.resultado;
      if (c === 'solicitada') toast.success(`Solicitud ${data.solicitud.radicado} radicada. Se pidió la autorización a la empresa.`);
      else if (c === 'sin_destinatario') toast(`Solicitud ${data.solicitud.radicado} radicada, pero no hay a quién pedirle la autorización: indica el correo de la empresa.`, { icon: '⚠️', duration: 8000 });
      else if (c === 'espera_firma') toast.success(`Solicitud ${data.solicitud.radicado} radicada. La empresa recibirá el correo cuando la firma quede completa.`, { duration: 6000 });
      else toast.success(`Solicitud ${data.solicitud.radicado} radicada`);
      navigate(`/creditos/${data.solicitud.id}`);
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo radicar la solicitud'));
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="grid gap-5 lg:grid-cols-2" noValidate>
      {/* Asociado */}
      <section className="rounded-sm border border-slate-800 bg-[#08101e] p-5 lg:col-span-2">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-[#84cc16]">1. ASOCIADO</h2>
        {!info ? (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cédula o nombre del asociado (mínimo 3 caracteres)" className={`${campo} pl-8`} aria-label="Buscar asociado" autoFocus />
            {cargandoInfo && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-slate-400" />}
            {resultados.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-slate-700 bg-[#0b1220] shadow-lg">
                {resultados.map((a) => (
                  <li key={a.codigo}>
                    <button type="button" onClick={() => elegir(a.codigo)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[#0d1829]">
                      <span><span className="block text-[#a0d4e0]">{a.apellido} {a.nombre}</span><span className="text-[10px] text-slate-500">{a.codigo} · {a.empresa_nombre ?? 'sin empresa'}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 3 && resultados.length === 0 && !cargandoInfo && <p className="mt-2 text-[11px] text-slate-500">Sin coincidencias entre los asociados vigentes.</p>}
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserRound size={28} className="mt-0.5 text-[#84cc16]" />
              <div className="text-xs">
                <p className="text-sm font-bold text-[#a0d4e0]">{info.apellido} {info.nombre}</p>
                <p className="text-slate-400">C.C. {info.codigo} · {info.movil ?? 'sin celular'}</p>
                <p className="text-slate-400">Empresa: <b className="text-[#a0d4e0]">{info.empresa_nombre}</b></p>
                <p className="text-slate-500">Ingreso {fecha(info.fecha_ingreso)} · Aportes {moneda(info.saldo_aporte)}</p>
              </div>
            </div>
            <button type="button" onClick={() => { setInfo(null); setQ(''); }} className={botonLinea}>CAMBIAR ASOCIADO</button>
            <div className="w-full space-y-2 text-[11px]">
              {info.solicitudes_abiertas.length > 0 && (
                <p className="flex gap-2 rounded-sm border border-amber-700 bg-amber-950/40 p-2 text-amber-300"><AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>Ya tiene {info.solicitudes_abiertas.length === 1 ? 'una solicitud abierta' : `${info.solicitudes_abiertas.length} solicitudes abiertas`}: {info.solicitudes_abiertas.map((s) => <Link key={s.id} to={`/creditos/${s.id}`} className="underline">{s.radicado}</Link>).reduce((a, b) => [a, ', ', b])}.</span></p>
              )}
              {info.creditos_vigentes.length > 0 && (
                <div className="rounded-sm border border-slate-800 p-2 text-slate-400">
                  <p className="mb-1 text-[10px] tracking-widest text-slate-500">CRÉDITOS VIGENTES (INFORMATIVO)</p>
                  {info.creditos_vigentes.map((c, i) => <p key={i}>{c.nombre_linea} — saldo {moneda(c.saldo_credito)} · cuota {moneda(c.valor)}</p>)}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Crédito */}
      <section className="space-y-3 rounded-sm border border-slate-800 bg-[#08101e] p-5">
        <h2 className="text-xs font-bold tracking-widest text-[#84cc16]">2. CRÉDITO</h2>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="CATEGORÍA"><select value={f.categoria_id} onChange={(e) => set('categoria_id', e.target.value)} className={campo}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
          <Campo label="SOLICITADO POR"><select value={f.canal_origen} onChange={(e) => set('canal_origen', e.target.value)} className={campo}>{Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Campo label="VALOR DE LA SOLICITUD" ayuda={f.valor_solicitado ? moneda(f.valor_solicitado) : undefined}><input inputMode="numeric" value={f.valor_solicitado} onChange={(e) => set('valor_solicitado', soloDigitos(e.target.value))} className={campo} placeholder="0" /></Campo>
          <p className="self-end pb-2 text-[10px] text-slate-500">El monto a desembolsar lo calcula Cartera al cerrar el crédito (valor solicitado − aval − firma electrónica).</p>
          <Campo label="NÚMERO DE CUOTAS (OPCIONAL)"><input inputMode="numeric" value={f.cuotas} onChange={(e) => set('cuotas', soloDigitos(e.target.value))} className={campo} /></Campo>
          <Campo label="CUOTA MENSUAL (OPCIONAL)" ayuda={f.cuota_mensual ? `${moneda(f.cuota_mensual)} — va en el correo a la empresa` : 'Va en el correo a la empresa'}><input inputMode="numeric" value={f.cuota_mensual} onChange={(e) => set('cuota_mensual', soloDigitos(e.target.value))} className={campo} /></Campo>
          <div className="col-span-2"><Campo label="FORMA DE DESEMBOLSO" ayuda={f.forma_desembolso === 'transferencia' ? 'Con transferencia se exige el certificado bancario.' : undefined}><select value={f.forma_desembolso} onChange={(e) => set('forma_desembolso', e.target.value)} className={campo}>{Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo></div>
        </div>
        <Campo label="OBSERVACIONES (OPCIONAL)"><textarea rows={2} value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)} className={campo} maxLength={1000} /></Campo>
      </section>

      {/* Firma y autorización */}
      <section className="space-y-3 rounded-sm border border-slate-800 bg-[#08101e] p-5">
        <h2 className="text-xs font-bold tracking-widest text-[#84cc16]">3. FIRMA Y AUTORIZACIÓN DE LA EMPRESA</h2>
        <Campo label="TIPO DE FIRMA"><select value={f.modalidad_firma} onChange={(e) => set('modalidad_firma', e.target.value)} className={campo}>{Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
        {f.modalidad_firma === 'externa' && <Campo label="PROVEEDOR DE FIRMA ELECTRÓNICA"><input value={f.proveedor_externo} onChange={(e) => set('proveedor_externo', e.target.value)} className={campo} maxLength={80} /></Campo>}

        {info ? (
          <div className="space-y-2 rounded-sm border border-slate-800 p-3 text-[11px]">
            <p className="text-slate-400">
              Política de <b className="text-[#a0d4e0]">{info.empresa_nombre}</b>: {info.config.requiere_autorizacion ? <b className="text-amber-300">exige autorización</b> : <b className="text-emerald-300">no exige autorización</b>}
              {info.config.requiere_autorizacion && <> · el correo sale: {MOMENTOS[info.config.momento_autorizacion]}</>}
              {info.config.sin_configurar && <span className="text-slate-500"> (empresa sin configurar: se asume que la exige)</span>}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-slate-400"><input type="checkbox" checked={f.cambiarPolitica} onChange={(e) => set('cambiarPolitica', e.target.checked)} /> Hacer una excepción para esta solicitud</label>
            {f.cambiarPolitica && (
              <div className="space-y-2 pl-5">
                <select value={f.requerir ? 'si' : 'no'} onChange={(e) => set('requerir', e.target.value === 'si')} className={campo}><option value="si">Sí requiere autorización</option><option value="no">No requiere autorización</option></select>
                <input value={f.override_motivo} onChange={(e) => set('override_motivo', e.target.value)} placeholder="Motivo de la excepción (obligatorio)" className={campo} maxLength={500} />
              </div>
            )}
            {requiere && (
              <Campo label="CORREO(S) DE LA EMPRESA PARA PEDIR LA AUTORIZACIÓN" ayuda={emails.length ? 'Las respuestas llegarán a tu correo.' : 'Sin correo no se podrá pedir la autorización por este medio: podrás indicarlo después.'}>
                <input value={f.emails} onChange={(e) => set('emails', e.target.value)} placeholder="nomina@empresa.com, rrhh@empresa.com" className={campo} />
              </Campo>
            )}
          </div>
        ) : <p className="text-[11px] text-slate-500">Selecciona al asociado para ver lo que exige su empresa.</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <button type="submit" disabled={enviando} className={botonPrimario}>{enviando ? 'RADICANDO…' : 'RADICAR SOLICITUD'}</button>
        <Link to="/creditos" className={botonLinea}>CANCELAR</Link>
        {errores.length > 0 && <span className="text-[11px] text-amber-300">{errores[0]}</span>}
      </div>
    </form>
  );
};

export default NuevaPage;
