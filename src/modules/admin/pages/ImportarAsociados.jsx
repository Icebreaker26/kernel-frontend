import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../services/apiService.js';

const ImportarAsociados = () => {
  const [archivo, setArchivo]       = useState(null);
  const [resultado, setResultado]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const inputRef                    = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.name.endsWith('.csv')) {
      setArchivo(f);
      setResultado(null);
    } else {
      toast.error('Solo se aceptan archivos .csv');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      setArchivo(f);
      setResultado(null);
    } else {
      toast.error('Solo se aceptan archivos .csv');
    }
  };

  const importar = async () => {
    if (!archivo) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await apiService.post('/asociados/importar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(data);
      if (data.errores.length === 0) {
        toast.success(`${data.importados} asociados importados`);
      } else {
        toast(`${data.importados} importados, ${data.errores.length} con errores`, { icon: '⚠️' });
      }
    } catch {
      toast.error('Error al importar el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-white font-bold text-lg mb-1">Importar asociados</h1>
      <p className="text-slate-500 text-xs mb-6">
        Sube un archivo CSV con las columnas: <span className="text-slate-400">codigo, apellido, nombre, direccion, movil, clase_cuota, empresa_dsto, nombre_empresa, ciudad</span>
      </p>

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
            <p className="text-slate-600 text-xs mt-1">Solo archivos .csv</p>
          </>
        )}
      </div>

      <button
        onClick={importar}
        disabled={!archivo || loading}
        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
      >
        {loading ? 'Importando...' : 'Importar'}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{resultado.total}</p>
                <p className="text-slate-500 text-xs mt-1">Total en archivo</p>
              </div>
              <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{resultado.importados}</p>
                <p className="text-slate-500 text-xs mt-1">Importados</p>
              </div>
              <div className="bg-slate-900 border border-red-900/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{resultado.errores.length}</p>
                <p className="text-slate-500 text-xs mt-1">Con errores</p>
              </div>
            </div>

            {resultado.errores.length > 0 && (
              <div className="bg-slate-900 border border-red-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-red-400 text-xs font-medium">Filas con error</p>
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
                <p>Importación completada sin errores</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImportarAsociados;
