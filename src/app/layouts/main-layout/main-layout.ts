import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ServerService } from '../../core/services/server';
import { FriendService } from '../../core/services/friend';
import { ModalService } from '../../core/services/modal';
import { VoiceControlComponent } from '../../shared/ui/voice-control/voice-control'; // điều chỉnh đường dẫn nếu cần
import { ModalComponent } from '../../shared/ui/modal/modal';
import { UserPanel } from './user-panel/user-panel';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        VoiceControlComponent,
        ModalComponent,
        UserPanel
    ],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayout {
    public serverService = inject(ServerService);
    public friendService = inject(FriendService);
    public modalService = inject(ModalService); // Thêm dòng này

    private readonly router = inject(Router);

    /** Đang ở trang dashboard? Dùng để bật thanh user trải ngang cả cột server. */
    protected readonly isDashboard = toSignal(
        this.router.events.pipe(
            filter((e) => e instanceof NavigationEnd),
            map(() => this.isDashboardUrl(this.router.url)),
            startWith(this.isDashboardUrl(this.router.url)),
        ),
        { initialValue: this.isDashboardUrl(this.router.url) },
    );

    private isDashboardUrl(url: string): boolean {
        return url.split('?')[0] === '/dashboard';
    }
}
