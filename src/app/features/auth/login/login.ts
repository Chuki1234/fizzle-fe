import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoginForm } from './components/login-form/login-form';

@Component({
  selector: 'fz-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginForm],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {}
