import React, { useMemo, useState, useEffect } from "react";
import { AuthContext, type AuthContextValue, type AuthUser } from "./authContext";
import { apiFetch } from "../api/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch<{ user: AuthUser }>("/me", { accessToken: token })
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      isLoading,
      setAuth: (next) => {
        setAccessToken(next.accessToken);
        setUser(next.user);
        localStorage.setItem("accessToken", next.accessToken);
      },
      clearAuth: () => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
      }
    }),
    [accessToken, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
