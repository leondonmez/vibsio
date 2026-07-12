import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://vibs.io",
  server: { port: 4335 },
  compressHTML: true,
  build: {
    // Inline tiny stylesheets, link larger ones so they cache independently
    inlineStylesheets: "auto",
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      minify: "esbuild",
      cssMinify: "esbuild",
      rollupOptions: {
        output: {
          // Isolate the pure-math/utility layer into its own long-cache
          // chunk: it changes far less often than UI orchestration code.
          manualChunks(id) {
            if (id.includes("/src/utils/")) return "engines";
          },
        },
      },
    },
  },
});
