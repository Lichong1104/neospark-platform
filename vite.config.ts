import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Must match `STATIC_BASE_URL` origin in `src/api/request.ts` so asset fetches are same-origin in dev. */
const STATIC_ORIGIN = "https://api.useneospark.com";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/uploads": { target: STATIC_ORIGIN, changeOrigin: true },
      "/storage": { target: STATIC_ORIGIN, changeOrigin: true },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
