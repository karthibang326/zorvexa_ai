import { create } from "zustand";
import { setApiAuthToken } from "@/lib/api";

const JWT_KEY = "quantumops_jwt";

type AuthUser = {
  name: string;
  email: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
};

function readToken(): string | null {
  try {
    return localStorage.getItem(JWT_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(JWT_KEY, token);
    else localStorage.removeItem(JWT_KEY);
  } catch {
    // ignore storage failures in non-browser contexts
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  hydrate: () => {
    const token = readToken();
    setApiAuthToken(token);
    set({ token });
  },
  login: async (email, password) => {
    set({ loading: true, error: null });
    await new Promise((resolve) => setTimeout(resolve, 900));

    if (!email || !password) {
      set({ loading: false, error: "Email and password are required." });
      return false;
    }

    if (password.length < 8) {
      set({ loading: false, error: "Password must be at least 8 characters." });
      return false;
    }

    const token = `astraops_${crypto.randomUUID()}`;
    writeToken(token);
    setApiAuthToken(token);
    set({
      token,
      user: { name: email.split("@")[0], email },
      loading: false,
      error: null,
    });
    return true;
  },
  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true, error: null });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!name || !email || !password || !confirmPassword) {
      set({ loading: false, error: "Please fill in all required fields." });
      return false;
    }

    if (password !== confirmPassword) {
      set({ loading: false, error: "Passwords do not match." });
      return false;
    }

    if (password.length < 8) {
      set({ loading: false, error: "Password must be at least 8 characters." });
      return false;
    }

    const token = `astraops_${crypto.randomUUID()}`;
    writeToken(token);
    setApiAuthToken(token);
    set({
      token,
      user: { name, email },
      loading: false,
      error: null,
    });
    return true;
  },
  logout: () => {
    writeToken(null);
    setApiAuthToken(null);
    set({ token: null, user: null, error: null });
  },
  clearError: () => {
    if (get().error) set({ error: null });
  },
}));
