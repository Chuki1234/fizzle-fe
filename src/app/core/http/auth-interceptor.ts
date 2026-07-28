import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';

/**
 * Attaches the access token, and performs a single silent refresh when the
 * server reports the token has expired.
 *
 * `refreshInFlight` is module-scoped so that a burst of parallel 401s triggers
 * exactly one `/auth/refresh` call; the rest queue on the subject and replay
 * once the new token lands.
 */
let refreshInFlight = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

const REFRESH_ENDPOINT = '/auth/refresh';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);

  const token = store.accessToken();
  const authed = token ? withBearer(req, token) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      const isExpiredToken =
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.includes(REFRESH_ENDPOINT) &&
        store.accessToken() !== null;

      if (!isExpiredToken) return throwError(() => err);

      return handleExpiredToken(req, next, auth, store);
    }),
  );
};

function handleExpiredToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  store: AuthStore,
): Observable<HttpEvent<unknown>> {
  if (refreshInFlight) {
    // Another request is already refreshing — wait for its result.
    return refreshedToken$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap((t) => next(withBearer(req, t))),
    );
  }

  refreshInFlight = true;
  refreshedToken$.next(null);

  return auth.refresh().pipe(
    switchMap((res) => {
      refreshInFlight = false;
      refreshedToken$.next(res.accessToken);
      return next(withBearer(req, res.accessToken));
    }),
    catchError((refreshErr: unknown) => {
      // The refresh cookie is gone or rejected — the session is over.
      refreshInFlight = false;
      store.clear();
      return throwError(() => refreshErr);
    }),
  );
}

function withBearer(
  req: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
