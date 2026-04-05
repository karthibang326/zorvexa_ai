import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export type MfaGateState =
  | { kind: "ok" }
  | { kind: "loading" }
  | { kind: "enroll" }
  | { kind: "verify"; factorId: string };

/** When not `"false"`, users must enroll TOTP before using the app. */
export function isTotpMfaRequired(): boolean {
  return import.meta.env.VITE_REQUIRE_TOTP_MFA !== "false";
}

/**
 * After Supabase password (or OAuth) sign-in, decide whether MFA enrollment or TOTP challenge is needed.
 */
export async function resolveMfaGate(session: Session | null): Promise<MfaGateState> {
  if (!isSupabaseConfigured || !session?.user) {
    return { kind: "ok" };
  }

  const requireEnrollment = isTotpMfaRequired();

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    if (import.meta.env.DEV) {
      console.warn("[mfa] listFactors failed — enable MFA in Supabase (Auth → Providers → MFA):", factorsError.message);
    }
    // Do not silently skip MFA when the product expects TOTP (user would never see Google Authenticator).
    if (requireEnrollment) {
      return { kind: "enroll" };
    }
    return { kind: "ok" };
  }

  const verifiedTotp = factors?.totp?.filter((f) => f.status === "verified") ?? [];
  const hasVerifiedTotp = verifiedTotp.length > 0;
  const factorId = verifiedTotp[0]?.id;

  if (!hasVerifiedTotp) {
    return requireEnrollment ? { kind: "enroll" } : { kind: "ok" };
  }

  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    if (import.meta.env.DEV) {
      console.warn("[mfa] getAuthenticatorAssuranceLevel failed:", aalError.message);
    }
    return factorId ? { kind: "verify", factorId } : { kind: "ok" };
  }

  if (!factorId) {
    return { kind: "ok" };
  }

  if (!aal) {
    return { kind: "verify", factorId };
  }

  // Any AAL1 session with a verified TOTP factor still needs a challenge (Google Authenticator code).
  // Relying only on nextLevel === "aal2" missed some Supabase/client combinations.
  if (aal.currentLevel === "aal1") {
    return { kind: "verify", factorId };
  }

  return { kind: "ok" };
}
