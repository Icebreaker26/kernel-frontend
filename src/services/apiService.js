import axios from 'axios';

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

apiService.interceptors.response.use(
  (r) => r,
  (err) => {
    if ([401, 403].includes(err.response?.status)) {
      window.location.href = '/landing';
    }
    return Promise.reject(err);
  }
);

export default apiService;
