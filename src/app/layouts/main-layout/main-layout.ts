import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ServerService } from '../../core/services/server';
import { FriendService } from '../../core/services/friend';
import { ModalService } from '../../core/services/modal';
import { VoiceControlComponent } from '../../shared/ui/voice-control/voice-control'; // điều chỉnh đường dẫn nếu cần
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
    public modalService = inject(ModalService); // Thêm dòng này
}