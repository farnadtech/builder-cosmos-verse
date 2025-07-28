import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath, URL } from "node:url";

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("server/node-build.ts", import.meta.url)),
      name: "server",
      fileName: "production",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // External dependencies that should not be bundled
        "express",
        "cors",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
