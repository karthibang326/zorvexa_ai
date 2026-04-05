import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    /** Match MSW handlers in integration.api.test.ts (`src/lib/api.ts` base URL). */
    env: { VITE_WORKFLOWS_API_URL: "http://localhost:5002" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
