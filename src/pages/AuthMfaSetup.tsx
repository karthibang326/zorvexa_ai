import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { BRAND, BRAND_TOTP_FRIENDLY_NAME, BRAND_TOTP_ISSUER } from "@/shared/branding";
import { resolveMfaGate } from "@/lib/mfaGate";

type EnrollPayload = {
  factorId: string;
  qrSvg: string;
  secret: string;
};

export default function AuthMfaSetup() {
  const { user, loading: authLoading, refreshMfaGate, signOut } = useAuth();
  const navigate = useNavigate();
  const [enroll, setEnroll] = useState<EnrollPayload | null>(null);
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
      if (gate.kind === "verify") {
        navigate("/auth/mfa-verify", { replace: true });
        return;
      }
      setRouting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const startEnroll = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: BRAND_TOTP_FRIENDLY_NAME,
        issuer: BRAND_TOTP_ISSUER,
      });
      if (enrollError) throw enrollError;
      if (!data?.totp?.qr_code || !data.id) throw new Error("Enrollment did not return a QR code.");
      setEnroll({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start MFA. Enable TOTP MFA in Supabase → Authentication → Providers."
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (chErr || !ch?.id) throw chErr ?? new Error("Challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code: trimmed,
      });
      if (vErr) throw vErr;
      await supabase.auth.getSession();
      await refreshMfaGate();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <ZorvexaLogo size={26} wordmarkClassName="text-[22px]" className="gap-3" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Set up authenticator</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Google Authenticator</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {BRAND.name} requires a time-based one-time password (TOTP) on every sign-in. Scan the QR code or enter the
            secret manually, then confirm with a 6-digit code.
          </p>

          {!enroll ? (
            <div className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                onClick={startEnroll}
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing…
                  </span>
                ) : (
                  "Generate QR code"
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={confirmEnroll} className="space-y-4">
              <div className="flex justify-center rounded-lg border border-border bg-secondary p-4">
                <img
                  src={
                    enroll.qrSvg.startsWith("data:")
                      ? enroll.qrSvg
                      : `data:image/svg+xml;utf-8,${encodeURIComponent(enroll.qrSvg)}`
                  }
                  alt="Scan this QR code with your authenticator app"
                  className="max-h-48 w-auto"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Manual entry secret</p>
                <code className="block break-all rounded-md bg-muted px-2 py-2 text-xs text-foreground">{enroll.secret}</code>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-center text-lg tracking-[0.3em] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  "Confirm and finish"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnroll(null);
                  setCode("");
                  setError(null);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Start over
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/auth", { replace: true });
              }}
              className="text-primary hover:underline"
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
