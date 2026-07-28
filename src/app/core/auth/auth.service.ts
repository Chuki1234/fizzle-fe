import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { User } from '../models/user.model';
import {
  LoginPayload,
  RegisterPayload,
  VerifyOtpPayload,
} from '../../shared/validators/auth.schema';
import { API_CONFIG } from '../http/api.config';
import { AuthStore } from './auth.store';
import { AuthSession, RegisterResult } from './token.model';

/**
 * Talks to the NestJS auth module.
 *
 * Every call sets `withCredentials` so the refresh-token cookie travels with
 * the request; the backend is the only thing that can read or set it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly baseUrl = inject(API_CONFIG).baseUrl;

  register(payload: RegisterPayload): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(
      `${this.baseUrl}/auth/register`,
      payload,
      { withCredentials: true },
    );
  }

  verifyOtp(payload: VerifyOtpPayload): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${this.baseUrl}/auth/verify-otp`, payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.store.setSession(session)));
  }

  resendOtp(email: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/auth/resend-otp`,
      { email },
      { withCredentials: true },
    );
  }

  login(payload: LoginPayload): Observable<AuthSession> {
    this.store.setAuthenticating();
    return this.http
      .post<AuthSession>(`${this.baseUrl}/auth/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((session) => this.store.setSession(session)),
        catchError((err) => {
          this.store.clear();
          return throwError(() => err);
        }),
      );
  }

  /** Exchanges the refresh cookie for a fresh access token. */
  refresh(): Observable<{ accessToken: string; expiresIn: number }> {
    return this.http
      .post<{ accessToken: string; expiresIn: number }>(
        `${this.baseUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(tap((res) => this.store.setAccessToken(res.accessToken)));
  }

  /**
   * Restores the session on app bootstrap: trade the refresh cookie for an
   * access token, then load the profile that goes with it. Never throws — a
   * missing or rejected cookie simply means "signed out".
   */
  restoreSession(): Observable<AuthSession | null> {
    return this.refresh().pipe(
      switchMap((res) =>
        this.http
          .get<{ user: User }>(`${this.baseUrl}/auth/me`, {
            withCredentials: true,
          })
          .pipe(
            map(
              ({ user }): AuthSession => ({
                accessToken: res.accessToken,
                expiresIn: res.expiresIn,
                user,
              }),
            ),
          ),
      ),
      tap((session) => this.store.setSession(session)),
      catchError(() => {
        this.store.clear();
        return of(null);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.store.clear()));
  }
}
