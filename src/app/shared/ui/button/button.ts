import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant =
  | 'primary' // white pill on dark  (button-on-dark)
  | 'accent' // mint pill            (button-accent-green)
  | 'secondary' // outlined pill        (button-secondary)
  | 'ghost' // rectangular ghost    (button-ghost)
  | 'link'; // inline text link     (button-link)

export type ButtonSize = 'md' | 'lg';

/**
 * The one button in the system. Every variant is `{rounded.full}` except
 * `ghost` and `link`, per the DESIGN-mintlify.md rule that squared buttons
 * read as third-party widgets.
 */
@Component({
  selector: 'fz-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
      [class]="classes()"
    >
      @if (loading()) {
        <span class="fz-btn__spinner" aria-hidden="true"></span>
      }
      <span class="fz-btn__label"><ng-content /></span>
    </button>
  `,
  styles: `
    :host {
      display: contents;
    }

    .fz-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      font-family: var(--font-sans);
      font-size: var(--text-button-md);
      font-weight: var(--weight-medium);
      line-height: var(--leading-button);
      white-space: nowrap;
      transition:
        background-color var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        opacity var(--duration-fast) var(--ease-standard);
    }

    .fz-btn:disabled {
      cursor: not-allowed;
    }

    /* --- Sizes ---------------------------------------------------------- */
    .fz-btn--md {
      padding: 10px 20px;
      min-height: var(--control-height);
    }

    .fz-btn--lg {
      padding: 12px 24px;
      min-height: 48px;
      font-size: var(--text-body-md);
    }

    .fz-btn--block {
      width: 100%;
    }

    /* --- Variants ------------------------------------------------------- */
    .fz-btn--primary {
      border-radius: var(--radius-full);
      background-color: var(--color-inverse-surface);
      color: var(--color-on-inverse);
    }
    .fz-btn--primary:active:not(:disabled) {
      background-color: var(--color-body);
    }
    .fz-btn--primary:disabled {
      background-color: var(--color-raised);
      color: var(--color-muted);
    }

    .fz-btn--accent {
      border-radius: var(--radius-full);
      background-color: var(--color-accent);
      color: var(--color-on-accent);
    }
    .fz-btn--accent:active:not(:disabled) {
      background-color: var(--color-accent-deep);
    }
    .fz-btn--accent:disabled {
      background-color: var(--color-raised);
      color: var(--color-muted);
    }

    .fz-btn--secondary {
      border-radius: var(--radius-full);
      background-color: transparent;
      color: var(--color-ink);
      border: 1px solid var(--color-hairline);
    }
    .fz-btn--secondary:active:not(:disabled) {
      background-color: var(--color-surface);
    }
    .fz-btn--secondary:disabled {
      color: var(--color-muted);
      border-color: var(--color-hairline-soft);
    }

    .fz-btn--ghost {
      border-radius: var(--radius-md);
      background-color: transparent;
      color: var(--color-ink);
      padding: 8px 12px;
      min-height: auto;
    }
    .fz-btn--ghost:active:not(:disabled) {
      background-color: var(--color-surface);
    }

    .fz-btn--link {
      padding: 0;
      min-height: auto;
      background: none;
      color: var(--color-accent);
      font-size: var(--text-body-sm);
    }
    .fz-btn--link:active:not(:disabled) {
      text-decoration: underline;
    }
    .fz-btn--link:disabled {
      color: var(--color-muted);
    }

    /* --- Loading -------------------------------------------------------- */
    .fz-btn__spinner {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-full);
      border: 2px solid currentColor;
      border-top-color: transparent;
      animation: fz-btn-spin 600ms linear infinite;
      flex: none;
    }

    @keyframes fz-btn-spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Touch targets grow on small screens (WCAG 2.5.5). */
    @media (max-width: 767px) {
      .fz-btn--md,
      .fz-btn--lg {
        min-height: var(--touch-target-min);
      }
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('accent');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly block = input(false);

  protected readonly classes = computed(() =>
    [
      'fz-btn',
      `fz-btn--${this.variant()}`,
      `fz-btn--${this.size()}`,
      this.block() ? 'fz-btn--block' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}
