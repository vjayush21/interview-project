import { useState, useEffect } from "react";
import { useAuth } from "../auth/authContext";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { Loader2, Save, KeyRound, User } from "lucide-react";

export function SettingsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: any; openrouterKeyStatus: string }>("/me", { accessToken })
  });

  useEffect(() => {
    if (me?.user?.displayName) {
      setDisplayName(me.user.displayName);
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiFetch("/me", {
        method: "PUT",
        accessToken,
        body: { displayName: name }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      alert("Profile updated successfully!");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update profile");
    }
  });

  const updateKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiFetch("/openrouter/key", {
        method: "POST",
        accessToken,
        body: { apiKey: key }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setApiKey("");
      alert("API Key updated and verified successfully!");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update API key");
    }
  });

  if (meLoading) {
    return (
      <Page>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-slate-400 mt-2">Manage your profile and API integrations.</p>
        </motion.div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                <CardTitle>Profile Settings</CardTitle>
              </div>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={me?.user?.email || ""}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                    disabled={updateProfileMutation.isPending || !displayName.trim() || displayName === me?.user?.displayName}
                    onClick={() => updateProfileMutation.mutate(displayName)}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <CardTitle>OpenRouter Integration</CardTitle>
              </div>
              <CardDescription>
                Manage your OpenRouter API key used for generating and evaluating interviews.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                  <div className={`h-2 w-2 rounded-full ${me?.openrouterKeyStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-sm font-medium text-slate-300">
                    Status: <span className={me?.openrouterKeyStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{me?.openrouterKeyStatus === 'active' ? 'Active' : 'Missing/Invalid'}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Update API Key</label>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Your key is encrypted at rest using AES-256-GCM. We never store your raw key.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    disabled={updateKeyMutation.isPending || !apiKey.trim()}
                    onClick={() => updateKeyMutation.mutate(apiKey)}
                  >
                    {updateKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save API Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
