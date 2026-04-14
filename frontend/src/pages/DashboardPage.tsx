import { useAuth } from "../auth/authContext";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { KeyRound, Plus, History, Activity, AlertCircle, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

export function DashboardPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me, isLoading: isMeLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: any; openrouterKeyStatus: "active" | "missing" | "invalid" }>("/me", {
      accessToken
    })
  });

  const { data: sessionData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiFetch<{ sessions: any[] }>("/sessions", {
      accessToken
    })
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiFetch(`/sessions/${sessionId}`, {
        method: "DELETE",
        accessToken
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
  });

  const keyStatus = me?.openrouterKeyStatus;
  const sessions = sessionData?.sessions || [];
  
  const completedSessions = sessions.filter(s => s.evaluatedCount === s.questionTargetCount);
  
  let overallAvgScore = "--";
  if (sessions.length > 0) {
    let totalScore = 0;
    let totalEvaluated = 0;
    sessions.forEach(s => {
      if (s.averageScore !== null) {
        totalScore += (s.averageScore * s.evaluatedCount);
        totalEvaluated += s.evaluatedCount;
      }
    });
    if (totalEvaluated > 0) {
      overallAvgScore = (Math.round((totalScore / totalEvaluated) * 10) / 10).toString();
    }
  }

  if (isMeLoading || isSessionsLoading) {
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
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName}</h1>
          <p className="text-slate-400 mt-2">Here's an overview of your interview prep progress.</p>
        </motion.div>

        {keyStatus === "missing" || keyStatus === "invalid" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-amber-500/20 p-3 rounded-full">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-500">Action Required: OpenRouter Key</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {keyStatus === "missing" 
                        ? "You need to connect an OpenRouter API key to start practicing."
                        : "Your OpenRouter API key is invalid or revoked. Please update it."}
                    </p>
                  </div>
                </div>
                <Link to="/onboarding/openrouter">
                  <Button className="bg-amber-600 hover:bg-amber-500 text-white border-0">
                    Connect Key
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-300">OpenRouter Status</CardTitle>
              <KeyRound className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyStatus === "active" ? (
                  <span className="text-emerald-400">Active</span>
                ) : (
                  <span className="text-slate-500">Pending</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {keyStatus === "active" ? "Ready to generate questions" : "Connect key to start"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-300">Interviews Completed</CardTitle>
              <History className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSessions.length}</div>
              <p className="text-xs text-slate-500 mt-1">Sessions fully evaluated</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-300">Average Score</CardTitle>
              <Activity className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallAvgScore}</div>
              <p className="text-xs text-slate-500 mt-1">Across all answered questions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 border-dashed border-2 border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
            <div className="bg-blue-500/10 p-4 rounded-full mb-4">
              <Plus className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start a New Interview</h3>
            <p className="text-slate-400 mb-6 max-w-sm">
              Configure your target role, difficulty, and topics to generate a custom interview session.
            </p>
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-500"
              disabled={keyStatus !== "active"}
              onClick={() => navigate("/sessions/new")}
            >
              Configure Session
            </Button>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest interview sessions and resume scores.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No activity yet. Start your first interview!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-200">{session.role}</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {new Date(session.createdAt).toLocaleDateString()} • {session.difficulty}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-300">
                              {session.averageScore !== null ? `${session.averageScore}/10` : "--"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {session.evaluatedCount} / {session.questionTargetCount} answered
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                              disabled={deleteMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this session?")) {
                                  deleteMutation.mutate(session.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => navigate(`/sessions/${session.id}`)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
