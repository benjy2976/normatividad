import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve : { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  plugins : [vue()],
  test    : {
    environment : 'happy-dom',
    include     : ['tests/**/*.test.ts'],
    maxWorkers  : 1
  }
})
