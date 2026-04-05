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
    return { kind: "ok" };
  }

  const verifiedTotp = factors?.totp?.filter((f) => f.status === "verified") ?? [];
  const hasVerifiedTotp = verifiedTotp.length > 0;
  const factorId = verifiedTotp[0]?.id;

  if (!hasVerifiedTotp) {
    return requireEnrollment ? { kind: "enroll" } : { kind: "ok" };
  }

  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || !aal || !factorId) {
    return { kind: "ok" };
  }

  if (aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    return { kind: "verify", factorId };
  }

  return { kind: "ok" };
}
