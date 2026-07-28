import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest-guard';
import { AuthLayout } from '../../layouts/auth-layout/auth-layout';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        title: 'Đăng nhập · Fizzle',
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        title: 'Tạo tài khoản · Fizzle',
        loadComponent: () =>
          import('./register/register').then((m) => m.Register),
      },
      // TODO(PLAN.md §2): forgot-password page. Routed now so the link on the
      // login form is not dead; replace the redirect when the page lands.
      { path: 'forgot-password', redirectTo: 'login' },
    ],
  },
];
