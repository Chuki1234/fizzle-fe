import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { OtpInput } from '../../../../../shared/ui/otp-input/otp-input';
import { OTP_MIN_LENGTH } from '../../../../../shared/validators/auth.schema';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Step 1 of recovery: prove the code. Nothing about the password is asked
 * here — a wrong code should be caught before the user has typed anything
 * else.
 */
@Component({
  selector: 'fz-verify-code-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Alert, OtpInput],
  templateUrl: './verify-code-form.html',
  styleUrl: './verify-code-form.css',
})
export class VerifyCodeForm {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the recovery code was sent to. */
  readonly email = input.required<string>();

  /** Emits the ticket the next step spends. */
  readonly verified = output<string>();

  /** The assembled OTP code from the 6-box input */
  protected readonly otpCode = signal('');

  /** OTP length from schema constants */
  protected readonly otpLength = OTP_MIN_LENGTH;

  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly cooldown = signal(0);

  protected readonly canResend = computed(
    () => this.cooldown() === 0 && !this.resending(),
  );

  protected submit(): void {
    if (this.submitting()) return;

    const code = this.otpCode();
    if (code.length < this.otpLength) {
      this.formError.set('Vui lòng nhập đủ mã OTP 6 chữ số.');
      return;
    }

    this.formError.set(null);
    this.notice.set(null);
    this.submitting.set(true);

    this.auth
      .verifyResetCode({
        email: this.email(),
        code,
      })
      .subscribe({
        next: ({ resetToken }) => {
          this.submitting.set(false);
          this.verified.emit(resetToken);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.otpCode.set('');
          this.applyError(err);
        },
      });
  }

  protected resend(): void {
    if (!this.canResend()) return;

    this.resending.set(true);
    this.formError.set(null);

    this.auth.forgotPassword(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.notice.set('Đã gửi lại mã. Vui lòng kiểm tra email.');
        this.startCooldown();
      },
      error: (err: ApiError) => {
        this.resending.set(false);
        this.formError.set(err.message);
        if (err.status === 429) this.startCooldown();
      },
    });
  }

  private startCooldown(): void {
    this.cooldown.set(RESEND_COOLDOWN_SECONDS);
    const timer = setInterval(() => {
      this.cooldown.update((n) => Math.max(0, n - 1));
      if (this.cooldown() === 0) clearInterval(timer);
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  /** A rejected code belongs on the code field, not in a banner. */
  private applyError(err: ApiError): void {
    const onCode: Record<string, string> = {
      OTP_INVALID: 'Mã xác thực không đúng hoặc đã hết hạn. Kiểm tra lại hoặc bấm "Gửi lại mã".',
      OTP_EXPIRED: 'Mã xác thực đã hết hạn. Hãy bấm "Gửi lại mã".',
    };

    const message = onCode[err.code];
    if (message) {
      this.formError.set(message);
      return;
    }

    this.formError.set(err.message);
  }
}

