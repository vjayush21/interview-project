import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/authContext";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingOpenRouterPage } from "./pages/OnboardingOpenRouterPage";
import { SignupPage } from "./pages/SignupPage";

import { SessionConfigPage } from "./pages/SessionConfigPage";
import { SessionPage } from "./pages/SessionPage";
import { SettingsPage } from "./pages/SettingsPage";

function AuthedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (accessToken) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route
          path="/onboarding/openrouter"
          element={
            <AuthedRoute>
              <OnboardingOpenRouterPage />
            </AuthedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthedRoute>
              <DashboardPage />
            </AuthedRoute>
          }
        />
        <Route
          path="/sessions/new"
          element={
            <AuthedRoute>
              <SessionConfigPage />
            </AuthedRoute>
          }
        />
        <Route
          path="/sessions/:id"
          element={
            <AuthedRoute>
              <SessionPage />
            </AuthedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthedRoute>
              <SettingsPage />
            </AuthedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
