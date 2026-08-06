import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NewPasswordForm } from './components/new-password-form/new-password-form';
import { VerifyCodeForm } from './components/verify-code-form/verify-code-form';

type Step = 'verify' | 'password' | 'done';

/**
 * Password recovery, resumed from the login page.
 *
 * The address is not asked for here: the login form already had it and sent
 * the code before navigating, so this page opens straight on the code step.
 * That address arrives in the navigation state — deliberately not the URL,
 * which would put an email address into browser history and server logs, and
 * would let anyone retarget the flow by editing it.
 */
@Component({
  selector: 'fz-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VerifyCodeForm, NewPasswordForm],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly router = inject(Router);

  protected readonly step = signal<Step>('verify');
  protected readonly email = signal<string>('');
  protected readonly resetToken = signal<string>('');

  constructor() {
    // Read before the first render: navigation state is only readable while
    // the navigation that carried it is still current.
    const state = this.router.getCurrentNavigation()?.extras.state as
      | { email?: string }
      | undefined;

    const email = state?.email ?? '';

    // Reached by typing the URL, a bookmark, or a reload — there is no address
    // and therefore no code in flight. Start the flow where it belongs.
    if (!email) {
      void this.router.navigate(['/auth/login'], { replaceUrl: true });
      return;
    }

    this.email.set(email);
  }

  protected onVerified(resetToken: string): void {
    this.resetToken.set(resetToken);
    this.step.set('password');
  }

  protected onReset(): void {
    this.resetToken.set('');
    this.step.set('done');
  }

  /** The ticket expired mid-form — send the user back for a fresh code. */
  protected onExpired(): void {
    this.resetToken.set('');
    this.step.set('verify');
  }
}
