import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RegisterResult } from '../../../core/auth/token.model';
import { OtpVerify } from './components/otp-verify/otp-verify';
import { RegisterForm } from './components/register-form/register-form';

type Step = 'form' | 'verify' | 'success';

const REDIRECT_DELAY_MS = 2500;

@Component({
  selector: 'fz-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RegisterForm, OtpVerify],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly step = signal<Step>('form');
  protected readonly pendingEmail = signal<string>('');

  private redirectTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected onRegistered(result: RegisterResult): void {
    this.pendingEmail.set(result.email);

    // Confirm email BẬT → cần nhập OTP trước. TẮT → tài khoản đã sẵn sàng nhưng
    // register KHÔNG tự đăng nhập; hiện popup "thành công" rồi đưa về trang login.
    if (result.verificationRequired) {
      this.step.set('verify');
      return;
    }

    this.step.set('success');
    this.redirectTimer = setTimeout(() => this.goToLogin(), REDIRECT_DELAY_MS);
  }

  /** Về trang đăng nhập, kèm state để login báo "vừa tạo xong" + điền sẵn email. */
  protected goToLogin(): void {
    this.clearTimer();
    void this.router.navigate(['/auth/login'], {
      state: { registered: true, email: this.pendingEmail() },
    });
  }

  protected backToForm(): void {
    this.step.set('form');
  }

  private clearTimer(): void {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }
}
