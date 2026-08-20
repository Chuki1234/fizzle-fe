import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { OtpInput } from '../../../../../shared/ui/otp-input/otp-input';
import { OTP_MIN_LENGTH } from '../../../../../shared/validators/auth.schema';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'fz-otp-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Alert, OtpInput],
  templateUrl: './otp-verify.html',
  styleUrl: './otp-verify.css',
})
export class OtpVerify {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the code was sent to. */
  readonly email = input.required<string>();

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
      .verifyOtp({ email: this.email(), code })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/app');
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.otpCode.set('');
          this.formError.set(this.messageFor(err));
        },
      });
  }

  protected resend(): void {
    if (!this.canResend()) return;

    this.resending.set(true);
    this.formError.set(null);

    this.auth.resendOtp(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.notice.set('Đã gửi lại mã xác thực. Vui lòng kiểm tra email.');
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

  private messageFor(err: ApiError): string {
    switch (err.code) {
      case 'OTP_INVALID':
        return 'Mã xác thực không đúng hoặc đã hết hạn. Kiểm tra lại hoặc bấm "Gửi lại mã".';
      case 'OTP_EXPIRED':
        return 'Mã xác thực đã hết hạn. Hãy bấm "Gửi lại mã".';
      default:
        return err.message;
    }
  }
}

