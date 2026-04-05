import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

function SignupPageDemo() {
  const navigate = useNavigate();
  const { signup, loading, error, clearError, hydrate, token } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await signup({ name, email, password, confirmPassword });
    if (ok) navigate("/dashboard");
  };

  const passwordMatch = !confirmPassword || password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white relative flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(37,99,235,0.16),transparent_35%),radial-gradient(circle_at_80%_90%,rgba(79,70,229,0.16),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
        <div className="mb-8 flex justify-center">
          <ZorvexaLogo size={24} wordmarkClassName="text-[22px] text-white" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111827]/85 p-7 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-slate-300">Launch autonomous cloud operations in minutes.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]"
                  placeholder="Jane Doe"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]"
                  placeholder="you@company.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Confirm Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  required
                  className={cn(
                    "h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]",
                    !passwordMatch && "border-red-400/60 focus:border-red-400/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
                  )}
                  placeholder="Confirm password"
                />
              </div>
            </label>

            {!!confirmPassword && (
              <div className={cn("flex items-center gap-2 text-xs", passwordMatch ? "text-emerald-300" : "text-red-300")}>
                {passwordMatch ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {passwordMatch ? "Passwords match" : "Passwords do not match"}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordMatch}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition duration-200 hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-center text-xs leading-relaxed text-slate-400">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-blue-300 hover:text-blue-200">Terms</a> and{" "}
              <a href="#" className="text-blue-300 hover:text-blue-200">Privacy Policy</a>.
            </p>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Already have an account?{" "}
            <Link to="/auth" className="text-blue-300 transition-colors hover:text-blue-200">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <SignupPageDemo />;
}
