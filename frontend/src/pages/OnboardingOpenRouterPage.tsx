import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/authContext";

export function OnboardingOpenRouterPage() {
  const [apiKey, setApiKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch {
      // Ignore paste error
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.startsWith("sk-or-v1-")) {
      setError("Invalid key format. Should start with sk-or-v1-");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // 1) Verify key
      await apiFetch("/openrouter/verify", {
        method: "POST",
        accessToken,
        body: { apiKey }
      });

      // 2) Store key
      await apiFetch("/openrouter/api-key", {
        method: "PUT",
        accessToken,
        body: { apiKey }
      });

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.error?.message || "Failed to verify or store key.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <Page>
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg z-10"
        >
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center border border-blue-500/20">
                <KeyRound className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Connect OpenRouter</CardTitle>
                <CardDescription className="text-slate-400 mt-2">
                  Bring your own API key to generate interview questions and get AI evaluations.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-800/50 rounded-lg p-6 mb-6 border border-white/5">
                <h4 className="text-sm font-semibold text-slate-200 mb-4">How to generate your free key:</h4>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="bg-blue-500/20 rounded-full w-6 h-6 flex items-center justify-center text-blue-400 font-bold text-xs mr-3 mt-0.5 flex-shrink-0">1</div>
                    <p className="text-sm text-slate-300">
                      Create a free account on <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenRouter.ai</a>
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-blue-500/20 rounded-full w-6 h-6 flex items-center justify-center text-blue-400 font-bold text-xs mr-3 mt-0.5 flex-shrink-0">2</div>
                    <p className="text-sm text-slate-300">
                      Navigate to your <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">API Keys page</a>
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-blue-500/20 rounded-full w-6 h-6 flex items-center justify-center text-blue-400 font-bold text-xs mr-3 mt-0.5 flex-shrink-0">3</div>
                    <p className="text-sm text-slate-300">
                      Click <strong>"Create Key"</strong>, copy the generated string (it starts with <code className="bg-slate-900 px-1 py-0.5 rounded text-xs">sk-or-v1-</code>), and paste it below.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-500/10 rounded-lg p-4 mb-6 border border-emerald-500/20">
                <h4 className="text-xs font-semibold text-emerald-400 mb-1 flex items-center uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Secure & Encrypted
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your key is securely encrypted at rest using AES-256-GCM. We never store your raw key, and it is only used to generate your interview questions using AI models.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="flex-1 font-mono"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePaste}
                      className="border-white/10 hover:bg-white/5"
                    >
                      Paste
                    </Button>
                  </div>
                </div>

                {error && <div className="text-sm text-red-400 font-medium p-3 bg-red-400/10 rounded-md border border-red-400/20">{error}</div>}

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isVerifying || !apiKey} 
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  >
                    {isVerifying ? "Verifying..." : (
                      <>
                        Connect Key <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
