import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Server, Channel } from '../models/server.model';
import { ChatMessage } from '../models/friend.model';
import { API_CONFIG } from '../http/api.config';
import { SocketService } from './socket';
import { SupabaseRealtimeService } from './supabase-realtime.service';
import { VoiceService } from './voice.service';
import { AuthStore } from '../auth/auth.store';
import { NotificationService } from './notification.service';

const KNOWN_STICKERS: Record<string, string> = {
    'mèo vui vẻ': 'https://assets5.lottiefiles.com/packages/lf20_tr1pjkop.json',
    'tiệc tùng': 'https://assets2.lottiefiles.com/packages/lf20_u4yrau.json',
    'vịt quẩy': 'https://assets9.lottiefiles.com/packages/lf20_m59b6h5q.json',
    'cháy quá': 'https://assets7.lottiefiles.com/packages/lf20_usmfx6bp.json',
    'thả tim': 'https://assets9.lottiefiles.com/packages/lf20_4kpomtpr.json',
    'cười bể bụng': 'https://assets4.lottiefiles.com/packages/lf20_ydo1amjm.json',
    'chiến game': 'https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json',
    'tuyệt vời': 'https://assets1.lottiefiles.com/packages/lf20_touohxv0.json',
    'bay lên nào': 'https://assets1.lottiefiles.com/packages/lf20_x62chJ.json',
    'chờ xíu': 'https://assets3.lottiefiles.com/packages/lf20_a2chheio.json',
    'hù dọa': 'https://assets10.lottiefiles.com/packages/lf20_rgsng1vv.json',
    'chill cà phê': 'https://assets3.lottiefiles.com/packages/lf20_tijb25x0.json'
};

const KNOWN_GIFS: Record<string, string> = {
    'applause leonardo': 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    'happy dance cat': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    'anime popcorn': 'https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif',
    'pikachu excited': 'https://media.giphy.com/media/13G7hmmFr9yuxG/giphy.gif',
    'gamer victory': 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    'mind blown': 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'dog vibing': 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    'gg well played': 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    'dance party celebration': 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    'anime cry tears': 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
    'confused travolta': 'https://media.giphy.com/media/g01ZnwEHvCUCA4yCwT/giphy.gif',
    'k-pop heart love': 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif',
    'delicious pizza mukbang': 'https://media.giphy.com/media/1108D2tVaUN3eo/giphy.gif',
    'lofi girl studying': 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
    'cat typing fast': 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
    'snoop dogg vibe': 'https://media.giphy.com/media/DhstvI3zZ598A/giphy.gif'
};

