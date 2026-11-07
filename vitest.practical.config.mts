import { defineConfig } from "vitest/config"

// Config só para o teste prático (usa navegador e rede reais). Não é usada pelo CI.
export default defineConfig({
    test: {
        environment: "node",
        include: ["__tests__/**/practical.spec.ts"],
        testTimeout: 120000,
    },
})
