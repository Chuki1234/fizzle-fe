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
    }

    public handleNotificationClick(n: InAppNotification): void {
        if (n.actionRoute && n.actionRoute.length > 0) {
            void this.router.navigate(n.actionRoute);
        }
        this.notificationService.dismiss(n.id);
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
