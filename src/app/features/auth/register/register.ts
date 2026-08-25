import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegisterResult } from '../../../core/auth/token.model';
import { OtpVerify } from './components/otp-verify/otp-verify';
import { RegisterForm } from './components/register-form/register-form';

type Step = 'form' | 'verify';

@Component({
  selector: 'fz-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RegisterForm, OtpVerify],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  protected readonly step = signal<Step>('form');
  protected readonly pendingEmail = signal<string>('');
  protected readonly pendingPhone = signal<string>('');

  protected onRegistered(result: RegisterResult): void {
    this.pendingEmail.set(result.email);
    this.pendingPhone.set(result.phone || '');
    // A backend configured without email confirmation returns a usable session
    // straight away; only gate on the verify step when it asks for one.
    this.step.set(result.verificationRequired ? 'verify' : 'form');
  }

  protected backToForm(): void {
    this.step.set('form');
  }
}
