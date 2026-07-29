import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, UserPlus, RefreshCw, UserMinus, Eye, X, Download, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../services/apiService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows    = lines.slice(1).map((l) => {
    const vals = splitLine(l);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
};

const COLUMNAS_CONOCIDAS = new Set([
  'codigo','apellido','nombre','direccion','movil','clase_cuota',
  'empresa_dsto','nombre_empresa','ciudad','fecha_credito',
  'fecha_pri_decuento','cuota','saldo','fecha_ingreso','fecha_reingreso','fecha_nacimiento',
]);

const PREVIEW_COLS = ['linea','codigo','apellido','nombre','nombre_empresa','ciudad'];

// ── Sub-componentes ───────────────────────────────────────────────────────────

const Stat = ({ label, valor, color, icon: Icon }) => (
  <div className={`bg-slate-900 border rounded-xl p-4 text-center ${color}`}>
    <Icon size={16} className="mx-auto mb-2 opacity-60" />
    <p className="text-2xl font-bold text-white">{valor}</p>
    <p className="text-slate-500 text-xs mt-1">{label}</p>
  </div>
);

const ColRow = ({ name, desc, required }) => (
  <div className="flex items-start gap-3">
    <code className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded font-mono ${
      required ? 'bg-violet-900/40 text-violet-300' : 'bg-slate-800/80 text-slate-300'
    }`}>
      {name}
    </code>
    <span className="mt-0.5 text-slate-500">{desc}</span>
  </div>
);

// ── Discrepancias línea 15 ────────────────────────────────────────────────────

const TIPO_CONFIG = {
  COBRO_A_RETIRADO:  { label: 'Cobro a retirado',     color: 'text-red-400',    border: 'border-red-900/40',    bg: 'bg-red-900/10',    desc: 'El sistema externo les está cobrando bonos a asociados que ya están retirados en Kernel.' },
  COBRO_SIN_BOLETO:  { label: 'Cobro sin boleto',      color: 'text-amber-400',  border: 'border-amber-900/40',  bg: 'bg-amber-900/10',  desc: 'El sistema externo les cobra bonos, pero Kernel no tiene ningún boleto asignado.' },
  MONTO_INCORRECTO:  { label: 'Monto incorrecto',      color: 'text-orange-400', border: 'border-orange-900/40', bg: 'bg-orange-900/10', desc: 'El monto que cobra el sistema externo no coincide con lo que Kernel tiene registrado.' },
  SIN_COBRO_EXTERNO: { label: 'Sin cobro en externo',  color: 'text-cyan-400',   border: 'border-cyan-900/40',   bg: 'bg-cyan-900/10',   desc: 'Kernel tiene bonos asignados, pero el sistema externo no está cobrando nada.' },
};

const fmtCOP = (v) => (v ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const exportarCSVDiscrepancias = (items) => {
  const cols = ['tipo', 'codigo', 'nombre', 'empresa', 'cuota_externa', 'cuota_kernel', 'diferencia'];
  const escape = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines  = [cols.join(','), ...items.map((d) => cols.map((c) => escape(d[c] ?? '')).join(','))];
  const blob   = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = 'discrepancias_linea15.csv'; a.click();
  URL.revokeObjectURL(url);
};

const DiscrepanciasSection = ({ discrepancias }) => {
  const [tipoActivo, setTipoActivo] = useState(null);

  if (!discrepancias) return null;

  const byTipo = Object.fromEntries(
    Object.keys(TIPO_CONFIG).map((t) => [t, discrepancias.filter((d) => d.tipo === t)])
  );
  const items = tipoActivo ? byTipo[tipoActivo] : discrepancias;

  if (discrepancias.length === 0) {
    return (
      <div className="flex items-center gap-2 text-cyan-400 text-sm">
        <CheckCircle size={16} />
        <p>Línea 15 reconciliada — sin discrepancias entre el sistema externo y Kernel</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TriangleAlert size={14} className="text-amber-400" />
          <p className="text-amber-400 text-xs font-semibold">
            Discrepancias línea 15 — {discrepancias.length} {discrepancias.length === 1 ? 'caso' : 'casos'} detectados
          </p>
        </div>
        <button
          onClick={() => exportarCSVDiscrepancias(discrepancias)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          <Download size={11} /> Exportar CSV
        </button>
      </div>

      {/* Contadores por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800">
        {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
          const count   = byTipo[tipo].length;
          const activo  = tipoActivo === tipo;
          return (
            <button
              key={tipo}
              onClick={() => setTipoActivo(activo ? null : tipo)}
              disabled={count === 0}
              className={`px-4 py-3 text-left border-r border-slate-800 last:border-r-0 transition-colors disabled:opacity-30
                ${activo ? `${cfg.bg}` : 'hover:bg-slate-800/40'}`}
            >
              <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
              <p className="text-slate-500 text-[10px] leading-tight mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Descripción del filtro activo */}
      {tipoActivo && (
        <div className={`px-5 py-2 text-xs ${TIPO_CONFIG[tipoActivo].color} border-b border-slate-800 ${TIPO_CONFIG[tipoActivo].bg}`}>
          {TIPO_CONFIG[tipoActivo].desc}
          <button onClick={() => setTipoActivo(null)} className="ml-3 text-slate-500 hover:text-slate-300 underline">ver todos</button>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2 text-left text-slate-500 font-medium">Tipo</th>
              <th className="px-4 py-2 text-left text-slate-500 font-medium">Código</th>
              <th className="px-4 py-2 text-left text-slate-500 font-medium">Nombre</th>
              <th className="px-4 py-2 text-left text-slate-500 font-medium">Empresa</th>
              <th className="px-4 py-2 text-right text-slate-500 font-medium">Externo</th>
              <th className="px-4 py-2 text-right text-slate-500 font-medium">Kernel</th>
              <th className="px-4 py-2 text-right text-slate-500 font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, i) => {
              const cfg = TIPO_CONFIG[d.tipo];
              return (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-mono ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-300">{d.codigo}</td>
                  <td className="px-4 py-2 text-slate-300 max-w-[140px] truncate">{d.nombre}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate">{d.empresa || '—'}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{d.cuota_externa ? fmtCOP(d.cuota_externa) : '—'}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{d.cuota_kernel ? fmtCOP(d.cuota_kernel) : '—'}</td>
                  <td className={`px-4 py-2 text-right font-mono ${d.diferencia > 0 ? 'text-orange-400' : d.diferencia < 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {d.diferencia != null && d.diferencia !== 0 ? fmtCOP(d.diferencia) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const ImportarAsociados = () => {
  const [archivo,   setArchivo]   = useState(null);
  const [preview,   setPreview]   = useState(null);   // { headers, rows, total, procesadas }
  const [resultado, setResultado] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const inputRef = useRef();

  const cargarPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      const tieneLinea = headers.includes('linea');
      const procesadas = tieneLinea
        ? rows.filter((r) => String(r.linea ?? '').trim() === '1')
        : rows;
      const linea15      = tieneLinea ? rows.filter((r) => String(r.linea ?? '').trim() === '15') : [];
      const otraDescartas = rows.length - procesadas.length - linea15.length;

      const colsVista = PREVIEW_COLS.filter((c) => headers.includes(c));
      const extrasHeaders = headers.filter((h) => !COLUMNAS_CONOCIDAS.has(h) && h !== 'linea');

      setPreview({
        colsVista,
        muestra:     procesadas.slice(0, 10),
        total:       rows.length,
        procesadas:  procesadas.length,
        linea15:     linea15.length,
        otraDescartas,
        tieneLinea,
        extrasHeaders,
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) { toast.error('Solo se aceptan archivos .csv'); return; }
    setArchivo(f);
    setResultado(null);
    setPreview(null);
    cargarPreview(f);
  };

  const limpiar = () => {
    setArchivo(null);
    setPreview(null);
    setResultado(null);
    inputRef.current.value = '';
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
      setPreview(null);
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
      <p className="text-slate-500 text-xs mb-1">El sistema compara el CSV con el padrón actual:</p>
      <ul className="text-slate-600 text-xs mb-6 space-y-0.5 list-none">
        <li>→ Asociado en CSV y en sistema → <span className="text-slate-400">actualiza sus datos</span></li>
        <li>→ Asociado en CSV pero no en sistema → <span className="text-emerald-400">se crea como nuevo</span></li>
        <li>→ Asociado en sistema pero no en CSV → <span className="text-amber-400">se marca como retirado</span></li>
      </ul>

      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-slate-700 hover:border-violet-600/60 rounded-xl p-10 text-center cursor-pointer transition-colors mb-4"
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
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
            <p className="text-slate-600 text-xs mt-1">Formato .csv con encabezados en la primera fila</p>
          </>
        )}
      </div>

      {/* Previsualización */}
      <AnimatePresence>
        {preview && !resultado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 bg-slate-900/70 border border-slate-700 rounded-xl overflow-hidden"
          >
            {/* Encabezado del preview */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold">
                <Eye size={13} />
                Previsualización — {preview.procesadas} filas a procesar
              </div>
              <button onClick={limpiar} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Resumen numérico */}
            <div className="px-5 py-3 flex flex-wrap gap-4 text-xs border-b border-slate-800">
              <span className="text-slate-400">
                Total en CSV: <strong className="text-white">{preview.total}</strong>
              </span>
              {preview.tieneLinea && (
                <>
                  <span className="text-emerald-400">
                    Línea 1 (aportes): <strong>{preview.procesadas}</strong>
                  </span>
                  {preview.linea15 > 0 && (
                    <span className="text-cyan-400/80">
                      Línea 15 (bonos, se reconcilian): <strong>{preview.linea15}</strong>
                    </span>
                  )}
                  {preview.otraDescartas > 0 && (
                    <span className="text-slate-600">
                      Otras líneas (descartadas): <strong>{preview.otraDescartas}</strong>
                    </span>
                  )}
                </>
              )}
              {preview.extrasHeaders.length > 0 && (
                <span className="text-slate-600">
                  Columnas extra ignoradas:{' '}
                  <strong className="text-slate-500">{preview.extrasHeaders.join(', ')}</strong>
                </span>
              )}
            </div>

            {/* Tabla muestra */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    {preview.colsVista.map((col) => (
                      <th key={col} className={`px-4 py-2 text-left font-medium tracking-wide ${
                        col === 'linea' ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.muestra.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      {preview.colsVista.map((col) => (
                        <td key={col} className={`px-4 py-2 ${
                          col === 'linea' ? 'text-slate-600' :
                          col === 'codigo' ? 'text-violet-300 font-mono' : 'text-slate-300'
                        }`}>
                          {row[col] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.procesadas > 10 && (
                <p className="px-5 py-2 text-slate-600 text-[10px]">
                  … y {preview.procesadas - 10} filas más
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="px-5 py-4 flex items-center gap-3 border-t border-slate-800">
              <button
                onClick={sincronizar}
                disabled={loading}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                {loading ? 'Sincronizando...' : `Confirmar sincronización (${preview.procesadas} filas)`}
              </button>
              <button
                onClick={limpiar}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón cuando no hay preview (archivo recién cargado con error de lectura) */}
      {archivo && !preview && !resultado && (
        <button
          onClick={sincronizar}
          disabled={loading}
          className="mb-5 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? 'Sincronizando...' : 'Sincronizar padrón'}
        </button>
      )}

      {/* Resultado */}
      <AnimatePresence>
        {resultado && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 space-y-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total procesado" valor={resultado.total}        color="border-slate-800"      icon={FileText}  />
              <Stat label="Nuevos"          valor={resultado.nuevos}       color="border-emerald-900/40" icon={UserPlus}  />
              <Stat label="Actualizados"    valor={resultado.actualizados} color="border-blue-900/40"    icon={RefreshCw} />
              <Stat label="Retirados"       valor={resultado.retirados}    color="border-amber-900/40"   icon={UserMinus} />
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

            {resultado.discrepancias !== null && resultado.discrepancias !== undefined && (
              <DiscrepanciasSection discrepancias={resultado.discrepancias} />
            )}

            <button onClick={limpiar} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Importar otro archivo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referencia de columnas */}
      <div className="mt-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <p className="text-slate-400 font-semibold tracking-wide">Columnas del CSV</p>

        <div className="space-y-1">
          <p className="text-slate-600 uppercase tracking-widest text-[10px] mb-1.5">Requeridas</p>
          <ColRow name="codigo"   desc="Identificador único del asociado" required />
          <ColRow name="apellido" desc="Apellidos" required />
          <ColRow name="nombre"   desc="Nombres" required />
        </div>

        <div className="space-y-1">
          <p className="text-slate-600 uppercase tracking-widest text-[10px] mb-1.5">Datos básicos</p>
          <ColRow name="direccion"        desc="Dirección de residencia" />
          <ColRow name="movil"            desc="Teléfono móvil" />
          <ColRow name="ciudad"           desc="Ciudad" />
          <ColRow name="clase_cuota"      desc="Tipo de cuota (mensual / quincenal)" />
          <ColRow name="empresa_dsto"     desc="Código de empresa para descuento" />
          <ColRow name="nombre_empresa"   desc="Nombre de la empresa empleadora" />
          <ColRow name="fecha_nacimiento" desc="Fecha de nacimiento — formato DD/MM/YYYY" />
        </div>

        <div className="space-y-1">
          <p className="text-slate-600 uppercase tracking-widest text-[10px] mb-1.5">Aporte</p>
          <ColRow name="fecha_credito"      desc="Fecha de ingreso al aporte — DD/MM/YYYY" />
          <ColRow name="fecha_pri_decuento" desc="Fecha del primer pago al aporte — DD/MM/YYYY" />
          <ColRow name="cuota"              desc="Valor del aporte periódico — formato colombiano (ej. 1.500,00)" />
          <ColRow name="saldo"              desc="Saldo en cuenta de aporte — negativo = a favor del asociado · positivo = debe a la cooperativa" />
          <ColRow name="fecha_ingreso"      desc="Primera vez que ingresó a la cooperativa — DD/MM/YYYY" />
          <ColRow name="fecha_reingreso"    desc="Último reingreso (si se retiró y volvió) — DD/MM/YYYY" />
        </div>

        <div className="space-y-1">
          <p className="text-slate-600 uppercase tracking-widest text-[10px] mb-1.5">Columna especial</p>
          <ColRow name="linea" desc="Si está presente, solo se procesan las filas donde linea = 1" />
        </div>

        <p className="text-slate-700 text-[10px]">Cualquier columna no listada arriba se descarta automáticamente.</p>
      </div>
    </div>
  );
};

export default ImportarAsociados;
