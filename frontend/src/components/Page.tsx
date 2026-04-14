import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { BrainCircuit, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "./ui/Button";

export function Page({ children }: { children: ReactNode }) {
  const { user, clearAuth } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
            <BrainCircuit className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              InterviewAI
            </span>
          </Link>

          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <div className="h-4 w-px bg-white/20 mx-2" />
                <span className="text-sm text-slate-400 hidden sm:inline-block">
                  {user.displayName}
                </span>
                <Link to="/settings">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearAuth}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    Sign in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="glass" size="sm" className="bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-white/10 bg-slate-950/50 backdrop-blur-lg py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} InterviewAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
