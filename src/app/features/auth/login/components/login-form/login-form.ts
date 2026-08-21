import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { FormField } from '../../../../../shared/ui/form-field/form-field';
import { InputDirective } from '../../../../../shared/ui/input/input';
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
  imports: [ReactiveFormsModule, Button, FormField, InputDirective, Alert],
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
  /** Banner xanh khi vừa đăng ký xong và được đưa về đây để đăng nhập. */
  protected readonly notice = signal<string | null>(null);

  constructor() {
    // Trang đăng ký gửi kèm state (không nằm trên URL) khi chuyển về đây.
    const nav = this.router.getCurrentNavigation()?.extras.state as
      | { registered?: boolean; email?: string }
      | undefined;
    if (nav?.registered) {
      this.notice.set(
        'Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.',
      );
      if (nav.email) this.form.controls.email.setValue(nav.email);
    }
  }

  /** Đăng nhập qua GitHub/Google — chuyển trang sang luồng OAuth của backend. */
  protected oauthLogin(provider: 'github' | 'google'): void {
    this.auth.oauthLogin(provider);
  }

  protected togglePassword(): void {
    this.showPassword.update((show) => !show);
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

  /**
   * Recovery starts here rather than on its own page: the address is already
   * in front of the user, so asking for it a second time is a step for
   * nothing. The button therefore stays disabled until the email is valid.
   */
  protected readonly canRequestReset = computed(() => {
    this.formEvents();
    return (
      !this.sendingResetCode() &&
      !this.submitting() &&
      emailField.safeParse(this.form.controls.email.value.trim()).success
    );
  });

  protected requestReset(): void {
    if (!this.canRequestReset()) return;

    const email = this.form.controls.email.value.trim();

    this.sendingResetCode.set(true);
    this.formError.set(null);

    this.auth.forgotPassword(email).subscribe({
      // The API answers 204 whether or not the account exists, so the page
      // advances either way — anything else would leak who is registered.
      next: () => {
        this.sendingResetCode.set(false);
        void this.router.navigate(['/auth/forgot-password'], {
          state: { email },
        });
      },
      error: (err: ApiError) => {
        this.sendingResetCode.set(false);
        this.formError.set(err.message);
      },
    });
  }

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
