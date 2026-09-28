import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes da camada de domínio pura (prioridade, sessão, datas) — sem DOM.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts"],
    passWithNoTests: true,
  },
});
