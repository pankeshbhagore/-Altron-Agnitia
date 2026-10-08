import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 -> emit one self-contained index.html (for publishing/offline demo)
const single = process.env.SINGLE === "1";
export default defineConfig({
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: { outDir: single ? "dist-single" : "dist", chunkSizeWarningLimit: 2000 },
  server: { proxy: { "/api": "http://localhost:8000" } },
});
