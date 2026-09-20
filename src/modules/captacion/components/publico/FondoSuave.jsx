/**
 * Fondo animado muy sutil para las pantallas de personas externas (Portal del Asociado): tres manchas difusas con los
 * colores de la marca que se desplazan despacio detrás del contenido. Solo usa transform (barato para el celular),
 * no recibe clics y se queda quieto si la persona pidió "reducir movimiento" en su dispositivo.
 * Debe ir dentro de un contenedor con `relative isolate`.
 */
const CSS = `
@keyframes fsDeriva1 { from { transform: translate3d(0,0,0) scale(1); }    to { transform: translate3d(9vw,7vh,0) scale(1.15); } }
@keyframes fsDeriva2 { from { transform: translate3d(0,0,0) scale(1.1); }  to { transform: translate3d(-8vw,-9vh,0) scale(0.95); } }
@keyframes fsDeriva3 { from { transform: translate3d(0,0,0) scale(0.95); } to { transform: translate3d(-6vw,8vh,0) scale(1.2); } }
.fs-mancha { position: absolute; border-radius: 9999px; filter: blur(70px); will-change: transform; }
@media (prefers-reduced-motion: reduce) { .fs-mancha { animation: none !important; } }
`;

const FondoSuave = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <style>{CSS}</style>
    <span className="fs-mancha" style={{ width: '46vmax', height: '46vmax', top: '-14vmax', left: '-12vmax', background: 'rgba(6,91,142,0.20)', animation: 'fsDeriva1 38s ease-in-out infinite alternate' }} />
    <span className="fs-mancha" style={{ width: '42vmax', height: '42vmax', bottom: '-16vmax', right: '-12vmax', background: 'rgba(91,156,60,0.20)', animation: 'fsDeriva2 46s ease-in-out infinite alternate' }} />
    <span className="fs-mancha" style={{ width: '30vmax', height: '30vmax', top: '32%', right: '-8vmax', background: 'rgba(45,190,170,0.16)', animation: 'fsDeriva3 54s ease-in-out infinite alternate' }} />
  </div>
);

export default FondoSuave;
