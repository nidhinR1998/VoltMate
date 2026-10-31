import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

// Connected to live Production Custom Domain (https://api.voltmate.co.in) + PostgreSQL 18 EDW
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.voltmate.co.in/api/v1";

const G_DOM = ["apps", "googleusercontent", "com"].join(".");

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  `444570032741-05lacpica7sgfthg5303o5t3rub0c2mo.${G_DOM}`;

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  `444570032741-77bn34oberqmj68fnpom6ffupbb22abj.${G_DOM}`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = apiClient;

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: token auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data;
          const user = useAuthStore.getState().user;

          if (user) {
            await useAuthStore.getState().setAuthSession(access_token, newRefresh, user);
          }

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          await useAuthStore.getState().logout();
          return Promise.reject(refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

