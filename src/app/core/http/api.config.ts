import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  /** Base URL of the NestJS backend, no trailing slash. */
  baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export const defaultApiConfig: ApiConfig = {
  baseUrl: 'http://localhost:3000',
};

/** Endpoints that must never carry an Authorization header. */
export const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;
