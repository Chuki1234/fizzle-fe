import { Component, computed, inject, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ServerService } from '../../core/services/server';
import { FriendService } from '../../core/services/friend';
import { ModalService } from '../../core/services/modal';
import { SocketService } from '../../core/services/socket';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
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
    public modalService = inject(ModalService);
    public authService = inject(AuthService);
    public authStore = inject(AuthStore);
    private socketService = inject(SocketService);
    private router = inject(Router);

    public userInitial = computed(() => {
        const name = this.authStore.user()?.displayName || this.authStore.user()?.username || 'U';
        return name.charAt(0).toUpperCase();
    });

    public userStatusText = computed(() => {
        const user = this.authStore.user();
        if (!user) return 'Trực tuyến';
        const custom = user.customStatus?.trim();
        if (custom) {
            return `${user.customStatusEmoji ? user.customStatusEmoji + ' ' : ''}${custom}`;
        }
        if (user.statusMessage?.trim()) {
            return user.statusMessage.trim();
        }
        switch (user.presence) {
            case 'online': return 'Trực tuyến';
            case 'idle': return 'Chờ';
            case 'dnd': return 'Đừng làm phiền';
            case 'offline': return 'Ngoại tuyến';
            default: return 'Trực tuyến';
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
        // Connect socket whenever user becomes authenticated
        effect(() => {
            const user = this.authStore.user();
            if (user?.id) {
                this.socketService.connect(user.id);
                // Also reload friends when user is known
                this.friendService.loadFriendsFromBackend();
            }
        });
    }

    public logout(): void {
        this.socketService.disconnect();
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