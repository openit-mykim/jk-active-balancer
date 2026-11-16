import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/*/tests/**/*.test.ts",
      "packages/*/src/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
      "apps/web/src/**/*.test.tsx",
      "apps/mobile/src/**/*.test.ts",
    ],
    reporters: ["default"],
  },
});
