import { api } from "@/lib/api";

export type SecurityComplianceResponse = {
  score: number;
  soc2Readiness: "on-track" | "needs-hardening";
  ssoProviders: Array<{ id: string; enabled: boolean }>;
  controls: {
    authProvider: string;
    jwtIssuerConfigured: boolean;
    jwtAudienceConfigured: boolean;
    mfaRequired: boolean;
    tlsEnabled: boolean;
    dbEncryptionEnabled: boolean;
    mTlsEnabled: boolean;
    secretsProvider: string;
    immutableAuditEnabled: boolean;
    backups: {
      multiRegion: boolean;
      schedule: string;
    };
  };
};

export async function getSecurityCompliance() {
  const { data } = await api.get("/security/compliance");
  return data as SecurityComplianceResponse;
}

