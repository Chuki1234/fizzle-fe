export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    unreadCount?: number;
}

export interface ServerMember {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    presence?: 'online' | 'idle' | 'dnd' | 'offline';
    role: 'owner' | 'admin' | 'moderator' | 'member';
    joinedAt?: string;
}

export interface Server {
    id: string;
    name: string;
    icon: string;
    channels: Channel[];
    members?: string[];
    creatorId?: string;
    ownerId?: string;
}