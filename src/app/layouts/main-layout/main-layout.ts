import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ServerService } from '../../core/services/server';
import { FriendService } from '../../core/services/friend';
import { ModalService } from '../../core/services/modal';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
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
    private router = inject(Router);

    public userInitial = computed(() => {
        const name = this.authStore.user()?.displayName || this.authStore.user()?.username || 'U';
        return name.charAt(0).toUpperCase();
    });

    public logout(): void {
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