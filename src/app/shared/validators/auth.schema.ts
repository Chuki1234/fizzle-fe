import { z } from 'zod';

/**
 * Validation schemas for the auth surfaces.
 *
 * These mirror the DTO schemas in `fizzle-be/src/modules/auth/dto/`. When you
 * change a rule here, change it there too — the polyrepo split means they are
 * kept in sync by hand.
 */

const MIN_AGE = 13;

export const emailField = z.email({ error: 'Email không hợp lệ.' });

export const passwordField = z
  .string()
  .min(8, { error: 'Mật khẩu phải có ít nhất 8 ký tự.' })
  .max(72, { error: 'Mật khẩu không được vượt quá 72 ký tự.' })
  .regex(/[a-z]/, { error: 'Mật khẩu phải có ít nhất 1 chữ thường.' })
  .regex(/[A-Z]/, { error: 'Mật khẩu phải có ít nhất 1 chữ hoa.' })
  .regex(/[0-9]/, { error: 'Mật khẩu phải có ít nhất 1 chữ số.' });

export const usernameField = z
  .string()
  .min(2, { error: 'Tên đăng nhập phải có ít nhất 2 ký tự.' })
  .max(32, { error: 'Tên đăng nhập không được vượt quá 32 ký tự.' })
  .regex(/^[a-z0-9._]+$/, {
    error: 'Chỉ dùng chữ thường, số, dấu chấm và gạch dưới.',
  });

export const displayNameField = z
  .string()
  .max(32, { error: 'Tên hiển thị không được vượt quá 32 ký tự.' });

/** POST /auth/login */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: 'Vui lòng nhập mật khẩu.' }),
});
export type LoginPayload = z.infer<typeof loginSchema>;

/**
 * POST /auth/register
 *
 * The birthday arrives as three separate selects, so it is validated as parts
 * and only then composed into an ISO date. This catches impossible dates like
 * 31/02 that a naive `new Date()` would silently roll over.
 */
export const registerSchema = z
  .object({
    email: emailField,
    displayName: displayNameField,
    username: usernameField,
    password: passwordField,
    // An unselected <select> holds "", which coerces to 0 — so the lower bound
    // is what reports "chưa chọn", and every bound needs its own message.
    birthDay: z.coerce
      .number({ error: 'Vui lòng chọn ngày sinh.' })
      .int({ error: 'Vui lòng chọn ngày sinh.' })
      .min(1, { error: 'Vui lòng chọn ngày sinh.' })
      .max(31, { error: 'Ngày sinh không hợp lệ.' }),
    birthMonth: z.coerce
      .number({ error: 'Vui lòng chọn tháng sinh.' })
      .int({ error: 'Vui lòng chọn tháng sinh.' })
      .min(1, { error: 'Vui lòng chọn tháng sinh.' })
      .max(12, { error: 'Tháng sinh không hợp lệ.' }),
    birthYear: z.coerce
      .number({ error: 'Vui lòng chọn năm sinh.' })
      .int({ error: 'Vui lòng chọn năm sinh.' })
      .min(1900, { error: 'Vui lòng chọn năm sinh.' })
      .max(new Date().getFullYear(), { error: 'Năm sinh không hợp lệ.' }),
    acceptsMarketingEmail: z.boolean(),
  })
  .refine((v) => isRealDate(v.birthYear, v.birthMonth, v.birthDay), {
    error: 'Ngày sinh không tồn tại.',
    path: ['birthDay'],
  })
  .refine((v) => ageOn(v.birthYear, v.birthMonth, v.birthDay) >= MIN_AGE, {
    error: `Bạn phải từ ${MIN_AGE} tuổi trở lên để tạo tài khoản.`,
    path: ['birthYear'],
  });
export type RegisterFormValue = z.infer<typeof registerSchema>;

/** The body actually sent to the API — birthday collapsed to one ISO field. */
export interface RegisterPayload {
  email: string;
  displayName: string;
  username: string;
  password: string;
  birthdate: string;
  acceptsMarketingEmail: boolean;
}

export function toRegisterPayload(v: RegisterFormValue): RegisterPayload {
  return {
    email: v.email,
    displayName: v.displayName.trim() || v.username,
    username: v.username,
    password: v.password,
    birthdate: toIsoDate(v.birthYear, v.birthMonth, v.birthDay),
    acceptsMarketingEmail: v.acceptsMarketingEmail,
  };
}

/** POST /auth/verify-otp */
export const verifyOtpSchema = z.object({
  email: emailField,
  code: z
    .string()
    .regex(/^[0-9]{6}$/, { error: 'Mã xác thực gồm 6 chữ số.' }),
});
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;

/* --- date helpers --------------------------------------------------------- */

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function ageOn(year: number, month: number, day: number, today = new Date()): number {
  let age = today.getFullYear() - year;
  const hasHadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthday) age -= 1;
  return age;
}

function toIsoDate(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}
