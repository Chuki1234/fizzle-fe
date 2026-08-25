import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  /** Base URL of the NestJS backend, no trailing slash. */
  baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export function getDynamicBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
  }
  return 'http://localhost:3000';
}

export const defaultApiConfig: ApiConfig = {
  baseUrl: getDynamicBaseUrl(),
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
