export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status: UserStatus;
}

export interface Attachment {
    id: string;
    url: string;
    type: 'image' | 'file' | 'video';
    name: string;
    size: number;
}

export interface Message {
    id: string;
    roomId: string;
    sender: User;
    content: string;
    attachments?: Attachment[];
    reactions?: Record<string, string[]>;
    createdAt: string;
    updatedAt?: string;
    isEdited?: boolean;
}

export interface Room {
    id: string;
    name: string;
    type: 'direct' | 'group' | 'channel';
    avatarUrl?: string;
    members: User[];
}