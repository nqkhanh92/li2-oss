import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // Môi trường `node`: mọi thứ được test ở v1 là logic server (crypto, URL, header).
    // Chưa có test component nào nên không kéo jsdom vào — một dep bớt phải cài là một
    // dep bớt phải tra license.
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // `lib/db.ts` import 'server-only', mà module đó throw ngoài bundler của Next.
      // Trỏ nó về một module vô hại để code server unit-test được.
      'server-only': fileURLToPath(new URL('./__tests__/stubs/server-only.ts', import.meta.url)),
    },
  },
})
