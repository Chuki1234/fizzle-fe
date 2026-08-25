/** Presence states shown on the avatar dot. */
export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

/** The authenticated user's own account. */
export interface User {
  id: string;
  email: string;
  /** Unique handle, lowercase. Used for @mentions and friend search. */
  username: string;
  /** Free-form name shown in chat and on the profile card. */
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  statusMessage: string | null;
  pronouns?: string | null;
  customStatus?: string | null;
  customStatusEmoji?: string | null;
  aboutMe?: string | null;
  bannerColor?: string | null;
  bannerGradient?: string | null;
  avatarFrame?: string | null;
  presence: PresenceStatus;
  /** ISO date (YYYY-MM-DD). */
  birthdate: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  acceptsMarketingEmail: boolean;
  createdAt: string;
}

/** The trimmed shape used in member lists, message authors and search results. */
export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  presence: PresenceStatus;
}
