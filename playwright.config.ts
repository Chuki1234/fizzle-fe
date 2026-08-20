import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình E2E cho Fizzle client.
 *
 * - baseURL trỏ dev server Angular (4200), nên trong test chỉ cần viết đường
 *   dẫn tương đối: `page.goto('/auth/login')`.
 * - webServer tự khởi động `npm start` nếu 4200 chưa chạy; `reuseExistingServer`
 *   để khi bạn đã mở sẵn dev server thì test dùng luôn, không bật trùng.
 * - Nhiều luồng (auth) cần backend NestJS ở :3000 — test tự kiểm tra và báo rõ
 *   nếu thiếu (xem e2e/helpers/test-user.ts), thay vì fail mơ hồ.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
