import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  // TODO(PLAN.md §2): the /app shell (app-layout + authGuard) arrives with the
  // dashboard work. Until then a successful login lands back here.
  { path: 'app', redirectTo: 'auth/login' },
  { path: '**', redirectTo: '' },
];
