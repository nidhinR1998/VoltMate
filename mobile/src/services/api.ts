import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

// Centralized Mobile Environment Configuration (single source of truth for EXPO_PUBLIC_* variables)
const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://voltmate.co.in/api/v1";
export const API_BASE_URL = RAW_API_URL.replace(
  "://api.voltmate.co.in",
  "://voltmate.co.in"
);
const BASE_URL = API_BASE_URL;

const G_DOM = ["apps", "googleusercontent", "com"].join(".");

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  `444570032741-05lacpica7sgfthg5303o5t3rub0c2mo.${G_DOM}`;

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  `444570032741-77bn34oberqmj68fnpom6ffupbb22abj.${G_DOM}`;

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

export const OLA_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || "";

export const RAZORPAY_PUBLIC_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = apiClient;

// Request interceptor: attach bearer token & strict anti-cache multi-tenant headers
apiClient.interceptors.request.use(
  async (config) => {
    const state = useAuthStore.getState();
    const token = state.accessToken || state.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (state.user?.id) {
      config.headers["X-User-ID"] = state.user.id;
    }
    config.headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize enterprise ApiResponse error format & token auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.data && typeof error.response.data === "object") {
      const d = error.response.data;
      if (!d.detail) {
        const firstFieldErr =
          Array.isArray(d.errors) && d.errors.length > 0
            ? d.errors[0]?.message
            : null;
        d.detail = firstFieldErr || d.message || "Request could not be completed.";
      }
    }

    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url || "").includes("/auth/login") &&
      !String(originalRequest.url || "").includes("/auth/register")
    ) {
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

