/**
 * Deslizador con los logos de las empresas con convenio.
 *
 * Para agregar o quitar un logo basta con poner (o borrar) el archivo en `src/modules/sitio/assets/logos-empresas/`.
 * El nombre del archivo es el nombre de la empresa: "Ingenio Risaralda.png", "CDA del Café.webp"... (los guiones y
 * guiones bajos se leen como espacios). Formatos: PNG, SVG, WebP o JPG; conviene fondo transparente.
 * No hay que tocar código: Vite descubre los archivos y los optimiza.
 *
 * Si la carpeta está vacía, no se dibuja nada.
 */
const archivos = import.meta.glob('../assets/logos-empresas/*.{png,svg,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' });

const nombreDe = (ruta) => decodeURIComponent(ruta.split('/').pop().replace(/\.[^.]+$/, '')).replace(/[-_]+/g, ' ').trim();

export const LOGOS = Object.entries(archivos)
  .map(([ruta, url]) => ({ nombre: nombreDe(ruta), url }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

// Para comparar nombres sin importar tildes, mayúsculas ni signos
export const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const CSS = `
@keyframes logos-desliza { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.logos-pista:hover .logos-fila, .logos-pista:focus-within .logos-fila { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .logos-fila { animation: none !important; }
  .logos-pista { overflow-x: auto; }
}`;

const Logo = ({ nombre, url }) => (
  <li className="flex h-20 w-44 shrink-0 items-center justify-center px-4">
    <img src={url} alt={`Logo de ${nombre}`} loading="lazy" decoding="async"
         className="max-h-14 w-auto max-w-full object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
  </li>
);

const LogosEmpresas = () => {
  if (LOGOS.length === 0) return null;

  // La lista va dos veces seguida para que el desplazamiento se repita sin saltos. Lentitud según cuántos hay.
  const segundos = Math.max(20, LOGOS.length * 3.5);
  return (
    <div className="logos-pista relative overflow-hidden" role="region" aria-label="Empresas con convenio">
      <style>{CSS}</style>
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-32" aria-hidden />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-32" aria-hidden />
      <ul className="logos-fila flex w-max items-center" style={{ animation: `logos-desliza ${segundos}s linear infinite` }}>
        {LOGOS.map((l) => <Logo key={l.url} {...l} />)}
        {/* Copia solo visual: los lectores de pantalla ya leyeron la lista una vez */}
        {LOGOS.map((l) => <li key={`copia-${l.url}`} aria-hidden className="flex h-20 w-44 shrink-0 items-center justify-center px-4">
          <img src={l.url} alt="" loading="lazy" decoding="async" className="max-h-14 w-auto max-w-full object-contain opacity-70 grayscale" />
        </li>)}
      </ul>
    </div>
  );
};

export default LogosEmpresas;
