import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { ZodType } from 'zod';

/**
 * Bridges a Zod schema onto a Reactive Form, so the schema stays the single
 * source of truth and the same rules can be shipped to the backend.
 *
 * Attach to the FormGroup: cross-field rules (`.refine`) need the whole value,
 * which a per-control validator would never see. Errors are written back onto
 * the individual controls under the `zod` key using the schema's issue paths.
 */
export function zodValidator<T>(schema: ZodType<T>): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(group.value);

    const controls = (group as { controls?: Record<string, AbstractControl> })
      .controls;
    if (controls) {
      for (const control of Object.values(controls)) {
        if (control.hasError('zod')) {
          const { zod, ...rest } = control.errors ?? {};
          control.setErrors(Object.keys(rest).length ? rest : null);
        }
      }
    }

    if (result.success) return null;

    const formErrors: string[] = [];

    for (const issue of result.error.issues) {
      const key = issue.path[0];
      const control =
        typeof key === 'string' ? controls?.[key] : undefined;

      if (control) {
        // Keep the first message per control — showing five at once is noise.
        if (!control.hasError('zod')) {
          control.setErrors({ ...(control.errors ?? {}), zod: issue.message });
        }
      } else {
        formErrors.push(issue.message);
      }
    }

    return formErrors.length ? { zod: formErrors[0] } : null;
  };
}

/**
 * The message to render for a control: only once the user has actually
 * interacted, so a pristine form is not a wall of red.
 */
export function errorMessageOf(control: AbstractControl | null): string | null {
  if (!control || control.valid) return null;
  if (!control.touched && !control.dirty) return null;

  const errors = control.errors;
  if (!errors) return null;

  if (typeof errors['zod'] === 'string') return errors['zod'];
  if (errors['required']) return 'Trường này là bắt buộc.';
  if (typeof errors['server'] === 'string') return errors['server'];

  return 'Giá trị không hợp lệ.';
}
