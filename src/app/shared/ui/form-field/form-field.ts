import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Label + control + message wrapper.
 *
 * Owns the `id`/`aria-describedby` wiring so no page has to invent it: the
 * control it wraps must use `[id]="field.controlId"` and
 * `[attr.aria-describedby]="field.describedBy()"`.
 */
@Component({
  selector: 'fz-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fz-field">
      <label class="fz-field__label" [for]="controlId">
        <span>{{ label() }}</span>
        @if (required()) {
          <span class="fz-field__required" aria-hidden="true">*</span>
          <span class="sr-only">(bắt buộc)</span>
        }
        @if (hasError()) {
          <span class="fz-field__error-inline"> — {{ error() }}</span>
        }
      </label>

      <ng-content />

      @if (hint() && !hasError()) {
        <p class="fz-field__hint" [id]="hintId">{{ hint() }}</p>
      }

      @if (hasError()) {
        <p class="fz-field__error" [id]="errorId" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .fz-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .fz-field__label {
      font-family: var(--font-sans);
      font-size: var(--text-micro-uppercase);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-caption);
      letter-spacing: var(--tracking-micro-uppercase);
      text-transform: uppercase;
      color: var(--color-body);
    }

    .fz-field__required {
      color: var(--color-error);
      margin-inline-start: 2px;
    }

    /* Inline error keeps the label row informative without shifting layout. */
    .fz-field__error-inline {
      color: var(--color-error);
      text-transform: none;
      letter-spacing: 0;
      font-style: italic;
      font-weight: var(--weight-medium);
    }

    .fz-field__hint {
      font-size: var(--text-caption);
      line-height: var(--leading-caption);
      color: var(--color-stone);
    }

    /* The inline copy in the label is the visible message; this one exists so
       screen readers announce it via role="alert" + aria-describedby. */
    .fz-field__error {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `,
})
export class FormField {
  private static nextId = 0;

  readonly label = input.required<string>();
  readonly required = input(false);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);

  private readonly uid = `fz-field-${FormField.nextId++}`;
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  protected readonly hasError = computed(() => !!this.error());

  /** Bind to the wrapped control's `aria-describedby`. */
  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint() && !this.hasError()) ids.push(this.hintId);
    if (this.hasError()) ids.push(this.errorId);
    return ids.length ? ids.join(' ') : null;
  });

  /** Bind to the wrapped control's `aria-invalid`. */
  readonly ariaInvalid = computed(() => (this.hasError() ? 'true' : null));
}
