import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { Page } from "../components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "../api/client";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Frontend Validations
    if (displayName.trim().length < 2) {
      setError("Name must be at least 2 characters long.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    // Basic phone number validation: allows numbers, spaces, parentheses, dashes
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    const strippedPhone = fullPhoneNumber.replace(/[\s\(\)\-]/g, '');
    if (!phoneRegex.test(fullPhoneNumber) || strippedPhone.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits).");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiFetch<{ user: any; accessToken: string }>("/auth/signup", {
        method: "POST",
        body: { email, phoneNumber: fullPhoneNumber, password, displayName }
      });
      setAuth({ user: data.user, accessToken: data.accessToken });
      navigate("/onboarding/openrouter");
    } catch (err: any) {
      setError(err.error?.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page>
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md z-10"
        >
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center border border-blue-500/20">
                <BrainCircuit className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                <CardDescription className="text-slate-400 mt-2">
                  Enter your details to start practicing
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Name</label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-28 h-11 bg-slate-900/50 border border-slate-700 rounded-lg px-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+55">🇧🇷 +55</option>
                    </select>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s\(\)\-]/g, ''))}
                      placeholder="555-000-0000"
                      required
                      className="flex-1 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11"
                  />
                </div>
                {error && <div className="text-sm text-red-400 font-medium p-3 bg-red-400/10 rounded-md border border-red-400/20">{error}</div>}
                
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  {isLoading ? "Creating account..." : "Sign up"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-white/5 pt-6 mt-2">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
