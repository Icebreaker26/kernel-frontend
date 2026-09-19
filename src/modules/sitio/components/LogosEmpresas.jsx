/**
 * Deslizadores con los logos: empresas con convenio de libranza y aliados comerciales.
 *
 * Para agregar, cambiar o quitar un logo basta con poner (o borrar) el archivo en la carpeta que corresponda:
 *   src/modules/sitio/assets/logos/convenios/   empresas donde trabajan los asociados (descuento por nómina)
 *   src/modules/sitio/assets/logos/aliados/     aliados comerciales (descuentos y beneficios)
 * El nombre del archivo es el nombre de la empresa: "Ingenio Risaralda.webp", "CDA del Café.png"... (los guiones y
 * guiones bajos se leen como espacios). Formatos: WebP, PNG, SVG o JPG; conviene fondo transparente y unos 200 px de alto.
 * No hay que tocar código: Vite descubre los archivos y los optimiza. Si una carpeta está vacía, no se dibuja nada.
 */
const convenios = import.meta.glob('../assets/logos/convenios/*.{webp,png,svg,jpg,jpeg}', { eager: true, query: '?url', import: 'default' });
const aliados   = import.meta.glob('../assets/logos/aliados/*.{webp,png,svg,jpg,jpeg}',   { eager: true, query: '?url', import: 'default' });

const nombreDe = (ruta) => decodeURIComponent(ruta.split('/').pop().replace(/\.[^.]+$/, '')).replace(/[-_]+/g, ' ').trim();

const listar = (archivos) => Object.entries(archivos)
  .map(([ruta, url]) => ({ nombre: nombreDe(ruta), url }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const LOGOS_CONVENIOS = listar(convenios);
export const LOGOS_ALIADOS = listar(aliados);

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
  <li className="flex h-24 w-52 shrink-0 items-center justify-center px-5">
    {/* Sin loading="lazy": una imagen diferida sin tamaño propio dentro de una fila animada puede no pedirse nunca.
        Cada logo pesa ~20 KB; la altura fija reserva el espacio y evita saltos. */}
    <img src={url} alt={`Logo de ${nombre}`} decoding="async" fetchPriority="low"
         className="h-14 w-auto max-w-full object-contain transition duration-300 hover:scale-105" />
  </li>
);

const LogosEmpresas = ({ logos, etiqueta = 'Empresas' }) => {
  if (!logos || logos.length === 0) return null;

  // La lista va dos veces seguida para que el desplazamiento se repita sin saltos. Lentitud según cuántos hay.
  const segundos = Math.max(20, logos.length * 3.5);
  return (
    <div className="logos-pista relative overflow-hidden" role="region" aria-label={etiqueta}>
      <style>{CSS}</style>
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-32" aria-hidden />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-32" aria-hidden />
      <ul className="logos-fila flex w-max items-center" style={{ animation: `logos-desliza ${segundos}s linear infinite` }}>
        {logos.map((l) => <Logo key={l.url} {...l} />)}
        {/* Copia solo visual: los lectores de pantalla ya leyeron la lista una vez */}
        {logos.map((l) => <li key={`copia-${l.url}`} aria-hidden className="flex h-24 w-52 shrink-0 items-center justify-center px-5">
          <img src={l.url} alt="" decoding="async" fetchPriority="low" className="h-14 w-auto max-w-full object-contain" />
        </li>)}
      </ul>
    </div>
  );
};

export default LogosEmpresas;
