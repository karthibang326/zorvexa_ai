/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COPILOT_API_URL?: string;
  readonly VITE_WORKFLOWS_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Set to "false" to skip mandatory TOTP enrollment (local demos only). */
  readonly VITE_REQUIRE_TOTP_MFA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
