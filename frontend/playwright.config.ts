import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir   : './tests',
  testMatch : '**/*.spec.ts',
  workers   : 1,
  use       : { baseURL: 'http://127.0.0.1:8080', trace: 'retain-on-failure' },
  projects  : [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
})
