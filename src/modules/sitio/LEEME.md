# Sitio público de la cooperativa (`modules/sitio`)

Páginas públicas: `/inicio`, `/nosotros`, `/transparencia`. Hoy viven dentro del frontend de Kernel como **copia de prueba** (con `noindex`). Están hechas para pasar más adelante a su propio repositorio y dominio (`progresemos-www`).

## Reglas para que la separación sea fácil
- Todo lo del sitio importa de **`compartido.js`** (lo que toma del resto de Kernel), **`config.js`** (URLs y rutas) y **`api.js`** (cliente HTTP). Nunca importa directamente de `captacion` ni de otro módulo.
- Solo consume **endpoints públicos** de la API de Kernel (sin sesión):
  - `GET /api/captacion/pub/sitio` (cifras y tarifas) · `GET /api/captacion/pub/presencia` (municipios)
  - `GET /api/transparencia/pub` y `GET /api/transparencia/pub/:id/descargar` (documentos)
  - `POST /api/captacion/pub/web/visita` (contador de visitas, opcional)
- El formulario de asociación **no se mueve**: vive en Kernel (`/asociate`); el sitio solo enlaza a él con `VITE_URL_ASOCIATE`.

## Qué copiar al nuevo repositorio
| Origen (repo de Kernel, frontend) | Para qué |
|---|---|
| `src/modules/sitio/**` | El sitio completo (páginas, componentes, logos de empresas) |
| `src/modules/captacion/data/marca.js` | Paleta y datos de contacto |
| `src/modules/captacion/data/standSlides.js` | Contenido corporativo (servicios, convenios, historia, pasos) |
| `src/modules/captacion/components/publico/MarcoPublico.jsx` | Solo el componente `Logo` |
| `src/modules/captacion/components/MapaPresencia.jsx` + `utils/usePresencia.js` | Mapa de presencia |
| `src/data/coordenadasCiudades.js` | Coordenadas de los municipios |
| `public/colombia.json`, `public/logo-progresemos.png` | Mapa y logo |
| dependencias: `react-simple-maps`, `d3-geo`, `framer-motion`, `lucide-react`, `react-router-dom`, `axios`, Tailwind | |

Al mover, se reescribe **solo `compartido.js`** para que apunte a las copias locales.

## Variables de entorno del sitio (Vite)
`VITE_API_BASE_URL` (API de Kernel) · `VITE_URL_ASOCIATE` · `VITE_URL_PORTAL` · `VITE_URL_PAGOS` · `VITE_URL_POLITICA_PRIVACIDAD` · `VITE_URL_TERMINOS`

## En el backend, al pasar a otro dominio
- Definir `SITIO_URL` (por ejemplo `https://cooperativaprogresemos.coop`) para que CORS deje leer la API pública desde ese origen.
- Quitar `noindex` en `LayoutSitio` (prop `noindex={false}`) y agregar `robots.txt`, sitemap y redirecciones 301 de las URLs viejas de WordPress (`/sobrenosotros/` → `/nosotros`, `/rte/` → `/transparencia`, etc.).
- El sitio nuevo necesita pre-renderizar cada ruta a HTML estático (SEO y vista previa al compartir).

## Contenido que se gestiona desde Kernel
- **Documentos de transparencia**: módulo *Documentos públicos* (`/documentos-publicos`). Se suben los PDF, se elige categoría y año, y se publican u ocultan. No hay que tocar código.
- **Logos de empresas y aliados**: soltar el archivo en `assets/logos/convenios/` o `assets/logos/aliados/` (el nombre del archivo es el de la empresa).
- **Organigrama**: `components/Organigrama.jsx` (estructura en código).
