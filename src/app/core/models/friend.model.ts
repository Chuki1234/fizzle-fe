import { UserSummary } from './user.model';

export interface Friend extends UserSummary {
    statusText?: string;
    customStatus?: string | null;
    customStatusEmoji?: string | null;
    relationshipStatus: 'friend' | 'pending' | 'pending_outgoing' | 'none';
}

export interface MessageAttachment {
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
    type?: 'image' | 'video' | 'audio' | 'file';
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string | null;
    avatarUrl?: string | null;
    text: string;
    timestamp: string;
    type?: 'text' | 'image' | 'gif' | 'sticker' | 'file' | 'video' | 'audio';
    attachments?: MessageAttachment[];
    mediaUrl?: string | null;
    metadata?: Record<string, any> | null;
}