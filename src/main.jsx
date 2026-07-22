import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AsociadoProvider } from './context/AsociadoContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AsociadoProvider>
          <ThemeProvider>
            <Toaster position="top-right" />
            <App />
          </ThemeProvider>
        </AsociadoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
