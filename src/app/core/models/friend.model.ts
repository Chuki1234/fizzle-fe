import { UserSummary } from './user.model';

export interface Friend extends UserSummary {
    statusText?: string;
    relationshipStatus: 'friend' | 'pending' | 'pending_outgoing' | 'none';
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
}