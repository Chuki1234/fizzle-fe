import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ApiError } from '../../../../../core/http/api-error.model';
import { RegisterResult } from '../../../../../core/auth/token.model';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { FormField } from '../../../../../shared/ui/form-field/form-field';
import { InputDirective } from '../../../../../shared/ui/input/input';
import {
  registerSchema,
  toRegisterPayload,
} from '../../../../../shared/validators/auth.schema';
import {
  errorMessageOf,
  zodValidator,
} from '../../../../../shared/validators/zod-form';

const MIN_AGE = 13;
const MAX_AGE = 100;

@Component({
  selector: 'fz-register-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, FormField, InputDirective, Alert],
  templateUrl: './register-form.html',
  styleUrl: './register-form.css',
})
export class RegisterForm {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** Emits once the account exists, carrying what the verify step needs. */
  readonly registered = output<RegisterResult>();

  protected readonly form = this.fb.nonNullable.group(
    {
      email: '',
      displayName: '',
      username: '',
      password: '',
      phone: '',
      birthDay: '',
      birthMonth: '',
      birthYear: '',
      acceptsMarketingEmail: false,
    },
    { validators: zodValidator(registerSchema) },
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

  protected readonly emailError = this.errorFor('email');
  protected readonly displayNameError = this.errorFor('displayName');
  protected readonly usernameError = this.errorFor('username');
  protected readonly passwordError = this.errorFor('password');
  protected readonly phoneError = this.errorFor('phone');
  protected readonly birthDayError = this.errorFor('birthDay');
  protected readonly birthMonthError = this.errorFor('birthMonth');
  protected readonly birthYearError = this.errorFor('birthYear');

  /** Any of the three selects failing lights up the whole birthday group. */
  protected readonly birthdateError = computed(
    () =>
      this.birthDayError() ?? this.birthMonthError() ?? this.birthYearError(),
  );

  protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  protected readonly years = (() => {
    const newest = new Date().getFullYear() - MIN_AGE;
    return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => newest - i);
  })();

  protected submit(): void {
    if (this.submitting()) return;

    this.form.markAllAsTouched();
    this.formError.set(null);

    if (this.form.invalid) return;

    const parsed = registerSchema.safeParse(this.form.getRawValue());
    if (!parsed.success) return;

    this.submitting.set(true);
    this.auth.register(toRegisterPayload(parsed.data)).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.registered.emit(result);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.applyServerError(err);
      },
    });
  }

  /**
   * Conflicts belong on the offending field, not in a banner — the user needs
   * to know *which* value to change.
   */
  private applyServerError(err: ApiError): void {
    const onField: Record<string, [string, string]> = {
      EMAIL_TAKEN: ['email', 'Email này đã được sử dụng.'],
      USERNAME_TAKEN: ['username', 'Tên đăng nhập này đã có người dùng.'],
    };

    const mapped = onField[err.code];
    if (mapped) {
      const [name, message] = mapped;
      this.form.get(name)?.setErrors({ server: message });
      this.form.get(name)?.markAsTouched();
      return;
    }

    for (const [name, message] of Object.entries(err.fieldErrors ?? {})) {
      this.form.get(name)?.setErrors({ server: message });
      this.form.get(name)?.markAsTouched();
    }

    if (!err.fieldErrors) this.formError.set(err.message);
  }

  private errorFor(name: string) {
    return computed(() => {
      this.formEvents();
      return errorMessageOf(this.form.get(name));
    });
  }
}
