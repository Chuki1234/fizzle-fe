import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
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
  ],
};
