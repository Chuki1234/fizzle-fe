import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { FormField } from '../../../../../shared/ui/form-field/form-field';
import { InputDirective } from '../../../../../shared/ui/input/input';
import { verifyOtpSchema } from '../../../../../shared/validators/auth.schema';
import {
  errorMessageOf,
  zodValidator,
} from '../../../../../shared/validators/zod-form';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'fz-otp-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, FormField, InputDirective, Alert],
  templateUrl: './otp-verify.html',
  styleUrl: './otp-verify.css',
})
export class OtpVerify {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the code was sent to. */
  readonly email = input.required<string>();

  /**
   * Only the code is editable — the address comes from the parent, so the form
   * validates the `code` half of the schema and the email is attached at
   * submit time.
   */
  protected readonly form = this.fb.nonNullable.group(
    { code: '' },
    { validators: zodValidator(verifyOtpSchema.pick({ code: true })) },
  );

  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly cooldown = signal(0);

  protected readonly canResend = computed(
    () => this.cooldown() === 0 && !this.resending(),
  );

  private readonly formEvents = toSignal(
    this.form.events.pipe(takeUntilDestroyed()),
    { initialValue: null },
  );

  protected readonly codeError = computed(() => {
    this.formEvents();
    return errorMessageOf(this.form.controls.code);
  });

  protected submit(): void {
    if (this.submitting()) return;

    this.form.markAllAsTouched();
    this.formError.set(null);
    this.notice.set(null);

    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth
      .verifyOtp({ email: this.email(), code: this.form.getRawValue().code })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/app');
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
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
        // A rate-limit rejection still means "wait" — hold the button.
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
        return 'Mã xác thực không đúng. Vui lòng kiểm tra lại.';
      case 'OTP_EXPIRED':
        return 'Mã xác thực đã hết hạn. Hãy bấm "Gửi lại mã".';
      default:
        return err.message;
    }
  }
}
