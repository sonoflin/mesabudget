// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://sonoflin.github.io",
  base: "/mesabudget",
  output: "static",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
});
