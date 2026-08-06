import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { API_CONFIG, defaultApiConfig } from './core/http/api.config';
import { authInterceptor } from './core/http/auth-interceptor';
import { errorInterceptor } from './core/http/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // Order matters: authInterceptor sits closer to the backend so it still
      // sees a raw HttpErrorResponse and can retry with a refreshed token;
      // errorInterceptor then normalizes whatever escapes into an ApiError.
      withInterceptors([errorInterceptor, authInterceptor]),
    ),
    { provide: API_CONFIG, useValue: defaultApiConfig },

    /*
      Rebuild the session before the first route is resolved.

      The access token lives in memory only — deliberately, so an XSS payload
      cannot read it — which means a reload starts with an empty AuthStore. The
      durable half is the HTTP-only refresh cookie, so trade it for a fresh
      token here. Without this, `authGuard` sees a signed-out store on every
      reload and bounces the user to the login page.

      Bootstrap waits for this: resolving routes first would let the guard read
      the store before it has been filled. `restoreSession()` swallows its own
      errors and completes with null, so a missing or rejected cookie just means
      "signed out" and never blocks startup.
    */
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
