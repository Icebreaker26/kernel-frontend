import axios from 'axios';

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

apiService.interceptors.response.use(
  (r) => r,
  (err) => {
    const apiUrl  = err.config?.url ?? '';
    const pageUrl = window.location.pathname;

    const isSilent = apiUrl.includes('/auth/me') || apiUrl.includes('/auth/login')
      || apiUrl.includes('/asociados/me') || apiUrl.includes('/asociados/login');

    // 401 = sin sesión → redirigir al login
    // 403 = sesión válida pero sin permiso → no redirigir, dejar que el componente lo maneje
    if (!isSilent && err.response?.status === 401) {
      window.location.href = pageUrl.startsWith('/portal') ? '/portal/login' : '/landing';
    }

    return Promise.reject(err);
  }
);

export default apiService;
