"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  apiRequest,
  authenticatedRequest,
  refreshAccessToken,
  setAccessToken,
  type LoginResponse,
  type User,
} from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sessionError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        await refreshAccessToken();

        const data = await authenticatedRequest<{ user: User }>(
          "/api/auth/me",
        );

        if (active) {
          setUser(data.user);
        }
      } catch (error) {
        if (!active) return;

        setUser(null);

        // A missing/expired session is normal for a logged-out visitor.
        if (!(error instanceof ApiError && error.status === 401)) {
          setSessionError(
            error instanceof Error
              ? error.message
              : "Unable to restore your session.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
    setSessionError("");
  }

  async function logout() {
    // Only show a successful logout after server-side revocation succeeds.
    await apiRequest<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    setAccessToken(null);
    setUser(null);
    setSessionError("");
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, sessionError, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}