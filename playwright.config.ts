import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}/Nutrition-Dashboard/`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // Set only in dev sandboxes whose pre-cached browser revision doesn't
    // match this pinned @playwright/test version — real CI runs its own
    // `playwright install` and needs no override.
    ...(process.env.PW_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } }
      : {}),
  },
  webServer: {
    // A prebuilt-and-served app, not `vite dev` — the service worker and
    // hashed-asset precaching this suite exercises only exist in a real
    // build; the dev server doesn't produce either.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        // This app's layout and gesture code (swipe cards, drag-to-dismiss
        // sheets) only branch to their mobile behavior below the `sm:`
        // breakpoint, so the suite runs at a phone-sized viewport rather
        // than the device preset's desktop default.
        viewport: { width: 390, height: 780 },
      },
    },
  ],
});
