import { env } from "../../config/env";

type RBACRole = "owner" | "admin" | "viewer";

const userRoleMap = new Map<string, RBACRole>();

export const securityService = {
  getComplianceStatus() {
    const ssoProviders = [
      { id: "google", enabled: env.SSO_GOOGLE_ENABLED === "true" },
      { id: "okta", enabled: env.SSO_OKTA_ENABLED === "true" },
      { id: "microsoft", enabled: env.SSO_MICROSOFT_ENABLED === "true" },
    ];
    const controls = {
      authProvider: env.AUTH_PROVIDER,
      jwtIssuerConfigured: Boolean(env.AUTH_ISSUER),
      jwtAudienceConfigured: Boolean(env.AUTH_AUDIENCE),
      mfaRequired: env.MFA_REQUIRED === "true",
      tlsEnabled: env.TLS_ENABLED === "true",
      dbEncryptionEnabled: env.DB_ENCRYPTION_ENABLED === "true",
      mTlsEnabled: env.MTLS_ENABLED === "true",
      secretsProvider: env.SECRETS_PROVIDER,
      immutableAuditEnabled: true,
      backups: {
        multiRegion: env.BACKUP_MULTI_REGION_ENABLED === "true",
        schedule: env.BACKUP_SCHEDULE,
      },
    };

    const scoreBase = [
      controls.jwtIssuerConfigured,
      controls.jwtAudienceConfigured,
      controls.mfaRequired,
      controls.tlsEnabled,
      controls.dbEncryptionEnabled,
      controls.mTlsEnabled,
      controls.secretsProvider !== "local",
      controls.backups.multiRegion,
    ].filter(Boolean).length;

    return {
      score: Math.round((scoreBase / 8) * 100),
      controls,
      ssoProviders,
      soc2Readiness: scoreBase >= 6 ? "on-track" : "needs-hardening",
    };
  },

  setUserRole(userId: string, role: RBACRole) {
    userRoleMap.set(userId, role);
    return { userId, role };
  },

  getMappedRole(userId: string): RBACRole | null {
    return userRoleMap.get(userId) ?? null;
  },
};

