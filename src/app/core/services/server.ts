import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Server, Channel } from '../models/server.model';
import { ChatMessage } from '../models/friend.model';

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private router = inject(Router);

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

    // --- HÀM XỬ LÝ CHUYỂN KÊNH & SERVER ---
    selectServer(serverId: string) {
        if (!serverId) {
            this.activeServerId.set('');
            this.activeChannelId.set('');
            this.router.navigate(['/friends']);
            return;
        }

        this.activeServerId.set(serverId);
        const firstTextChannel = this.servers().find(s => s.id === serverId)?.channels.find(c => c.type === 'text');
        if (firstTextChannel) {
            this.activeChannelId.set(firstTextChannel.id);
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

        const newServerId = 'server-' + Date.now();
        const defaultTextChannelId = 'c-' + Date.now() + '-1';
        const defaultVoiceChannelId = 'c-' + Date.now() + '-2';

        const newServer: Server = {
            id: newServerId,
            name: name.trim(),
            icon: icon.trim() || '🔥',
            channels: [
                { id: defaultTextChannelId, name: 'thảo-luận-chung', type: 'text' },
                { id: defaultVoiceChannelId, name: 'Phòng Chờ 🎙️', type: 'voice' }
            ]
        };

        this.servers.update(list => [...list, newServer]);
        this.selectServer(newServerId);
    }

    // --- HÀM TẠO KÊNH VÀ GỬI TIN NHẮN ---
    addChannel(name: string, type: 'text' | 'voice') {
        const serverId = this.activeServerId();
        if (!serverId || !name.trim()) return;

        const newChannel: Channel = {
            id: 'c-' + Date.now(),
            name: name.toLowerCase().replace(/\s+/g, '-'),
            type: type
        };

        this.servers.update(list => list.map(s => {
            if (s.id === serverId) {
                return { ...s, channels: [...s.channels, newChannel] };
            }
            return s;
        }));

        if (type === 'text') {
            this.selectChannel(newChannel);
        }
    }

    sendMessage(text: string) {
        if (!text.trim()) return;

        const channelId = this.activeChannelId();
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: 'user',
            senderName: 'Thiện Phúc',
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.channelMessages.update(store => ({
            ...store,
            [channelId]: [...(store[channelId] || []), userMsg]
        }));
    }
}