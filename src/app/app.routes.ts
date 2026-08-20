import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'app',
    title: 'Dashboard · Fizzle',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'settings',
    title: 'Settings · Fizzle',
    loadComponent: () => import('./khang/khang').then((m) => m.Khang),
  },
  {
    path: 'profile',
    title: 'Profile · Fizzle',
    loadComponent: () => import('./k-profile/k-profile').then((m) => m.KProfile),
  },
  { path: '**', redirectTo: '' },
];
