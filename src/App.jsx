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
import ImportarAsociados  from './modules/admin/pages/ImportarAsociados.jsx';
import Asociados          from './modules/admin/pages/Asociados.jsx';
import Auditoria          from './modules/admin/pages/Auditoria.jsx';
import Empresas           from './modules/empresas/pages/Empresas.jsx';
import EmpresasLayout    from './modules/empresas/components/EmpresasLayout.jsx';
import EmpresasLista     from './modules/empresas/pages/EmpresasLista.jsx';
import EmpresaPerfil     from './modules/empresas/pages/EmpresaPerfil.jsx';
import Perfil             from './modules/perfil/pages/Perfil.jsx';
import AsociadosLayout    from './modules/asociados/components/AsociadosLayout.jsx';
import AsociadosLista     from './modules/asociados/pages/AsociadosLista.jsx';
import AsociadoPerfil     from './modules/asociados/pages/AsociadoPerfil.jsx';
import MonitorPortal      from './modules/asociados/pages/MonitorPortal.jsx';
import ControlUsuarios    from './modules/admin/pages/ControlUsuarios.jsx';
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
import PreviewPeriodo         from './modules/patronales/pages/PreviewPeriodo.jsx';
import { EmpresaProtectedRoute, EmpresaPublicRoute } from './modules/patronales/components/EmpresaPortalRoute.jsx';
import { EmpresaProvider }   from './context/EmpresaContext.jsx';
import GanadoresPublicos      from './modules/asociados/pages/GanadoresPublicos.jsx';
import PoliticaPrivacidad  from './modules/asociados/pages/PoliticaPrivacidad.jsx';
import TerminosCondiciones from './modules/asociados/pages/TerminosCondiciones.jsx';
import GerenciaDashboard   from './modules/gerencia/pages/GerenciaDashboard.jsx';
import FacturasGerencia    from './modules/gerencia/pages/FacturasGerencia.jsx';
import MailingLayout        from './modules/mailing/components/MailingLayout.jsx';
import TransparenciaLayout  from './modules/transparencia/components/TransparenciaLayout.jsx';
import DocumentosPage       from './modules/transparencia/pages/DocumentosPage.jsx';
import BlogLayout           from './modules/blog/components/BlogLayout.jsx';
import EntradasPage         from './modules/blog/pages/EntradasPage.jsx';
import EditorPage           from './modules/blog/pages/EditorPage.jsx';
import AnaliticaLayout      from './modules/analitica/components/AnaliticaLayout.jsx';
import AnaliticaPage        from './modules/analitica/pages/AnaliticaPage.jsx';
import CampanasPage         from './modules/mailing/pages/CampanasPage.jsx';
import ContactosPage        from './modules/mailing/pages/ContactosPage.jsx';
import TesoreriaLayout      from './modules/tesoreria/components/TesoreriaLayout.jsx';
import TesoreriaDashboard   from './modules/tesoreria/pages/Dashboard.jsx';
import Cuentas              from './modules/tesoreria/pages/Cuentas.jsx';
import Movimientos          from './modules/tesoreria/pages/Movimientos.jsx';
import Proveedores          from './modules/tesoreria/pages/Proveedores.jsx';
import Facturas             from './modules/tesoreria/pages/Facturas.jsx';
import CIConfigUmbrales        from './modules/control_interno/pages/ConfigUmbrales.jsx';
import CIEstadisticas          from './modules/control_interno/pages/EstadisticasFacturas.jsx';
import ImportarExtracto    from './modules/tesoreria/pages/ImportarExtracto.jsx';
import ControlInternoLayout    from './modules/control_interno/components/ControlInternoLayout.jsx';
import AprobacionFacturas      from './modules/control_interno/pages/AprobacionFacturas.jsx';
import CIDatosBancarios        from './modules/control_interno/pages/DatosBancarios.jsx';
import ContableLayout          from './modules/contable/components/ContableLayout.jsx';
import ContableFacturas        from './modules/contable/pages/Facturas.jsx';
import ContableProveedores     from './modules/contable/pages/Proveedores.jsx';
import ContablePeriodos        from './modules/contable/pages/Periodos.jsx';
import ContableCategorias      from './modules/contable/pages/Categorias.jsx';
import MisAprobaciones         from './modules/aprobaciones/pages/MisAprobaciones.jsx';
import SeguridadPanel         from './modules/admin/pages/SeguridadPanel.jsx';
import LockdownBanner         from './components/LockdownBanner.jsx';
import ConocenosLanding       from './modules/captacion/pages/ConocenosLanding.jsx';
import StandKioscoPage        from './modules/captacion/pages/StandKioscoPage.jsx';
import BajaAvisos             from './pages/BajaAvisos.jsx';
import InicioPublico          from './modules/sitio/pages/InicioPublico.jsx';
import NosotrosPublico        from './modules/sitio/pages/NosotrosPublico.jsx';
import TransparenciaPublica    from './modules/sitio/pages/TransparenciaPublica.jsx';
import ServiciosPublico        from './modules/sitio/pages/ServiciosPublico.jsx';
import BeneficiosPublico      from './modules/sitio/pages/BeneficiosPublico.jsx';
import AliadosPublico         from './modules/sitio/pages/AliadosPublico.jsx';
import PagosPublico            from './modules/sitio/pages/PagosPublico.jsx';
import PqrsPublica             from './modules/sitio/pages/PqrsPublica.jsx';
import PqrsLayout              from './modules/pqrs/components/PqrsLayout.jsx';
import BandejaPqrs             from './modules/pqrs/pages/BandejaPage.jsx';
import CaptacionLayout        from './modules/captacion/components/CaptacionLayout.jsx';
import ProspectosList         from './modules/captacion/pages/ProspectosList.jsx';
import VinculacionesList      from './modules/captacion/pages/VinculacionesList.jsx';
import VinculacionDetalle     from './modules/captacion/pages/VinculacionDetalle.jsx';
import ValoresAsesor          from './modules/captacion/pages/ValoresAsesor.jsx';
import Cumplimiento           from './modules/captacion/pages/Cumplimiento.jsx';

