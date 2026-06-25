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

    if (!isSilent && [401, 403].includes(err.response?.status)) {
      window.location.href = pageUrl.startsWith('/portal') ? '/portal/login' : '/landing';
    }

    return Promise.reject(err);
  }
);

export default apiService;
