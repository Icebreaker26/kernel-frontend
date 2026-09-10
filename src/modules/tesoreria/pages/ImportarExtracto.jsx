import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Loader2, Link, Unlink, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService.js';

const ACCENT   = '#34d399';
const inputCls = 'w-full bg-[#05080f] border border-[#34d39922] rounded-sm px-3 py-2 text-[11px] text-[#a0d4e0] placeholder-[#6aacbc] focus:outline-none focus:border-[#34d39955] transition-colors cursor-pointer';
const labelCls = 'text-[8px] tracking-[2px] text-[#6aacbc] mb-1 block';

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const fmtFecha = (s) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// ── Paso 1 — Selección de archivo y cuenta ────────────────────────────────────

const PasoSeleccion = ({ cuentas, onPreview, cargando }) => {
  const [archivo,   setArchivo]   = useState(null);
  const [cuentaId,  setCuentaId]  = useState('');
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      toast.error('Solo se aceptan archivos .xls o .xlsx del banco');
      return;
    }
    setArchivo(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const submit = () => {
    if (!archivo)  return toast.error('Selecciona el archivo del banco');
    if (!cuentaId) return toast.error('Selecciona la cuenta bancaria');
    onPreview(archivo, cuentaId);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-[#34d399] bg-[#34d39910]'
            : archivo
            ? 'border-[#34d39955] bg-[#34d39908]'
            : 'border-[#34d39922] hover:border-[#34d39944] hover:bg-[#34d39906]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {archivo ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet size={28} style={{ color: ACCENT }} />
            <p className="text-[#34d399] text-xs tracking-wide">{archivo.name}</p>
            <p className="text-[#6aacbc] text-[10px]">{(archivo.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={(e) => { e.stopPropagation(); setArchivo(null); }}
              className="text-[10px] text-[#ef4444] hover:text-[#ff6b6b] mt-1"
            >
              Cambiar archivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={28} style={{ color: '#6aacbc' }} />
            <p className="text-[#a0d4e0] text-xs tracking-wide">Arrastra el extracto aquí</p>
            <p className="text-[#6aacbc] text-[10px]">o haz clic para seleccionar · .xls de Bancolombia</p>
          </div>
        )}
      </div>

      {/* Cuenta */}
      <div>
        <label className={labelCls}>CUENTA BANCARIA</label>
        <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls}>
          <option value="">— Selecciona la cuenta —</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.numero ? `· ${c.numero}` : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={submit}
        disabled={cargando || !archivo || !cuentaId}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-sm border border-[#34d39944] bg-[#34d39911] hover:bg-[#34d39922] text-[#34d399] text-xs tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        {cargando ? 'ANALIZANDO...' : 'ANALIZAR EXTRACTO'}
      </button>
    </div>
  );
};

// ── Fila de transacción en el preview ─────────────────────────────────────────

const TIPO_BANCARIO_LABEL = {
  N109: 'Transferencia recibida (ACH)',
  N110: 'Depósito efectivo recaudo',
  N126: 'Abono nómina / proveedor',
  N129: 'Crédito transferencia internet',
  N209: 'Débito autorizado ACH',
  N223: 'Pago nómina / proveedores',
  N227: 'Compra internet',
  N202: 'Pago cheque ventanilla',
  N334: 'Devolución transacción no exitosa',
  N511: 'Depósito en ventanilla',
};

const FilaTx = ({ tx, seleccionada, onToggle, vinculada, onVincularToggle }) => {
  const [expandida, setExpandida] = useState(false);
  const esNueva    = tx.estado === 'nuevo';
  const colorMonto = tx.tipo_movimiento === 'ingreso' ? '#22c55e' : '#ef4444';
  const sf         = tx.sugerencia_factura;

  const handleRowClick = (e) => {
    // Evitar expandir si hicieron click en el checkbox
    if (e.target.closest('[data-checkbox]')) return;
    setExpandida(v => !v);
  };

  return (
    <div className={`border-b border-[#34d39910] transition-colors ${
      !esNueva ? 'opacity-40' : ''
    } ${expandida ? 'bg-[#0d1a2a]' : esNueva && seleccionada ? 'bg-[#34d39905]' : ''}`}>

      {/* Fila principal — clickeable para expandir */}
      <div
        onClick={handleRowClick}
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#34d39906] transition-colors select-none"
      >
        {/* Checkbox — data-checkbox para interceptar click en handleRowClick */}
        <div data-checkbox>
          <button
            disabled={!esNueva}
            onClick={(e) => { e.stopPropagation(); esNueva && onToggle(tx.referencia_bancaria); }}
            className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
              !esNueva
                ? 'border-[#34d39911] bg-transparent cursor-default'
                : seleccionada
                ? 'border-[#34d399] bg-[#34d399]'
                : 'border-[#34d39944] hover:border-[#34d399]'
            }`}
          >
            {seleccionada && esNueva && <Check size={9} strokeWidth={3} className="text-black" />}
          </button>
        </div>

        {/* Estado badge */}
        <span className={`text-[9px] tracking-wide px-1.5 py-0.5 rounded-sm border shrink-0 ${
          esNueva
            ? 'border-[#34d39933] text-[#34d399]'
            : 'border-[#6aacbc22] text-[#6aacbc]'
        }`}>
          {esNueva ? 'NUEVO' : 'YA REG.'}
        </span>

        {/* Sugerencia de vinculación con factura */}
        {esNueva && sf && (
          <button
            data-checkbox
            onClick={(e) => { e.stopPropagation(); onVincularToggle(tx.referencia_bancaria, sf.id); }}
            title={vinculada ? 'Desvincular de factura' : `Vincular con factura de ${sf.proveedor_nombre}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm border shrink-0 transition-all text-[9px]"
            style={vinculada
              ? { borderColor: '#a78bfa55', background: '#a78bfa15', color: '#a78bfa' }
              : { borderColor: '#a78bfa22', color: '#a78bfa88' }}>
            {vinculada ? <Link size={9} /> : <Unlink size={9} />}
            {vinculada ? `FACT. ${sf.numero_factura || sf.proveedor_nombre.slice(0,8)}` : 'VINCULAR?'}
          </button>
        )}

        {/* Fecha */}
        <span className="text-[10px] text-[#6aacbc] shrink-0 w-20">{fmtFecha(tx.fecha)}</span>

        {/* Descripción */}
        <span className="text-[10px] text-[#a0d4e0] flex-1 truncate">
          {tx.descripcion || TIPO_BANCARIO_LABEL[tx.tipo_bancario] || tx.tipo_bancario || '—'}
        </span>

        {/* Tipo */}
        <span className="shrink-0">
          {tx.tipo_movimiento === 'ingreso'
            ? <TrendingUp  size={11} style={{ color: '#22c55e' }} />
            : <TrendingDown size={11} style={{ color: '#ef4444' }} />}
        </span>

        {/* Monto */}
        <span className="text-[11px] font-medium shrink-0 w-32 text-right" style={{ color: colorMonto }}>
          {tx.tipo_movimiento === 'ingreso' ? '+' : '-'}{fmtCOP(tx.monto)}
        </span>

        {/* Indicador expandir */}
        <span className="shrink-0 text-[#34d39955]">
          {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </div>

      {/* Panel de detalles expandido */}
      {expandida && (
        <div className="px-4 pb-4 pt-1 border-t border-[#34d39910]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 ml-8">

            {/* Referencia bancaria */}
            {tx.referencia_bancaria && (
              <div>
                <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-0.5">REFERENCIA BANCO</p>
                <p className="text-[11px] text-[#34d399] font-mono">{tx.referencia_bancaria}</p>
              </div>
            )}

            {/* Tipo con descripción legible */}
            {tx.tipo_bancario && (
              <div>
                <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-0.5">TIPO DE OPERACIÓN</p>
                <p className="text-[10px] text-[#a0d4e0]">
                  <span className="text-[#34d39988] font-mono mr-1.5">{tx.tipo_bancario}</span>
                  {TIPO_BANCARIO_LABEL[tx.tipo_bancario] || 'Desconocido'}
                </p>
              </div>
            )}

            {/* Oficina */}
            {tx.oficina_bancaria && (
              <div>
                <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-0.5">OFICINA</p>
                <p className="text-[10px] text-[#a0d4e0]">{tx.oficina_bancaria}</p>
              </div>
            )}

            {/* Fecha */}
            <div>
              <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-0.5">FECHA TRANSACCIÓN</p>
              <p className="text-[10px] text-[#a0d4e0]">{fmtFecha(tx.fecha)}</p>
            </div>

            {/* Detalles adicionales — ocupa todo el ancho si existe */}
            {tx.detalles_banco && (
              <div className="col-span-2">
                <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-0.5">DETALLES ADICIONALES</p>
                <p className="text-[10px] text-[#a0d4e0] font-mono break-all leading-relaxed bg-[#05080f] border border-[#34d39911] rounded-sm px-3 py-2">
                  {tx.detalles_banco}
                </p>
              </div>
            )}

            {/* Vinculación con factura autorizada */}
            {sf && (
              <div className="col-span-2 mt-1 p-2.5 rounded-sm border"
                style={{ borderColor: '#a78bfa33', background: '#a78bfa08' }}>
                <p className="text-[8px] tracking-[2px] text-[#a78bfa] mb-1.5">FACTURA AUTORIZADA COINCIDENTE</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-[#c4b5fd]">{sf.proveedor_nombre}</p>
                    <p className="text-[9px] text-[#a78bfa80]">
                      {sf.numero_factura && <span className="mr-2">{sf.numero_factura}</span>}
                      Neto: {fmtCOP(sf.monto_neto)} · Pago esperado: {fmtFecha(sf.fecha_pago)}
                    </p>
                  </div>
                  {vinculada
                    ? <span className="flex items-center gap-1 text-[9px] text-[#a78bfa]"><Link size={10}/> VINCULADA</span>
                    : <span className="text-[9px] text-[#a78bfa55]">no vinculada</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Paso 2 — Preview y selección ──────────────────────────────────────────────

const PasoPreview = ({ preview, archivo, onConfirmar, onVolver, cargando }) => {
  const [seleccionadas, setSeleccionadas] = useState(
    () => new Set(preview.transacciones.filter(t => t.estado === 'nuevo').map(t => t.referencia_bancaria))
  );
  // vinculos: { [referencia_bancaria]: factura_id } — se llena al presionar "Buscar coincidencias"
  const [vinculos, setVinculos] = useState({});
  const [periodoId,    setPeriodoId]    = useState('');
  const [categoriaId,  setCategoriaId]  = useState('');
  const [periodos,     setPeriodos]     = useState([]);
  const [categorias,   setCategorias]   = useState([]);

  useEffect(() => {
    Promise.all([
      apiService.get('/tesoreria/periodos'),
      apiService.get('/tesoreria/categorias'),
    ]).then(([p, c]) => {
      setPeriodos(p.data.filter(x => x.estado === 'abierto'));
      setCategorias(c.data);
    }).catch(() => {});
  }, []);

  const toggleTx = (ref) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  };

  const buscarCoincidencias = () => {
    const nuevos = {};
    preview.transacciones.forEach(t => {
      if (t.sugerencia_factura && seleccionadas.has(t.referencia_bancaria)) {
        nuevos[t.referencia_bancaria] = t.sugerencia_factura.id;
      }
    });
    const n = Object.keys(nuevos).length;
    if (!n) return toast('Sin coincidencias automáticas en las transacciones seleccionadas', { icon: '🔍' });
    setVinculos(prev => ({ ...prev, ...nuevos }));
    toast.success(`${n} coincidencia${n > 1 ? 's' : ''} encontrada${n > 1 ? 's' : ''}`);
  };

  const toggleVinculo = (referencia_bancaria, factura_id) => {
    setVinculos(prev => {
      const next = { ...prev };
      if (next[referencia_bancaria]) {
        delete next[referencia_bancaria];
      } else {
        next[referencia_bancaria] = factura_id;
      }
      return next;
    });
  };

  const toggleTodos = () => {
    const nuevas = preview.transacciones.filter(t => t.estado === 'nuevo').map(t => t.referencia_bancaria);
    setSeleccionadas(prev =>
      prev.size === nuevas.length ? new Set() : new Set(nuevas)
    );
  };

  const nuevasTx      = preview.transacciones.filter(t => t.estado === 'nuevo');
  const todasMarcadas = seleccionadas.size === nuevasTx.length && nuevasTx.length > 0;
  const vinculosArr   = Object.entries(vinculos)
    .filter(([ref]) => seleccionadas.has(ref))
    .map(([referencia_bancaria, factura_id]) => ({ referencia_bancaria, factura_id }));

  const submit = () => {
    if (!seleccionadas.size) return toast.error('Selecciona al menos una transacción');
    onConfirmar(archivo, preview.cuenta.id, [...seleccionadas], periodoId, categoriaId, vinculosArr);
  };

  return (
    <div className="space-y-4">
      {/* Cabecera resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TOTAL EN ARCHIVO',    val: preview.resumen.total,      color: '#a0d4e0' },
          { label: 'NUEVAS (IMPORTAR)',   val: preview.resumen.nuevas,     color: ACCENT },
          { label: 'YA REGISTRADAS',      val: preview.resumen.duplicadas, color: '#6aacbc' },
        ].map(({ label, val, color }) => (
          <div key={label} className="border border-[#34d39922] bg-[#08101e] rounded-sm px-4 py-3">
            <p className="text-[8px] tracking-[2px] text-[#6aacbc]">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Saldos diarios */}
      {preview.saldos.length > 0 && (
        <div className="border border-[#34d39911] bg-[#08101e] rounded-sm px-4 py-3">
          <p className="text-[8px] tracking-[2px] text-[#6aacbc] mb-2">SALDOS DEL EXTRACTO</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {preview.saldos
              .filter(s => s.tipo === 'inicial')
              .slice(0, 1)
              .concat(preview.saldos.filter(s => s.tipo === 'final').slice(-1))
              .map((s, i) => (
                <span key={i} className="text-[10px] text-[#a0d4e0]">
                  <span className="text-[#6aacbc]">{s.tipo === 'inicial' ? 'SALDO INICIAL' : 'SALDO FINAL'} {fmtFecha(s.fecha)} </span>
                  {fmtCOP(s.monto)}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Período y categoría opcionales */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>PERÍODO (OPCIONAL)</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={inputCls}>
            <option value="">— Sin asignar —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>CATEGORÍA POR DEFECTO (OPCIONAL)</label>
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={inputCls}>
            <option value="">— Sin categoría —</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="border border-[#34d39922] rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#08101e] border-b border-[#34d39922]">
          <button
            onClick={toggleTodos}
            disabled={!nuevasTx.length}
            className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
              todasMarcadas
                ? 'border-[#34d399] bg-[#34d399]'
                : 'border-[#34d39944] hover:border-[#34d399]'
            } disabled:opacity-30 disabled:cursor-default`}
          >
            {todasMarcadas && <Check size={9} strokeWidth={3} className="text-black" />}
          </button>
          <span className="text-[8px] tracking-[2px] text-[#6aacbc] flex-1">
            {seleccionadas.size} de {nuevasTx.length} seleccionadas
          </span>
          <span className="text-[8px] tracking-[2px] text-[#6aacbc] w-20">FECHA</span>
          <span className="text-[8px] tracking-[2px] text-[#6aacbc] flex-1">DESCRIPCIÓN</span>
          <span className="text-[8px] tracking-[2px] text-[#6aacbc] w-32 text-right">MONTO</span>
          <span className="w-4" />
        </div>

        {/* Filas */}
        <div className="max-h-[400px] overflow-y-auto">
          {preview.transacciones.map((tx) => (
            <FilaTx
              key={tx.referencia_bancaria}
              tx={tx}
              seleccionada={seleccionadas.has(tx.referencia_bancaria)}
              onToggle={toggleTx}
              vinculada={!!vinculos[tx.referencia_bancaria]}
              onVincularToggle={toggleVinculo}
            />
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onVolver}
          className="px-4 py-2 rounded-sm border border-[#34d39922] text-[#6aacbc] hover:text-[#a0d4e0] text-[11px] tracking-wide transition-colors"
        >
          VOLVER
        </button>

        {/* Buscar coincidencias — vincula transacciones seleccionadas con facturas pendientes */}
        <button
          onClick={buscarCoincidencias}
          disabled={cargando || !seleccionadas.size}
          className="flex items-center gap-1.5 px-4 py-2 rounded-sm border border-[#a78bfa44] bg-[#a78bfa11] hover:bg-[#a78bfa22] text-[#a78bfa] text-[11px] tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={12} /> BUSCAR COINCIDENCIAS
        </button>

        <div className="flex-1" />

        <button
          onClick={submit}
          disabled={cargando || !seleccionadas.size}
          className="flex items-center gap-2 px-5 py-2 rounded-sm border border-[#34d39944] bg-[#34d39911] hover:bg-[#34d39922] text-[#34d399] text-xs tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {cargando ? 'IMPORTANDO...' : `IMPORTAR ${seleccionadas.size} TX${vinculosArr.length ? ` · ${vinculosArr.length} VINCULADA${vinculosArr.length > 1 ? 'S' : ''}` : ''}`}
        </button>
      </div>
    </div>
  );
};

// ── Resultado final ────────────────────────────────────────────────────────────

const PasoResultado = ({ resultado, onNueva }) => (
  <div className="max-w-md mx-auto text-center space-y-6 py-6">
    <div className="w-14 h-14 rounded-full border-2 border-[#34d399] flex items-center justify-center mx-auto">
      <Check size={28} style={{ color: ACCENT }} />
    </div>
    <div>
      <p className="text-[#34d399] text-lg tracking-widest">IMPORTACIÓN COMPLETA</p>
      <p className="text-[#6aacbc] text-xs mt-1">Las transacciones están disponibles en Movimientos</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="border border-[#34d39933] bg-[#34d39908] rounded-sm p-4">
        <p className="text-[8px] tracking-[2px] text-[#6aacbc]">IMPORTADAS</p>
        <p className="text-3xl font-bold text-[#34d399] mt-1">{resultado.importadas}</p>
      </div>
      <div className="border border-[#6aacbc22] bg-[#08101e] rounded-sm p-4">
        <p className="text-[8px] tracking-[2px] text-[#6aacbc]">OMITIDAS</p>
        <p className="text-3xl font-bold text-[#6aacbc] mt-1">{resultado.omitidas}</p>
      </div>
    </div>

    {resultado.detalle_omitidas?.length > 0 && (
      <div className="border border-[#fbbf2422] bg-[#fbbf2408] rounded-sm px-4 py-3 text-left">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={12} style={{ color: '#fbbf24' }} />
          <span className="text-[9px] tracking-[2px] text-[#fbbf24]">OMITIDAS (YA EXISTÍAN)</span>
        </div>
        {resultado.detalle_omitidas.map((d, i) => (
          <p key={i} className="text-[10px] text-[#a0d4e0] font-mono">{d.referencia}</p>
        ))}
      </div>
    )}

    <button
      onClick={onNueva}
      className="flex items-center gap-2 mx-auto px-5 py-2 rounded-sm border border-[#34d39944] bg-[#34d39911] hover:bg-[#34d39922] text-[#34d399] text-xs tracking-widest transition-all"
    >
      <Upload size={13} /> IMPORTAR OTRO EXTRACTO
    </button>
  </div>
);

// ── Página principal ───────────────────────────────────────────────────────────

export default function ImportarExtracto() {
  const [paso,      setPaso]      = useState(1); // 1=selección, 2=preview, 3=resultado
  const [cuentas,   setCuentas]   = useState([]);
  const [preview,   setPreview]   = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando,  setCargando]  = useState(false);
  const archivoRef = useRef(null);

  useEffect(() => {
    apiService.get('/tesoreria/cuentas')
      .then(r => setCuentas(r.data.filter(c => c.tipo === 'banco')))
      .catch(() => toast.error('No se pudieron cargar las cuentas'));
  }, []);

  const handlePreview = useCallback(async (archivo, cuentaId) => {
    setCargando(true);
    archivoRef.current = { archivo, cuentaId };
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await apiService.post(
        `/tesoreria/extracto/preview?cuenta_id=${cuentaId}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setPreview(data);
      setPaso(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al analizar el archivo');
    } finally {
      setCargando(false);
    }
  }, []);

  const handleConfirmar = useCallback(async (archivo, cuentaId, referencias, periodoId, categoriaId, vinculos = []) => {
    setCargando(true);
    try {
      const form = new FormData();
      form.append('archivo',      archivo);
      form.append('cuenta_id',    cuentaId);
      form.append('referencias',  JSON.stringify(referencias));
      form.append('vinculos',     JSON.stringify(vinculos));
      if (periodoId)   form.append('periodo_id',   periodoId);
      if (categoriaId) form.append('categoria_id', categoriaId);

      const { data } = await apiService.post('/tesoreria/extracto/confirmar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(data);
      setPaso(3);
      toast.success(`${data.importadas} transacciones importadas`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally {
      setCargando(false);
    }
  }, []);

  const reiniciar = () => {
    setPaso(1);
    setPreview(null);
    setResultado(null);
    archivoRef.current = null;
  };

  return (
    <div className="p-8">
      {/* Título */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#34d399] text-[8px] tracking-[4px]">TESORERÍA</span>
          <span className="text-[#34d39944]">/</span>
          <span className="text-[#6aacbc] text-[8px] tracking-[4px]">INGESTA</span>
        </div>
        <h1 className="text-white text-xl tracking-[3px]">IMPORTAR EXTRACTO BANCARIO</h1>
        <p className="text-[#6aacbc] text-[11px] mt-1">Extracto de Bancolombia · formato .xls (PWXL)</p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'SELECCIÓN' },
          { n: 2, label: 'REVISIÓN' },
          { n: 3, label: 'RESULTADO' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${
              paso === n
                ? 'border-[#34d399] bg-[#34d399] text-black'
                : paso > n
                ? 'border-[#34d399] text-[#34d399]'
                : 'border-[#34d39933] text-[#34d39955]'
            }`}>
              {paso > n ? <Check size={9} strokeWidth={3} /> : n}
            </div>
            <span className={`text-[9px] tracking-[2px] ${paso >= n ? 'text-[#a0d4e0]' : 'text-[#34d39944]'}`}>
              {label}
            </span>
            {i < 2 && <span className="text-[#34d39922] mx-1">──</span>}
          </div>
        ))}
      </div>

      {/* Contenido por paso */}
      {paso === 1 && (
        <PasoSeleccion
          cuentas={cuentas}
          onPreview={handlePreview}
          cargando={cargando}
        />
      )}
      {paso === 2 && preview && (
        <PasoPreview
          preview={preview}
          archivo={archivoRef.current.archivo}
          onConfirmar={handleConfirmar}
          onVolver={() => setPaso(1)}
          cargando={cargando}
        />
      )}
      {paso === 3 && resultado && (
        <PasoResultado resultado={resultado} onNueva={reiniciar} />
      )}
    </div>
  );
}
