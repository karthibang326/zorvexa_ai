import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { BRAND } from "@/shared/branding";
import { getSupabaseEnvPresence, isSupabaseConfigured } from "@/integrations/supabase/client";
import { resolveMfaGate } from "@/lib/mfaGate";

function SupabaseNotConfigured() {
  const presence = getSupabaseEnvPresence();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">Supabase sign-in required</h1>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed text-left">
          This app uses <strong>Supabase</strong> for accounts and MFA. Add the variables below to a{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> or{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> file.
        </p>
        <Link to="/" className="inline-block text-sm text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default function Auth() {
  const { user, loading, refreshMfaGate } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(() => searchParams.get("signup") !== "1");
  const [isForgot, setIsForgot] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("signup") === "1") setIsLogin(false);
  }, [searchParams]);

  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured />;
  }
  if (loading) return null;
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox.");
        setIsForgot(false);
      } else if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (error) throw error;
        toast.success("Secure magic link sent to your email!");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const gate = await resolveMfaGate(session);
        await refreshMfaGate();
        if (gate.kind === "enroll") navigate("/auth/mfa-setup", { replace: true });
        else if (gate.kind === "verify") navigate("/auth/mfa-verify", { replace: true });
        else navigate("/dashboard", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
        <div className="flex items-center justify-center mb-8">
          <ZorvexaLogo size={26} wordmarkClassName="text-[22px]" className="gap-3" />
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isForgot ? "Reset password" : isMagicLink ? "Sign in instantly" : isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isForgot
              ? "Enter your email to receive a reset link"
              : isMagicLink
                ? "Enter your email to receive a secure login link"
                : isLogin
                  ? `Sign in to your ${BRAND.name} workspace`
                  : `Get started with ${BRAND.name}`}
          </p>

          {!isForgot && !isMagicLink && isLogin && (
            <div className="mb-6 space-y-4">
              <button
                type="button"
                onClick={() => setIsMagicLink(true)}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Sign in with a Magic Link
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground tracking-wider">Or enter your password</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgot && !isMagicLink && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="you@company.com"
                required
              />
            </div>

            {!isForgot && !isMagicLink && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isForgot && !isMagicLink && (
              <button
                type="button"
                onClick={() => setIsForgot(true)}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? "Loading..."
                : isForgot
                  ? "Send reset link"
                  : isMagicLink
                    ? "Send Magic Link"
                    : isLogin
                      ? "Sign in"
                      : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isForgot || isMagicLink ? (
              <button type="button" onClick={() => { setIsForgot(false); setIsMagicLink(false); }} className="text-primary hover:underline">
                Back to sign in
              </button>
            ) : isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setIsLogin(false)} className="text-primary hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setIsLogin(true)} className="text-primary hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
