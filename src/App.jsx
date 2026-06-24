import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute   from './components/ProtectedRoute.jsx';
import PublicOnlyRoute  from './components/PublicOnlyRoute.jsx';
import Landing          from './pages/Landing.jsx';
import Login            from './pages/Login.jsx';
import Selector         from './pages/Selector.jsx';
import NotFound         from './pages/NotFound.jsx';

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/landing" replace />} />

    <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
    <Route path="/login"   element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

    <Route path="/selector" element={<ProtectedRoute><Selector /></ProtectedRoute>} />

    {/* Aquí se agregarán los módulos del sistema */}

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
