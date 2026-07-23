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
import PatronalesLayout      from './modules/patronales/components/PatronalesLayout.jsx';
import PatronalesDashboard   from './modules/patronales/pages/Dashboard.jsx';
import EmpresasList          from './modules/patronales/pages/EmpresasList.jsx';
import EmpresaDetalle        from './modules/patronales/pages/EmpresaDetalle.jsx';
import FacturasList          from './modules/patronales/pages/FacturasList.jsx';
import FacturaDetalle        from './modules/patronales/pages/FacturaDetalle.jsx';
import EmpresaPortalLogin    from './modules/patronales/pages/EmpresaPortalLogin.jsx';
import EmpresaPortalDashboard from './modules/patronales/pages/EmpresaPortalDashboard.jsx';
import { EmpresaProtectedRoute, EmpresaPublicRoute } from './modules/patronales/components/EmpresaPortalRoute.jsx';
import { EmpresaProvider }   from './context/EmpresaContext.jsx';

const App = () => (
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

    <Route path="/portal/login"   element={<PortalPublicRoute><PortalLogin /></PortalPublicRoute>} />
    <Route path="/portal"         element={<PortalProtectedRoute><MisDatos /></PortalProtectedRoute>} />
    <Route path="/portal/sorteos" element={<PortalProtectedRoute><PortalSorteos /></PortalProtectedRoute>} />

    <Route path="/patronales" element={<ProtectedRoute><PatronalesLayout /></ProtectedRoute>}>
      <Route index                      element={<PatronalesDashboard />} />
      <Route path="empresas"            element={<EmpresasList />} />
      <Route path="empresas/:codigo"    element={<EmpresaDetalle />} />
      <Route path="facturas"            element={<FacturasList />} />
      <Route path="facturas/:id"        element={<FacturaDetalle />} />
    </Route>

    <Route path="/portal-empresa" element={
      <EmpresaProvider>
        <EmpresaProtectedRoute><EmpresaPortalDashboard /></EmpresaProtectedRoute>
      </EmpresaProvider>
    } />
    <Route path="/portal-empresa/login" element={
      <EmpresaProvider>
        <EmpresaPublicRoute><EmpresaPortalLogin /></EmpresaPublicRoute>
      </EmpresaProvider>
    } />
    <Route path="/portal-empresa/cambiar-password" element={
      <EmpresaProvider>
        <EmpresaProtectedRoute><EmpresaPortalDashboard /></EmpresaProtectedRoute>
      </EmpresaProvider>
    } />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
