// Supabase types are generated; client wiring is maintained here for env validation.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

/** Use before calling auth — avoids silent failures when `.env` is missing keys. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** For setup UI: whether Vite injected each var (does not log secret values). */
export function getSupabaseEnvPresence() {
  const urlRaw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const keyRaw = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const url = String(urlRaw ?? "").trim();
  const key = String(keyRaw ?? "").trim();
  return {
    url: Boolean(url),
    key: Boolean(key),
    /** Key exists in `.env` as `VITE_*=` but nothing after `=` — still invalid. */
    urlEmptyAfterEquals: urlRaw !== undefined && !url,
    keyEmptyAfterEquals: keyRaw !== undefined && !key,
  };
}

// Valid-looking placeholders so `createClient` never throws at import; calls fail fast if env was empty.
const SAFE_URL = SUPABASE_URL || "https://placeholder.supabase.co";
const SAFE_KEY = SUPABASE_PUBLISHABLE_KEY || "sb_publishable_missing_env";

// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SAFE_URL, SAFE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});