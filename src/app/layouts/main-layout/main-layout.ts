import { Component, computed, inject, effect } from '@angular/core';
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
