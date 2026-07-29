import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ShieldX, MessageCircle, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../services/apiService.js';

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const ModalSolicitudesPortal = ({ onClose, onAprobado }) => {
  const [solicitudes, setSolicitudes] = useState(null);
  const [procesando, setProcesando]   = useState({});
  const [resultados, setResultados]   = useState({});

  useEffect(() => {
    apiService.get('/asociados/pendientes-portal')
      .then(({ data }) => setSolicitudes(data))
      .catch(() => setSolicitudes([]));
  }, []);

  const aprobar = async (codigo, movil) => {
    setProcesando((p) => ({ ...p, [codigo]: true }));
    try {
      const { data } = await apiService.post(`/asociados/${codigo}/activar-portal`);
      setResultados((r) => ({ ...r, [codigo]: data.password }));
      setSolicitudes((s) => s.filter((x) => x.codigo !== codigo));
      onAprobado();
      toast.success('Portal activado');
    } catch {
      toast.error('Error al activar portal');
    } finally {
      setProcesando((p) => ({ ...p, [codigo]: false }));
    }
  };

  const rechazar = async (codigo) => {
    setProcesando((p) => ({ ...p, [codigo]: true }));
    try {
      await apiService.post(`/asociados/${codigo}/rechazar-solicitud`);
      setSolicitudes((s) => s.filter((x) => x.codigo !== codigo));
      setResultados((r) => { const n = { ...r }; delete n[codigo]; return n; });
      onAprobado();
      toast.success('Solicitud rechazada');
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setProcesando((p) => ({ ...p, [codigo]: false }));
    }
  };

  const copiar = (texto) => {
    navigator.clipboard.writeText(texto).then(() => toast.success('Copiado'));
  };

  const whatsapp = (movil, codigo, password) => {
    const num  = `57${movil.replace(/\D/g, '')}`;
    const txt  = encodeURIComponent(
      `Hola, le informamos que su acceso al portal de la Cooperativa Progresemos ha sido activado.\n\nUsuario: ${codigo}\nContraseña temporal: ${password}\n\nPor favor ingrese en el portal y cambie su contraseña al iniciar sesión.`
    );
    window.open(`https://wa.me/${num}?text=${txt}`, '_blank');
  };

  const aprobadas = Object.entries(resultados);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#020b18cc] backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-lg bg-[#08101e] border border-[#ffb70033] rounded-sm overflow-hidden"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 40px #ffb70011' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ffb70022]">
          <div>
            <div className="absolute top-0 left-0 w-1/2 h-[1px] bg-[#ffb700]"
              style={{ boxShadow: '0 0 8px #ffb70066' }} />
            <p className="text-[#ffb700] text-[9px] tracking-[4px]">// SOLICITUDES DE PORTAL</p>
            <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">
              {solicitudes === null ? '...' : `${solicitudes.length} PENDIENTE${solicitudes.length !== 1 ? 'S' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="text-[#6aacbc] hover:text-[#a0d4e0] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Resultados de aprobaciones recientes */}
        <AnimatePresence>
          {aprobadas.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-[#00e5ff11] overflow-hidden"
            >
              {aprobadas.map(([codigo, password]) => {
                const asoc = solicitudes?.find((s) => s.codigo === codigo);
                return (
                  <div key={codigo} className="px-5 py-3 bg-[#00e5ff06] flex items-center gap-3">
                    <CheckCircle2 size={13} className="text-[#00e5ff] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#a0d4e0] text-[10px] truncate">{codigo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[#00e5ff] text-xs font-mono tracking-widest">{password}</code>
                        <button onClick={() => copiar(password)}
                          className="text-[#6aacbc] hover:text-[#00e5ff] transition-colors">
                          <Copy size={10} />
                        </button>
                      </div>
                    </div>
                    {asoc?.movil && (
                      <button
                        onClick={() => whatsapp(asoc.movil, codigo, password)}
                        className="flex items-center gap-1 px-2 py-1 rounded-sm bg-[#00e5ff11] border border-[#00e5ff22] text-[#00e5ff] hover:bg-[#00e5ff22] transition-all text-[8px] tracking-widest shrink-0"
                      >
                        <MessageCircle size={10} /> WA
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de pendientes */}
        <div className="max-h-[50vh] overflow-y-auto">
          {solicitudes === null ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={16} className="animate-spin text-[#6aacbc]" />
            </div>
          ) : solicitudes.length === 0 ? (
            <p className="text-center text-[#6aacbc] text-[10px] tracking-[3px] py-12">
              SIN SOLICITUDES PENDIENTES
            </p>
          ) : (
            <div className="divide-y divide-[#00e5ff08]">
              {solicitudes.map((s) => (
                <div key={s.codigo} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#ffffff03]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#a0d4e0] text-[11px] font-medium truncate">
                      {s.nombre} {s.apellido}
                    </p>
                    <p className="text-[#6aacbc] text-[9px] tracking-widest mt-0.5">
                      {s.codigo} · {s.nombre_empresa ?? '—'}
                    </p>
                    <p className="text-[#6aacbc44] text-[8px] mt-0.5">{fmtFecha(s.solicitud_portal_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={procesando[s.codigo]}
                      onClick={() => rechazar(s.codigo)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-sm border border-[#ff3d3d22] bg-[#ff3d3d08] hover:bg-[#ff3d3d15] hover:border-[#ff3d3d44] text-[#ff3d3d] text-[8px] tracking-widest transition-all disabled:opacity-40"
                    >
                      <ShieldX size={10} /> RECHAZAR
                    </button>
                    <button
                      disabled={procesando[s.codigo]}
                      onClick={() => aprobar(s.codigo, s.movil)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-sm border border-[#ffb70033] bg-[#ffb70011] hover:bg-[#ffb70022] hover:border-[#ffb70055] text-[#ffb700] text-[8px] tracking-widest transition-all disabled:opacity-40"
                    >
                      {procesando[s.codigo]
                        ? <Loader2 size={10} className="animate-spin" />
                        : <ShieldCheck size={10} />
                      }
                      APROBAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModalSolicitudesPortal;