const App = () => (
  <>
  <LockdownBanner />
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
      <Route index                     element={<ControlUsuarios />} />
      <Route path="asociados"          element={<Asociados />} />
      <Route path="auditoria"          element={<Auditoria />} />
      <Route path="empresas"           element={<Empresas />} />
      <Route path="asociados/importar" element={<ImportarAsociados />} />
      <Route path="monitor"            element={<MonitorPortal />} />
      <Route path="seguridad"          element={<SeguridadPanel />} />
    </Route>

    <Route path="/empresas" element={<ProtectedRoute><EmpresasLayout /></ProtectedRoute>}>
      <Route index           element={<EmpresasLista />} />
      <Route path=":codigo"  element={<EmpresaPerfil />} />
    </Route>

    <Route path="/asociados" element={<ProtectedRoute><AsociadosLayout /></ProtectedRoute>}>
      <Route index          element={<AsociadosLista />} />
      <Route path="monitor" element={<MonitorPortal />} />
      <Route path=":codigo" element={<AsociadoPerfil />} />
    </Route>

    <Route path="/sorteos" element={<ProtectedRoute><SorteosLayout /></ProtectedRoute>}>
      <Route index      element={<Sorteos />} />
      <Route path=":id" element={<DetalleSorteo />} />
    </Route>

    <Route path="/portal/login"              element={<PortalPublicRoute><PortalLogin /></PortalPublicRoute>} />
    <Route path="/portal"                    element={<PortalProtectedRoute><MisDatos /></PortalProtectedRoute>} />
    <Route path="/portal/sorteos"            element={<PortalProtectedRoute><PortalSorteos /></PortalProtectedRoute>} />
    <Route path="/portal/politica-privacidad" element={<PoliticaPrivacidad />} />
    <Route path="/portal/terminos-condiciones" element={<TerminosCondiciones />} />

    <Route path="/patronales" element={<ProtectedRoute><PatronalesLayout /></ProtectedRoute>}>
      <Route index                      element={<PatronalesDashboard />} />
      <Route path="preview"             element={<PreviewPeriodo />} />
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

    <Route path="/gerencia"          element={<ProtectedRoute><GerenciaDashboard /></ProtectedRoute>} />
    <Route path="/gerencia/facturas" element={<ProtectedRoute><FacturasGerencia /></ProtectedRoute>} />

    <Route path="/mailing" element={<ProtectedRoute><MailingLayout /></ProtectedRoute>}>
      <Route index element={<CampanasPage />} />
      <Route path="contactos" element={<ContactosPage />} />
    </Route>

    {/* Gestión de los documentos que se publican en /transparencia (esa ruta pública es distinta) */}
    {/* Bandeja de gestión de PQRS (la página pública para radicar es /pqrs) */}
    <Route path="/gestion-pqrs" element={<ProtectedRoute><PqrsLayout /></ProtectedRoute>}>
      <Route index element={<BandejaPqrs />} />
    </Route>

    <Route path="/documentos-publicos" element={<ProtectedRoute><TransparenciaLayout /></ProtectedRoute>}>
      <Route index element={<DocumentosPage />} />
    </Route>

    {/* Blog del sitio público (las entradas publicadas salen en /blog del sitio) y su analítica de visitas */}
    <Route path="/blog-sitio" element={<ProtectedRoute><BlogLayout /></ProtectedRoute>}>
      <Route index element={<EntradasPage />} />
      <Route path=":id" element={<EditorPage />} />
    </Route>
    <Route path="/analitica-sitio" element={<ProtectedRoute><AnaliticaLayout /></ProtectedRoute>}>
      <Route index element={<AnaliticaPage />} />
    </Route>

    <Route path="/tesoreria" element={<ProtectedRoute><TesoreriaLayout /></ProtectedRoute>}>
      <Route index                  element={<TesoreriaDashboard />} />
      <Route path="cuentas"         element={<Cuentas />} />
      <Route path="movimientos"     element={<Movimientos />} />
      <Route path="proveedores"     element={<Proveedores />} />
      <Route path="facturas"        element={<Facturas />} />
      <Route path="extracto"        element={<ImportarExtracto />} />
    </Route>

    <Route path="/control-interno" element={<ProtectedRoute><ControlInternoLayout /></ProtectedRoute>}>
      <Route index element={<AprobacionFacturas />} />
      <Route path="estadisticas"    element={<CIEstadisticas />} />
      <Route path="datos-bancarios" element={<CIDatosBancarios />} />
      <Route path="umbrales"        element={<CIConfigUmbrales />} />
    </Route>

    <Route path="/contable" element={<ProtectedRoute><ContableLayout /></ProtectedRoute>}>
      <Route index                  element={<ContableFacturas />} />
      <Route path="proveedores"     element={<ContableProveedores />} />
      <Route path="periodos"        element={<ContablePeriodos />} />
      <Route path="categorias"      element={<ContableCategorias />} />
    </Route>

    <Route path="/aprobaciones" element={<ProtectedRoute><MisAprobaciones /></ProtectedRoute>} />

    <Route path="/baja/:token" element={<BajaAvisos />} />
    <Route path="/inicio" element={<InicioPublico />} />
    <Route path="/servicios" element={<ServiciosPublico />} />
    <Route path="/beneficios" element={<BeneficiosPublico />} />
    <Route path="/aliados" element={<AliadosPublico />} />
    <Route path="/nosotros" element={<NosotrosPublico />} />
    <Route path="/transparencia" element={<TransparenciaPublica />} />
    <Route path="/pqrs" element={<PqrsPublica />} />
    <Route path="/pagos" element={<PagosPublico />} />
    <Route path="/conocenos/:token" element={<ConocenosLanding />} />
    <Route path="/stand/:standToken" element={<StandKioscoPage modo="kiosco" />} />
    <Route path="/conoce/:enlaceToken" element={<StandKioscoPage modo="enlace" />} />
    <Route path="/asociate" element={<StandKioscoPage modo="web" />} />

    <Route path="/captacion" element={<ProtectedRoute><CaptacionLayout /></ProtectedRoute>}>
      <Route index                         element={<ProspectosList />} />
      <Route path="vinculaciones"          element={<VinculacionesList />} />
      <Route path="vinculaciones/:id"      element={<VinculacionDetalle />} />
      <Route path="valores"                element={<ValoresAsesor />} />
      <Route path="cumplimiento"           element={<Cumplimiento />} />
    </Route>

    <Route path="/ganadores" element={<GanadoresPublicos />} />

    <Route path="*" element={<NotFound />} />
  </Routes>
  </>
);

export default App;
