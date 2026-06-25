# Kernel Frontend — Cooperativa Progresemos

Interfaz web construida con **React 18 + Vite**. Cubre dos contextos de usuario: empleados de la cooperativa y el portal de asociados.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Estilos | Tailwind CSS |
| Iconos | lucide-react |
| Animaciones | Framer Motion |
| HTTP | Axios via `apiService.js` (withCredentials) |
| Notificaciones UI | react-hot-toast |
| Gráficas | recharts |
| Mapa | react-simple-maps |
| Export Excel | SheetJS (`xlsx`) |
| Export PDF tabular | jsPDF + jspdf-autotable |
| Export PDF dashboard | html2canvas + jsPDF |
| Real-time | Socket.IO client |

---

## Requisitos

- Node.js 18+
- Backend corriendo en `http://localhost:4000`
- `.env` configurado

---

## Variables de entorno

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## Instalación y arranque

```bash
npm install
npm run dev     # Vite en puerto 5173
npm run build   # build de producción
```

---

## Arquitectura

```
src/
  App.jsx                         # router principal
  modules/
    admin/
      components/
        AdminLayout.jsx           # sidebar admin + NotificationBell
        ResetPasswordModal.jsx    # modal reset genérico (usuarios y asociados)
      pages/
        Usuarios.jsx              # gestión empleados (aprobar/desactivar/reactivar/rol/reset)
        Permisos.jsx              # asignación masiva de permisos
        Asociados.jsx             # listado paginado (75/pág) con búsqueda y filtros
        ImportarAsociados.jsx     # sincronización CSV
        Empresas.jsx              # listado empresas
        Auditoria.jsx             # tabs: Sincronizaciones CSV · Acciones admin
    asociados/
      pages/
        MisDatos.jsx              # perfil asociado + cambiar contraseña + notif
    sorteos/
      components/
        SorteosLayout.jsx         # sidebar sorteos + modal crear
        BoletosGrid.jsx           # grilla 40×25, coloreada por estado
        SolicitudesPanel.jsx      # aprobar/rechazar con notas
        EmpresasPanel.jsx         # toggle empresas habilitadas (con caché)
        AsociadosSorteoPanel.jsx  # participantes paginados (50/pág) + modal perfil
        EstadisticasSorteoPanel.jsx  # dashboard gráficas (lazy-loaded)
        MapaColombia.jsx          # mapa SVG Colombia con react-simple-maps
      pages/
        Sorteos.jsx               # empty state
        DetalleSorteo.jsx         # tabs: Boletos/Solicitudes/Empresas/Participantes/Estadísticas/Ganadores/Logs
        PortalSorteos.jsx         # vista asociado
  pages/
    Landing.jsx
    Login.jsx
    Selector.jsx                  # panel módulos + métricas + notificaciones
    Notificaciones.jsx            # página completa de notificaciones
    NotFound.jsx
  components/
    ProtectedRoute.jsx
    PublicOnlyRoute.jsx
    NotificationBell.jsx          # campanita con dropdown + badge
  context/
    AuthContext.jsx               # sesión empleado
    AsociadoContext.jsx           # sesión portal asociado
    NotificationContext.jsx       # notificaciones en tiempo real (Socket.IO)
    ThemeContext.jsx
  services/
    apiService.js                 # instancia Axios única, interceptor 401/403
    exportService.js              # exportarExcel() y exportarPDF()
  utils/
    asociados.js                  # labelClaseCuota(), coincideBusqueda()
public/
  colombia.json                   # GeoJSON Colombia 1.5MB (NO en bundle JS)
```

---

## Rutas

### Empleados

| Ruta | Componente | Descripción |
|---|---|---|
| `/landing` | `Landing` | Pública — punto de entrada |
| `/login` | `Login` | Login empleados |
| `/selector` | `Selector` | Módulos + métricas + notificaciones |
| `/notificaciones` | `Notificaciones` | Página completa de notificaciones |
| `/perfil` | `Perfil` | Datos personales + cambiar contraseña |
| `/admin` | `AdminLayout` > `Usuarios` | Gestión de empleados |
| `/admin/permisos` | `Permisos` | Asignación masiva de permisos |
| `/admin/asociados` | `Asociados` | Listado paginado con filtros |
| `/admin/asociados/importar` | `ImportarAsociados` | Sync CSV padrón |
| `/admin/empresas` | `Empresas` | Listado de empresas |
| `/admin/auditoria` | `Auditoria` | Sincronizaciones + acciones admin |
| `/sorteos` | `SorteosLayout` > `Sorteos` | Empty state |
| `/sorteos/:id` | `DetalleSorteo` | Detalle con tabs |

