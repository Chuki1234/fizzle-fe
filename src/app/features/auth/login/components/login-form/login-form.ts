import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import {
  emailField,
  loginSchema,
} from '../../../../../shared/validators/auth.schema';
import {
  errorMessageOf,
  zodValidator,
} from '../../../../../shared/validators/zod-form';

@Component({
  selector: 'fz-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
})
export class LoginForm {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group(
    { email: '', password: '' },
    { validators: zodValidator(loginSchema) },
  );

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly sendingResetCode = signal(false);
  protected readonly showPassword = signal(false);

  // Forgot password modal state
  protected readonly showForgotModal = signal(false);
  protected readonly forgotEmailValue = signal('');
  protected readonly forgotEmailError = signal<string | null>(null);
  protected readonly forgotApiError = signal<string | null>(null);
  protected readonly forgotSuccess = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((show) => !show);
  }

  protected openForgotModal(): void {
    const currentEmail = this.form.controls.email.value.trim();
    this.forgotEmailValue.set(currentEmail);
    this.forgotEmailError.set(null);
    this.forgotApiError.set(null);
    this.forgotSuccess.set(false);
    this.showForgotModal.set(true);
  }

  protected closeForgotModal(): void {
    this.showForgotModal.set(false);
  }

  protected onForgotEmailInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.forgotEmailValue.set(val);
    if (this.forgotEmailError()) {
      this.forgotEmailError.set(null);
    }
  }

  protected submitForgot(): void {
    const email = this.forgotEmailValue().trim();
    const parseRes = emailField.safeParse(email);

    if (!parseRes.success) {
      this.forgotEmailError.set('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    this.sendingResetCode.set(true);
    this.forgotApiError.set(null);
    this.forgotEmailError.set(null);

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.sendingResetCode.set(false);
        this.showForgotModal.set(false);
        void this.router.navigate(['/auth/forgot-password'], {
          state: { email },
        });
      },
      error: (err: ApiError) => {
        this.sendingResetCode.set(false);
        this.forgotApiError.set(err.message || 'Đã có lỗi xảy ra khi gửi yêu cầu khôi phục.');
      },
    });
  }

  protected fillDemoCredentials(): void {
    this.form.patchValue({
      email: 'dev@fizzle.io',
      password: 'Password123!',
    });
    this.form.controls.email.markAsTouched();
    this.form.controls.password.markAsTouched();
  }

  /**
   * Form state lives outside the signal graph, so mirror its event stream into
   * a signal — the computed messages below depend on it and re-evaluate when
   * a control is edited, blurred, or revalidated.
   */
  private readonly formEvents = toSignal(
    this.form.events.pipe(takeUntilDestroyed()),
    { initialValue: null },
  );

  protected readonly emailError = computed(() => {
    this.formEvents();
    return errorMessageOf(this.form.controls.email);
  });

  protected readonly passwordError = computed(() => {
    this.formEvents();
    return errorMessageOf(this.form.controls.password);
  });

  protected submit(): void {
    if (this.submitting()) return;

    this.form.markAllAsTouched();
    this.formError.set(null);

    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(this.redirectTarget());
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.formError.set(this.messageFor(err));
      },
    });
  }

  /**
   * Credential failures are reported on the form, never on a single field —
   * saying which half was wrong tells an attacker whether the email exists.
   */
  private messageFor(err: ApiError): string {
    if (err.code === 'INVALID_CREDENTIALS') {
      return 'Email hoặc mật khẩu không đúng.';
    }
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      return 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email của bạn.';
    }
    return err.message;
  }

  private redirectTarget(): string {
    const requested =
      this.router.parseUrl(this.router.url).queryParams['redirectTo'];
    // Only accept in-app paths — an absolute URL here would be an open redirect.
    return typeof requested === 'string' && requested.startsWith('/')
      ? requested
      : '/';
  }
}
