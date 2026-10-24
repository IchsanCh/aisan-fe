import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";

// Lazy per-route biar bundle awal (auth) gak numpuk sama halaman chat/docs
// yang jauh lebih berat.
const LoginPage = React.lazy(() =>
  import("@/pages/auth/login-page").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = React.lazy(() =>
  import("@/pages/auth/register-page").then((m) => ({
    default: m.RegisterPage,
  })),
);
const ChatPage = React.lazy(() =>
  import("@/pages/chat/chat-page").then((m) => ({ default: m.ChatPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Memuat…
    </div>
  );
}

// Flag `isAuthenticated` doang gak cukup: session lama di localStorage bisa
// punya flag true tapi token-nya kosong. Jadi token juga harus ada.
function useHasSession() {
  return useAuthStore((s) => s.isAuthenticated && !!s.accessToken);
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useHasSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useHasSession();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <RegisterPage />
              </RedirectIfAuthed>
            }
          />
          {/* Satu route buat /chat dan /chat/:id: ChatPage gak ke-remount
              pas URL berubah (mis. /chat -> /chat/12 abis chat baru dibikin),
              jadi stream yang lagi jalan tetap nyambung ke tombol stop. */}
          <Route
            path="/chat/:id?"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
