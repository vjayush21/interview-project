import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { Code2, Brain, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: <Brain className="h-6 w-6 text-blue-400" />,
    title: "AI-Powered Questions",
    description: "Generate highly relevant interview questions based on your target role and experience level."
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-400" />,
    title: "Instant Evaluation",
    description: "Get real-time feedback and scoring on your answers to identify areas of improvement."
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
    title: "Bring Your Own Key",
    description: "Securely connect your OpenRouter API key to maintain control over your AI usage and costs."
  },
  {
    icon: <Code2 className="h-6 w-6 text-indigo-400" />,
    title: "Resume Scoring",
    description: "Upload your resume and get AI-driven ATS optimization suggestions instantly."
  }
];

export function LandingPage() {
  return (
    <Page>
      <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 text-center max-w-4xl"
        >
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            v1.0 is now live with OpenRouter Integration
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            Master your next interview with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI Precision
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop guessing what they'll ask. Generate role-specific questions, practice your answers, 
            and get instant, actionable feedback from advanced AI models.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]">
                Start Practicing Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="glass" className="h-14 px-8 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="container mx-auto px-4 mt-32 max-w-6xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg transition-all hover:bg-white/10 hover:border-white/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="mb-4 inline-flex rounded-xl bg-slate-900/50 p-3 shadow-inner ring-1 ring-white/10">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-200">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Page>
  );
}