export function normalizeMessage(rawMsg: any): ChatMessage {
    if (!rawMsg) return rawMsg;
    let text = rawMsg.text || '';
    let type = rawMsg.type || 'text';
    let mediaUrl = rawMsg.mediaUrl || null;
    let attachments = rawMsg.attachments || [];
    let metadata = rawMsg.metadata || null;

    if (typeof text === 'string' && (text.startsWith('{"__isRichMessage":true') || text.includes('"__isRichMessage":true'))) {
        try {
            const parsed = JSON.parse(text);
            text = parsed.text || '';
            type = parsed.type || type || 'text';
            mediaUrl = parsed.mediaUrl || mediaUrl;
            attachments = parsed.attachments || attachments;
            metadata = parsed.metadata || metadata;
        } catch {
            // ignore
        }
    }

    // Auto-detect sticker or GIF from text if type/mediaUrl is missing
    const cleanText = (text || '').trim().toLowerCase();
    if (!mediaUrl || type === 'text') {
        if (KNOWN_STICKERS[cleanText]) {
            type = 'sticker';
            mediaUrl = KNOWN_STICKERS[cleanText];
        } else if (KNOWN_GIFS[cleanText]) {
            type = 'gif';
            mediaUrl = KNOWN_GIFS[cleanText];
        } else if (cleanText.startsWith('http') && (cleanText.includes('.json') || cleanText.includes('lottiefiles.com'))) {
            type = 'sticker';
            mediaUrl = text.trim();
        } else if (cleanText.startsWith('http') && (cleanText.includes('.gif') || cleanText.includes('giphy.com') || cleanText.includes('tenor.com'))) {
            type = 'gif';
            mediaUrl = text.trim();
        }
    }

    return {
        ...rawMsg,
        id: String(rawMsg.id || Date.now()),
        senderId: rawMsg.senderId || rawMsg.sender_id || 'user',
        senderName: rawMsg.senderName || rawMsg.sender_name || 'Người dùng',
        senderAvatarUrl: rawMsg.senderAvatarUrl || rawMsg.avatarUrl || rawMsg.avatar_url || null,
        avatarUrl: rawMsg.avatarUrl || rawMsg.senderAvatarUrl || rawMsg.avatar_url || null,
        text,
        type,
        mediaUrl,
        attachments,
        metadata,
        timestamp: rawMsg.timestamp || (rawMsg.created_at ? new Date(rawMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    };
}

export function isSameMessage(a: ChatMessage, b: ChatMessage): boolean {
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id) === String(b.id)) return true;

    // Check mediaUrl (GIF, Sticker, Image)
    if (a.mediaUrl && b.mediaUrl && a.mediaUrl === b.mediaUrl) return true;

    // Check attachments
    if (a.attachments?.length && b.attachments?.length && a.attachments[0].name === b.attachments[0].name) {
        return true;
    }

    // Sender flexible check
    const senderMatches = !a.senderId || !b.senderId ||
        a.senderId === b.senderId ||
        a.senderId === 'user' || b.senderId === 'user' ||
        (a.senderName && b.senderName && a.senderName.trim().toLowerCase() === b.senderName.trim().toLowerCase());

    if (!senderMatches) return false;

    // Both are stickers with same text or id
    if (a.type === 'sticker' && b.type === 'sticker') {
        return (a.text || '').trim() === (b.text || '').trim() ||
               (a.metadata?.['stickerId'] && a.metadata?.['stickerId'] === b.metadata?.['stickerId']);
    }

    // Both are GIFs with same text/name
    if (a.type === 'gif' && b.type === 'gif') {
        return (a.text || '').trim() === (b.text || '').trim();
    }

    // Text comparison
    const aText = (a.text || '').trim();
    const bText = (b.text || '').trim();
    return aText.length > 0 && aText === bText;
}

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private router = inject(Router);
    private http = inject(HttpClient);
    private apiConfig = inject(API_CONFIG);
    private socketService = inject(SocketService);
    private supabaseRealtime = inject(SupabaseRealtimeService);
    public voiceService = inject(VoiceService);
    private authStore = inject(AuthStore);
    private notificationService = inject(NotificationService);

    // --- STATE QUẢN LÝ VOICE CHANNEL ---
    activeVoiceChannel = computed(() => {
        const chId = this.voiceService.currentChannelId();
        if (!chId) return null;
        return {
            serverId: this.voiceService.currentServerId() || '',
            channelId: chId,
            channelName: this.voiceService.currentChannelName()
        };
    });

    isMuted = computed(() => this.voiceService.isMuted());
    isDeafened = computed(() => this.voiceService.isDeafened());

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


    private upsertChannelMsg(currentList: ChatMessage[], incomingRaw: any): ChatMessage[] {
        const incoming = normalizeMessage(incomingRaw);
        if (!incoming || (!incoming.text && !incoming.mediaUrl && !incoming.attachments?.length)) {
            return currentList;
        }

        // 1. Kiểm tra trùng ID chính xác
        const exactIdIndex = currentList.findIndex(m => String(m.id) === String(incoming.id));
        if (exactIdIndex !== -1) {
            const updated = [...currentList];
            updated[exactIdIndex] = { ...currentList[exactIdIndex], ...incoming };
            return updated;
        }

        // 2. Kiểm tra trùng nội dung / media / sender trong 20 tin nhắn gần nhất
        const recentSliceIndex = Math.max(0, currentList.length - 20);
        const recentMessages = currentList.slice(recentSliceIndex);
        const matchIndexInRecent = recentMessages.findIndex(m => isSameMessage(m, incoming));

        if (matchIndexInRecent !== -1) {
            const actualIndex = recentSliceIndex + matchIndexInRecent;
            const updated = [...currentList];
            updated[actualIndex] = { ...currentList[actualIndex], ...incoming };
            return updated;
        }

        return [...currentList, incoming];
    }

    constructor() {
        this.loadServers();
        if (this.activeChannelId()) {
            this.loadChannelMessages(this.activeChannelId());
        }

        const handleIncomingChannelMsg = (channelId: string, message: any) => {
            this.channelMessages.update(store => {
                const current = store[channelId] || [];
                return { ...store, [channelId]: this.upsertChannelMsg(current, message) };
            });
        };

        // 1. Socket handler
        this.socketService.registerChannelMessageHandler(handleIncomingChannelMsg);

        // 2. Supabase Realtime cloud handler
        this.supabaseRealtime.registerChannelMessageHandler(handleIncomingChannelMsg);
        this.supabaseRealtime.registerServerChangeHandler(() => {
            this.loadServers();
        });

        const handleServerInvite = (data: any) => {
            if (!data) return;
            const server = data.server || data;
            if (!server || !server.id) return;

            const exists = this.servers().some(s => s.id === server.id);
            if (!exists) {
                this.servers.update(list => [...list, server]);
            }
            this.notificationService.show({
                type: 'server_invite',
                title: 'Lời mời máy chủ mới 🚀',
                message: `Bạn đã được thêm vào máy chủ "${server.name}"!`,
                actionLabel: 'Mở máy chủ',
                actionRoute: ['/channels', server.id, server.channels?.[0]?.id || '']
            });
            this.loadServers();
        };

        this.socketService.registerServerInviteHandler(handleServerInvite);
        this.supabaseRealtime.registerServerInviteHandler(handleServerInvite);

        this.socketService.registerServerUpdatedHandler((data) => {
            if (!data) return;

            if (data.type === 'CHANNEL_ADDED' || data.type === 'CHANNEL_DELETED' || data.type === 'SERVER_CREATED') {
                this.loadServers();
            }

            if (data.type === 'MEMBER_ADDED' && data.server) {
                const currentUserId = this.authStore.user()?.id;
                if (data.userId === currentUserId || (data.server.members && data.server.members.includes(currentUserId))) {
                    this.loadServers();
                }
            }
        });
    }

    // --- LOAD DỮ LIỆU TỪ BACKEND ---
    loadServers() {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';
        this.http.get<Server[]>(`${this.apiConfig.baseUrl}/servers${params}`).subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    // Deduplicate channels within each server
                    const cleanedServers = data.map(s => {
                        const uniqueChannels: Channel[] = [];
                        const seenIds = new Set<string>();
                        for (const ch of s.channels || []) {
                            if (!seenIds.has(ch.id)) {
                                seenIds.add(ch.id);
                                uniqueChannels.push(ch);
                            }
                        }
                        return { ...s, channels: uniqueChannels };
                    });

                    this.servers.set(cleanedServers);
                    const currentServerId = this.activeServerId();
                    if (currentServerId) {
                        const currentServer = cleanedServers.find(s => s.id === currentServerId);
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
                if (!msgs) return;
                const normalized = msgs.map(m => normalizeMessage(m));
                this.channelMessages.update(store => {
                    const current = store[channelId] || [];
                    let merged: ChatMessage[] = [];
                    for (const sMsg of normalized) {
                        merged = this.upsertChannelMsg(merged, sMsg);
                    }
                    const pendingMsgs = current.filter(m => !merged.some(existing => isSameMessage(existing, m)) && (Date.now() - Number(m.id)) < 15000);
                    for (const p of pendingMsgs) {
                        merged = this.upsertChannelMsg(merged, p);
                    }
                    return {
                        ...store,
                        [channelId]: merged
                    };
                });
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

    // --- PHƯƠNG THỨC XỬ LÝ VOICE (WebRTC) ---
    joinVoiceChannel(channel: Channel) {
        const serverId = this.activeServerId();
        void this.voiceService.joinChannel(serverId, channel.id, channel.name);
    }

    leaveVoiceChannel() {
        this.voiceService.leaveChannel();
    }

    toggleMute() {
        this.voiceService.toggleMute();
    }

    toggleDeafen() {
        this.voiceService.toggleDeafen();
    }

    // --- HÀM TẠO SERVER ---
    createServer(name: string) {
        if (!name.trim()) return;

        const currentUserId = this.authStore.user()?.id;
        const payload = {
            name: name,
            icon: '🔥',
            userId: currentUserId || 'user'
        };

        this.http.post<Server>(`${this.apiConfig.baseUrl}/servers`, payload).subscribe({
            next: (createdServer) => {
                this.loadServers();
                this.selectServer(createdServer.id);
            },
            error: () => {
                const newServerId = 's-' + Date.now();
                const defaultTextChannelId = 'c-' + Date.now() + '-1';
                const defaultVoiceChannelId = 'c-' + Date.now() + '-2';

                const fallbackServer: Server = {
                    id: newServerId,
                    name: name,
                    icon: '🔥',
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
                this.loadServers();
                if (type === 'text') {
                    this.selectChannel(newChannel);
                }
            },
            error: () => {
                this.loadServers();
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
    sendMessage(
        text: string,
        senderName: string = 'Thiện Phúc',
        senderId: string = 'user',
        options?: {
            type?: 'text' | 'image' | 'gif' | 'sticker' | 'file' | 'video' | 'audio';
            attachments?: any[];
            mediaUrl?: string | null;
            metadata?: Record<string, any> | null;
        }
    ) {
        if (!text?.trim() && !options?.mediaUrl && !options?.attachments?.length) return;

        const channelId = this.activeChannelId();
        const currentUser = this.authStore.user();
        const avatarUrl = currentUser?.avatarUrl || null;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: senderId,
            senderName: senderName,
            senderAvatarUrl: avatarUrl,
            avatarUrl: avatarUrl,
            text: text || '',
            type: options?.type || 'text',
            attachments: options?.attachments || [],
            mediaUrl: options?.mediaUrl || null,
            metadata: options?.metadata || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic update
        this.channelMessages.update(store => {
            const currentList = store[channelId] || [];
            return { ...store, [channelId]: this.upsertChannelMsg(currentList, userMsg) };
        });

        // 1. Fail-safe Supabase Realtime Broadcast (direct cloud WebSocket to other machine)
        this.supabaseRealtime.broadcastChannelMessage(channelId, userMsg);

        // 2. Send to backend (will persist to DB & broadcast via Socket.IO)
        this.http.post<ChatMessage>(`${this.apiConfig.baseUrl}/messages/channel/${channelId}`, {
            text: text || '',
            senderId: senderId,
            senderName: senderName,
            senderAvatarUrl: avatarUrl,
            type: userMsg.type,
            attachments: userMsg.attachments,
            mediaUrl: userMsg.mediaUrl,
            metadata: userMsg.metadata
        }).subscribe({
            next: (savedMsg) => {
                if (savedMsg?.id) {
                    this.channelMessages.update(store => {
                        const currentList = store[channelId] || [];
                        return { ...store, [channelId]: this.upsertChannelMsg(currentList, { ...userMsg, ...savedMsg }) };
                    });
                }
            },
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
        const server = this.activeServer() || this.servers().find(s => s.id === serverId);

        if (server) {
            this.supabaseRealtime.broadcastServerInvite(friendId, {
                type: 'SERVER_INVITE',
                server: server,
                inviterId: userId,
            });
        }

        return this.http.post<{ success: boolean }>(
            `${this.apiConfig.baseUrl}/servers/${serverId}/invite-friend`,
            { friendId, inviterId: userId }
        ).toPromise() as any;
    }
}