import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error.model';
import { emailField } from '../../../shared/validators/auth.schema';
import { NewPasswordForm } from './components/new-password-form/new-password-form';
import { VerifyCodeForm } from './components/verify-code-form/verify-code-form';

type Step = 'email' | 'verify' | 'password' | 'done';

@Component({
  selector: 'fz-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VerifyCodeForm, NewPasswordForm],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly step = signal<Step>('verify');
  protected readonly email = signal<string>('');
  protected readonly resetToken = signal<string>('');

  protected readonly inputEmailValue = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly sendingCode = signal(false);

  constructor() {
    const state = this.router.getCurrentNavigation()?.extras.state as
      | { email?: string }
      | undefined;

    const initialEmail = state?.email ?? '';

    if (initialEmail) {
      this.email.set(initialEmail);
      this.inputEmailValue.set(initialEmail);
      this.step.set('verify');
    } else {
      this.step.set('email');
    }
  }

  protected onEmailInput(event: Event): void {
    this.inputEmailValue.set((event.target as HTMLInputElement).value);
    this.emailError.set(null);
  }

  protected requestOtp(): void {
    const emailVal = this.inputEmailValue().trim();
    const parseRes = emailField.safeParse(emailVal);

    if (!parseRes.success) {
      this.emailError.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    this.sendingCode.set(true);
    this.emailError.set(null);

    this.auth.forgotPassword(emailVal).subscribe({
      next: () => {
        this.sendingCode.set(false);
        this.email.set(emailVal);
        this.step.set('verify');
      },
      error: (err: ApiError) => {
        this.sendingCode.set(false);
        this.emailError.set(err.message || 'Không thể gửi mã. Vui lòng thử lại.');
      },
    });
  }

  protected backToEmail(): void {
    this.step.set('email');
  }

  protected onVerified(resetToken: string): void {
    this.resetToken.set(resetToken);
    this.step.set('password');
  }

  protected onReset(): void {
    this.resetToken.set('');
    this.step.set('done');
  }

  /** The ticket expired mid-form — send the user back for a fresh code. */
  protected onExpired(): void {
    this.resetToken.set('');
    this.step.set('verify');
  }
}

