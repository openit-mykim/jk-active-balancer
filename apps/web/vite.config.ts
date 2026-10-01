import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Web Bluetooth requires a secure context (HTTPS or localhost).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
  server: {
    host: true,
  },
  plugins: [react()],
});
