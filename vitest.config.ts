import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnvConfig } from "@next/env";

process.env.NODE_ENV = 'development';
loadEnvConfig(process.cwd(), true);
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.test.json"] }), react()],
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10000,
    // Use jsdom environment for component/hook tests that need DOM
    environmentMatchGlobs: [
      ["src/__tests__/unit/use-*.test.ts", "jsdom"],
      ["src/__tests__/unit/**/*.test.tsx", "jsdom"],
    ],
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: {
      'server-only': 'vitest',
    },
  },
});
