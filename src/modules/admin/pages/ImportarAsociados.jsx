import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, UserPlus, RefreshCw, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const Stat = ({ label, valor, color, icon: Icon }) => (
  <div className={`bg-slate-900 border rounded-xl p-4 text-center ${color}`}>
    <Icon size={16} className="mx-auto mb-2 opacity-60" />
    <p className="text-2xl font-bold text-white">{valor}</p>
    <p className="text-slate-500 text-xs mt-1">{label}</p>
  </div>
);

const ImportarAsociados = () => {
  const [archivo, setArchivo]     = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading]     = useState(false);
  const inputRef                  = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.name.endsWith('.csv')) { setArchivo(f); setResultado(null); }
    else toast.error('Solo se aceptan archivos .csv');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) { setArchivo(f); setResultado(null); }
    else toast.error('Solo se aceptan archivos .csv');
  };

  const sincronizar = async () => {
    if (!archivo) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await apiService.post('/asociados/importar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(data);
      const msg = `${data.nuevos} nuevos · ${data.actualizados} actualizados · ${data.retirados} retirados`;
      data.errores.length === 0
        ? toast.success(msg)
        : toast(msg + ` · ${data.errores.length} con errores`, { icon: '⚠️' });
    } catch {
      toast.error('Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-1">Sincronizar asociados</h1>
      <p className="text-slate-500 text-xs mb-1">
        El sistema compara el CSV con el padrón actual:
      </p>
      <ul className="text-slate-600 text-xs mb-6 space-y-0.5 list-none">
        <li>→ Asociado en CSV y en sistema → <span className="text-slate-400">actualiza sus datos</span></li>
        <li>→ Asociado en CSV pero no en sistema → <span className="text-emerald-400">se crea como nuevo</span></li>
        <li>→ Asociado en sistema pero no en CSV → <span className="text-amber-400">se marca como retirado</span></li>
      </ul>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-slate-700 hover:border-violet-600/60 rounded-xl p-10 text-center cursor-pointer transition-colors mb-4"
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <Upload size={24} className="mx-auto text-slate-600 mb-3" />
        {archivo ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={14} className="text-violet-400" />
            <p className="text-slate-300 text-sm">{archivo.name}</p>
            <p className="text-slate-600 text-xs">({(archivo.size / 1024).toFixed(1)} KB)</p>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm">Arrastra tu CSV aquí o haz clic para seleccionar</p>
            <p className="text-slate-600 text-xs mt-1">
              Columnas: codigo, apellido, nombre, direccion, movil, clase_cuota, empresa_dsto, nombre_empresa, ciudad
            </p>
          </>
        )}
      </div>

      <button
        onClick={sincronizar}
        disabled={!archivo || loading}
        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
      >
        {loading ? 'Sincronizando...' : 'Sincronizar padrón'}
      </button>

      {/* Resultado */}
      <AnimatePresence>
        {resultado && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total en CSV"   valor={resultado.total}        color="border-slate-800"           icon={FileText}  />
              <Stat label="Nuevos"         valor={resultado.nuevos}       color="border-emerald-900/40"      icon={UserPlus}  />
              <Stat label="Actualizados"   valor={resultado.actualizados} color="border-blue-900/40"         icon={RefreshCw} />
              <Stat label="Retirados"      valor={resultado.retirados}    color="border-amber-900/40"        icon={UserMinus} />
            </div>

            {resultado.errores.length > 0 && (
              <div className="bg-slate-900 border border-red-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-red-400 text-xs font-medium">Filas con error ({resultado.errores.length})</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {resultado.errores.map((e, i) => (
                    <div key={i} className="text-xs text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-slate-300">Código {e.fila}:</span>{' '}
                      {JSON.stringify(e.error.fieldErrors)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.errores.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle size={16} />
                <p>Sincronización completada sin errores</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImportarAsociados;
