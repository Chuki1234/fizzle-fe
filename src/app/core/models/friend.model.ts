import { UserSummary } from './user.model';

export interface Friend extends UserSummary {
    statusText?: string;
    customStatus?: string | null;
    customStatusEmoji?: string | null;
    relationshipStatus: 'friend' | 'pending' | 'pending_outgoing' | 'none';
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
}