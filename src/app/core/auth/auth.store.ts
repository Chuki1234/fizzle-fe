import { Injectable, computed, signal } from '@angular/core';
import { User } from '../models/user.model';
import { AuthSession, AuthStatus } from './token.model';

/**
 * Holds the session in memory.
 *
 * The access token deliberately never touches localStorage or sessionStorage —
 * anything readable by JavaScript is readable by an XSS payload. Durability
 * across reloads comes from the refresh-token cookie instead: on bootstrap the
 * app calls `/auth/refresh`, and the browser attaches the HTTP-only cookie by
 * itself.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);
  private readonly _status = signal<AuthStatus>('idle');

  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();

  readonly isAuthenticated = computed(() => this._status() === 'authenticated');
  readonly isBusy = computed(() => this._status() === 'authenticating');
  readonly displayName = computed(() => this._user()?.displayName ?? '');

  setAuthenticating(): void {
    this._status.set('authenticating');
  }

  setSession(session: AuthSession): void {
    this._accessToken.set(session.accessToken);
    this._user.set(session.user);
    this._status.set('authenticated');
  }

  /** Refresh returns a new token for the same user — keep the profile. */
  setAccessToken(token: string): void {
    this._accessToken.set(token);
    this._status.set('authenticated');
  }

  patchUser(patch: Partial<User>): void {
    this._user.update((u) => (u ? { ...u, ...patch } : u));
  }

  clear(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._status.set('unauthenticated');
  }
}
