import { defineConfig } from "vitest/config";

export default defineConfig({
  // Caminhos relativos mantêm o build utilizável no GitHub Pages, inclusive em subdiretórios.
  base: "./",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
