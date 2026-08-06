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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { FormField } from '../../../../../shared/ui/form-field/form-field';
import { InputDirective } from '../../../../../shared/ui/input/input';
import {
  OTP_MAX_LENGTH,
  verifyResetCodeSchema,
} from '../../../../../shared/validators/auth.schema';
import {
  errorMessageOf,
  zodValidator,
} from '../../../../../shared/validators/zod-form';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Step 1 of recovery: prove the code. Nothing about the password is asked
 * here — a wrong code should be caught before the user has typed anything
 * else.
 */
@Component({
  selector: 'fz-verify-code-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, FormField, InputDirective, Alert],
  templateUrl: './verify-code-form.html',
  styleUrl: './verify-code-form.css',
})
export class VerifyCodeForm {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the recovery code was sent to. */
  readonly email = input.required<string>();

  /** Emits the ticket the next step spends. */
  readonly verified = output<string>();

  /** Caps the input at the longest code Supabase can issue, never at 6. */
  protected readonly codeMaxLength = OTP_MAX_LENGTH;

  protected readonly form = this.fb.nonNullable.group(
    { code: '' },
    { validators: zodValidator(verifyResetCodeSchema.pick({ code: true })) },
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
      .verifyResetCode({
        email: this.email(),
        code: this.form.getRawValue().code,
      })
      .subscribe({
        next: ({ resetToken }) => {
          this.submitting.set(false);
          this.verified.emit(resetToken);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
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

  /** A rejected code belongs on the code field, not in a banner. */
  private applyError(err: ApiError): void {
    const onCode: Record<string, string> = {
      // Supabase cannot tell a mistyped code from a stale one, so the message
      // has to cover both and offer both remedies.
      OTP_INVALID:
        'Mã xác thực không đúng hoặc đã hết hạn. Kiểm tra lại hoặc bấm "Gửi lại mã".',
      OTP_EXPIRED: 'Mã xác thực đã hết hạn. Hãy bấm "Gửi lại mã".',
    };

    const message = onCode[err.code];
    if (message) {
      this.form.controls.code.setErrors({ server: message });
      this.form.controls.code.markAsTouched();
      return;
    }

    this.formError.set(err.message);
  }
}
