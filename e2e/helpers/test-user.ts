import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tiện ích tạo/xoá tài khoản test trực tiếp qua Supabase Admin API.
 *
 * Vì sao không đăng ký qua UI để lấy tài khoản test? Vì đăng ký gửi email xác
 * thực (dính rate limit) và chậm. Admin API tạo thẳng user đã confirm sẵn, kèm
 * một hàng `profiles` — đúng như một lần đăng ký thành công — rồi test tự xoá.
 *
 * KHÔNG đổi schema: chỉ INSERT/DELETE dữ liệu vào bảng `profiles` đã tồn tại.
 */

interface SupabaseEnv {
  url: string;
  serviceKey: string;
}

/** Đọc key từ process.env, nếu thiếu thì fallback sang ../fizzle-be/.env. */
function loadEnv(): SupabaseEnv | null {
  let url = process.env.SUPABASE_URL ?? '';
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !serviceKey) {
    const envPath = resolve(__dirname, '../../../fizzle-be/.env');
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (key === 'SUPABASE_URL' && !url) url = val;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !serviceKey) serviceKey = val;
      }
    }
  }

  return url && serviceKey ? { url, serviceKey } : null;
}

const env = loadEnv();

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
}

/** Kiểm tra backend NestJS (:3000) có đang chạy không — để test báo lỗi rõ ràng. */
export async function backendUp(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3000/', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Có đủ key Supabase để chạy các test cần tài khoản thật không? */
export function supabaseConfigured(): boolean {
  return env !== null;
}

function adminHeaders() {
  if (!env) throw new Error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    'Content-Type': 'application/json',
  };
}

/** Tạo một tài khoản test đã confirm sẵn + hàng profiles đi kèm. */
export async function createTestUser(
  overrides: Partial<Pick<TestUser, 'password'>> = {},
): Promise<TestUser> {
  if (!env) throw new Error('Supabase chưa cấu hình — không tạo được test user');

  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e_${stamp}@example.com`;
  const username = `e2e_${stamp}`;
  const password = overrides.password ?? 'E2ePass123';

  const createRes = await fetch(`${env.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!createRes.ok) {
    throw new Error(`Tạo auth user thất bại: ${createRes.status} ${await createRes.text()}`);
  }
  const user = (await createRes.json()) as { id: string };

  const profileRes = await fetch(`${env.url}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...adminHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: user.id,
      username,
      display_name: 'E2E Test',
      birthdate: '2000-01-01',
    }),
  });
  if (!profileRes.ok) {
    // dọn auth user để không để lại rác nếu bước profiles hỏng
    await fetch(`${env.url}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    throw new Error(`Tạo profile thất bại: ${profileRes.status} ${await profileRes.text()}`);
  }

  return { id: user.id, email, username, password };
}

/** Xoá tài khoản test (profiles trước, rồi auth user). Nuốt lỗi — best effort. */
export async function deleteTestUser(id: string): Promise<void> {
  if (!env || !id) return;
  await fetch(`${env.url}/rest/v1/profiles?id=eq.${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  }).catch(() => undefined);
  await fetch(`${env.url}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  }).catch(() => undefined);
}
