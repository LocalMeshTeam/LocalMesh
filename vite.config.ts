import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Packaged Electron loads index.html from file://, so renderer assets must
  // use relative URLs instead of root-relative /assets/... URLs.
  base: "./",
  server: {
    port: 1420,
    strictPort: true,
  },
});
