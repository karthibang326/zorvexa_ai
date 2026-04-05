import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Backend for dev + `vite preview` (same-origin /api in browser). Override with VITE_DEV_API_TARGET=http://host:port */
const API_TARGET = (process.env.VITE_DEV_API_TARGET || "http://127.0.0.1:5002").replace(/\/$/, "");

const apiProxy = {
  "/health": { target: API_TARGET, changeOrigin: true },
  "/api": { target: API_TARGET, changeOrigin: true },
  "/api/copilot": { target: API_TARGET, changeOrigin: true },
  "/api/agents": { target: API_TARGET, changeOrigin: true },
  "/api/workflows": { target: API_TARGET, changeOrigin: true },
  "/api/deploy": { target: API_TARGET, changeOrigin: true },
  "/api/runs": { target: API_TARGET, changeOrigin: true },
  "/api/ai": { target: API_TARGET, changeOrigin: true },
  "/api/realtime": { target: API_TARGET, changeOrigin: true },
  "/api/cloud": { target: API_TARGET, changeOrigin: true },
  "/ws": { target: API_TARGET, ws: true, changeOrigin: true },
} as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    /** Default 5173 — match Auth0 Allowed Callback / Logout / Web Origins. Override with PORT=. */
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: { ...apiProxy },
  },
  /** Without this, `npm run preview` serves the SPA but /api returns 404 — dev proxy only applied to `vite` dev. */
  preview: {
    port: process.env.PREVIEW_PORT ? Number(process.env.PREVIEW_PORT) : 4173,
    strictPort: true,
    proxy: { ...apiProxy },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "vendor-motion";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-router") || id.includes("@remix-run/router")) return "vendor-router";
          if (id.includes("@tanstack/query")) return "vendor-query";
          if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
          return;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
