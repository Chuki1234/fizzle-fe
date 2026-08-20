import {
  ChangeDetectionStrategy,
  Component,
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
import { newPasswordSchema } from '../../../../../shared/validators/auth.schema';
import {
  errorMessageOf,
  zodValidator,
} from '../../../../../shared/validators/zod-form';

/**
 * Step 2 of recovery: choose the new password, entered twice.
 *
 * Only reachable once the code has been verified — this form holds the ticket
 * that proves it.
 */
@Component({
  selector: 'fz-new-password-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, FormField, InputDirective, Alert],
  templateUrl: './new-password-form.html',
  styleUrl: './new-password-form.css',
})
export class NewPasswordForm {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** The ticket minted by the verify step. */
  readonly resetToken = input.required<string>();

  /** Emitted once the new password is live. */
  readonly reset = output<void>();

  /** Raised when the ticket expired — the page sends the user back a step. */
  readonly expired = output<void>();

  protected readonly form = this.fb.nonNullable.group(
    { password: '', confirmPassword: '' },
    { validators: zodValidator(newPasswordSchema) },
  );

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((show) => !show);
  }

  private readonly formEvents = toSignal(
    this.form.events.pipe(takeUntilDestroyed()),
    { initialValue: null },
  );

  protected readonly passwordStrength = computed(() => {
    this.formEvents();
    const val = this.form.controls.password.value || '';
    if (!val) return { score: 0, label: '', percent: 0, tone: 'none' };
    
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const percent = Math.min(100, score * 25);
    let label = 'Yếu';
    let tone = 'error';

    if (score === 2) {
      label = 'Trung bình';
      tone = 'warn';
    } else if (score === 3) {
      label = 'Khá';
      tone = 'info';
    } else if (score === 4) {
      label = 'Mạnh';
      tone = 'success';
    }

    return { score, label, percent, tone };
  });

  protected readonly passwordError = computed(() => {
    this.formEvents();
    return errorMessageOf(this.form.controls.password);
  });

  protected readonly confirmPasswordError = computed(() => {
    this.formEvents();
    return errorMessageOf(this.form.controls.confirmPassword);
  });

  protected submit(): void {
    if (this.submitting()) return;

    this.form.markAllAsTouched();
    this.formError.set(null);

    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth
      .resetPassword({
        resetToken: this.resetToken(),
        password: this.form.getRawValue().password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.reset.emit();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.applyError(err);
        },
      });
  }

  private applyError(err: ApiError): void {
    // The ticket died under the user — only a fresh code can revive the flow,
    // so hand control back to the page rather than showing a dead end.
    if (err.code === 'RESET_TOKEN_INVALID') {
      this.expired.emit();
      return;
    }

    if (err.code === 'PASSWORD_REUSED') {
      this.form.controls.password.setErrors({
        server: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
      });
      this.form.controls.password.markAsTouched();
      return;
    }

    for (const [name, message] of Object.entries(err.fieldErrors ?? {})) {
      this.form.get(name)?.setErrors({ server: message });
      this.form.get(name)?.markAsTouched();
    }

    if (!err.fieldErrors) this.formError.set(err.message);
  }
}
