import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError, hydrate, token } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(email, password);
    if (ok) navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white relative flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.16),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AstraOpsLogo size={24} wordmarkClassName="text-[22px] text-white" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111827]/85 p-7 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-300">Sign in to continue managing autonomous cloud operations.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className={cn(
                    "h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]",
                    error && "border-red-400/60 focus:border-red-400/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
                  )}
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
                  className={cn(
                    "h-11 w-full rounded-xl border border-white/10 bg-[#0F172A] pl-10 pr-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)]",
                    error && "border-red-400/60 focus:border-red-400/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
                  )}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </label>

            <div className="flex items-center justify-between pt-1">
              <Link to="/reset-password" className="text-sm text-blue-300 transition-colors hover:text-blue-200">
                Forgot password?
              </Link>
              <Link to="/auth/signup" className="text-sm text-slate-300 transition-colors hover:text-white">
                Create account
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition duration-200 hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-slate-100 transition duration-200 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.4 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.2-3.8 9.2-9.2 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
