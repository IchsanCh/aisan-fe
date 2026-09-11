import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type {
  ApiErrorBody,
  LoginResponse,
  RegisterResponse,
} from "@/types/api";
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/validators/auth";

export function extractApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorBody>;
  return axiosError.response?.data?.error ?? fallback;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await apiClient.post<LoginResponse>(
        "/auth/login",
        values,
      );
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.access_token, data.refresh_token);
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const { data } = await apiClient.post<RegisterResponse>(
        "/auth/register",
        {
          name: values.name,
          email: values.email,
          password: values.password,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.access_token, data.refresh_token);
    },
  });
}