### Portal asociados

| Ruta | Componente | Descripción |
|---|---|---|
| `/portal/login` | `PortalLogin` | Login por CC |
| `/portal` | `MisDatos` | Perfil + contraseña + notificaciones |
| `/portal/sorteos` | `PortalSorteos` | Grilla boletos + solicitudes |

---

## Autenticación y contexto

- `AuthContext` — sesión empleado. No llama `/auth/me` en rutas `/portal/*`
- `AsociadoContext` — sesión portal. No llama `/asociados/me` fuera de `/portal/*`
- `ProtectedRoute` — redirige a `/landing` si no hay sesión
- `PublicOnlyRoute` — redirige a `/selector` si ya hay sesión
- `apiService.js` — interceptor global: 401/403 → `window.location.href = '/landing'`

---

## Sistema de notificaciones

`NotificationContext` se monta en cada layout pasando el `endpoint` correcto:

```jsx
// Empleados
<NotificationProvider endpoint="/notificaciones">
  <AdminLayout />
</NotificationProvider>

// Asociados
<NotificationProvider endpoint="/asociados/notificaciones">
  <MisDatos />
</NotificationProvider>
```

- Carga el historial inicial al montar
- Conecta Socket.IO a `VITE_API_BASE_URL` (sin `/api`)
- Escucha evento `notificacion` y prepende al estado

---

## Tab Estadísticas (por sorteo)

Cargada con `lazy()` — recharts y react-simple-maps se descargan solo cuando el usuario abre esta tab.

**Gráficas incluidas:**
1. **4 tarjetas métricas** — asignados, libres, ocupación %, pendientes retiro
2. **Pie chart (donut)** — distribución de boletos por estado
3. **Bar horizontal** — top 10 empresas por boletos activos (altura y ancho dinámico)
4. **Bar horizontal** — top 10 asociados con más bonos
5. **Mapa Colombia SVG** — pins proporcionales por ciudad, scroll wheel zoom, tooltip
6. **Área chart** — boletos activos por día (snapshot real desde `fecha_asignacion`)
7. **Bar chart agrupado** — compras vs retiros por día

**Exportar PDF:** html2canvas captura el panel completo → jsPDF lo incrusta con header y fondo dark.

---

## Mapa de Colombia

- Librería: `react-simple-maps` (SVG puro, sin tiles externos)
- GeoJSON: `public/colombia.json` (1.5MB) — cargado via fetch por react-simple-maps, **no entra al bundle JS**
- +200 municipios hardcodeados en `MapaColombia.jsx` con coordenadas `[lng, lat]`
- Scroll wheel zoom sin click previo (listener `wheel` con `passive: false`)
- Ciudades sin coordenadas se listan debajo del mapa como fallback

---

## Búsqueda por palabras

`coincideBusqueda(query, ...campos)` en `src/utils/asociados.js`:

```js
// "juan garcia" encuentra "Juan Fernando Garcia"
// divide el query en tokens, exige que TODOS aparezcan en algún campo
```

Usado en admin/Asociados y sorteos/AsociadosSorteoPanel.

---

## Exportaciones

```js
import { exportarExcel, exportarPDF } from '../services/exportService.js';

// Excel
exportarExcel(datos, [{ campo: 'nombre', header: 'Nombre' }, ...], 'nombre_archivo');

// PDF tabular (landscape)
exportarPDF({ titulo, subtitulo, columnas, datos, nombreArchivo });
```

---

## Performance

| Problema | Solución |
|---|---|
| 1000 filas en DOM | Paginación: 75/pág en Asociados admin, 50/pág en Participantes sorteo |
| Recharts + react-simple-maps en bundle principal | `lazy(() => import('./EstadisticasSorteoPanel'))` |
| colombia.json 1.5MB en bundle | Movido a `public/`, cargado por fetch |
| Empresas recargadas cada vez | Lista cacheada en `DetalleSorteo`, pasada como prop |
| Animaciones costosas en listas | `transition={{ duration: 0.1 }}` fijo, sin delays acumulados |

---

## Estética

- Fondo: `bg-[#020617]`
- Fuente: `font-mono`
- Bordes: `border-slate-800`
- Color de acento por módulo: admin → `violet`, sorteos → `emerald`
- Componente de fondo: `ConstellationBackground` (en layouts principales)
