import { Component, computed, inject, effect, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ServerService } from '../../core/services/server';
import { FriendService } from '../../core/services/friend';
import { VoiceService } from '../../core/services/voice.service';
import { ModalService } from '../../core/services/modal';
import { SocketService } from '../../core/services/socket';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationService, InAppNotification } from '../../core/services/notification.service';
import { LanguageService } from '../../core/services/language.service';
import { VoiceControlComponent } from '../../shared/ui/voice-control/voice-control';
import { ModalComponent } from '../../shared/ui/modal/modal';
import { Server } from '../../core/models/server.model';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        VoiceControlComponent,
        ModalComponent
    ],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayout {
    public serverService = inject(ServerService);
    public friendService = inject(FriendService);
    public voiceService = inject(VoiceService);
    public modalService = inject(ModalService);
    public authService = inject(AuthService);
    public authStore = inject(AuthStore);
    public notificationService = inject(NotificationService);
    public languageService = inject(LanguageService);
    private socketService = inject(SocketService);
    private supabaseRealtime = inject(SupabaseRealtimeService);
    private router = inject(Router);

    // --- DRAG & DROP STATE ---
    public draggedServerId = signal<string | null>(null);
    public dragOverServerId = signal<string | null>(null);
    public isDragging = signal<boolean>(false);

    /** Danh sách server đã được sắp xếp theo thứ tự người dùng tùy chỉnh */
    public sortedServers = computed<Server[]>(() => {
        const servers = this.serverService.servers();
        const userId = this.authStore.user()?.id;
        if (!userId) return servers;
        const orderKey = `server_order_${userId}`;
        const savedOrder: string[] = JSON.parse(localStorage.getItem(orderKey) || '[]');
        if (!savedOrder.length) return servers;
        // Sắp xếp theo thứ tự đã lưu, các server mới thêm sẽ xuất hiện ở cuối
        const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
        return [...servers].sort((a, b) => {
            const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
            const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
            return ia - ib;
        });
    });

    /** Lưu thứ tự server mới vào localStorage */
    private saveServerOrder(servers: Server[]): void {
        const userId = this.authStore.user()?.id;
        if (!userId) return;
        const orderKey = `server_order_${userId}`;
        localStorage.setItem(orderKey, JSON.stringify(servers.map(s => s.id)));
    }

    onDragStart(event: DragEvent, serverId: string): void {
        this.draggedServerId.set(serverId);
        this.isDragging.set(true);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', serverId);
        }
        // Add ghost image effect
        const el = event.target as HTMLElement;
        el.style.opacity = '0.5';
    }

    onDragEnd(event: DragEvent): void {
        const el = event.target as HTMLElement;
        el.style.opacity = '1';
        this.draggedServerId.set(null);
        this.dragOverServerId.set(null);
        this.isDragging.set(false);
    }

    onDragOver(event: DragEvent, serverId: string): void {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        if (this.draggedServerId() !== serverId) {
            this.dragOverServerId.set(serverId);
        }
    }

    onDragLeave(serverId: string): void {
        if (this.dragOverServerId() === serverId) {
            this.dragOverServerId.set(null);
        }
    }

    onDrop(event: DragEvent, targetServerId: string): void {
        event.preventDefault();
        const sourceId = this.draggedServerId();
        if (!sourceId || sourceId === targetServerId) return;

        const current = [...this.sortedServers()];
        const sourceIdx = current.findIndex(s => s.id === sourceId);
        const targetIdx = current.findIndex(s => s.id === targetServerId);
        if (sourceIdx === -1 || targetIdx === -1) return;

        // Move source to target position
        const [moved] = current.splice(sourceIdx, 1);
        current.splice(targetIdx, 0, moved);

        this.saveServerOrder(current);
        // Trigger recompute by updating servers signal
        this.serverService.servers.set([...current]);

        this.draggedServerId.set(null);
        this.dragOverServerId.set(null);
        this.isDragging.set(false);
    }

    // --- CHANNEL DRAG & DROP STATE ---
    public draggedChannelId = signal<string | null>(null);
    public dragOverChannelId = signal<string | null>(null);

    /** Danh sách kênh của server hiện tại đã được sắp xếp theo thứ tự người dùng kéo thả */
    public sortedChannels = computed(() => {
        const server = this.serverService.activeServer();
        if (!server || !server.channels) return [];

        const orderKey = `channel_order_${server.id}`;
        const savedOrder: string[] = JSON.parse(localStorage.getItem(orderKey) || '[]');
        if (!savedOrder.length) return server.channels;

        const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
        return [...server.channels].sort((a, b) => {
            const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
            const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
            return ia - ib;
        });
    });

    /** Kiểm tra người dùng hiện tại có phải chủ server không */
    public isServerOwner = computed(() => {
        const server = this.serverService.activeServer();
        const currentUserId = this.authStore.user()?.id;
        if (!server || !currentUserId) return true; // Cho phép sắp xếp nếu không xác định
        const owner = server.ownerId || server.creatorId;
        return !owner || owner === currentUserId;
    });

    onChannelDragStart(event: DragEvent, channelId: string): void {
        this.draggedChannelId.set(channelId);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', channelId);
        }
        const el = event.target as HTMLElement;
        el.style.opacity = '0.5';
    }

    onChannelDragEnd(event: DragEvent): void {
        const el = event.target as HTMLElement;
        el.style.opacity = '1';
        this.draggedChannelId.set(null);
        this.dragOverChannelId.set(null);
    }

    onChannelDragOver(event: DragEvent, channelId: string): void {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        if (this.draggedChannelId() !== channelId) {
            this.dragOverChannelId.set(channelId);
        }
    }

    onChannelDragLeave(channelId: string): void {
        if (this.dragOverChannelId() === channelId) {
            this.dragOverChannelId.set(null);
        }
    }

    onChannelDrop(event: DragEvent, targetChannelId: string): void {
        event.preventDefault();
        const sourceId = this.draggedChannelId();
        if (!sourceId || sourceId === targetChannelId) return;

        const server = this.serverService.activeServer();
        if (!server) return;

        const current = [...this.sortedChannels()];
        const sourceIdx = current.findIndex(c => c.id === sourceId);
        const targetIdx = current.findIndex(c => c.id === targetChannelId);
        if (sourceIdx === -1 || targetIdx === -1) return;

        const [moved] = current.splice(sourceIdx, 1);
        current.splice(targetIdx, 0, moved);

        // Lưu vào localStorage
        const orderKey = `channel_order_${server.id}`;
        localStorage.setItem(orderKey, JSON.stringify(current.map(c => c.id)));

        // Cập nhật signal channels trong serverService
        this.serverService.servers.update(list => list.map(s => {
            if (s.id === server.id) {
                return { ...s, channels: [...current] };
            }
            return s;
        }));

        this.draggedChannelId.set(null);
        this.dragOverChannelId.set(null);
    }

    public attachScreenStream(videoEl: HTMLVideoElement): void {
        const screenShare = this.voiceService.activeScreenShare();
        if (videoEl && screenShare?.stream) {
            videoEl.srcObject = screenShare.stream;
            videoEl.play().catch(e => console.warn('Autoplay screen share video warning:', e));
        }
    }

    public isImageUrl(icon: string | undefined): boolean {
        if (!icon) return false;
        return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image/') || icon.startsWith('/') || icon.includes('/');
    }

    public userInitial = computed(() => {
        const name = this.authStore.user()?.displayName || this.authStore.user()?.username || 'U';
        return name.charAt(0).toUpperCase();
    });

    public userStatusText = computed(() => {
        const user = this.authStore.user();
        if (!user) return this.languageService.t('status.online');
        const custom = user.customStatus?.trim();
        if (custom) {
            return `${user.customStatusEmoji ? user.customStatusEmoji + ' ' : ''}${custom}`;
        }
        if (user.statusMessage?.trim()) {
            return user.statusMessage.trim();
        }
        switch (user.presence) {
            case 'online': return this.languageService.t('status.online');
            case 'idle': return this.languageService.t('status.idle');
            case 'dnd': return this.languageService.t('status.dnd');
            case 'offline': return this.languageService.t('status.offline');
            default: return this.languageService.t('status.online');
        }
    });

    public userStatusColor = computed(() => {
        switch (this.authStore.user()?.presence) {
            case 'online': return '#00d4a4';
            case 'idle': return '#f0b232';
            case 'dnd': return '#f23f43';
            case 'offline': return '#80848e';
            default: return '#00d4a4';
        }
    });

    constructor() {
        // Connect socket & Supabase Realtime whenever user becomes authenticated
        effect(() => {
            const user = this.authStore.user();
            if (user?.id) {
                this.socketService.connect(user.id);
                this.supabaseRealtime.init(user.id);
                // Reload both friends and servers for this user
                this.friendService.loadFriendsFromBackend();
                this.serverService.loadServers();
            }
        });

        // Auto-attach LiveKit screen share video stream
        effect(() => {
            const screenShare = this.voiceService.activeScreenShare();
            if (screenShare?.stream) {
                setTimeout(() => {
                    const videoEl = document.querySelector<HTMLVideoElement>('.screenshare-video');
                    if (videoEl && videoEl.srcObject !== screenShare.stream) {
                        videoEl.srcObject = screenShare.stream;
                        videoEl.play().catch(e => console.warn('Screen share video play warning:', e));
                    }
                }, 100);
            }
        });
    }

    public handleNotificationClick(n: InAppNotification): void {
        if (n.actionRoute && n.actionRoute.length > 0) {
            void this.router.navigate(n.actionRoute);
        }
        this.notificationService.dismiss(n.id);
    }

    public isImageIcon(icon?: string): boolean {
        if (!icon) return false;
        const trimmed = icon.trim();
        return (
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('data:image') ||
            trimmed.startsWith('/uploads/') ||
            trimmed.startsWith('blob:') ||
            trimmed.endsWith('.png') ||
            trimmed.endsWith('.jpg') ||
            trimmed.endsWith('.jpeg') ||
            trimmed.endsWith('.webp') ||
            trimmed.endsWith('.svg') ||
            trimmed.endsWith('.gif') ||
            trimmed.length > 8
        );
    }

    public getServerDisplayIcon(server: any): string {
        if (!server) return 'S';
        const icon = server.icon?.trim();
        if (icon && icon.length <= 3) return icon;
        return (server.name || 'S').charAt(0).toUpperCase();
    }

    public logout(): void {
        this.socketService.disconnect();
        this.supabaseRealtime.disconnect();
        this.authService.logout().subscribe({
            next: () => {
                void this.router.navigateByUrl('/auth/login');
            },
            error: () => {
                this.authStore.clear();
                void this.router.navigateByUrl('/auth/login');
            }
        });
    }
}
