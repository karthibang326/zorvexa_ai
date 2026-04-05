import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { BRAND } from "@/shared/branding";
import { resolveMfaGate } from "@/lib/mfaGate";

export default function AuthMfaVerify() {
  const { user, loading: authLoading, refreshMfaGate, signOut } = useAuth();
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routing, setRouting] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        setRouting(false);
        return;
      }
      const gate = await resolveMfaGate(session);
      if (cancelled) return;
      if (gate.kind === "ok") {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (gate.kind === "enroll") {
        navigate("/auth/mfa-setup", { replace: true });
        return;
      }
      if (gate.kind === "verify") {
        setFactorId(gate.factorId);
      }
      setRouting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!isSupabaseConfigured) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading || routing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: trimmed,
      });
      if (verifyError) throw verifyError;
      await supabase.auth.getSession();
      await refreshMfaGate();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (!factorId && !routing) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <ZorvexaLogo size={26} wordmarkClassName="text-[22px]" className="gap-3" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Two-factor authentication</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Authenticator code</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Open Google Authenticator (or any TOTP app) and enter the 6-digit code for{" "}
            <strong>{BRAND.name}</strong>.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">One-time code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-center text-lg tracking-[0.3em] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Verify and continue"
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/auth", { replace: true });
              }}
              className="text-primary hover:underline"
            >
              Sign out and use a different account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
