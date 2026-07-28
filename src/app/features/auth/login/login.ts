import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginForm } from './components/login-form/login-form';

@Component({
  selector: 'fz-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoginForm],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {}
