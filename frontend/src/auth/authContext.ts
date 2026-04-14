import { createContext, useContext } from "react";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
};

export type AuthContextValue = {
  accessToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setAuth: (next: { accessToken: string; user: AuthUser }) => void;
  clearAuth: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
