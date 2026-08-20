export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    unreadCount?: number;
}

export interface Server {
    id: string;
    name: string;
    icon: string;
    channels: Channel[];
}