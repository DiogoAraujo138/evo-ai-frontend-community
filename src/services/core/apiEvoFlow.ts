import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

// Direct evo-flow client. No service here imports it: they all reach evo-flow
// through the CRM proxy (`api`). It stays for builds that still import it.
const evoFlowApi = axios.create({
  baseURL: `${import.meta.env.VITE_EVOFLOW_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

evoFlowApi.interceptors.request.use((config) => {
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

evoFlowApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(error);
  }
);

applySetupInterceptor(evoFlowApi);

export default evoFlowApi;
