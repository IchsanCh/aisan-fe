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

let refreshPromise: Promise<string> | null = null;

// Satu-satunya tempat yang boleh manggil POST /auth/refresh -- dipake BARENG
// sama axios interceptor di bawah DAN useChatStream (yang manggil fetch()
// manual buat SSE, jadi gak lewat axios interceptor sama sekali). Di-share
// lewat `refreshPromise` biar single-flight: kalau dua request kena 401
// bareng, cuma 1 kali call /auth/refresh yang beneran jalan.
export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const { refreshToken, setTokens, clearSession } = getAuthState();
  if (!refreshToken) {
    clearSession();
    throw new Error("No refresh token available");
  }

  refreshPromise = refreshClient
    .post<RefreshResponse>("/auth/refresh", { refresh_token: refreshToken })
    .then(({ data }) => {
      setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    })
    .catch((err) => {
      clearSession();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
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
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
