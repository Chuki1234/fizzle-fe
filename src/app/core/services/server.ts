import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Server, Channel } from '../models/server.model';
import { ChatMessage } from '../models/friend.model';
import { API_CONFIG } from '../http/api.config';
import { SocketService } from './socket';
import { AuthStore } from '../auth/auth.store';
import { NotificationService } from './notification.service';

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private router = inject(Router);
    private http = inject(HttpClient);
    private apiConfig = inject(API_CONFIG);
    private socketService = inject(SocketService);
    private authStore = inject(AuthStore);
    private notificationService = inject(NotificationService);

    // --- STATE QUẢN LÝ VOICE CHANNEL ---
    activeVoiceChannel = signal<{ serverId: string; channelId: string; channelName: string } | null>(null);
    isMuted = signal<boolean>(false);
    isDeafened = signal<boolean>(false);

    // --- DANH SÁCH SERVER & KÊNH ---
    servers = signal<Server[]>([]);

    activeServerId = signal<string>('');
    activeChannelId = signal<string>('');

    activeServer = computed(() => this.servers().find(s => s.id === this.activeServerId()));
    activeChannel = computed(() => this.activeServer()?.channels.find(c => c.id === this.activeChannelId()));

    private channelMessages = signal<Record<string, ChatMessage[]>>({});

    messages = computed(() => {
        const channelId = this.activeChannelId();
        return this.channelMessages()[channelId] || [];
    });


    constructor() {
        this.loadServers();
        if (this.activeChannelId()) {
            this.loadChannelMessages(this.activeChannelId());
        }

        // Register socket handlers
        this.socketService.registerChannelMessageHandler((channelId, message) => {
            const currentUserId = this.authStore.user()?.id || 'user';
            // Don't add if it came from current user (already added optimistically)
            if (message?.senderId === currentUserId) return;

            this.channelMessages.update(store => {
                const current = store[channelId] || [];
                // Avoid duplicates
                if (current.some((m: ChatMessage) => m.id === message.id)) return store;
                return { ...store, [channelId]: [...current, message] };
            });
        });

        this.socketService.registerServerUpdatedHandler((data) => {
            if (!data) return;

            if (data.type === 'CHANNEL_ADDED' && data.serverId && data.channel) {
                this.servers.update(list => list.map(s => {
                    if (s.id === data.serverId) {
                        const already = s.channels.some(c => c.id === data.channel.id);
                        if (!already) {
                            return { ...s, channels: [...s.channels, data.channel] };
                        }
                    }
                    return s;
                }));
            }

            if (data.type === 'CHANNEL_DELETED' && data.serverId && data.channelId) {
                this.servers.update(list => list.map(s => {
                    if (s.id === data.serverId) {
                        return { ...s, channels: s.channels.filter(c => c.id !== data.channelId) };
                    }
                    return s;
                }));
            }

            if (data.type === 'SERVER_CREATED' && data.server) {
                // Reload from backend to get accurate state (avoids duplicate with optimistic add)
                this.loadServers();
            }

            if (data.type === 'MEMBER_ADDED' && data.server) {
                // Check if this member added is the current user
                const currentUserId = this.authStore.user()?.id;
                if (data.userId === currentUserId || (data.server.members && data.server.members.includes(currentUserId))) {
                    const exists = this.servers().some(s => s.id === data.server.id);
                    if (!exists) {
                        this.servers.update(list => [...list, data.server]);
                    }
                }
                this.loadServers();
            }
        });

        this.socketService.registerServerInviteHandler((data) => {
            if (!data || !data.server) return;
            // 1. Add server immediately to state
            const exists = this.servers().some(s => s.id === data.server.id);
            if (!exists) {
                this.servers.update(list => [...list, data.server]);
            }
            // 2. Show toast notification
            this.notificationService.show({
                type: 'server_invite',
                title: 'Lời mời máy chủ mới 🚀',
                message: `Bạn đã được thêm vào máy chủ "${data.server.name}"!`,
                actionLabel: 'Mở máy chủ',
                actionRoute: ['/channels', data.server.id, data.server.channels?.[0]?.id || '']
            });
            // 3. Sync from backend
            this.loadServers();
        });
    }

    // --- LOAD DỮ LIỆU TỪ BACKEND ---
    loadServers() {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';
        this.http.get<Server[]>(`${this.apiConfig.baseUrl}/servers${params}`).subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.servers.set(data);
                    const currentServerId = this.activeServerId();
                    if (currentServerId) {
                        const currentServer = data.find(s => s.id === currentServerId);
                        if (currentServer) {
                            const hasChannel = currentServer.channels.some(c => c.id === this.activeChannelId());
                            if (!hasChannel && currentServer.channels.length > 0) {
                                const firstText = currentServer.channels.find(c => c.type === 'text') || currentServer.channels[0];
                                this.activeChannelId.set(firstText.id);
                            }
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
                // Join socket room for this channel
                this.socketService.joinRoom(channelId);
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

        const userId = this.authStore.user()?.id;
        const payload = {
            name: name.trim(),
            icon: icon.trim() || '🔥',
            creatorId: userId || 'user'
        };

        this.http.post<Server>(`${this.apiConfig.baseUrl}/servers`, payload).subscribe({
            next: (newServer) => {
                // Add server directly from response (do NOT rely on socket SERVER_CREATED to avoid duplicate)
                const exists = this.servers().some(s => s.id === newServer.id);
                if (!exists) {
                    this.servers.update(list => [...list, newServer]);
                }
                this.selectServer(newServer.id);
            },
            error: () => {
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

    // --- HÀM TẠO KÊNH ---
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

        if (this.activeVoiceChannel()?.channelId === channelId) {
            this.leaveVoiceChannel();
        }

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

    // --- GỬI TIN NHẮN ---
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

        // Send to backend (will broadcast via socket to all in the channel)
        this.http.post<ChatMessage>(`${this.apiConfig.baseUrl}/messages/channel/${channelId}`, {
            text: text,
            senderId: senderId,
            senderName: senderName
        }).subscribe({
            error: (err) => console.warn('Could not persist channel message to backend:', err)
        });
    }

    // --- Tạo mã mời và mời bạn vào server ---
    generateInviteCode(serverId: string): Promise<{ code: string; serverId: string; serverName: string }> {
        return this.http.get<{ code: string; serverId: string; serverName: string }>(
            `${this.apiConfig.baseUrl}/servers/${serverId}/invite`
        ).toPromise() as any;
    }

    inviteFriendToServer(serverId: string, friendId: string): Promise<{ success: boolean }> {
        const userId = this.authStore.user()?.id || 'user';
        return this.http.post<{ success: boolean }>(
            `${this.apiConfig.baseUrl}/servers/${serverId}/invite-friend`,
            { friendId, inviterId: userId }
        ).toPromise() as any;
    }
}