import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { setApiAuthToken } from "@/lib/api";
import { resolveMfaGate, type MfaGateState } from "@/lib/mfaGate";

type AppRole = "admin" | "moderator" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaGate: MfaGateState;
  refreshMfaGate: () => Promise<void>;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [mfaGate, setMfaGate] = useState<MfaGateState>({ kind: "ok" });
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchRoles = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (data) {
      setRoles(data.map((r: { role: AppRole }) => r.role));
    }
  };

  const refreshMfaGate = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setMfaGate({ kind: "ok" });
      return;
    }
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (!s?.user) {
      setMfaGate({ kind: "ok" });
      return;
    }
    setMfaGate({ kind: "loading" });
    const next = await resolveMfaGate(s);
    setMfaGate(next);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setApiAuthToken(sess?.access_token ?? null);
      if (sess?.user) {
        setTimeout(() => fetchRoles(sess.user.id), 0);
        setMfaGate({ kind: "loading" });
        resolveMfaGate(sess).then(setMfaGate);
      } else {
        setRoles([]);
        setMfaGate({ kind: "ok" });
        setApiAuthToken(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setApiAuthToken(s?.access_token ?? null);
      if (s?.user) {
        fetchRoles(s.user.id);
        setMfaGate({ kind: "loading" });
        resolveMfaGate(s).then(setMfaGate);
      } else {
        setMfaGate({ kind: "ok" });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setMfaGate({ kind: "ok" });
    if (isSupabaseConfigured) setApiAuthToken(null);
  };

  const guardLoading =
    loading || (!!user && isSupabaseConfigured && mfaGate.kind === "loading");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: guardLoading,
        mfaGate,
        refreshMfaGate,
        roles,
        hasRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
