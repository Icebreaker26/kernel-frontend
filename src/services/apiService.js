import axios from 'axios';

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Emite eventos del DOM para que LockdownBanner los escuche sin acoplamiento
const emitLockdown = (detail) =>
  window.dispatchEvent(new CustomEvent('lockdown', { detail }));

apiService.interceptors.response.use(
  (r) => r,
  (err) => {
    const apiUrl  = err.config?.url ?? '';
    const pageUrl = window.location.pathname;
    const status  = err.response?.status;
    const code    = err.response?.data?.code;

    const isSilent = apiUrl.includes('/auth/me') || apiUrl.includes('/auth/login')
      || apiUrl.includes('/asociados/me') || apiUrl.includes('/asociados/login');

    // Circuit breaker: sistema en modo lockdown
    if (status === 503 && code === 'LOCKDOWN') {
      emitLockdown({ tipo: 'lockdown', nivel: err.response.data.nivel, motivo: err.response.data.motivo });
      return Promise.reject(err);
    }

    // Cuarentena dirigida: IP o usuario en cuarentena
    if (status === 403 && (code === 'IP_CUARENTENA' || code === 'USUARIO_CUARENTENA')) {
      emitLockdown({ tipo: 'cuarentena', code });
      return Promise.reject(err);
    }

    // 401 = sin sesión → redirigir al login
    // 403 sin code especial = sin permiso → dejar que el componente lo maneje
    if (!isSilent && status === 401) {
      window.location.href = pageUrl.startsWith('/portal') ? '/portal/login' : '/landing';
    }

    return Promise.reject(err);
  }
);

export default apiService;
