import { defineConfig } from "vitest/config";

/**
 * Config dos testes de BANCO (regra de pontos). Roda em ambiente node, sem
 * jsdom/MSW, batendo no Postgres LOCAL real (supabase start). Separado do
 * vitest.config.ts (que é unit/integração de frontend com mocks).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    // sem setupFiles: nada de MSW; estes testes usam o banco de verdade
    fileParallelism: false,
    testTimeout: 20000,
  },
});
