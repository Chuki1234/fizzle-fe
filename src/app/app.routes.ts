import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { guestGuard } from './core/auth/guest-guard';

export const routes: Routes = [
  // 1. Main Layout & Các trang chính
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      { path: '', redirectTo: 'friends', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },

      // Chat Direct Messages (1-1 với Bạn Bè)
      { path: 'chat', loadComponent: () => import('./features/chat/chat').then(m => m.Chat) },
      { path: 'chat/:id', loadComponent: () => import('./features/chat/chat').then(m => m.Chat) },

      // Chat Server / Kênh Discord
      { path: 'channels/:serverId/:channelId', loadComponent: () => import('./features/chat/chat').then(m => m.Chat) },

      { path: 'friends', loadComponent: () => import('./features/friends/friends').then(m => m.Friends) },

      // Profile overlay
      { path: 'profile', loadComponent: () => import('./features/profile/k-profile').then((m) => m.KProfile) },

      // Settings overlay
      { path: 'settings', loadComponent: () => import('./features/settings/khang').then((m) => m.Khang) },
    ]
  },

  // 2. Luồng Auth
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register').then(m => m.Register) },
    ]
  },
  { path: '**', redirectTo: '' },
];
