import { User } from '../models/user.model';

/**
 * What the server returns on a successful login.
 *
 * The refresh token is NOT here on purpose — the backend sets it as an
 * HTTP-only cookie, so JavaScript can never read it. Only the short-lived
 * access token reaches the client, and it is held in memory.
 */
export interface AuthSession {
  accessToken: string;
  /** Seconds until `accessToken` expires. */
  expiresIn: number;
  user: User;
}

/** Register returns no session — the account must be verified first. */
export interface RegisterResult {
  userId: string;
  email: string;
  phone?: string;
  /** True when an OTP was emailed and the verify step is required. */
  verificationRequired: boolean;
}

export type AuthStatus =
  | 'idle'
  | 'authenticating'
  | 'authenticated'
  | 'unauthenticated';
