import { Page, expect, test } from '@playwright/test';

/**
 * Smoke test: mọi route đang khai báo phải "sống" — load được, không ném lỗi
 * JS chưa bắt (uncaught), và guard điều hướng đúng vai trò.
 *
 * Đây là lưới an toàn cấp thấp nhất: chưa kiểm tra chức năng, chỉ chắc chắn
 * không trang nào vỡ trắng hay crash khi mở.
 */

/** Gắn listener bắt mọi exception JS chưa xử lý trên trang. */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Chờ Angular dựng xong + guard chạy (appInitializer đợi restoreSession). */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

test.describe('Smoke — các route công khai (auth)', () => {
  test('/auth/login render được', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/auth/login');
    await settle(page);

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    expect(errors, `Lỗi JS: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/auth/register render được', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/auth/register');
    await settle(page);

    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    expect(errors, `Lỗi JS: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/auth/forgot-password không crash', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/auth/forgot-password');
    await settle(page);

    // Vào thẳng URL không có email trong state → trang tự đẩy về login. Cả hai
    // (ở lại forgot-password HOẶC về login) đều hợp lệ, miễn không crash.
    await expect(page).toHaveURL(/\/auth\/(forgot-password|login)/);
    expect(errors, `Lỗi JS: ${errors.join(' | ')}`).toEqual([]);
  });
});

test.describe('Smoke — route được bảo vệ (authGuard) khi CHƯA đăng nhập', () => {
  for (const route of ['/friends', '/dashboard']) {
    test(`${route} → đẩy về /auth/login`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(route);
      await settle(page);

      await expect(page).toHaveURL(/\/auth\/login/);
      expect(errors, `Lỗi JS: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});

test.describe('Smoke — route CHƯA gắn guard (ghi nhận hiện trạng)', () => {
  // /settings và /profile hiện KHÔNG có authGuard: người chưa đăng nhập vẫn vào
  // được. Test khẳng định đúng hiện trạng này (không redirect) để nếu sau này
  // mentor thêm guard, test sẽ đỏ và nhắc cập nhật — đây là finding, không phải
  // hành vi mong muốn lâu dài.
  for (const route of ['/settings', '/profile']) {
    test(`${route} render được (chưa có guard)`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(route);
      await settle(page);

      await expect(page).toHaveURL(new RegExp(route));
      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length, 'Trang không được trắng').toBeGreaterThan(0);
      expect(errors, `Lỗi JS: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});
