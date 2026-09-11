import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAuthState } from "@/store/auth-store";
import type { RefreshResponse } from "@/types/api";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export const apiClient = axios.create({ baseURL });

// Instance polos khusus buat refresh call -- sengaja gak lewat interceptor di
// atas biar gak ke-loop kalau refresh-nya sendiri kena 401.
const refreshClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = getAuthState();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, clearSession } = getAuthState();
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // udah ada refresh yang jalan -- antri, jangan nembak /auth/refresh lagi.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest._retry = true;
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post<RefreshResponse>(
        "/auth/refresh",
        {
          refresh_token: refreshToken,
        },
      );
      setTokens(data.access_token, data.refresh_token);
      flushQueue(null, data.access_token);
      originalRequest.headers.set(
        "Authorization",
        `Bearer ${data.access_token}`,
      );
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
