import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AlertTone = 'error' | 'success' | 'info';

/** Form-level banner — the message that belongs to the whole submission. */
@Component({
  selector: 'fz-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fz-alert"
      [class.fz-alert--error]="tone() === 'error'"
      [class.fz-alert--success]="tone() === 'success'"
      [class.fz-alert--info]="tone() === 'info'"
      [attr.role]="tone() === 'error' ? 'alert' : 'status'"
    >
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .fz-alert {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      font-size: var(--text-body-sm);
      line-height: var(--leading-body);
    }

    .fz-alert--error {
      background-color: rgba(212, 86, 86, 0.12);
      border-color: rgba(212, 86, 86, 0.32);
      color: var(--color-error);
    }

    .fz-alert--success {
      background-color: rgba(0, 212, 164, 0.1);
      border-color: rgba(0, 212, 164, 0.32);
      color: var(--color-accent);
    }

    .fz-alert--info {
      background-color: var(--color-surface);
      border-color: var(--color-hairline);
      color: var(--color-body);
    }
  `,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
}
