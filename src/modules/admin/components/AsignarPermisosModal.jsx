import { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCIONES = ['READ', 'WRITE', 'DELETE'];

const AsignarPermisosModal = ({ usuario, onClose, onSaved }) => {
  const [modulos, setModulos]       = useState([]);
  const [seleccion, setSeleccion]   = useState({});
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const [{ data: mods }, { data: perms }] = await Promise.all([
        apiService.get('/admin/modulos'),
        apiService.get(`/admin/usuarios/${usuario.id}/permisos`),
      ]);
      setModulos(mods);
      const inicial = {};
      for (const m of mods) {
        inicial[m.nombre] = perms
          .filter((p) => p.modulo === m.nombre)
          .map((p) => p.accion);
      }
      setSeleccion(inicial);
    };
    cargar().catch(() => toast.error('Error cargando permisos'));
  }, [usuario.id]);

  const toggle = (modulo, accion) => {
    setSeleccion((prev) => {
      const actual = prev[modulo] ?? [];
      return {
        ...prev,
        [modulo]: actual.includes(accion)
          ? actual.filter((a) => a !== accion)
          : [...actual, accion],
      };
    });
  };

  const guardar = async () => {
    const permisos = Object.entries(seleccion)
      .filter(([, acciones]) => acciones.length > 0)
      .map(([modulo, acciones]) => ({ modulo, acciones }));

    setLoading(true);
    try {
      await apiService.post('/admin/permisos/asignar-masivo', {
        usuario_uuid: usuario.id,
        permisos,
      });
      toast.success('Permisos actualizados');
      onSaved();
    } catch {
      toast.error('Error al guardar permisos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-white text-sm font-medium">Permisos</p>
            <p className="text-slate-500 text-xs">{usuario.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-4">
          {modulos.map((m) => (
            <div key={m.nombre}>
              <p className="text-slate-300 text-xs font-medium mb-2 capitalize">{m.nombre}</p>
              <div className="flex gap-3">
                {ACCIONES.map((accion) => {
                  const activo = seleccion[m.nombre]?.includes(accion);
                  return (
                    <button
                      key={accion}
                      onClick={() => toggle(m.nombre, accion)}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                        activo
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-slate-700 text-slate-500 hover:border-slate-500'
                      }`}
                    >
                      {accion}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={guardar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            <Save size={13} /> {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsignarPermisosModal;
