import axios from 'axios';

// Instancia sin withCredentials ni interceptor 401 — endpoints públicos no requieren auth
const pub = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
});

export default pub;
