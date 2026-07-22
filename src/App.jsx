import { Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext.jsx';
import ProtectedRoute     from './components/ProtectedRoute.jsx';
import PublicOnlyRoute    from './components/PublicOnlyRoute.jsx';
import Landing            from './pages/Landing.jsx';
import Login              from './pages/Login.jsx';
import Selector           from './pages/Selector.jsx';
import Notificaciones     from './pages/Notificaciones.jsx';
import NotFound           from './pages/NotFound.jsx';
import AdminLayout        from './modules/admin/components/AdminLayout.jsx';
import Usuarios           from './modules/admin/pages/Usuarios.jsx';
import Permisos           from './modules/admin/pages/Permisos.jsx';
import ImportarAsociados  from './modules/admin/pages/ImportarAsociados.jsx';
import Asociados          from './modules/admin/pages/Asociados.jsx';
import Auditoria          from './modules/admin/pages/Auditoria.jsx';
import Empresas           from './modules/empresas/pages/Empresas.jsx';
import Perfil             from './modules/perfil/pages/Perfil.jsx';
import SorteosLayout      from './modules/sorteos/components/SorteosLayout.jsx';
import Sorteos            from './modules/sorteos/pages/Sorteos.jsx';
import DetalleSorteo      from './modules/sorteos/pages/DetalleSorteo.jsx';
import PortalLogin        from './modules/asociados/pages/PortalLogin.jsx';
import MisDatos           from './modules/asociados/pages/MisDatos.jsx';
import PortalSorteos      from './modules/asociados/pages/PortalSorteos.jsx';
import { PortalProtectedRoute, PortalPublicRoute } from './modules/asociados/components/PortalRoute.jsx';

// En producción se detecta el subdominio.
// En desarrollo (localhost) se sirven todas las rutas para facilitar el trabajo.
const hostname = window.location.hostname;
const isPortal = hostname.startsWith('portal.');
const isDev    = hostname === 'localhost' || hostname === '127.0.0.1';

const PortalRoutes = () => (
  <Routes>
    <Route path="/"              element={<Navigate to="/portal/login" replace />} />
    <Route path="/portal/login"  element={<PortalPublicRoute><PortalLogin /></PortalPublicRoute>} />
    <Route path="/portal"        element={<PortalProtectedRoute><MisDatos /></PortalProtectedRoute>} />
    <Route path="/portal/sorteos" element={<PortalProtectedRoute><PortalSorteos /></PortalProtectedRoute>} />
    <Route path="*"              element={<NotFound />} />
  </Routes>
);

const StaffRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/landing" replace />} />

    <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
    <Route path="/login"   element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

    <Route path="/selector"       element={<ProtectedRoute><Selector /></ProtectedRoute>} />
    <Route path="/perfil"         element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/notificaciones" element={
      <ProtectedRoute>
        <NotificationProvider endpoint="/notificaciones">
          <Notificaciones />
        </NotificationProvider>
      </ProtectedRoute>
    } />

    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
      <Route index                     element={<Usuarios />} />
      <Route path="permisos"           element={<Permisos />} />
      <Route path="asociados"          element={<Asociados />} />
      <Route path="auditoria"          element={<Auditoria />} />
      <Route path="empresas"           element={<Empresas />} />
      <Route path="asociados/importar" element={<ImportarAsociados />} />
    </Route>

    <Route path="/sorteos" element={<ProtectedRoute><SorteosLayout /></ProtectedRoute>}>
      <Route index      element={<Sorteos />} />
      <Route path=":id" element={<DetalleSorteo />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

// En desarrollo se mantienen también las rutas del portal para poder probarlas
const DevRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/landing" replace />} />

    <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
    <Route path="/login"   element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

    <Route path="/selector"       element={<ProtectedRoute><Selector /></ProtectedRoute>} />
    <Route path="/perfil"         element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/notificaciones" element={
      <ProtectedRoute>
        <NotificationProvider endpoint="/notificaciones">
          <Notificaciones />
        </NotificationProvider>
      </ProtectedRoute>
    } />

    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
      <Route index                     element={<Usuarios />} />
      <Route path="permisos"           element={<Permisos />} />
      <Route path="asociados"          element={<Asociados />} />
      <Route path="auditoria"          element={<Auditoria />} />
      <Route path="empresas"           element={<Empresas />} />
      <Route path="asociados/importar" element={<ImportarAsociados />} />
    </Route>

    <Route path="/sorteos" element={<ProtectedRoute><SorteosLayout /></ProtectedRoute>}>
      <Route index      element={<Sorteos />} />
      <Route path=":id" element={<DetalleSorteo />} />
    </Route>

    {/* Portal — solo disponible en dev vía path directo */}
    <Route path="/portal/login"   element={<PortalPublicRoute><PortalLogin /></PortalPublicRoute>} />
    <Route path="/portal"         element={<PortalProtectedRoute><MisDatos /></PortalProtectedRoute>} />
    <Route path="/portal/sorteos" element={<PortalProtectedRoute><PortalSorteos /></PortalProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  if (isDev)    return <DevRoutes />;
  if (isPortal) return <PortalRoutes />;
  return <StaffRoutes />;
};

export default App;
