import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { motion } from "framer-motion";
import { apiFetch } from "../api/client";
import { BrainCircuit, Loader2 } from "lucide-react";

export function SessionConfigPage() {
  const [role, setRole] = useState("Frontend Developer");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [topics, setTopics] = useState("React, TypeScript, Performance");
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError("");

    try {
      const topicArray = topics.split(",").map(t => t.trim()).filter(Boolean);
      const res = await apiFetch<{ session: { id: number } }>("/sessions", {
        method: "POST",
        accessToken,
        body: {
          role,
          difficulty,
          topics: topicArray,
          questionCount
        }
      });
      navigate(`/sessions/${res.session.id}`);
    } catch (err: any) {
      setError(err.error?.message || "Failed to generate session");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Page>
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl z-10"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Configure Interview</CardTitle>
              <CardDescription>Set up the parameters for your AI-driven interview session.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Target Role</label>
                  <Input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Backend Engineer, Product Manager"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Topics (comma separated)</label>
                  <Input
                    value={topics}
                    onChange={e => setTopics(e.target.value)}
                    placeholder="e.g. Node.js, System Design, SQL"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="easy" className="text-black">Easy</option>
                      <option value="medium" className="text-black">Medium</option>
                      <option value="hard" className="text-black">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Question Count</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={questionCount}
                      onChange={e => setQuestionCount(parseInt(e.target.value) || 5)}
                      required
                    />
                  </div>
                </div>

                {error && <div className="text-sm text-red-400 p-3 bg-red-400/10 rounded-md">{error}</div>}

                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="mr-2 h-5 w-5" />
                      Start Interview
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
