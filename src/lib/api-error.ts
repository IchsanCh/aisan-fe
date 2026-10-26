import axios from "axios";

// Ambil pesan error dari body { error } milik BE; kalau gak ada response
// sama sekali (offline / server mati) kasih pesan koneksi.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string }>(err)) {
    const message = err.response?.data?.error;
    if (message) return message;
    if (!err.response) return "Gagal terhubung ke server. Coba lagi.";
  }
  return fallback;
}
