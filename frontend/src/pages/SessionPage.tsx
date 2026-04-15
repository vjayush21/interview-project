import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/authContext";
import { apiFetch } from "../api/client";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Trophy, Sparkles } from "lucide-react";

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [evaluatingIds, setEvaluatingIds] = useState<Record<number, boolean>>({});
  const [evalErrors, setEvalErrors] = useState<Record<number, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: () => apiFetch<any>(`/sessions/${id}`, { accessToken })
  });

  const evaluateMutation = useMutation({
    mutationFn: async ({ questionId, answerText }: { questionId: number, answerText: string }) => {
      return apiFetch<any>(`/questions/${questionId}/answer`, {
        method: "POST",
        accessToken,
        body: { answerText }
      });
    },
    onMutate: ({ questionId }) => {
      setEvaluatingIds(prev => ({ ...prev, [questionId]: true }));
      setEvalErrors(prev => ({ ...prev, [questionId]: "" }));
    },
    onSuccess: (_, { questionId }) => {
      setEvaluatingIds(prev => ({ ...prev, [questionId]: false }));
      // Invalidate the session query to refresh the question data
      queryClient.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: (err: any, { questionId }) => {
      setEvaluatingIds(prev => ({ ...prev, [questionId]: false }));
      setEvalErrors(prev => ({ ...prev, [questionId]: err.message || "Evaluation failed" }));
    }
  });

  if (isLoading) {
    return (
      <Page>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="p-8 text-center text-red-400">Failed to load session.</div>
      </Page>
    );
  }

  const session = data?.session;
  const questions = data?.questions || [];

  const allAnswered = questions.length > 0 && questions.every((q: any) => q.status === "evaluated");
  let avgScore = 0;
  if (allAnswered) {
    const total = questions.reduce((sum: number, q: any) => sum + (q.evaluationJson?.score || 0), 0);
    avgScore = Math.round((total / questions.length) * 10) / 10;
  }

  return (
    <Page>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interview: {session.role}</h1>
            <p className="text-slate-400 mt-2">
              Difficulty: <span className="capitalize text-slate-200">{session.difficulty}</span> &bull; 
              Topics: <span className="text-slate-200">{session.topicsJson?.join(", ")}</span>
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="hidden sm:flex">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </motion.div>

        {allAnswered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-6 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-emerald-500/20 p-4 rounded-full flex-shrink-0">
                    <Trophy className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-400 mb-1">Interview Completed!</h3>
                    <p className="text-slate-300">
                      You have answered all questions. Review your feedback below to see where you can improve.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900/80 px-6 py-4 rounded-xl border border-white/5 flex flex-col items-center justify-center min-w-[140px]">
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Overall Score</p>
                  <p className="text-3xl font-black text-white">{avgScore}<span className="text-lg text-slate-500 font-normal">/10</span></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-6">
          {questions.map((q: any, i: number) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-lg">Question {i + 1}</CardTitle>
                <CardDescription className="text-blue-400 font-medium">Topic: {q.topic || "General"}</CardDescription>
              </CardHeader>
              <CardContent>
                {q.status === "failed" ? (
                  <p className="text-red-400">Failed to generate this question. Model response was incomplete.</p>
                ) : (
                  <>
                    <p className="text-slate-200 text-lg leading-relaxed">{q.questionText || "No question text generated."}</p>
                    
                    {q.status === "evaluated" || q.status === "answered" ? (
                      <div className="mt-6 space-y-6">
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
                          <p className="text-sm font-medium text-slate-400 mb-2">Your Answer:</p>
                          <p className="text-slate-300 whitespace-pre-wrap">{q.answerText}</p>
                        </div>
                        
                        {q.evaluationJson && (
                          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-5 h-5 text-blue-400" />
                              <h4 className="font-semibold text-blue-100">AI Evaluation (Score: {q.evaluationJson.score}/10)</h4>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Feedback</span>
                                <p className="text-sm text-slate-300 mt-1">{q.evaluationJson.feedback}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">How to Improve</span>
                                <p className="text-sm text-slate-300 mt-1">{q.evaluationJson.improvement}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/10">
                          <p className="text-sm text-slate-500 mb-2">Expected points to cover:</p>
                          <ul className="list-disc list-inside text-sm text-slate-400 pl-4 space-y-1">
                            {q.expectedPointsJson?.length > 0 ? q.expectedPointsJson.map((pt: string, j: number) => (
                              <li key={j}>{pt}</li>
                            )) : (
                              <li>No expected points listed.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <textarea
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none min-h-[150px]"
                          placeholder="Type your answer here..."
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          disabled={evaluatingIds[q.id]}
                        />
                        
                        <AnimatePresence>
                          {evaluatingIds[q.id] && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-center overflow-hidden"
                            >
                              <div className="flex items-center gap-3 text-blue-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium flex items-center">
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  AI is evaluating your response...
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {evalErrors[q.id] && (
                          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{evalErrors[q.id]}</span>
                          </div>
                        )}
                        <div className="mt-4 flex justify-end">
                          <button
                            className={`bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${evaluatingIds[q.id] ? 'opacity-0 hidden' : 'opacity-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={() => evaluateMutation.mutate({ questionId: q.id, answerText: answers[q.id] || "" })}
                            disabled={!answers[q.id]?.trim() || evaluatingIds[q.id]}
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}
