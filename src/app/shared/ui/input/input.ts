import { Directive, input } from '@angular/core';

/**
 * Applies the `text-input` recipe to a native control.
 *
 * A directive rather than a component so `formControlName`, `type`,
 * `autocomplete` and the rest keep working exactly as the platform defines
 * them — no ControlValueAccessor to re-implement.
 */
@Directive({
  selector:
    'input[fzInput], select[fzInput], textarea[fzInput]',
  host: {
    class: 'fz-input',
    '[class.fz-input--invalid]': 'invalid()',
  },
})
export class InputDirective {
  readonly invalid = input(false, { alias: 'fzInvalid' });
}
