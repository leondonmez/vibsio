import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://vibs.io",
  server: { port: 4335 },
  vite: {
    plugins: [tailwindcss()],
  },
});
