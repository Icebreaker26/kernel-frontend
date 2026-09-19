import { useEffect, useRef, useState } from 'react';
import { PenLine, RotateCcw } from 'lucide-react';
import { Aviso, BarraAcciones, Casilla, Grupo } from './publico/ui.jsx';

const MIN_LONGITUD = 30; // px de trazo acumulado: evita que un toque suelto cuente como firma

const SeccionFirma = ({ perfil, versionConsentimiento, versionFirmaElectronica, onSave, saving, onBack }) => {
  const canvasRef   = useRef(null);
  const puntos      = useRef([]);      // [{x, y, t}] en px CSS, como exige el backend
  const dibujando   = useRef(false);
  const longitud    = useRef(0);
  const ultimo      = useRef(null);   // último punto del trazo en curso (no del anterior)
  const [tinta, setTinta]     = useState(false);
  const [trazado, setTrazado] = useState(false);
  const [acepta, setAcepta]   = useState(false);
  const [aceptaFirma, setAceptaFirma] = useState(false);
  const [intentado, setIntentado] = useState(false);

  // El bitmap del canvas debe coincidir con su tamaño en pantalla (y con el devicePixelRatio);
  // si no, el trazo sale desplazado respecto al dedo.
  useEffect(() => {
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: Math.round((e.clientX - r.left) * 10) / 10, y: Math.round((e.clientY - r.top) * 10) / 10, t: Date.now() };
  };

  const iniciar = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
    puntos.current.push(p);
    dibujando.current = true;
    ultimo.current = p;
    setTinta(true);
  };

  const mover = (e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const p = pos(e);
    const anterior = ultimo.current;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    puntos.current.push(p);
    ultimo.current = p;
    if (anterior) longitud.current += Math.hypot(p.x - anterior.x, p.y - anterior.y);
    if (!trazado && longitud.current >= MIN_LONGITUD) setTrazado(true);
  };

  const terminar = () => { dibujando.current = false; };

  const limpiarFirma = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    puntos.current = [];
    longitud.current = 0;
    setTinta(false);
    setTrazado(false);
  };

  const enviar = (e) => {
    e.preventDefault();
    setIntentado(true);
    if (!trazado || !acepta || !aceptaFirma) return;
    onSave({
      firma_png: canvasRef.current.toDataURL('image/png'),
      firma_trazos: puntos.current,
      version_consentimiento: versionConsentimiento,
      acepta_terminos: true,
      acepta_firma_electronica: true,
      version_firma_electronica: versionFirmaElectronica,
    });
  };

  const nombre = [perfil?.nombres, perfil?.apellidos].filter(Boolean).join(' ');

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Grupo titulo="Declaración">
        <p className="text-base leading-relaxed text-slate-600">
          Declaro que la información que suministré es verídica y autorizo a Cooperativa Progresemos para verificarla.
          Acepto los estatutos y reglamentos de la cooperativa y el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.
        </p>
        <Casilla checked={acepta} onChange={setAcepta} name="acepta_terminos">
          Leí y acepto la declaración anterior
        </Casilla>
        {intentado && !acepta && <p role="alert" className="-mt-2 text-sm font-medium text-red-600">Debes aceptar la declaración para firmar.</p>}
      </Grupo>

      <Grupo titulo="Firma electrónica">
        <p className="text-base leading-relaxed text-slate-600">
          Tu firma en este formulario es una firma electrónica (Ley 527 de 1999 y Decreto 2364 de 2012). Guardamos junto a ella la fecha y hora,
          tu dirección IP y el dispositivo, y una huella digital (hash) del documento para comprobar que no se altera después de firmado.
        </p>
        <Casilla checked={aceptaFirma} onChange={setAceptaFirma} name="acepta_firma_electronica">
          Acepto firmar electrónicamente y que esta firma tiene el mismo valor que mi firma manuscrita
        </Casilla>
        {intentado && !aceptaFirma && <p role="alert" className="-mt-2 text-sm font-medium text-red-600">Debes aceptar para poder firmar electrónicamente.</p>}
      </Grupo>

      <Grupo titulo="Tu firma" descripcion={nombre ? `Firma como ${nombre}.` : undefined}>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
          <canvas
            ref={canvasRef}
            aria-label="Área de firma"
            className="block h-48 w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onPointerDown={iniciar} onPointerMove={mover} onPointerUp={terminar}
            onPointerCancel={terminar} onPointerLeave={terminar}
          />
          {!tinta && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
              <PenLine size={28} />
              <p className="text-base">Firma aquí con el dedo o el mouse</p>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-9 left-6 right-6 border-b border-slate-200" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Se guarda como imagen junto con tu solicitud.</p>
          <button type="button" onClick={limpiarFirma} disabled={!tinta}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40">
            <RotateCcw size={15} /> Borrar
          </button>
        </div>
        {intentado && !trazado && <p role="alert" className="text-sm font-medium text-red-600">Dibuja tu firma para continuar.</p>}
      </Grupo>

      <Aviso tono="info">Al enviar, tu asesor recibe un aviso y se comunica contigo para los siguientes pasos.</Aviso>

      <BarraAcciones onBack={onBack} cargando={saving} etiqueta="Enviar mi solicitud" />
    </form>
  );
};

export default SeccionFirma;
