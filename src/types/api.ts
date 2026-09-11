// Tipe-tipe ini dijaga supaya 1:1 sama struct/DTO di aisan-be (internal/model,
// internal/handler). Kalau BE nambah field, update di sini juga.

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RegisterResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface ApiErrorBody {
  error: string;
}
