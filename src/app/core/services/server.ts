import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Server, Channel } from '../models/server.model';
import { ChatMessage } from '../models/friend.model';
import { API_CONFIG } from '../http/api.config';

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private router = inject(Router);
    private http = inject(HttpClient);
    private apiConfig = inject(API_CONFIG);

    // --- STATE QUẢN LÝ VOICE CHANNEL ---
    activeVoiceChannel = signal<{ serverId: string; channelId: string; channelName: string } | null>(null);
    isMuted = signal<boolean>(false);
    isDeafened = signal<boolean>(false);

    // --- DANH SÁCH SERVER & KÊNH ---
    servers = signal<Server[]>([
        {
            id: 'hsu-it',
            name: 'HSU - AI & IT',
            icon: 'HSU',
            channels: [
                { id: 'c-general', name: 'thảo-luận-chung', type: 'text' },
                { id: 'c-java', name: 'đồ-án-java', type: 'text' },
                { id: 'c-lounge', name: 'Phòng Chờ 🎙️', type: 'voice' }
            ]
        },
        {
            id: 'gaming-hub',
            name: 'Gaming Community',
            icon: '🎮',
            channels: [
                { id: 'c-lol', name: 'league-of-legends', type: 'text' },
                { id: 'c-voice-1', name: 'Team 1 🔊', type: 'voice' }
            ]
        }
    ]);

    activeServerId = signal<string>('hsu-it');
    activeChannelId = signal<string>('c-general');

    activeServer = computed(() => this.servers().find(s => s.id === this.activeServerId()));
    activeChannel = computed(() => this.activeServer()?.channels.find(c => c.id === this.activeChannelId()));

    private channelMessages = signal<Record<string, ChatMessage[]>>({
        'c-general': [
            { id: '1', senderId: 'hoang', senderName: 'Hoàng Nam', text: 'Anh em làm xong bài tập Discrete Math chưa?', timestamp: '09:15 AM' }
        ],
        'c-java': [
            { id: '1', senderId: 'kevin', senderName: 'Kevin', text: 'Dự án DoAnCuoiKi đang bị lỗi file path này Phúc ơi!', timestamp: '10:00 AM' }
        ]
    });

    messages = computed(() => {
        const channelId = this.activeChannelId();
        return this.channelMessages()[channelId] || [];
    });

    constructor() {
        this.loadServers();
        if (this.activeChannelId()) {
            this.loadChannelMessages(this.activeChannelId());
        }
    }

    // --- LOAD DỮ LIỆU TỪ BACKEND ---
    loadServers() {
        this.http.get<Server[]>(`${this.apiConfig.baseUrl}/servers`).subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.servers.set(data);
                    // Cập nhật lại active channel nếu cần
                    const currentServer = data.find(s => s.id === this.activeServerId()) || data[0];
                    if (currentServer) {
                        this.activeServerId.set(currentServer.id);
                        const hasChannel = currentServer.channels.some(c => c.id === this.activeChannelId());
                        if (!hasChannel && currentServer.channels.length > 0) {
                            const firstText = currentServer.channels.find(c => c.type === 'text') || currentServer.channels[0];
                            this.activeChannelId.set(firstText.id);
                        }
                    }
                }
            },
            error: (err) => console.warn('Could not load servers from backend, using default fallback:', err)
        });
    }

    loadChannelMessages(channelId: string) {
        if (!channelId) return;
        this.http.get<ChatMessage[]>(`${this.apiConfig.baseUrl}/messages/channel/${channelId}`).subscribe({
            next: (msgs) => {
                this.channelMessages.update(store => ({
                    ...store,
                    [channelId]: msgs
                }));
            },
            error: (err) => console.warn(`Could not load messages for channel ${channelId}:`, err)
        });
    }

    // --- HÀM XỬ LÝ CHUYỂN KÊNH & SERVER ---
    selectServer(serverId: string) {
        if (!serverId) {
            this.activeServerId.set('');
            this.activeChannelId.set('');
            this.router.navigate(['/friends']);
            return;
        }

        this.activeServerId.set(serverId);
        const server = this.servers().find(s => s.id === serverId);
        const firstTextChannel = server?.channels.find(c => c.type === 'text');
        if (firstTextChannel) {
            this.activeChannelId.set(firstTextChannel.id);
            this.loadChannelMessages(firstTextChannel.id);
            this.router.navigate(['/channels', serverId, firstTextChannel.id]);
        }
    }

    // Nhận cả object Channel lẫn string ID
    selectChannel(channelOrId: Channel | string) {
        let targetChannel: Channel | undefined;

        if (typeof channelOrId === 'string') {
            targetChannel = this.activeServer()?.channels.find(c => c.id === channelOrId);
        } else {
            targetChannel = channelOrId;
        }

        if (!targetChannel) return;

        if (targetChannel.type === 'voice') {
            this.joinVoiceChannel(targetChannel);
        } else {
            this.activeChannelId.set(targetChannel.id);
            this.loadChannelMessages(targetChannel.id);
            const serverId = this.activeServerId();
            this.router.navigate(['/channels', serverId, targetChannel.id]);
        }
    }

    // --- PHƯƠNG THỨC XỬ LÝ VOICE ---
    joinVoiceChannel(channel: Channel) {
        this.activeVoiceChannel.set({
            serverId: this.activeServerId(),
            channelId: channel.id,
            channelName: channel.name
        });
    }

    leaveVoiceChannel() {
        this.activeVoiceChannel.set(null);
    }

    toggleMute() {
        this.isMuted.update(v => !v);
    }

    toggleDeafen() {
        this.isDeafened.update(v => !v);
    }

    // --- HÀM TẠO SERVER MỚI ---
    addServer(name: string, icon: string) {
        if (!name.trim()) return;

        const payload = {
            name: name.trim(),
            icon: icon.trim() || '🔥'
        };

        this.http.post<Server>(`${this.apiConfig.baseUrl}/servers`, payload).subscribe({
            next: (newServer) => {
                this.servers.update(list => [...list, newServer]);
                this.selectServer(newServer.id);
            },
            error: () => {
                // Fallback offline
                const newServerId = 'server-' + Date.now();
                const defaultTextChannelId = 'c-' + Date.now() + '-1';
                const defaultVoiceChannelId = 'c-' + Date.now() + '-2';
                const fallbackServer: Server = {
                    id: newServerId,
                    name: payload.name,
                    icon: payload.icon,
                    channels: [
                        { id: defaultTextChannelId, name: 'thảo-luận-chung', type: 'text' },
                        { id: defaultVoiceChannelId, name: 'Phòng Chờ 🎙️', type: 'voice' }
                    ]
                };
                this.servers.update(list => [...list, fallbackServer]);
                this.selectServer(newServerId);
            }
        });
    }

    // --- HÀM TẠO KÊNH VÀ GỬI TIN NHẮN ---
    addChannel(name: string, type: 'text' | 'voice') {
        const serverId = this.activeServerId();
        if (!serverId || !name.trim()) return;

        const payload = {
            name: name.toLowerCase().replace(/\s+/g, '-'),
            type: type
        };

        this.http.post<Channel>(`${this.apiConfig.baseUrl}/servers/${serverId}/channels`, payload).subscribe({
            next: (newChannel) => {
                this.servers.update(list => list.map(s => {
                    if (s.id === serverId) {
                        return { ...s, channels: [...s.channels, newChannel] };
                    }
                    return s;
                }));

                if (type === 'text') {
                    this.selectChannel(newChannel);
                }
            },
            error: () => {
                // Fallback offline
                const fallbackChannel: Channel = {
                    id: 'c-' + Date.now(),
                    name: payload.name,
                    type: type
                };
                this.servers.update(list => list.map(s => {
                    if (s.id === serverId) {
                        return { ...s, channels: [...s.channels, fallbackChannel] };
                    }
                    return s;
                }));
                if (type === 'text') {
                    this.selectChannel(fallbackChannel);
                }
            }
        });
    }

    // --- HÀM XÓA KÊNH ---
    deleteChannel(channelId: string) {
        const serverId = this.activeServerId();
        if (!serverId || !channelId) return;

        this.http.delete(`${this.apiConfig.baseUrl}/servers/${serverId}/channels/${channelId}`).subscribe({
            next: () => {
                this.handleChannelDeletedLocally(serverId, channelId);
            },
            error: (err) => {
                console.warn('Could not delete channel on backend, deleting locally:', err);
                this.handleChannelDeletedLocally(serverId, channelId);
            }
        });
    }

    private handleChannelDeletedLocally(serverId: string, channelId: string) {
        this.servers.update(list => list.map(s => {
            if (s.id === serverId) {
                return { ...s, channels: s.channels.filter(c => c.id !== channelId) };
            }
            return s;
        }));

        // Nếu kênh vừa xóa là voice channel đang kết nối thì rời voice
        if (this.activeVoiceChannel()?.channelId === channelId) {
            this.leaveVoiceChannel();
        }

        // Nếu kênh vừa xóa là text channel đang mở thì chuyển sang kênh khác
        if (this.activeChannelId() === channelId) {
            const currentServer = this.servers().find(s => s.id === serverId);
            const nextTextChannel = currentServer?.channels.find(c => c.type === 'text');
            if (nextTextChannel) {
                this.selectChannel(nextTextChannel);
            } else {
                this.activeChannelId.set('');
            }
        }
    }

    sendMessage(text: string, senderName: string = 'Thiện Phúc', senderId: string = 'user') {
        if (!text.trim()) return;

        const channelId = this.activeChannelId();
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: senderId,
            senderName: senderName,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic update
        this.channelMessages.update(store => ({
            ...store,
            [channelId]: [...(store[channelId] || []), userMsg]
        }));

        // Gửi lên backend để lưu vĩnh viễn
        this.http.post<ChatMessage>(`${this.apiConfig.baseUrl}/messages/channel/${channelId}`, {
            text: text,
            senderId: senderId,
            senderName: senderName
        }).subscribe({
            error: (err) => console.warn('Could not persist channel message to backend:', err)
        });
    }
}