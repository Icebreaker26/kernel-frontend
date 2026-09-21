import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus, Trash2, Loader, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT = '#6366f1';
const JORNADA_KEY = 'mailing_jornada_actual';

const inputCls = 'w-full bg-[#0d1829] border border-[#1e293b] rounded-sm px-3 py-2.5 text-sm text-[#e2e8f0] outline-none focus:border-[#6366f144] transition-colors';
const labelCls = 'text-[10px] tracking-[2px] text-[#6aacbc] block mb-1.5';

const leerJornada = () => { try { return localStorage.getItem(JORNADA_KEY) ?? ''; } catch { return ''; } };
const guardarJornada = (v) => { try { localStorage.setItem(JORNADA_KEY, v); } catch { /* sin almacenamiento */ } };

const ContactosPage = () => {
  const [jornada, setJornada]   = useState(leerJornada);
  const [nombre, setNombre]     = useState('');
  const [email, setEmail]       = useState('');
  const [telefono, setTelefono] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando]   = useState(false);
  const nombreRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!jornada.trim()) { setContactos([]); return; }
    setCargando(true);
    try {
      const { data } = await apiService.get('/mailing/contactos', { params: { jornada: jornada.trim() } });
      setContactos(data);
    } catch { toast.error('Error cargando contactos'); }
    finally { setCargando(false); }
  }, [jornada]);

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  const cambiarJornada = (v) => { setJornada(v); guardarJornada(v); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!jornada.trim()) { toast.error('Escribe el nombre de la jornada'); return; }
    if (!autoriza) { toast.error('La persona debe autorizar el tratamiento de sus datos'); return; }
    setGuardando(true);
    try {
      await apiService.post('/mailing/contactos', {
        nombre, email, telefono, jornada: jornada.trim(), autorizacion_datos: true,
      });
      toast.success(`${nombre} agregado`);
      setNombre(''); setEmail(''); setTelefono(''); setAutoriza(false);
      nombreRef.current?.focus();
      cargar();
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.error !== 'Datos inválidos' ? (d?.error ?? 'No se pudo guardar') : Object.values(d.detalles?.fieldErrors ?? {}).flat()[0] ?? 'Datos inválidos');
    } finally { setGuardando(false); }
  };

  const quitar = async (c) => {
    if (!confirm(`¿Quitar a ${c.nombre} de la lista?`)) return;
    try { await apiService.delete(`/mailing/contactos/${c.id}`); cargar(); }
    catch { toast.error('Error al quitar'); }
  };

  return (
    <div className="grid md:grid-cols-[minmax(0,380px)_1fr] gap-6 items-start">
      <form onSubmit={guardar} className="bg-[#08101e] border border-[#6366f118] rounded-sm p-5 relative space-y-4">
        <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT }} />
        <p className="text-[10px] tracking-[3px] text-[#6aacbc]">// REGISTRAR PERSONA</p>

        <div>
          <label className={labelCls}>JORNADA</label>
          <input value={jornada} onChange={e => cambiarJornada(e.target.value)}
            placeholder="Ej: Jornada visual — Óptica X — 21 sep 2026" className={inputCls} />
          <p className="text-[9px] text-[#475569] mt-1">Agrupa a quienes llegan hoy; luego eliges esta jornada al crear la campaña.</p>
        </div>
        <div>
          <label className={labelCls}>NOMBRE</label>
          <input ref={nombreRef} value={nombre} onChange={e => setNombre(e.target.value)} required
            autoComplete="off" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>CORREO</label>
          <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required
            autoComplete="off" autoCapitalize="none" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>TELÉFONO <span className="text-[#334155] normal-case tracking-normal">— opcional</span></label>
          <input type="tel" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            autoComplete="off" className={inputCls} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={autoriza} onChange={e => setAutoriza(e.target.checked)}
            className="accent-[#6366f1] w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-[11px] text-[#a0d4e0] leading-relaxed">
            La persona autoriza a la Cooperativa Progresemos a tratar sus datos para enviarle información
            sobre asociación y el convenio de la jornada (Ley 1581 de 2012).
          </span>
        </label>

        <button type="submit" disabled={guardando}
          className="w-full flex items-center justify-center gap-2 text-[11px] tracking-widest px-4 py-3 rounded-sm border transition-all disabled:opacity-50"
          style={{ color: ACCENT, borderColor: ACCENT + '66', background: ACCENT + '18' }}>
          {guardando ? <Loader size={13} className="animate-spin" /> : <UserPlus size={13} />}
          AGREGAR
        </button>
      </form>

      <div className="bg-[#08101e] border border-[#6366f118] rounded-sm p-5 relative">
        <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT }} />
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-[3px] text-[#6aacbc] flex items-center gap-2">
            <Users size={12} /> {jornada.trim() ? 'REGISTRADOS EN ESTA JORNADA' : 'ELIGE UNA JORNADA'}
          </p>
          <span className="text-[10px] tracking-wider" style={{ color: '#22c55e' }}>{contactos.length}</span>
        </div>

        {cargando ? (
          <p className="text-[10px] text-[#475569] text-center py-8 animate-pulse">Cargando...</p>
        ) : contactos.length === 0 ? (
          <p className="text-[10px] text-[#334155] text-center py-8">Aún no hay personas registradas</p>
        ) : (
          <div className="divide-y divide-[#0d1424] max-h-[60vh] overflow-y-auto">
            {contactos.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs text-[#e2e8f0] truncate">{c.nombre}</p>
                  <p className="text-[10px] text-[#475569] truncate">{c.email}{c.telefono ? ` · ${c.telefono}` : ''}</p>
                </div>
                <button onClick={() => quitar(c)} title="Quitar"
                  className="p-1.5 rounded-sm border border-[#ef444433] text-[#ef4444] hover:border-[#ef444466] transition-colors flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-[#475569] mt-4 leading-relaxed">
          Para enviar: ve a Campañas → “Nueva campaña para no asociados”, completa la plantilla, elige esta jornada y pulsa Enviar.
        </p>
      </div>
    </div>
  );
};

export default ContactosPage;
